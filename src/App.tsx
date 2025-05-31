import { useState, useEffect, useRef } from 'react'
import styled from 'styled-components'
import './App.css'
import backgroundImage from './assets/back.jpg'
import socket from './utils/socket'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  color: #ecf0f1;
  font-family: 'Western', Arial, sans-serif;
  position: relative;

  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url(${backgroundImage});
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
    filter: brightness(0.7);
    z-index: -1;
  }

  & > * {
    position: relative;
    z-index: 1;
  }
`

const Title = styled.h1`
  font-size: 3rem;
  margin-bottom: 2rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  font-family: 'Wanted', 'Western', cursive;
`

const Button = styled.button`
  padding: 1rem 2rem;
  font-size: 1.2rem;
  margin: 0.5rem;
  background: #8b0000;
  border: 2px solid #daa520;
  border-radius: 5px;
  color: #daa520;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Western', Arial, sans-serif;
  text-transform: uppercase;
  letter-spacing: 1px;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: scale(1.05);
    background: #a00000;
    box-shadow: 0 0 10px rgba(218, 165, 32, 0.5);
  }

  &::before {
    content: '🌵';
    position: absolute;
    left: 10px;
    opacity: 0.7;
  }

  &::after {
    content: '🎯';
    position: absolute;
    right: 10px;
    opacity: 0.7;
  }
`

const Input = styled.input`
  padding: 1rem;
  font-size: 1.2rem;
  margin: 0.5rem;
  border: 2px solid #daa520;
  border-radius: 5px;
  width: 200px;
  background: rgba(0, 0, 0, 0.7);
  color: #daa520;
  font-family: 'Western', Arial, sans-serif;

  &:focus {
    outline: none;
    box-shadow: 0 0 10px rgba(218, 165, 32, 0.5);
  }
`

const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: 2rem;
  min-width: 300px;
  background: rgba(0, 0, 0, 0.8);
  border: 3px solid #daa520;
  border-radius: 10px;
  position: relative;
  backdrop-filter: blur(5px);

  &::before {
    content: '';
    position: absolute;
    top: -20px;
    left: -20px;
    right: -20px;
    bottom: -20px;
    border: 2px solid #8b0000;
    border-radius: 15px;
    z-index: -1;
  }
`

const WordDisplay = styled.div`
  font-size: 2.5rem;
  margin: 1rem 0;
  color: #daa520;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  font-family: 'Wanted', 'Western', cursive;
  letter-spacing: 2px;
`

const StatsContainer = styled.div`
  display: flex;
  justify-content: space-around;
  width: 100%;
  margin-top: 1rem;
  padding: 1rem;
  border-top: 2px solid #daa520;
`

const StatBox = styled.div`
  text-align: center;
  padding: 0.5rem;
  background: rgba(139, 0, 0, 0.3);
  border-radius: 5px;

  h3 {
    color: #daa520;
    margin: 0 0 0.5rem 0;
  }

  p {
    color: #ecf0f1;
    margin: 0;
  }
`

const RoundDisplay = styled.div`
  position: absolute;
  top: -15px;
  background: #8b0000;
  padding: 0.5rem 1rem;
  border: 2px solid #daa520;
  border-radius: 15px;
  color: #daa520;
  font-weight: bold;
`

const CountdownOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
`

const CountdownNumber = styled.div`
  font-size: 8rem;
  color: var(--gold-color);
  font-family: 'Wanted', 'Western', cursive;
  animation: countdownPulse 1s ease-in-out;
  text-shadow: 0 0 20px var(--gold-color);

  @keyframes countdownPulse {
    0% {
      transform: scale(2);
      opacity: 0;
    }
    50% {
      transform: scale(1);
      opacity: 1;
    }
    100% {
      transform: scale(0);
      opacity: 0;
    }
  }
`

const ReadyMessage = styled.div`
  font-size: 2rem;
  color: var(--gold-color);
  text-align: center;
  margin-bottom: 1rem;
  font-family: 'Western', Arial, sans-serif;
  text-transform: uppercase;
  letter-spacing: 2px;
  animation: fadeIn 0.5s ease-out;
