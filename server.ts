const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);

// Define allowed origins
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://type-shooter.vercel.app',
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
      process.env.VERCEL_URL ? `http://${process.env.VERCEL_URL}` : ''
    ].filter(Boolean)
  : ['http://localhost:5173'];

console.log('Server starting with config:', {
  env: process.env.NODE_ENV,
  vercelUrl: process.env.VERCEL_URL,
  allowedOrigins
});

// CORS middleware
app.use(cors({
  origin: (origin, callback) => {
    console.log('Incoming request from origin:', origin);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error('Origin not allowed:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true
}));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    headers: req.headers
  });
  res.status(500).json({ error: 'Internal Server Error' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    env: process.env.NODE_ENV,
    vercelUrl: process.env.VERCEL_URL
  });
});

// Initialize Socket.IO with error handling
const io = new Server(httpServer, {
  path: '/socket.io/',
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['polling', 'websocket'], // Try polling first
  allowEIO3: true
});

// Socket.IO middleware for logging
io.use((socket, next) => {
  console.log('New socket connection attempt:', {
    id: socket.id,
    handshake: {
      headers: socket.handshake.headers,
      query: socket.handshake.query,
      auth: socket.handshake.auth
    }
  });
  next();
});

// Handle Socket.IO errors
io.on('connect_error', (err) => {
  console.error('Socket.IO connection error:', {
    message: err.message,
    stack: err.stack
  });
});

io.engine.on('connection_error', (err) => {
  console.error('Socket.IO engine error:', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    context: err.context
  });
});

// Store rooms in memory (note: this will be cleared on serverless function restart)
const rooms = new Map();

function getRandomWord() {
  const words = [
    // Classic Western Items
    "sheriff", "wanted", "bounty", "outlaw", "saloon",
    "cowboy", "desert", "duel", "ranch", "horse",
    "bandit", "deputy", "cattle", "sunset", "cactus",
    "lasso", "boots", "spurs", "saddle", "rifle",
    
    // Additional Western Terms
    "frontier", "homestead", "stagecoach", "corral", "mustang",
    "tumbleweed", "campfire", "canyon", "prairie", "rodeo",
    "gunslinger", "marshal", "rustler", "stampede", "wagon",
    "windmill", "hideout", "tavern", "gold", "mine",
    
    // Western Landscape
    "mountain", "valley", "plateau", "gulch", "mesa",
    "butte", "ravine", "creek", "trail", "oasis",
    
    // Western Activities
    "roundup", "showdown", "ambush", "shootout", "tracking",
    "hunting", "roping", "wrangling", "mining", "trading",
    
    // Western Gear
    "holster", "bandana", "chaps", "poncho", "stirrup",
    "canteen", "revolver", "shotgun", "dynamite", "rope"
  ];
  return words[Math.floor(Math.random() * words.length)];
}

function startCountdown(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.countdownStarted) return;

  room.countdownStarted = true;
  let count = 3;

  const countdownInterval = setInterval(() => {
    if (!rooms.has(roomId)) {
      clearInterval(countdownInterval);
      return;
    }

    if (count > 0) {
      io.to(roomId).emit('countdown', count);
      count--;
    } else {
      clearInterval(countdownInterval);
      const room = rooms.get(roomId);
      if (room) {
        room.roundStartTime = Date.now();
        io.to(roomId).emit('roundStart', {
          word: room.word,
          round: room.round,
          stats: room.playerStats
        });
      }
    }
  }, 1000);

  // Ensure interval is cleared after 5 seconds (safety measure for serverless)
  setTimeout(() => clearInterval(countdownInterval), 5000);
}

io.on('connection', (socket) => {
  console.log('Client connected:', {
    id: socket.id,
    transport: socket.conn.transport.name
  });

  socket.on('createGame', () => {
    try {
      const roomId = Math.random().toString(36).substring(2, 8);
      rooms.set(roomId, {
        players: [socket.id],
        word: getRandomWord(),
        gameStarted: false,
        round: 1,
        playerStats: {
          [socket.id]: { wins: 0, totalGames: 0, fastestTime: Infinity }
        },
        countdownStarted: false
      });
      socket.join(roomId);
      socket.emit('gameCreated', roomId);
    } catch (error) {
      console.error('Error creating game:', error);
      socket.emit('error', 'Failed to create game');
    }
  });

  socket.on('joinGame', (roomId) => {
    try {
      const room = rooms.get(roomId);
      if (room && room.players.length < 2) {
        room.players.push(socket.id);
        room.playerStats[socket.id] = { wins: 0, totalGames: 0, fastestTime: Infinity };
        socket.join(roomId);
        if (room.players.length === 2) {
          room.gameStarted = true;
          io.to(roomId).emit('gameStart');
          startCountdown(roomId);
        }
      } else {
        socket.emit('joinError', 'Room is full or does not exist');
      }
    } catch (error) {
      console.error('Error joining game:', error);
      socket.emit('error', 'Failed to join game');
    }
  });

  socket.on('submitWord', ({ roomId, word }) => {
    try {
      const room = rooms.get(roomId);
      if (room && room.gameStarted && room.word === word) {
        const roundTime = Date.now() - (room.roundStartTime || Date.now());
        const timeInSeconds = (roundTime / 1000).toFixed(2);
        room.playerStats[socket.id].fastestTime = Math.min(
          room.playerStats[socket.id].fastestTime,
          roundTime
        );
        room.playerStats[socket.id].wins++;
        room.playerStats[socket.id].totalGames++;
        
        const otherPlayerId = room.players.find(id => id !== socket.id);
        if (otherPlayerId) {
          room.playerStats[otherPlayerId].totalGames++;
        }

        if (room.round < 5) {
          room.round++;
          room.word = getRandomWord();
          room.countdownStarted = false;
          io.to(roomId).emit('roundEnd', {
            winner: socket.id,
            stats: room.playerStats,
            timeToShoot: timeInSeconds
          });
          setTimeout(() => startCountdown(roomId), 2000);
        } else {
          io.to(roomId).emit('gameOver', {
            winner: socket.id,
            stats: room.playerStats,
            timeToShoot: timeInSeconds,
            finalWord: word
          });
          rooms.delete(roomId);
        }
      }
    } catch (error) {
      console.error('Error submitting word:', error);
      socket.emit('error', 'Failed to submit word');
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', {
      id: socket.id,
      reason
    });
    try {
      rooms.forEach((room, roomId) => {
        if (room.players.includes(socket.id)) {
          io.to(roomId).emit('playerLeft');
          rooms.delete(roomId);
        }
      });
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

// Only serve static files in development
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Start the server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});

// Export for Vercel
module.exports = app; 