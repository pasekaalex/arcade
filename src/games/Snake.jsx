import { useEffect, useRef, useState, useCallback } from 'react'
import './Snake.css'

const GRID_SIZE = 25
const CELL_SIZE = 20
const INITIAL_SNAKE = [{ x: 12, y: 12 }]
const INITIAL_DIRECTION = { x: 1, y: 0 }
const INITIAL_SPEED = 120

export default function Snake() {
  const canvasRef = useRef(null)
  const [snake, setSnake] = useState(INITIAL_SNAKE)
  const [direction, setDirection] = useState(INITIAL_DIRECTION)
  const [food, setFood] = useState({ x: 18, y: 18 })
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [gameSpeed, setGameSpeed] = useState(INITIAL_SPEED)
  const [specialFood, setSpecialFood] = useState(null)
  const [specialFoodTimer, setSpecialFoodTimer] = useState(0)
  const [particles, setParticles] = useState([])
  const [screenFlash, setScreenFlash] = useState(null)
  const [combo, setCombo] = useState(0)
  const animationTimeRef = useRef(0)

  useEffect(() => {
    const savedHighScore = localStorage.getItem('snakeHighScore')
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore))
    }
  }, [])

  const generateFood = useCallback(() => {
    let newFood
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      }
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y))
    return newFood
  }, [snake])

  const generateSpecialFood = useCallback(() => {
    let newFood
    const types = ['speed', 'bonus', 'shrink', 'rainbow']
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
        type: types[Math.floor(Math.random() * types.length)]
      }
    } while (
      snake.some(segment => segment.x === newFood.x && segment.y === newFood.y) ||
      (food.x === newFood.x && food.y === newFood.y)
    )
    return newFood
  }, [snake, food])

  const spawnParticles = (x, y, color, count = 8) => {
    const newParticles = []
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
      const speed = 2 + Math.random() * 3
      newParticles.push({
        x: x * CELL_SIZE + CELL_SIZE / 2,
        y: y * CELL_SIZE + CELL_SIZE / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
        size: 3 + Math.random() * 4
      })
    }
    setParticles(prev => [...prev, ...newParticles])
  }

  const checkCollision = (head, body) => {
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      return true
    }
    for (let segment of body) {
      if (head.x === segment.x && head.y === segment.y) {
        return true
      }
    }
    return false
  }

  useEffect(() => {
    if (!gameStarted || gameOver) return

    const gameLoop = setInterval(() => {
      setSnake(prevSnake => {
        const head = { ...prevSnake[0] }
        head.x += direction.x
        head.y += direction.y

        if (checkCollision(head, prevSnake)) {
          setGameOver(true)
          setScreenFlash('#ff0000')
          setTimeout(() => setScreenFlash(null), 200)
          if (score > highScore) {
            const newHighScore = score
            setHighScore(newHighScore)
            localStorage.setItem('snakeHighScore', newHighScore.toString())
          }
          return prevSnake
        }

        const newSnake = [head, ...prevSnake]

        // Check regular food
        if (head.x === food.x && head.y === food.y) {
          spawnParticles(food.x, food.y, '#ff6b6b', 12)
          setScreenFlash('#ff6b6b')
          setTimeout(() => setScreenFlash(null), 100)
          setCombo(prev => prev + 1)
          
          setScore(prev => {
            const comboMultiplier = Math.min(combo + 1, 5)
            const newScore = prev + 10 * comboMultiplier
            if (newScore % 50 === 0 && gameSpeed > 60) {
              setGameSpeed(prev => Math.max(60, prev - 5))
            }
            return newScore
          })
          setFood(generateFood())
          
          if (Math.random() > 0.6) {
            setSpecialFood(generateSpecialFood())
            setSpecialFoodTimer(400)
          }
        } else {
          setCombo(0)
          
          if (specialFood && head.x === specialFood.x && head.y === specialFood.y) {
            spawnParticles(specialFood.x, specialFood.y, 
              specialFood.type === 'speed' ? '#FFD700' : 
              specialFood.type === 'rainbow' ? '#ff00ff' :
              specialFood.type === 'shrink' ? '#00ff00' : '#FF6B6B', 
              16
            )
            setScreenFlash(specialFood.type === 'speed' ? '#FFD700' : '#ff00ff')
            setTimeout(() => setScreenFlash(null), 150)
            
            if (specialFood.type === 'speed') {
              setGameSpeed(prev => Math.max(60, prev - 10))
              setScore(prev => prev + 25)
            } else if (specialFood.type === 'bonus') {
              setScore(prev => prev + 50)
            } else if (specialFood.type === 'shrink' && newSnake.length > 3) {
              newSnake.pop()
              newSnake.pop()
              setScore(prev => prev + 30)
            } else if (specialFood.type === 'rainbow') {
              setScore(prev => prev + 100)
            }
            setSpecialFood(null)
            setSpecialFoodTimer(0)
          } else {
            newSnake.pop()
          }
        }

        return newSnake
      })
    }, gameSpeed)

    return () => clearInterval(gameLoop)
  }, [direction, food, gameStarted, gameOver, gameSpeed, specialFood, score, highScore, combo, generateFood, generateSpecialFood])

  // Special food timer
  useEffect(() => {
    if (!gameStarted || gameOver || !specialFood) return

    const timer = setInterval(() => {
      setSpecialFoodTimer(prev => {
        if (prev <= 1) {
          setSpecialFood(null)
          return 0
        }
        return prev - 1
      })
    }, 100)

    return () => clearInterval(timer)
  }, [gameStarted, gameOver, specialFood])

  // Update particles
  useEffect(() => {
    if (particles.length === 0) return

    const updateParticles = setInterval(() => {
      setParticles(prev => prev
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.1, // gravity
          life: p.life - 0.03,
          size: p.size * 0.95
        }))
        .filter(p => p.life > 0)
      )
    }, 16)

    return () => clearInterval(updateParticles)
  }, [particles.length])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    animationTimeRef.current += 0.02
    const time = animationTimeRef.current
    
    // Animated gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    const hue1 = (time * 10) % 360
    bgGradient.addColorStop(0, `hsl(${240 + Math.sin(time) * 20}, 30%, 8%)`)
    bgGradient.addColorStop(0.5, `hsl(${260 + Math.cos(time) * 15}, 35%, 12%)`)
    bgGradient.addColorStop(1, `hsl(${220 + Math.sin(time * 0.5) * 25}, 40%, 10%)`)
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Animated grid with pulse
    const gridPulse = 0.3 + Math.sin(time * 2) * 0.1
    ctx.strokeStyle = `rgba(100, 100, 150, ${gridPulse})`
    ctx.lineWidth = 1
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath()
      ctx.moveTo(i * CELL_SIZE, 0)
      ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i * CELL_SIZE)
      ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE)
      ctx.stroke()
    }

    // Draw particles
    particles.forEach(p => {
      ctx.save()
      ctx.globalAlpha = p.life
      ctx.fillStyle = p.color
      ctx.shadowBlur = 10
      ctx.shadowColor = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    })

    // Draw special food with fancy effects
    if (specialFood) {
      const pulse = Math.sin(time * 8) * 0.4 + 0.6
      const size = (CELL_SIZE / 2 - 2) * (0.8 + pulse * 0.4)
      
      // Outer glow rings
      for (let ring = 3; ring > 0; ring--) {
        ctx.beginPath()
        ctx.arc(
          specialFood.x * CELL_SIZE + CELL_SIZE / 2,
          specialFood.y * CELL_SIZE + CELL_SIZE / 2,
          size + ring * 6,
          0, Math.PI * 2
        )
        const colors = {
          speed: `rgba(255, 215, 0, ${0.1 * pulse / ring})`,
          bonus: `rgba(255, 107, 107, ${0.1 * pulse / ring})`,
          shrink: `rgba(0, 255, 100, ${0.1 * pulse / ring})`,
          rainbow: `hsla(${(time * 100 + ring * 60) % 360}, 100%, 50%, ${0.15 * pulse / ring})`
        }
        ctx.fillStyle = colors[specialFood.type]
        ctx.fill()
      }
      
      // Main special food
      const foodColors = {
        speed: '#FFD700',
        bonus: '#FF6B6B',
        shrink: '#00ff88',
        rainbow: `hsl(${(time * 100) % 360}, 100%, 60%)`
      }
      ctx.fillStyle = foodColors[specialFood.type]
      ctx.shadowBlur = 25
      ctx.shadowColor = foodColors[specialFood.type]
      
      // Star shape for special food
      ctx.beginPath()
      const cx = specialFood.x * CELL_SIZE + CELL_SIZE / 2
      const cy = specialFood.y * CELL_SIZE + CELL_SIZE / 2
      const spikes = specialFood.type === 'rainbow' ? 6 : 5
      const outerRadius = size
      const innerRadius = size * 0.5
      
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius
        const angle = (i * Math.PI) / spikes - Math.PI / 2 + time * 2
        const x = cx + Math.cos(angle) * radius
        const y = cy + Math.sin(angle) * radius
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fill()
      ctx.shadowBlur = 0
    }

    // Draw regular food with animated glow
    const foodPulse = 0.8 + Math.sin(time * 4) * 0.2
    ctx.fillStyle = '#ff6b6b'
    ctx.shadowBlur = 15 * foodPulse
    ctx.shadowColor = '#ff6b6b'
    ctx.beginPath()
    ctx.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      (CELL_SIZE / 2 - 2) * foodPulse,
      0,
      Math.PI * 2
    )
    ctx.fill()
    
    // Apple stem
    ctx.fillStyle = '#4a2'
    ctx.shadowBlur = 0
    ctx.fillRect(
      food.x * CELL_SIZE + CELL_SIZE / 2 - 1,
      food.y * CELL_SIZE + 2,
      2, 4
    )
    // Apple leaf
    ctx.beginPath()
    ctx.ellipse(
      food.x * CELL_SIZE + CELL_SIZE / 2 + 4,
      food.y * CELL_SIZE + 4,
      4, 2, Math.PI / 4, 0, Math.PI * 2
    )
    ctx.fill()

    // Draw snake with smooth segments
    snake.forEach((segment, index) => {
      const isHead = index === 0
      const progress = index / Math.max(snake.length - 1, 1)
      
      // Rainbow mode when snake is long
      const isRainbow = snake.length > 15
      let segmentColor
      
      if (isRainbow) {
        const hue = (time * 50 + index * 20) % 360
        segmentColor = `hsl(${hue}, 80%, 55%)`
      } else {
        segmentColor = isHead ? '#4ecdc4' : `rgba(69, 183, 209, ${1 - progress * 0.6})`
      }

      const x = segment.x * CELL_SIZE
      const y = segment.y * CELL_SIZE
      const size = CELL_SIZE - 4
      const radius = isHead ? 8 : 6

      // Glow effect
      ctx.shadowBlur = isHead ? 20 : 8
      ctx.shadowColor = isRainbow ? segmentColor : '#4ecdc4'

      // Draw rounded rectangle
      ctx.fillStyle = segmentColor
      ctx.beginPath()
      ctx.roundRect(x + 2, y + 2, size, size, radius)
      ctx.fill()

      // Segment shine
      if (!isHead) {
        const shineGradient = ctx.createLinearGradient(x, y, x + size, y + size)
        shineGradient.addColorStop(0, 'rgba(255,255,255,0.2)')
        shineGradient.addColorStop(0.5, 'rgba(255,255,255,0)')
        ctx.fillStyle = shineGradient
        ctx.beginPath()
        ctx.roundRect(x + 2, y + 2, size, size, radius)
        ctx.fill()
      }

      ctx.shadowBlur = 0

      // Fancy head details
      if (isHead) {
        // Eyes with pupils
        ctx.fillStyle = '#fff'
        const eyeSize = 5
        const pupilSize = 2
        let eye1X, eye1Y, eye2X, eye2Y
        
        if (direction.x === 1) {
          eye1X = x + size - 4; eye1Y = y + 7
          eye2X = x + size - 4; eye2Y = y + size - 5
        } else if (direction.x === -1) {
          eye1X = x + 6; eye1Y = y + 7
          eye2X = x + 6; eye2Y = y + size - 5
        } else if (direction.y === 1) {
          eye1X = x + 7; eye1Y = y + size - 4
          eye2X = x + size - 5; eye2Y = y + size - 4
        } else {
          eye1X = x + 7; eye1Y = y + 6
          eye2X = x + size - 5; eye2Y = y + 6
        }

        // White of eyes
        ctx.beginPath()
        ctx.arc(eye1X, eye1Y, eyeSize, 0, Math.PI * 2)
        ctx.arc(eye2X, eye2Y, eyeSize, 0, Math.PI * 2)
        ctx.fill()

        // Pupils (follow direction)
        ctx.fillStyle = '#111'
        ctx.beginPath()
        ctx.arc(eye1X + direction.x * 1.5, eye1Y + direction.y * 1.5, pupilSize, 0, Math.PI * 2)
        ctx.arc(eye2X + direction.x * 1.5, eye2Y + direction.y * 1.5, pupilSize, 0, Math.PI * 2)
        ctx.fill()

        // Eye shine
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(eye1X - 1, eye1Y - 1, 1, 0, Math.PI * 2)
        ctx.arc(eye2X - 1, eye2Y - 1, 1, 0, Math.PI * 2)
        ctx.fill()

        // Tongue (when moving)
        if (gameStarted && !gameOver) {
          const tongueWag = Math.sin(time * 15) * 2
          ctx.strokeStyle = '#ff4466'
          ctx.lineWidth = 2
          ctx.lineCap = 'round'
          
          const tongueStartX = x + CELL_SIZE / 2 + direction.x * (CELL_SIZE / 2)
          const tongueStartY = y + CELL_SIZE / 2 + direction.y * (CELL_SIZE / 2)
          const tongueLength = 8
          
          ctx.beginPath()
          ctx.moveTo(tongueStartX, tongueStartY)
          ctx.lineTo(
            tongueStartX + direction.x * tongueLength + (direction.y ? tongueWag : 0),
            tongueStartY + direction.y * tongueLength + (direction.x ? tongueWag : 0)
          )
          ctx.stroke()
          
          // Forked tongue
          ctx.beginPath()
          ctx.moveTo(
            tongueStartX + direction.x * tongueLength,
            tongueStartY + direction.y * tongueLength
          )
          ctx.lineTo(
            tongueStartX + direction.x * (tongueLength + 4) + (direction.y ? 3 : (direction.x ? 0 : 3)),
            tongueStartY + direction.y * (tongueLength + 4) + (direction.x ? 3 : 0)
          )
          ctx.moveTo(
            tongueStartX + direction.x * tongueLength,
            tongueStartY + direction.y * tongueLength
          )
          ctx.lineTo(
            tongueStartX + direction.x * (tongueLength + 4) + (direction.y ? -3 : (direction.x ? 0 : -3)),
            tongueStartY + direction.y * (tongueLength + 4) + (direction.x ? -3 : 0)
          )
          ctx.stroke()
        }
      }
    })

    // Screen flash overlay
    if (screenFlash) {
      ctx.fillStyle = screenFlash
      ctx.globalAlpha = 0.3
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.globalAlpha = 1
    }

  }, [snake, food, specialFood, direction, particles, screenFlash, gameStarted, gameOver])

  const handleKeyPress = (e) => {
    if (!gameStarted) {
      setGameStarted(true)
      return
    }

    if (gameOver) return

    const key = e.key.toLowerCase()
    if ((key === 'arrowup' || key === 'w') && direction.y === 0) {
      setDirection({ x: 0, y: -1 })
    } else if ((key === 'arrowdown' || key === 's') && direction.y === 0) {
      setDirection({ x: 0, y: 1 })
    } else if ((key === 'arrowleft' || key === 'a') && direction.x === 0) {
      setDirection({ x: -1, y: 0 })
    } else if ((key === 'arrowright' || key === 'd') && direction.x === 0) {
      setDirection({ x: 1, y: 0 })
    }
  }

  const resetGame = () => {
    setSnake(INITIAL_SNAKE)
    setDirection(INITIAL_DIRECTION)
    setFood(generateFood())
    setScore(0)
    setGameOver(false)
    setGameStarted(false)
    setGameSpeed(INITIAL_SPEED)
    setSpecialFood(null)
    setSpecialFoodTimer(0)
    setParticles([])
    setCombo(0)
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [direction, gameStarted, gameOver])

  // Touch/swipe controls for mobile
  const touchStartRef = useRef({ x: 0, y: 0 })
  
  const handleTouchStart = (e) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    
    if (!gameStarted) {
      setGameStarted(true)
    }
  }

  const handleTouchEnd = (e) => {
    if (gameOver) return
    
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y
    const minSwipe = 30
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (deltaX > minSwipe && direction.x === 0) {
        setDirection({ x: 1, y: 0 })
      } else if (deltaX < -minSwipe && direction.x === 0) {
        setDirection({ x: -1, y: 0 })
      }
    } else {
      // Vertical swipe
      if (deltaY > minSwipe && direction.y === 0) {
        setDirection({ x: 0, y: 1 })
      } else if (deltaY < -minSwipe && direction.y === 0) {
        setDirection({ x: 0, y: -1 })
      }
    }
  }

  const handleDirectionButton = (dir) => {
    if (!gameStarted) {
      setGameStarted(true)
      return
    }
    if (gameOver) return
    
    if (dir === 'up' && direction.y === 0) setDirection({ x: 0, y: -1 })
    else if (dir === 'down' && direction.y === 0) setDirection({ x: 0, y: 1 })
    else if (dir === 'left' && direction.x === 0) setDirection({ x: -1, y: 0 })
    else if (dir === 'right' && direction.x === 0) setDirection({ x: 1, y: 0 })
  }

  // Animation loop for smooth rendering
  useEffect(() => {
    let animationId
    const animate = () => {
      animationId = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(animationId)
  }, [])

  return (
    <div className="snake-container">
      <h1 className="snake-title">
        <span className="snake-emoji">🐍</span> 
        SNAKE 
        <span className="snake-emoji">🐍</span>
      </h1>
      <p className="snake-subtitle">Slither your way to victory!</p>
      
      <div className="snake-stats">
        <div className="snake-stat">
          <div className="snake-stat-label">Score</div>
          <div className="snake-stat-value">{score}</div>
        </div>
        <div className="snake-stat">
          <div className="snake-stat-label">Length</div>
          <div className="snake-stat-value">{snake.length}</div>
        </div>
        <div className="snake-stat">
          <div className="snake-stat-label">Speed</div>
          <div className="snake-stat-value">Lv.{Math.round((INITIAL_SPEED - gameSpeed) / 5) + 1}</div>
        </div>
        {combo > 1 && (
          <div className="snake-stat combo">
            <div className="snake-stat-label">Combo</div>
            <div className="snake-stat-value">x{Math.min(combo, 5)}</div>
          </div>
        )}
        {highScore > 0 && (
          <div className="snake-stat high-score">
            <div className="snake-stat-label">Best</div>
            <div className="snake-stat-value">{highScore}</div>
          </div>
        )}
      </div>

      {specialFood && (
        <div className={`special-food-alert ${specialFood.type}`}>
          {specialFood.type === 'speed' && '⚡ Speed Boost!'}
          {specialFood.type === 'bonus' && '⭐ Bonus Points!'}
          {specialFood.type === 'shrink' && '✂️ Shrink Power!'}
          {specialFood.type === 'rainbow' && '🌈 Rainbow Mode!'}
          <span className="timer">({Math.ceil(specialFoodTimer / 60)}s)</span>
        </div>
      )}

      <div className="snake-canvas-wrapper"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          width={GRID_SIZE * CELL_SIZE}
          height={GRID_SIZE * CELL_SIZE}
          className="snake-canvas"
        />
        
        {!gameStarted && !gameOver && (
          <div className="snake-overlay">
            <div className="start-prompt">
              <div className="press-start">Press any key to start!</div>
              <div className="controls-hint">
                <span>↑</span>
                <div><span>←</span><span>↓</span><span>→</span></div>
                <div className="or">or WASD</div>
              </div>
            </div>
          </div>
        )}

        {gameOver && (
          <div className="snake-overlay game-over-overlay">
            <div className="game-over-content">
              <h2 className="game-over-title">Game Over!</h2>
              <div className="final-stats">
                <div className="final-score">
                  <span className="label">Score</span>
                  <span className="value">{score}</span>
                </div>
                <div className="final-length">
                  <span className="label">Length</span>
                  <span className="value">{snake.length}</span>
                </div>
              </div>
              {score >= highScore && score > 0 && (
                <div className="new-high-score">🏆 NEW HIGH SCORE! 🏆</div>
              )}
              <button onClick={resetGame} className="play-again-btn">
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Controls */}
      <div className="mobile-controls">
        <div className="dpad">
          <button className="dpad-btn up" onTouchStart={() => handleDirectionButton('up')} onClick={() => handleDirectionButton('up')}>▲</button>
          <div className="dpad-row">
            <button className="dpad-btn left" onTouchStart={() => handleDirectionButton('left')} onClick={() => handleDirectionButton('left')}>◀</button>
            <div className="dpad-center"></div>
            <button className="dpad-btn right" onTouchStart={() => handleDirectionButton('right')} onClick={() => handleDirectionButton('right')}>▶</button>
          </div>
          <button className="dpad-btn down" onTouchStart={() => handleDirectionButton('down')} onClick={() => handleDirectionButton('down')}>▼</button>
        </div>
      </div>

      <div className="snake-controls-info">
        <div className="food-legend">
          <span className="food-item apple">🍎 +10pts</span>
          <span className="food-item speed">⚡ Speed +25pts</span>
          <span className="food-item bonus">⭐ Bonus +50pts</span>
          <span className="food-item shrink">✂️ Shrink +30pts</span>
          <span className="food-item rainbow">🌈 Rainbow +100pts</span>
        </div>
        <p className="mobile-hint">📱 Swipe or use D-pad on mobile</p>
      </div>
    </div>
  )
}
