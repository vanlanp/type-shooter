import { createServer as createHttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createHttpServer(app);

// Define allowed origins
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://type-shooter.vercel.app']
  : ['http://localhost:5173'];

// Add Vercel URL to allowed origins if it exists
if (process.env.VERCEL_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Initialize Socket.IO with error handling
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  },
  connectionStateRecovery: {
    // the backup duration of the sessions and the packets
    maxDisconnectionDuration: 2 * 60 * 1000,
    // whether to skip middlewares upon successful recovery
    skipMiddlewares: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Handle Socket.IO errors
io.on("connect_error", (err) => {
  console.error('Socket.IO connection error:', err);
});

io.engine.on("connection_error", (err) => {
  console.error('Socket.IO engine error:', err);
});

// Store rooms in memory (note: this will be cleared on serverless function restart)
const rooms = new Map<string, GameRoom>();

interface PlayerStats {
  wins: number;
  totalGames: number;
  fastestTime: number;
}

interface GameRoom {
  players: string[];
  word: string;
  gameStarted: boolean;
  round: number;
  playerStats: Record<string, PlayerStats>;
  roundStartTime?: number;
  countdownStarted?: boolean;
}

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

function getRandomWord(): string {
  return words[Math.floor(Math.random() * words.length)];
}

function startCountdown(roomId: string) {
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
  console.log('User connected:', socket.id);

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

  socket.on('joinGame', (roomId: string) => {
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

  socket.on('disconnect', () => {
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

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Add a catch-all route to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Export for Vercel
export default app;

// Only listen if not in Vercel
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} 