import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

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

const rooms: Map<string, GameRoom> = new Map();
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
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createGame', () => {
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
  });

  socket.on('joinGame', (roomId: string) => {
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
  });

  socket.on('submitWord', ({ roomId, word }) => {
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
  });

  socket.on('disconnect', () => {
    rooms.forEach((room, roomId) => {
      if (room.players.includes(socket.id)) {
        io.to(roomId).emit('playerLeft');
        rooms.delete(roomId);
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 