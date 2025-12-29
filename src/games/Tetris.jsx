import { useState, useEffect, useCallback, useRef } from 'react'
import './Tetris.css'

// Tetromino shapes
const TETROMINOES = {
  I: { shape: [[1, 1, 1, 1]], color: '#00f5ff' },
  O: { shape: [[1, 1], [1, 1]], color: '#ffd700' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#bf00ff' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#00ff41' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#ff073a' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#0066ff' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#ff6b00' }
}

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20

const createEmptyBoard = () => 
  Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null))

const randomTetromino = () => {
  const pieces = Object.keys(TETROMINOES)
  const randPiece = pieces[Math.floor(Math.random() * pieces.length)]
  return { type: randPiece, ...TETROMINOES[randPiece] }
}

export default function Tetris() {
  const [board, setBoard] = useState(createEmptyBoard())
  const [currentPiece, setCurrentPiece] = useState(null)
  const [piecePos, setPiecePos] = useState({ x: 0, y: 0 })
  const [nextPiece, setNextPiece] = useState(null)
  const [holdPiece, setHoldPiece] = useState(null)
  const [canHold, setCanHold] = useState(true)
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [level, setLevel] = useState(1)
  const [gameOver, setGameOver] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [clearingLines, setClearingLines] = useState([])
  const [combo, setCombo] = useState(0)
  const [lastAction, setLastAction] = useState('')
  
  const gameLoopRef = useRef(null)
  const touchStartRef = useRef({ x: 0, y: 0 })
  const lastMoveRef = useRef(0)
  const containerRef = useRef(null)

  // Rotate matrix 90 degrees clockwise
  const rotate = useCallback((matrix) => {
    const rows = matrix.length
    const cols = matrix[0].length
    const result = Array.from({ length: cols }, () => Array(rows).fill(0))
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        result[c][rows - 1 - r] = matrix[r][c]
      }
    }
    return result
  }, [])

  // Check collision
  const checkCollision = useCallback((piece, pos, boardToCheck) => {
    if (!piece) return false
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = pos.x + x
          const newY = pos.y + y
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return true
          }
          if (newY >= 0 && boardToCheck[newY][newX]) {
            return true
          }
        }
      }
    }
    return false
  }, [])

  // Get ghost piece position (where piece will land)
  const getGhostPosition = useCallback(() => {
    if (!currentPiece) return piecePos
    let ghostY = piecePos.y
    while (!checkCollision(currentPiece, { x: piecePos.x, y: ghostY + 1 }, board)) {
      ghostY++
    }
    return { x: piecePos.x, y: ghostY }
  }, [currentPiece, piecePos, board, checkCollision])

  // Place piece on board
  const placePiece = useCallback(() => {
    if (!currentPiece) return

    const newBoard = board.map(row => [...row])
    
    for (let y = 0; y < currentPiece.shape.length; y++) {
      for (let x = 0; x < currentPiece.shape[y].length; x++) {
        if (currentPiece.shape[y][x]) {
          const boardY = piecePos.y + y
          const boardX = piecePos.x + x
          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            newBoard[boardY][boardX] = currentPiece.color
          }
        }
      }
    }

    // Check for completed lines
    const completedLines = []
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (newBoard[y].every(cell => cell !== null)) {
        completedLines.push(y)
      }
    }

    if (completedLines.length > 0) {
      setClearingLines(completedLines)
      setCombo(prev => prev + 1)
      
      // Score based on lines and combo
      const lineScores = [0, 100, 300, 500, 800]
      const baseScore = lineScores[completedLines.length] * level
      const comboBonus = combo * 50 * level
      setScore(prev => prev + baseScore + comboBonus)
      
      // Show action text
      const actionTexts = ['', 'SINGLE!', 'DOUBLE!', 'TRIPLE!', 'TETRIS!']
      setLastAction(actionTexts[completedLines.length])
      setTimeout(() => setLastAction(''), 1000)

      // Delay line clearing for animation
      setTimeout(() => {
        const clearedBoard = newBoard.filter((_, idx) => !completedLines.includes(idx))
        while (clearedBoard.length < BOARD_HEIGHT) {
          clearedBoard.unshift(Array(BOARD_WIDTH).fill(null))
        }
        setBoard(clearedBoard)
        setClearingLines([])
        setLines(prev => {
          const newLines = prev + completedLines.length
          setLevel(Math.floor(newLines / 10) + 1)
          return newLines
        })
      }, 300)
    } else {
      setBoard(newBoard)
      setCombo(0)
    }

    // Spawn next piece
    setCurrentPiece(nextPiece)
    setNextPiece(randomTetromino())
    const startX = Math.floor((BOARD_WIDTH - (nextPiece?.shape[0].length || 4)) / 2)
    setPiecePos({ x: startX, y: 0 })
    setCanHold(true)

    // Check game over
    if (checkCollision(nextPiece, { x: startX, y: 0 }, newBoard)) {
      setGameOver(true)
    }
  }, [currentPiece, piecePos, board, nextPiece, level, combo, checkCollision])

  // Move piece
  const movePiece = useCallback((dx, dy) => {
    if (!currentPiece || gameOver || isPaused) return false
    const newPos = { x: piecePos.x + dx, y: piecePos.y + dy }
    if (!checkCollision(currentPiece, newPos, board)) {
      setPiecePos(newPos)
      return true
    }
    return false
  }, [currentPiece, piecePos, board, gameOver, isPaused, checkCollision])

  // Rotate piece
  const rotatePiece = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return
    const rotated = { ...currentPiece, shape: rotate(currentPiece.shape) }
    
    // Wall kick - try different positions if rotation fails
    const kicks = [0, 1, -1, 2, -2]
    for (const kick of kicks) {
      if (!checkCollision(rotated, { x: piecePos.x + kick, y: piecePos.y }, board)) {
        setCurrentPiece(rotated)
        setPiecePos(prev => ({ ...prev, x: prev.x + kick }))
        return
      }
    }
  }, [currentPiece, piecePos, board, gameOver, isPaused, rotate, checkCollision])

  // Hard drop
  const hardDrop = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return
    const ghost = getGhostPosition()
    const dropDistance = ghost.y - piecePos.y
    setScore(prev => prev + dropDistance * 2)
    setPiecePos(ghost)
    setTimeout(placePiece, 50)
  }, [currentPiece, gameOver, isPaused, getGhostPosition, piecePos.y, placePiece])

  // Hold piece
  const holdCurrentPiece = useCallback(() => {
    if (!currentPiece || !canHold || gameOver || isPaused) return
    
    if (holdPiece) {
      const temp = holdPiece
      setHoldPiece({ type: currentPiece.type, ...TETROMINOES[currentPiece.type] })
      setCurrentPiece(temp)
      const startX = Math.floor((BOARD_WIDTH - temp.shape[0].length) / 2)
      setPiecePos({ x: startX, y: 0 })
    } else {
      setHoldPiece({ type: currentPiece.type, ...TETROMINOES[currentPiece.type] })
      setCurrentPiece(nextPiece)
      setNextPiece(randomTetromino())
      const startX = Math.floor((BOARD_WIDTH - (nextPiece?.shape[0].length || 4)) / 2)
      setPiecePos({ x: startX, y: 0 })
    }
    setCanHold(false)
  }, [currentPiece, holdPiece, nextPiece, canHold, gameOver, isPaused])

  // Start game
  const startGame = useCallback(() => {
    setBoard(createEmptyBoard())
    const first = randomTetromino()
    const next = randomTetromino()
    setCurrentPiece(first)
    setNextPiece(next)
    setHoldPiece(null)
    setPiecePos({ x: Math.floor((BOARD_WIDTH - first.shape[0].length) / 2), y: 0 })
    setScore(0)
    setLines(0)
    setLevel(1)
    setGameOver(false)
    setGameStarted(true)
    setIsPaused(false)
    setCombo(0)
    setCanHold(true)
  }, [])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!gameStarted) {
        if (e.key === ' ' || e.key === 'Enter') {
          startGame()
        }
        return
      }

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        setIsPaused(prev => !prev)
        return
      }

      if (gameOver || isPaused) return

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          movePiece(-1, 0)
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          movePiece(1, 0)
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          if (movePiece(0, 1)) {
            setScore(prev => prev + 1)
          }
          break
        case 'ArrowUp':
        case 'w':
        case 'W':
          rotatePiece()
          break
        case ' ':
          hardDrop()
          break
        case 'c':
        case 'C':
        case 'Shift':
          holdCurrentPiece()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameStarted, gameOver, isPaused, movePiece, rotatePiece, hardDrop, holdCurrentPiece, startGame])

  // Touch controls
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleTouchStart = (e) => {
      if (!gameStarted) {
        startGame()
        return
      }
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      }
    }

    const handleTouchMove = (e) => {
      if (!gameStarted || gameOver || isPaused) return
      e.preventDefault()
      
      const now = Date.now()
      if (now - lastMoveRef.current < 100) return
      
      const deltaX = e.touches[0].clientX - touchStartRef.current.x
      const deltaY = e.touches[0].clientY - touchStartRef.current.y
      
      if (Math.abs(deltaX) > 30) {
        movePiece(deltaX > 0 ? 1 : -1, 0)
        touchStartRef.current.x = e.touches[0].clientX
        lastMoveRef.current = now
      }
      
      if (deltaY > 30) {
        if (movePiece(0, 1)) {
          setScore(prev => prev + 1)
        }
        touchStartRef.current.y = e.touches[0].clientY
        lastMoveRef.current = now
      }
    }

    const handleTouchEnd = (e) => {
      if (!gameStarted || gameOver || isPaused) return
      
      const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x
      const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y
      
      // Tap to rotate
      if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
        rotatePiece()
      }
      
      // Swipe up to hard drop
      if (deltaY < -50) {
        hardDrop()
      }
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [gameStarted, gameOver, isPaused, movePiece, rotatePiece, hardDrop, startGame])

  // Game loop
  useEffect(() => {
    if (!gameStarted || gameOver || isPaused) return

    const speed = Math.max(100, 800 - (level - 1) * 70)
    
    gameLoopRef.current = setInterval(() => {
      if (!movePiece(0, 1)) {
        placePiece()
      }
    }, speed)

    return () => clearInterval(gameLoopRef.current)
  }, [gameStarted, gameOver, isPaused, level, movePiece, placePiece])

  // Render board with current piece
  const renderBoard = () => {
    const displayBoard = board.map(row => [...row])
    const ghostPos = getGhostPosition()

    // Draw ghost piece
    if (currentPiece && !gameOver) {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const boardY = ghostPos.y + y
            const boardX = ghostPos.x + x
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              if (!displayBoard[boardY][boardX]) {
                displayBoard[boardY][boardX] = `ghost-${currentPiece.color}`
              }
            }
          }
        }
      }
    }

    // Draw current piece
    if (currentPiece && !gameOver) {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const boardY = piecePos.y + y
            const boardX = piecePos.x + x
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              displayBoard[boardY][boardX] = currentPiece.color
            }
          }
        }
      }
    }

    return displayBoard
  }

  // Render preview piece
  const renderPreview = (piece) => {
    if (!piece) return null
    return (
      <div className="preview-grid">
        {piece.shape.map((row, y) => (
          <div key={y} className="preview-row">
            {row.map((cell, x) => (
              <div
                key={x}
                className={`preview-cell ${cell ? 'filled' : ''}`}
                style={cell ? { 
                  backgroundColor: piece.color,
                  boxShadow: `0 0 10px ${piece.color}, inset 0 0 5px rgba(255,255,255,0.3)`
                } : {}}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  const displayBoard = renderBoard()

  return (
    <div className="tetris-container" ref={containerRef}>
      <div className="tetris-background">
        <div className="grid-lines"></div>
      </div>
      
      {!gameStarted && (
        <div className="tetris-start-screen">
          <h1 className="tetris-logo">
            <span style={{ color: '#00f5ff' }}>T</span>
            <span style={{ color: '#bf00ff' }}>E</span>
            <span style={{ color: '#00ff41' }}>T</span>
            <span style={{ color: '#ff073a' }}>R</span>
            <span style={{ color: '#ffd700' }}>I</span>
            <span style={{ color: '#ff6b00' }}>S</span>
          </h1>
          <div className="start-instructions">
            <p>🎮 Controls</p>
            <div className="control-list">
              <span>← → Move</span>
              <span>↓ Soft Drop</span>
              <span>↑ Rotate</span>
              <span>Space Hard Drop</span>
              <span>C Hold Piece</span>
            </div>
            <p className="mobile-hint">📱 Swipe to move, Tap to rotate</p>
          </div>
          <button className="start-btn" onClick={startGame}>
            START GAME
          </button>
        </div>
      )}

      {gameStarted && (
        <div className="tetris-game">
          <div className="side-panel left-panel">
            <div className="panel-box hold-box">
              <h3>HOLD</h3>
              {renderPreview(holdPiece)}
              {!canHold && <div className="hold-locked">🔒</div>}
            </div>
            
            <div className="panel-box stats-box">
              <div className="stat">
                <span className="stat-label">SCORE</span>
                <span className="stat-value">{score.toLocaleString()}</span>
              </div>
              <div className="stat">
                <span className="stat-label">LINES</span>
                <span className="stat-value">{lines}</span>
              </div>
              <div className="stat">
                <span className="stat-label">LEVEL</span>
                <span className="stat-value">{level}</span>
              </div>
              {combo > 1 && (
                <div className="stat combo">
                  <span className="stat-label">COMBO</span>
                  <span className="stat-value">x{combo}</span>
                </div>
              )}
            </div>
          </div>

          <div className="board-wrapper">
            {lastAction && (
              <div className="action-text">{lastAction}</div>
            )}
            
            <div className="tetris-board">
              {displayBoard.map((row, y) => (
                <div 
                  key={y} 
                  className={`board-row ${clearingLines.includes(y) ? 'clearing' : ''}`}
                >
                  {row.map((cell, x) => {
                    const isGhost = typeof cell === 'string' && cell.startsWith('ghost-')
                    const color = isGhost ? cell.replace('ghost-', '') : cell
                    
                    return (
                      <div
                        key={x}
                        className={`board-cell ${cell ? 'filled' : ''} ${isGhost ? 'ghost' : ''}`}
                        style={cell ? {
                          backgroundColor: isGhost ? 'transparent' : color,
                          borderColor: color,
                          boxShadow: isGhost 
                            ? `inset 0 0 0 2px ${color}40`
                            : `0 0 8px ${color}, inset 0 0 4px rgba(255,255,255,0.4)`
                        } : {}}
                      />
                    )
                  })}
                </div>
              ))}
            </div>

            {isPaused && (
              <div className="pause-overlay">
                <h2>PAUSED</h2>
                <p>Press P or ESC to resume</p>
              </div>
            )}

            {gameOver && (
              <div className="game-over-overlay">
                <h2>GAME OVER</h2>
                <p>Score: {score.toLocaleString()}</p>
                <p>Lines: {lines}</p>
                <p>Level: {level}</p>
                <button className="restart-btn" onClick={startGame}>
                  PLAY AGAIN
                </button>
              </div>
            )}
          </div>

          <div className="side-panel right-panel">
            <div className="panel-box next-box">
              <h3>NEXT</h3>
              {renderPreview(nextPiece)}
            </div>
            
            <div className="panel-box controls-box">
              <h3>CONTROLS</h3>
              <div className="mini-controls">
                <span>← → Move</span>
                <span>↑ Rotate</span>
                <span>↓ Drop</span>
                <span>⎵ Hard</span>
                <span>C Hold</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile controls */}
      {gameStarted && !gameOver && (
        <div className="mobile-controls">
          <div className="mobile-row">
            <button 
              className="mobile-btn rotate-btn"
              onTouchStart={(e) => { e.preventDefault(); rotatePiece(); }}
            >
              ↻
            </button>
            <button 
              className="mobile-btn hold-btn"
              onTouchStart={(e) => { e.preventDefault(); holdCurrentPiece(); }}
            >
              HOLD
            </button>
          </div>
          <div className="mobile-row">
            <button 
              className="mobile-btn left-btn"
              onTouchStart={(e) => { e.preventDefault(); movePiece(-1, 0); }}
            >
              ←
            </button>
            <button 
              className="mobile-btn drop-btn"
              onTouchStart={(e) => { e.preventDefault(); hardDrop(); }}
            >
              ⬇
            </button>
            <button 
              className="mobile-btn right-btn"
              onTouchStart={(e) => { e.preventDefault(); movePiece(1, 0); }}
            >
              →
            </button>
          </div>
          <button 
            className="mobile-btn soft-drop-btn"
            onTouchStart={(e) => { e.preventDefault(); movePiece(0, 1); }}
          >
            ▼ SOFT DROP
          </button>
        </div>
      )}
    </div>
  )
}

