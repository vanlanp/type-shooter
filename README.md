# Type Shooter - Western Duel Typing Game 🤠

A real-time multiplayer typing game where two players face off in a western-style duel. The first player to correctly type the given word and press enter wins the shootout!

## Features

- Real-time multiplayer gameplay
- Western-themed interface
- Room-based matchmaking
- Instant feedback on game results
- Responsive design

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/type-shooter.git
cd type-shooter
```

2. Install dependencies:
```bash
npm install
```

## Running the Game

1. Start both the server and client:
```bash
npm start
```

This will start:
- The game server on port 3000
- The development server on port 5173

2. Open your browser and navigate to:
```
http://localhost:5173
```

## How to Play

1. First player:
   - Click "Create New Game"
   - Share the Room ID with your opponent

2. Second player:
   - Enter the Room ID
   - Click "Join Game"

3. When both players are in:
   - A word will appear on the screen
   - Type the word as fast as you can
   - Press Enter or click "SHOOT!" to submit
   - First player to correctly type the word wins!

## Technologies Used

- React
- TypeScript
- Socket.IO
- Styled Components
- Vite
- Express

## License

MIT
