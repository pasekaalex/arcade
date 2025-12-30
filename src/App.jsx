import { useState, useEffect } from 'react'
import Intro from './Intro'
import Snake from './games/Snake'
import SpaceInvaders from './games/SpaceInvaders'
import HighwayRacer from './games/HighwayRacer'
import Chess from './games/Chess'
import Tetris from './games/Tetris'
import IsometricCity from './games/IsometricCity'
import './App.css'

const GAMES = [
  {
    id: 'snake',
    name: '🐍 Classic Snake',
    description: 'Eat food and grow longer!',
    component: Snake,
    color: '#4CAF50',
    difficulty: 'Easy',
    players: '1'
  },
  {
    id: 'space-invaders',
    name: '🚀 Space Invaders',
    description: 'Destroy all the aliens!',
    component: SpaceInvaders,
    color: '#FF6B6B',
    difficulty: 'Medium',
    players: '1'
  },
  {
    id: 'highway-racer',
    name: '🏎️ Highway Racer',
    description: 'Avoid oncoming traffic!',
    component: HighwayRacer,
    color: '#FFD700',
    difficulty: 'Hard',
    players: '1'
  },
  {
    id: 'chess',
    name: '♟️ Chess',
    description: 'Battle the AI in classic chess!',
    component: Chess,
    color: '#DAA520',
    difficulty: 'Variable',
    players: '1 vs AI'
  },
  {
    id: 'tetris',
    name: '🧱 Tetris',
    description: 'Stack blocks, clear lines!',
    component: Tetris,
    color: '#00f5ff',
    difficulty: 'Medium',
    players: '1'
  },
  {
    id: 'isometric-city',
    name: '🏙️ City Builder',
    description: 'Build your dream isometric city!',
    component: IsometricCity,
    color: '#2ecc71',
    difficulty: 'Relaxing',
    players: '1'
  }
]

function App() {
  const [showIntro, setShowIntro] = useState(true)
  const [selectedGame, setSelectedGame] = useState(null)
  const [stats, setStats] = useState({
    totalGames: 0,
    totalScore: 0,
    favoriteGame: null
  })

  useEffect(() => {
    // Load stats from localStorage
    const savedStats = localStorage.getItem('arcadeStats')
    if (savedStats) {
      try {
        setStats(JSON.parse(savedStats))
      } catch (e) {
        console.error('Error loading stats:', e)
      }
    }
  }, [])

  const handleEnterArcade = () => {
    setShowIntro(false)
  }

  const handleBackToIntro = () => {
    setShowIntro(true)
    setSelectedGame(null)
  }

  const handleGameSelect = (game) => {
    setSelectedGame(game)
    // Update stats
    const newStats = {
      ...stats,
      totalGames: stats.totalGames + 1,
      favoriteGame: game.id
    }
    setStats(newStats)
    localStorage.setItem('arcadeStats', JSON.stringify(newStats))
  }

  // Show intro page first
  if (showIntro) {
    return <Intro onEnter={handleEnterArcade} />
  }

  if (selectedGame) {
    const GameComponent = selectedGame.component
    return (
      <div className="app">
        <div className="game-header">
          <button 
            className="back-button"
            onClick={() => setSelectedGame(null)}
          >
            ← Back to Arcade
          </button>
          <div className="game-header-info">
            <h2>{selectedGame.name}</h2>
            <div className="game-meta">
              <span className="difficulty-badge" style={{ background: selectedGame.color }}>
                {selectedGame.difficulty}
              </span>
              <span className="players-badge">👤 {selectedGame.players}</span>
            </div>
          </div>
        </div>
        <GameComponent />
      </div>
    )
  }

  return (
      <div className="app arcade-menu">
      <div className="arcade-container">
        <div className="arcade-header">
          <button 
            className="back-to-intro-button"
            onClick={handleBackToIntro}
            title="Back to Main Menu"
          >
            ← Back to Main Menu
          </button>
          <h1 className="arcade-title">🎮 React Arcade</h1>
          <p className="arcade-subtitle">Choose a game to play!</p>
          {stats.totalGames > 0 && (
            <div className="arcade-stats">
              <span>Games Played: {stats.totalGames}</span>
              {stats.favoriteGame && (
                <span>Favorite: {GAMES.find(g => g.id === stats.favoriteGame)?.name}</span>
              )}
            </div>
          )}
        </div>
        
        <div className="games-grid">
          {GAMES.map((game, index) => (
            <div
              key={game.id}
              className="game-card"
              onClick={() => handleGameSelect(game)}
              style={{ 
                '--game-color': game.color,
                animationDelay: `${index * 0.1}s`
              }}
            >
              <div className="game-card-glow" style={{ background: game.color }}></div>
              <div className="game-card-content">
                <div className="game-icon">{game.name.split(' ')[0]}</div>
                <h3>{game.name}</h3>
                <p>{game.description}</p>
                <div className="game-card-footer">
                  <span className="difficulty-tag">{game.difficulty}</span>
                  <button className="play-button">Play Now →</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="other-projects">
          <h3>🌐 My Other Projects</h3>
          <div className="project-links">
            <a href="https://www.cockpants.lol" target="_blank" rel="noopener noreferrer" className="project-link spongebob">
              <span className="project-emoji">🧽</span>
              <span className="project-name">Spongebob Arcade</span>
              <span className="project-arrow">→</span>
            </a>
            <a href="https://www.bulked.lol" target="_blank" rel="noopener noreferrer" className="project-link bulk">
              <span className="project-emoji">💪</span>
              <span className="project-name">Amazing Bulk</span>
              <span className="project-arrow">→</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}

export default App