`

const ResultOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  animation: fadeIn 0.5s ease-out;
`

const ResultContent = styled.div`
  background: rgba(139, 0, 0, 0.9);
  padding: 2rem;
  border-radius: 15px;
  border: 3px solid var(--gold-color);
  text-align: center;
  max-width: 80%;
  animation: slideIn 0.5s ease-out;

  @keyframes slideIn {
    from {
      transform: translateY(-50px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`

const ResultTitle = styled.h2`
  color: var(--gold-color);
  font-size: 2.5rem;
  margin: 0 0 1rem 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  font-family: 'Wanted', 'Western', cursive;
`

const ResultText = styled.p`
  color: var(--text-color);
  font-size: 1.2rem;
  margin: 0.5rem 0;
`

const ResultEmoji = styled.div`
  font-size: 4rem;
  margin: 1rem 0;
  animation: bounce 1s infinite;

  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }
`

interface PlayerStats {
  wins: number;
  totalGames: number;
  fastestTime: number;
}

function App() {
  const [gameState, setGameState] = useState<'menu' | 'waiting' | 'playing'>('menu')
  const [roomId, setRoomId] = useState('')
  const [word, setWord] = useState('')
  const [inputWord, setInputWord] = useState('')
  const [gameResult, setGameResult] = useState<string | null>(null)
  const [round, setRound] = useState(1)
  const [stats, setStats] = useState<Record<string, PlayerStats>>({})
  const [countdown, setCountdown] = useState<number | null>(null)
  const [showWord, setShowWord] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [timeToShoot, setTimeToShoot] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)

  // Input focus effect
  useEffect(() => {
    if (showWord && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showWord])

  useEffect(() => {
    const onGameCreated = (newRoomId: string) => {
      console.log('Game created:', newRoomId)
      setRoomId(newRoomId)
      setGameState('waiting')
    }

    const onGameStart = () => {
      console.log('Game starting...')
      setGameState('playing')
      setShowWord(false)
      setGameResult(null)
      setInputWord('')
    }

    const onCountdown = (count: number) => {
      console.log('Countdown:', count)
      setCountdown(count)
    }

    const onRoundStart = ({ word, round, stats }: { 
      word: string;
      round: number;
      stats: Record<string, PlayerStats>
    }) => {
      console.log('Round starting with word:', word)
      setWord(word)
      setRound(round)
      setStats(stats)
      setCountdown(null)
      setShowWord(true)
    }

    const onRoundEnd = ({ winner, stats, timeToShoot }: {
      winner: string;
      stats: Record<string, PlayerStats>;
      timeToShoot: string;
    }) => {
      setStats(stats)
      setShowWord(false)
      setInputWord('')
      setTimeToShoot(timeToShoot)
      const isWinner = winner === socket.id
      setGameResult(isWinner ? 'You won this round! 🎯' : 'You lost this round! 😢')
      setShowResult(true)
      setTimeout(() => {
        setShowResult(false)
        setGameResult(null)
        setTimeToShoot(null)
      }, 2000)
    }

    const onGameOver = ({ winner, stats, timeToShoot, finalWord }: { 
      winner: string;
      stats: Record<string, PlayerStats>;
      timeToShoot: string;
      finalWord: string;
    }) => {
      setStats(stats)
      setTimeToShoot(timeToShoot)
      const isWinner = winner === socket.id
      setGameResult(isWinner ? 'You won the game! 🏆' : 'You lost the game! 😢')
      setShowResult(true)
      setTimeout(() => {
        setGameState('menu')
        setShowResult(false)
        setTimeToShoot(null)
      }, 3000)
    }

    const onPlayerLeft = () => {
      setGameResult('Other player left the game')
      setGameState('menu')
    }

    socket.on('gameCreated', onGameCreated)
    socket.on('gameStart', onGameStart)
    socket.on('countdown', onCountdown)
    socket.on('roundStart', onRoundStart)
    socket.on('roundEnd', onRoundEnd)
    socket.on('gameOver', onGameOver)
    socket.on('playerLeft', onPlayerLeft)

    return () => {
      socket.off('gameCreated', onGameCreated)
      socket.off('gameStart', onGameStart)
      socket.off('countdown', onCountdown)
      socket.off('roundStart', onRoundStart)
      socket.off('roundEnd', onRoundEnd)
      socket.off('gameOver', onGameOver)
      socket.off('playerLeft', onPlayerLeft)
    }
  }, [])

  const createGame = () => {
    console.log('Creating game...')
    socket.emit('createGame')
  }

  const joinGame = () => {
    if (roomId) {
      console.log('Joining game:', roomId)
      socket.emit('joinGame', roomId)
    }
  }

  const submitWord = () => {
    if (!showWord) return
    console.log('Submitting word:', inputWord)
    socket.emit('submitWord', { roomId, word: inputWord })
  }

  const renderStats = () => {
    if (!socket.id || !stats[socket.id]) return null;
    const myStats = stats[socket.id];
    
    return (
      <StatsContainer>
        <StatBox>
          <h3>Wins</h3>
          <p>{myStats.wins}</p>
        </StatBox>
        <StatBox>
          <h3>Games</h3>
          <p>{myStats.totalGames}</p>
        </StatBox>
        <StatBox>
          <h3>Best Time</h3>
          <p>{myStats.fastestTime === Infinity ? '-' : `${Math.round(myStats.fastestTime / 1000)}s`}</p>
        </StatBox>
      </StatsContainer>
    );
  };

  const renderResult = () => {
    if (!gameResult || !showResult) return null;
    
    const isWinner = gameResult.includes('won');
    return (
      <ResultOverlay>
        <ResultContent>
          <ResultEmoji>
            {isWinner ? '🎯' : '😢'}
          </ResultEmoji>
          <ResultTitle>
            {isWinner ? 'VICTORY!' : 'DEFEATED!'}
          </ResultTitle>
          <ResultText>{gameResult}</ResultText>
          {timeToShoot && (
            <ResultText>
              Time to shoot: {timeToShoot} seconds
            </ResultText>
          )}
        </ResultContent>
      </ResultOverlay>
    );
  };

  return (
    <Container>
      <Title>🤠 Type Shooter 🎯</Title>
      {gameState === 'menu' && (
        <GameContainer className="game-container">
          <Button onClick={createGame}>Create New Game</Button>
          <div>
            <Input
              type="text"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <Button onClick={joinGame}>Join Game</Button>
          </div>
          {gameResult && <div className="fade-in">{gameResult}</div>}
          {renderStats()}
        </GameContainer>
      )}

      {gameState === 'waiting' && (
        <GameContainer className="game-container">
          <div>Room ID: {roomId}</div>
          <div>Waiting for another player to join...</div>
        </GameContainer>
      )}

      {gameState === 'playing' && (
        <GameContainer className="game-container">
          <RoundDisplay>Round {round}/5</RoundDisplay>
          {!showWord && !countdown && (
            <ReadyMessage>Get ready for the next word!</ReadyMessage>
          )}
          {showWord && <WordDisplay>{word}</WordDisplay>}
          <Input
            ref={inputRef}
            type="text"
            value={inputWord}
            onChange={(e) => setInputWord(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && submitWord()}
            placeholder={showWord ? "Type the word..." : "Wait for the word..."}
            disabled={!showWord}
          />
          <Button onClick={submitWord} disabled={!showWord}>SHOOT! 🔫</Button>
          {gameResult && <div className="fade-in">{gameResult}</div>}
          {renderStats()}
        </GameContainer>
      )}

      {countdown !== null && (
        <CountdownOverlay>
          <CountdownNumber>{countdown}</CountdownNumber>
        </CountdownOverlay>
      )}
      
      {renderResult()}
    </Container>
  )
}

export default App
