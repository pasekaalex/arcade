import { useEffect, useRef, useState } from 'react'
import './Breakout.css'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const PADDLE_WIDTH = 100
const PADDLE_HEIGHT = 15
const BALL_RADIUS = 10
const BRICK_ROWS = 5
const BRICK_COLS = 10
const BRICK_WIDTH = 70
const BRICK_HEIGHT = 25
const BRICK_PADDING = 5
const BRICK_OFFSET_TOP = 50

export default function Breakout() {
  const canvasRef = useRef(null)
  const [paddleX, setPaddleX] = useState(CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2)
  const [ball, setBall] = useState({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 100,
    dx: 4,
    dy: -4
  })
  const [bricks, setBricks] = useState([])
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)

  // Initialize bricks
  useEffect(() => {
    const newBricks = []
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8']
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        newBricks.push({
          x: col * (BRICK_WIDTH + BRICK_PADDING) + BRICK_PADDING,
          y: row * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP,
          color: colors[row % colors.length],
          destroyed: false
        })
      }
    }
    setBricks(newBricks)
  }, [])

  useEffect(() => {
    if (!gameStarted || gameOver) return

    const gameLoop = setInterval(() => {
      setBall(prevBall => {
        let newBall = {
          x: prevBall.x + prevBall.dx,
          y: prevBall.y + prevBall.dy,
          dx: prevBall.dx,
          dy: prevBall.dy
        }

        // Wall collisions
        if (newBall.x <= BALL_RADIUS || newBall.x >= CANVAS_WIDTH - BALL_RADIUS) {
          newBall.dx = -newBall.dx
        }
        if (newBall.y <= BALL_RADIUS) {
          newBall.dy = -newBall.dy
        }

        // Paddle collision
        if (
          newBall.y >= CANVAS_HEIGHT - PADDLE_HEIGHT - BALL_RADIUS - 10 &&
          newBall.y <= CANVAS_HEIGHT - PADDLE_HEIGHT - BALL_RADIUS &&
          newBall.x >= paddleX &&
          newBall.x <= paddleX + PADDLE_WIDTH
        ) {
          const hitPos = (newBall.x - paddleX) / PADDLE_WIDTH
          newBall.dx = (hitPos - 0.5) * 8
          newBall.dy = -Math.abs(newBall.dy)
        }

        // Bottom collision (game over)
        if (newBall.y >= CANVAS_HEIGHT) {
          setGameOver(true)
        }

        // Brick collisions
        setBricks(prevBricks => {
          return prevBricks.map(brick => {
            if (brick.destroyed) return brick

            if (
              newBall.x + BALL_RADIUS >= brick.x &&
              newBall.x - BALL_RADIUS <= brick.x + BRICK_WIDTH &&
              newBall.y + BALL_RADIUS >= brick.y &&
              newBall.y - BALL_RADIUS <= brick.y + BRICK_HEIGHT
            ) {
              brick.destroyed = true
              setScore(prev => prev + 10)
              newBall.dy = -newBall.dy
            }
            return brick
          })
        })

        return newBall
      })
    }, 16)

    return () => clearInterval(gameLoop)
  }, [gameStarted, gameOver, paddleX])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    
    // Clear canvas
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw bricks
    bricks.forEach(brick => {
      if (!brick.destroyed) {
        ctx.fillStyle = brick.color
        ctx.fillRect(brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.strokeRect(brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT)
      }
    })

    // Draw paddle
    ctx.fillStyle = '#4ecdc4'
    ctx.fillRect(paddleX, CANVAS_HEIGHT - PADDLE_HEIGHT - 10, PADDLE_WIDTH, PADDLE_HEIGHT)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.strokeRect(paddleX, CANVAS_HEIGHT - PADDLE_HEIGHT - 10, PADDLE_WIDTH, PADDLE_HEIGHT)

    // Draw ball
    ctx.fillStyle = '#FFD700'
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()
  }, [bricks, paddleX, ball])

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    setPaddleX(Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, x - PADDLE_WIDTH / 2)))
  }

  const startGame = () => {
    setGameStarted(true)
    setGameOver(false)
    setBall({
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 100,
      dx: 4,
      dy: -4
    })
  }

  const resetGame = () => {
    setBricks(prevBricks => prevBricks.map(brick => ({ ...brick, destroyed: false })))
    setScore(0)
    setGameOver(false)
    setGameStarted(false)
    setBall({
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 100,
      dx: 4,
      dy: -4
    })
  }

  const allBricksDestroyed = bricks.length > 0 && bricks.every(brick => brick.destroyed)

  return (
    <div className="container">
      <h1>🎯 Breakout</h1>
      <p className="subtitle">Move your mouse to control the paddle. Break all the blocks!</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginBottom: '20px' }}>
        <div className="stat">
          <div className="stat-label">Score</div>
          <div className="stat-value">{score}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Bricks Left</div>
          <div className="stat-value">{bricks.filter(b => !b.destroyed).length}</div>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="game-canvas"
        onMouseMove={handleMouseMove}
        style={{ maxWidth: '800px', height: '600px' }}
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
            fontWeight: 'bold'
          }}>
            Start Game
          </button>
        </div>
      )}
      {gameOver && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ color: '#ff6b6b', fontSize: '1.5em', marginBottom: '10px' }}>Game Over!</p>
          <button onClick={resetGame} style={{
            background: '#4ecdc4',
            color: 'white',
            border: 'none',
            padding: '10px 30px',
            borderRadius: '10px',
            fontSize: '1.1em',
            cursor: 'pointer'
          }}>
            Play Again
          </button>
        </div>
      )}
      {allBricksDestroyed && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ color: '#4ecdc4', fontSize: '1.5em', marginBottom: '10px' }}>You Win! 🎉</p>
          <button onClick={resetGame} style={{
            background: '#4ecdc4',
            color: 'white',
            border: 'none',
            padding: '10px 30px',
            borderRadius: '10px',
            fontSize: '1.1em',
            cursor: 'pointer'
          }}>
            Play Again
          </button>
        </div>
      )}
      <div className="controls">
        <p><strong>Controls:</strong> Move mouse to control paddle</p>
      </div>
    </div>
  )
}


