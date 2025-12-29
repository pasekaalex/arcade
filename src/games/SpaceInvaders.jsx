import { useEffect, useRef, useState } from 'react'
import '../App.css'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const PLAYER_WIDTH = 60
const PLAYER_HEIGHT = 30
const PLAYER_SPEED = 6
const BULLET_SPEED = 10
const ALIEN_ROWS = 5
const ALIEN_COLS = 10
const ALIEN_WIDTH = 40
const ALIEN_HEIGHT = 30
const ALIEN_SPACING = 50
const ALIEN_SPEED = 1.2
const ALIEN_DROP = 25

export default function SpaceInvaders() {
  const canvasRef = useRef(null)
  const [playerX, setPlayerX] = useState(CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2)
  const [bullets, setBullets] = useState([])
  const [aliens, setAliens] = useState([])
  const [alienDirection, setAlienDirection] = useState(1)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [gameOver, setGameOver] = useState(false)
  const [gameWon, setGameWon] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [lastAlienMove, setLastAlienMove] = useState(0)
  const [level, setLevel] = useState(1)
  const [explosions, setExplosions] = useState([])

  useEffect(() => {
    const savedHighScore = localStorage.getItem('spaceInvadersHighScore')
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore))
    }
  }, [])

  // Initialize aliens
  useEffect(() => {
    const newAliens = []
    const startX = (CANVAS_WIDTH - (ALIEN_COLS * ALIEN_SPACING)) / 2
    const startY = 50

    for (let row = 0; row < ALIEN_ROWS; row++) {
      for (let col = 0; col < ALIEN_COLS; col++) {
        newAliens.push({
          x: startX + col * ALIEN_SPACING,
          y: startY + row * ALIEN_SPACING,
          alive: true,
          row: row,
          animFrame: 0
        })
      }
    }
    setAliens(newAliens)
  }, [level])

  const createExplosion = (x, y) => {
    setExplosions(prev => [...prev, { x, y, frame: 0 }])
  }

  // Game loop
  useEffect(() => {
    if (!gameStarted || gameOver || gameWon) return

    const gameLoop = setInterval(() => {
      const now = Date.now()

      // Update explosions
      setExplosions(prev => prev.map(exp => ({ ...exp, frame: exp.frame + 1 })).filter(exp => exp.frame < 10))

      // Move aliens
      if (now - lastAlienMove > 500 / level) {
        setAliens(prevAliens => {
          const aliveAliens = prevAliens.filter(a => a.alive)
          if (aliveAliens.length === 0) {
            setLevel(prev => prev + 1)
            setGameWon(true)
            setTimeout(() => {
              setGameWon(false)
              setLives(3)
            }, 2000)
            return prevAliens
          }

          const leftmost = Math.min(...aliveAliens.map(a => a.x))
          const rightmost = Math.max(...aliveAliens.map(a => a.x + ALIEN_WIDTH))
          let newDirection = alienDirection

          if (rightmost >= CANVAS_WIDTH - 10 || leftmost <= 10) {
            newDirection = -alienDirection
            setAlienDirection(newDirection)
          }

          return prevAliens.map(alien => {
            if (!alien.alive) return alien
            return {
              ...alien,
              x: alien.x + ALIEN_SPEED * newDirection * (1 + level * 0.1),
              y: rightmost >= CANVAS_WIDTH - 10 || leftmost <= 10 
                ? alien.y + ALIEN_DROP 
                : alien.y,
              animFrame: (alien.animFrame + 1) % 20
            }
          })
        })
        setLastAlienMove(now)
      }

      // Check if aliens reached bottom
      setAliens(prevAliens => {
        const aliveAliens = prevAliens.filter(a => a.alive)
        const bottomAlien = Math.max(...aliveAliens.map(a => a.y + ALIEN_HEIGHT))
        if (bottomAlien >= CANVAS_HEIGHT - 100) {
          setGameOver(true)
          if (score > highScore) {
            const newHighScore = score
            setHighScore(newHighScore)
            localStorage.setItem('spaceInvadersHighScore', newHighScore.toString())
          }
        }
        return prevAliens
      })

      // Move bullets
      setBullets(prevBullets => {
        return prevBullets
          .map(bullet => ({
            ...bullet,
            y: bullet.y + bullet.speed
          }))
          .filter(bullet => bullet.y > 0 && bullet.y < CANVAS_HEIGHT)
      })

      // Check bullet-alien collisions
      setBullets(prevBullets => {
        return prevBullets.filter(bullet => {
          if (bullet.type === 'player') {
            const hitAlien = aliens.find(alien => 
              alien.alive &&
              bullet.x >= alien.x &&
              bullet.x <= alien.x + ALIEN_WIDTH &&
              bullet.y >= alien.y &&
              bullet.y <= alien.y + ALIEN_HEIGHT
            )
            if (hitAlien) {
              createExplosion(hitAlien.x + ALIEN_WIDTH / 2, hitAlien.y + ALIEN_HEIGHT / 2)
              setAliens(prevAliens => 
                prevAliens.map(alien => 
                  alien === hitAlien ? { ...alien, alive: false } : alien
                )
              )
              const points = (ALIEN_ROWS - hitAlien.row) * 10 * level
              setScore(prev => prev + points)
              return false
            }
          }
          return true
        })
      })

    }, 16)

    return () => clearInterval(gameLoop)
  }, [gameStarted, gameOver, gameWon, alienDirection, lastAlienMove, aliens, level, score, highScore])

  // Drawing
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    
    // Starfield background with parallax
    const time = Date.now() * 0.0001
    ctx.fillStyle = '#000011'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Animated stars
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < 100; i++) {
      const x = (i * 37) % CANVAS_WIDTH
      const y = ((i * 73) + time * 50) % CANVAS_HEIGHT
      const size = (i % 3) + 1
      ctx.fillRect(x, y, size, size)
    }

    // Draw explosions
    explosions.forEach(exp => {
      const size = exp.frame * 3
      const alpha = 1 - (exp.frame / 10)
      ctx.fillStyle = `rgba(255, ${100 + exp.frame * 15}, 0, ${alpha})`
      ctx.beginPath()
      ctx.arc(exp.x, exp.y, size, 0, Math.PI * 2)
      ctx.fill()
    })

    // Draw aliens with animation
    aliens.forEach(alien => {
      if (!alien.alive) return

      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8']
      const color = colors[alien.row % colors.length]
      
      // Alien body with pulsing effect
      const pulse = Math.sin(alien.animFrame * 0.3) * 0.1 + 1
      ctx.fillStyle = color
      ctx.shadowBlur = 10
      ctx.shadowColor = color
      ctx.fillRect(alien.x, alien.y, ALIEN_WIDTH, ALIEN_HEIGHT)
      
      // Alien pattern
      ctx.fillStyle = '#000'
      const eyeSize = 6
      const mouthWidth = ALIEN_WIDTH - 20
      
      // Eyes
      ctx.fillRect(alien.x + 10, alien.y + 10, eyeSize, eyeSize)
      ctx.fillRect(alien.x + ALIEN_WIDTH - 16, alien.y + 10, eyeSize, eyeSize)
      
      // Mouth with animation
      const mouthY = alien.y + ALIEN_HEIGHT - 12 + Math.sin(alien.animFrame * 0.5) * 2
      ctx.fillRect(alien.x + 10, mouthY, mouthWidth, 4)
      
      ctx.shadowBlur = 0
    })

    // Draw player ship with glow
    ctx.fillStyle = '#4ecdc4'
    ctx.shadowBlur = 15
    ctx.shadowColor = '#4ecdc4'
    ctx.beginPath()
    ctx.moveTo(playerX, CANVAS_HEIGHT - 30)
    ctx.lineTo(playerX + PLAYER_WIDTH / 2, CANVAS_HEIGHT - 30 - PLAYER_HEIGHT)
    ctx.lineTo(playerX + PLAYER_WIDTH, CANVAS_HEIGHT - 30)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.shadowBlur = 0

    // Draw bullets with trails
    bullets.forEach(bullet => {
      if (bullet.type === 'player') {
        const gradient = ctx.createLinearGradient(bullet.x - 2, bullet.y - 10, bullet.x - 2, bullet.y)
        gradient.addColorStop(0, '#FFD700')
        gradient.addColorStop(1, '#FF6B6B')
        ctx.fillStyle = gradient
        ctx.shadowBlur = 8
        ctx.shadowColor = '#FFD700'
      } else {
        ctx.fillStyle = '#FF6B6B'
        ctx.shadowBlur = 5
        ctx.shadowColor = '#FF6B6B'
      }
      ctx.fillRect(bullet.x - 2, bullet.y - 10, 4, 12)
      ctx.shadowBlur = 0
    })

    // Draw lives
    ctx.fillStyle = '#4ecdc4'
    for (let i = 0; i < lives; i++) {
      ctx.beginPath()
      ctx.moveTo(20 + i * 25, CANVAS_HEIGHT - 20)
      ctx.lineTo(30 + i * 25, CANVAS_HEIGHT - 30)
      ctx.lineTo(40 + i * 25, CANVAS_HEIGHT - 20)
      ctx.closePath()
      ctx.fill()
    }
  }, [aliens, playerX, bullets, explosions, lives])

  const handleKeyDown = (e) => {
    if (gameOver || gameWon) return

    const key = e.key.toLowerCase()
    
    if (key === 'arrowleft' || key === 'a') {
      setPlayerX(prev => Math.max(0, prev - PLAYER_SPEED))
    } else if (key === 'arrowright' || key === 'd') {
      setPlayerX(prev => Math.min(CANVAS_WIDTH - PLAYER_WIDTH, prev + PLAYER_SPEED))
    } else if (key === ' ' || key === 'arrowup' || key === 'w') {
      if (bullets.filter(b => b.type === 'player').length < 5) {
        setBullets(prev => [...prev, {
          x: playerX + PLAYER_WIDTH / 2,
          y: CANVAS_HEIGHT - 30 - PLAYER_HEIGHT,
          speed: -BULLET_SPEED,
          type: 'player'
        }])
      }
    }
  }

  const startGame = () => {
    setGameStarted(true)
    setGameOver(false)
    setGameWon(false)
    setLevel(1)
    setScore(0)
    setLives(3)
  }

  const resetGame = () => {
    setAliens(prevAliens => prevAliens.map(alien => ({ ...alien, alive: true })))
    setBullets([])
    setExplosions([])
    setScore(0)
    setLives(3)
    setGameOver(false)
    setGameWon(false)
    setGameStarted(false)
    setLevel(1)
    setPlayerX(CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2)
    setAlienDirection(1)
  }

  // Mobile controls
  const moveLeft = () => {
    if (gameOver || gameWon) return
    setPlayerX(prev => Math.max(0, prev - PLAYER_SPEED * 2))
  }

  const moveRight = () => {
    if (gameOver || gameWon) return
    setPlayerX(prev => Math.min(CANVAS_WIDTH - PLAYER_WIDTH, prev + PLAYER_SPEED * 2))
  }

  const shoot = () => {
    if (gameOver || gameWon) return
    if (bullets.filter(b => b.type === 'player').length < 5) {
      setBullets(prev => [...prev, {
        x: playerX + PLAYER_WIDTH / 2,
        y: CANVAS_HEIGHT - 30 - PLAYER_HEIGHT,
        speed: -BULLET_SPEED,
        type: 'player'
      }])
    }
  }

  // Touch move handling
  const handleTouchMove = (e) => {
    if (!gameStarted || gameOver || gameWon) return
    const touch = e.touches[0]
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const touchX = (touch.clientX - rect.left) / rect.width * CANVAS_WIDTH
    setPlayerX(Math.max(0, Math.min(CANVAS_WIDTH - PLAYER_WIDTH, touchX - PLAYER_WIDTH / 2)))
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [playerX, bullets, gameOver, gameWon])

  const allAliensDestroyed = aliens.length > 0 && aliens.every(alien => !alien.alive)

  return (
    <div className="container">
      <h1>🚀 Space Invaders</h1>
      <p className="subtitle">Destroy all the aliens! Each level gets faster and more challenging!</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className="stat">
          <div className="stat-label">Score</div>
          <div className="stat-value">{score.toLocaleString()}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Level</div>
          <div className="stat-value">{level}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Lives</div>
          <div className="stat-value">{lives}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Aliens Left</div>
          <div className="stat-value">{aliens.filter(a => a.alive).length}</div>
        </div>
        {highScore > 0 && (
          <div className="stat">
            <div className="stat-label">High Score</div>
            <div className="stat-value" style={{ color: '#FFD700' }}>{highScore.toLocaleString()}</div>
          </div>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="game-canvas"
        style={{ maxWidth: '800px', height: '600px', touchAction: 'none' }}
        onTouchMove={handleTouchMove}
        onTouchStart={(e) => { if (gameStarted) shoot(); }}
      />
      {!gameStarted && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button onClick={startGame} style={{
            background: '#4ecdc4',
            color: 'white',
            border: 'none',
            padding: '15px 40px',
            borderRadius: '10px',
            fontSize: '1.2em',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
          }}>
            Start Game
          </button>
          {highScore > 0 && (
            <p style={{ color: '#FFD700', marginTop: '15px', fontSize: '1.1em' }}>
              High Score: {highScore.toLocaleString()}
            </p>
          )}
        </div>
      )}
      {gameWon && !gameOver && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ color: '#4ecdc4', fontSize: '2em', marginBottom: '10px', fontWeight: 'bold' }}>Level Complete! 🎉</p>
          <p style={{ color: '#fff', marginBottom: '10px' }}>Starting Level {level + 1}...</p>
        </div>
      )}
      {gameOver && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ color: '#ff6b6b', fontSize: '2em', marginBottom: '10px', fontWeight: 'bold' }}>Game Over! 👾</p>
          <p style={{ color: '#fff', marginBottom: '5px', fontSize: '1.2em' }}>Final Score: {score.toLocaleString()}</p>
          <p style={{ color: '#ccc', marginBottom: '5px' }}>Level Reached: {level}</p>
          {score >= highScore && score > 0 && (
            <p style={{ color: '#FFD700', marginBottom: '15px', fontSize: '1.3em', fontWeight: 'bold' }}>
              🏆 NEW HIGH SCORE! 🏆
            </p>
          )}
          <button onClick={resetGame} style={{
            background: '#4ecdc4',
            color: 'white',
            border: 'none',
            padding: '12px 30px',
            borderRadius: '10px',
            fontSize: '1.1em',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
          }}>
            Play Again
          </button>
        </div>
      )}
      {allAliensDestroyed && gameStarted && !gameWon && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ color: '#4ecdc4', fontSize: '2em', marginBottom: '10px', fontWeight: 'bold' }}>You Win! 🎉</p>
          <p style={{ color: '#fff', marginBottom: '10px' }}>Final Score: {score.toLocaleString()}</p>
          <button onClick={resetGame} style={{
            background: '#4ecdc4',
            color: 'white',
            border: 'none',
            padding: '12px 30px',
            borderRadius: '10px',
            fontSize: '1.1em',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
          }}>
            Play Again
          </button>
        </div>
      )}
      {/* Mobile Controls */}
      <div className="mobile-game-controls" style={{
        display: 'none',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '20px',
        padding: '0 20px'
      }}>
        <button 
          className="mobile-btn"
          onTouchStart={moveLeft}
          onClick={moveLeft}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            border: '3px solid #4ecdc4',
            background: 'rgba(78, 205, 196, 0.2)',
            color: '#4ecdc4',
            fontSize: '2em',
            cursor: 'pointer'
          }}
        >◀</button>
        
        <button 
          className="mobile-btn shoot-btn"
          onTouchStart={shoot}
          onClick={shoot}
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            border: '3px solid #ff6b6b',
            background: 'rgba(255, 107, 107, 0.3)',
            color: '#ff6b6b',
            fontSize: '1.2em',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >FIRE</button>
        
        <button 
          className="mobile-btn"
          onTouchStart={moveRight}
          onClick={moveRight}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            border: '3px solid #4ecdc4',
            background: 'rgba(78, 205, 196, 0.2)',
            color: '#4ecdc4',
            fontSize: '2em',
            cursor: 'pointer'
          }}
        >▶</button>
      </div>
      
      <style>{`
        @media (max-width: 900px), (hover: none) and (pointer: coarse) {
          .mobile-game-controls {
            display: flex !important;
          }
        }
        .mobile-btn:active {
          transform: scale(0.95);
          opacity: 0.8;
        }
      `}</style>

      <div className="controls">
        <p><strong>Controls:</strong> Arrow Keys/WASD to move | Space/W to shoot</p>
        <p>📱 On mobile: Touch/drag to move, tap to shoot</p>
        <p>Higher rows = More points! Score multiplies with each level!</p>
      </div>
    </div>
  )
}
