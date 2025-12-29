import { useState, useEffect, useCallback } from 'react'
import './Chess.css'

// Chess piece Unicode characters
const PIECES = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟'
}

// Initial board setup
const INITIAL_BOARD = [
  ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
  ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
  ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
]

// Piece values for evaluation
const PIECE_VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 }

// Position bonuses for pieces (encourages good positioning)
const POSITION_BONUS = {
  P: [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
  ],
  N: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ],
  B: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5,  5,  5,  5,  5,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ],
  R: [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [0,  0,  0,  5,  5,  0,  0,  0]
  ],
  Q: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [-5,  0,  5,  5,  5,  5,  0, -5],
    [0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
  ],
  K: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20, 20,  0,  0,  0,  0, 20, 20],
    [20, 30, 10,  0,  0, 10, 30, 20]
  ]
}

export default function Chess() {
  const [board, setBoard] = useState(INITIAL_BOARD.map(row => [...row]))
  const [selectedSquare, setSelectedSquare] = useState(null)
  const [validMoves, setValidMoves] = useState([])
  const [turn, setTurn] = useState('w')
  const [gameStatus, setGameStatus] = useState('playing')
  const [difficulty, setDifficulty] = useState(null)
  const [moveHistory, setMoveHistory] = useState([])
  const [capturedPieces, setCapturedPieces] = useState({ w: [], b: [] })
  const [isThinking, setIsThinking] = useState(false)
  const [lastMove, setLastMove] = useState(null)
  const [castlingRights, setCastlingRights] = useState({
    wK: true, wQ: true, bK: true, bQ: true
  })
  const [enPassantTarget, setEnPassantTarget] = useState(null)

  // Get piece color
  const getColor = (piece) => piece ? piece[0] : null

  // Get piece type
  const getType = (piece) => piece ? piece[1] : null

  // Check if position is on board
  const isOnBoard = (row, col) => row >= 0 && row < 8 && col >= 0 && col < 8

  // Clone board
  const cloneBoard = (b) => b.map(row => [...row])

  // Get all pieces of a color
  const getPieces = useCallback((b, color) => {
    const pieces = []
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (b[row][col] && getColor(b[row][col]) === color) {
          pieces.push({ row, col, piece: b[row][col] })
        }
      }
    }
    return pieces
  }, [])

  // Find king position
  const findKing = useCallback((b, color) => {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (b[row][col] === color + 'K') {
          return { row, col }
        }
      }
    }
    return null
  }, [])

  // Check if a square is attacked by a color
  const isSquareAttacked = useCallback((b, row, col, byColor) => {
    // Check pawn attacks
    const pawnDir = byColor === 'w' ? 1 : -1
    if (isOnBoard(row + pawnDir, col - 1) && b[row + pawnDir][col - 1] === byColor + 'P') return true
    if (isOnBoard(row + pawnDir, col + 1) && b[row + pawnDir][col + 1] === byColor + 'P') return true

    // Check knight attacks
    const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]
    for (const [dr, dc] of knightMoves) {
      const nr = row + dr, nc = col + dc
      if (isOnBoard(nr, nc) && b[nr][nc] === byColor + 'N') return true
    }

    // Check king attacks
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const nr = row + dr, nc = col + dc
        if (isOnBoard(nr, nc) && b[nr][nc] === byColor + 'K') return true
      }
    }

    // Check diagonal attacks (bishop, queen)
    const diagonals = [[-1,-1],[-1,1],[1,-1],[1,1]]
    for (const [dr, dc] of diagonals) {
      for (let i = 1; i < 8; i++) {
        const nr = row + dr * i, nc = col + dc * i
        if (!isOnBoard(nr, nc)) break
        if (b[nr][nc]) {
          if (b[nr][nc] === byColor + 'B' || b[nr][nc] === byColor + 'Q') return true
          break
        }
      }
    }

    // Check straight attacks (rook, queen)
    const straights = [[-1,0],[1,0],[0,-1],[0,1]]
    for (const [dr, dc] of straights) {
      for (let i = 1; i < 8; i++) {
        const nr = row + dr * i, nc = col + dc * i
        if (!isOnBoard(nr, nc)) break
        if (b[nr][nc]) {
          if (b[nr][nc] === byColor + 'R' || b[nr][nc] === byColor + 'Q') return true
          break
        }
      }
    }

    return false
  }, [])

  // Check if king is in check
  const isInCheck = useCallback((b, color) => {
    const king = findKing(b, color)
    if (!king) return false
    const enemyColor = color === 'w' ? 'b' : 'w'
    return isSquareAttacked(b, king.row, king.col, enemyColor)
  }, [findKing, isSquareAttacked])

  // Get raw moves for a piece (without check validation)
  const getRawMoves = useCallback((b, row, col, castle = castlingRights, epTarget = enPassantTarget) => {
    const piece = b[row][col]
    if (!piece) return []

    const color = getColor(piece)
    const type = getType(piece)
    const moves = []

    const addMove = (r, c) => {
      if (isOnBoard(r, c)) {
        const target = b[r][c]
        if (!target || getColor(target) !== color) {
          moves.push({ row: r, col: c })
        }
      }
    }

    const addSlidingMoves = (directions) => {
      for (const [dr, dc] of directions) {
        for (let i = 1; i < 8; i++) {
          const nr = row + dr * i, nc = col + dc * i
          if (!isOnBoard(nr, nc)) break
          const target = b[nr][nc]
          if (!target) {
            moves.push({ row: nr, col: nc })
          } else {
            if (getColor(target) !== color) {
              moves.push({ row: nr, col: nc })
            }
            break
          }
        }
      }
    }

    switch (type) {
      case 'P': {
        const dir = color === 'w' ? -1 : 1
        const startRow = color === 'w' ? 6 : 1

        // Forward move
        if (isOnBoard(row + dir, col) && !b[row + dir][col]) {
          moves.push({ row: row + dir, col })
          // Double move from start
          if (row === startRow && !b[row + dir * 2][col]) {
            moves.push({ row: row + dir * 2, col })
          }
        }

        // Captures
        for (const dc of [-1, 1]) {
          const nr = row + dir, nc = col + dc
          if (isOnBoard(nr, nc)) {
            const target = b[nr][nc]
            if (target && getColor(target) !== color) {
              moves.push({ row: nr, col: nc })
            }
            // En passant
            if (epTarget && epTarget.row === nr && epTarget.col === nc) {
              moves.push({ row: nr, col: nc, enPassant: true })
            }
          }
        }
        break
      }

      case 'N': {
        const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]
        for (const [dr, dc] of knightMoves) {
          addMove(row + dr, col + dc)
        }
        break
      }

      case 'B':
        addSlidingMoves([[-1,-1],[-1,1],[1,-1],[1,1]])
        break

      case 'R':
        addSlidingMoves([[-1,0],[1,0],[0,-1],[0,1]])
        break

      case 'Q':
        addSlidingMoves([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]])
        break

      case 'K': {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr !== 0 || dc !== 0) {
              addMove(row + dr, col + dc)
            }
          }
        }

        // Castling
        const enemyColor = color === 'w' ? 'b' : 'w'
        if (!isSquareAttacked(b, row, col, enemyColor)) {
          // Kingside
          if (castle[color + 'K'] && !b[row][5] && !b[row][6] &&
              !isSquareAttacked(b, row, 5, enemyColor) && !isSquareAttacked(b, row, 6, enemyColor)) {
            moves.push({ row, col: 6, castle: 'K' })
          }
          // Queenside
          if (castle[color + 'Q'] && !b[row][3] && !b[row][2] && !b[row][1] &&
              !isSquareAttacked(b, row, 3, enemyColor) && !isSquareAttacked(b, row, 2, enemyColor)) {
            moves.push({ row, col: 2, castle: 'Q' })
          }
        }
        break
      }
    }

    return moves
  }, [castlingRights, enPassantTarget, isSquareAttacked])

  // Get legal moves (filters out moves that leave king in check)
  const getLegalMoves = useCallback((b, row, col, castle = castlingRights, epTarget = enPassantTarget) => {
    const piece = b[row][col]
    if (!piece) return []

    const color = getColor(piece)
    const rawMoves = getRawMoves(b, row, col, castle, epTarget)

    return rawMoves.filter(move => {
      const newBoard = cloneBoard(b)
      
      // Handle en passant capture
      if (move.enPassant) {
        const capturedRow = color === 'w' ? move.row + 1 : move.row - 1
        newBoard[capturedRow][move.col] = null
      }
      
      // Handle castling
      if (move.castle) {
        if (move.castle === 'K') {
          newBoard[row][5] = newBoard[row][7]
          newBoard[row][7] = null
        } else {
          newBoard[row][3] = newBoard[row][0]
          newBoard[row][0] = null
        }
      }

      newBoard[move.row][move.col] = piece
      newBoard[row][col] = null

      return !isInCheck(newBoard, color)
    })
  }, [getRawMoves, isInCheck, castlingRights, enPassantTarget])

  // Get all legal moves for a color
  const getAllLegalMoves = useCallback((b, color, castle = castlingRights, epTarget = enPassantTarget) => {
    const moves = []
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (b[row][col] && getColor(b[row][col]) === color) {
          const pieceMoves = getLegalMoves(b, row, col, castle, epTarget)
          for (const move of pieceMoves) {
            moves.push({ from: { row, col }, to: move })
          }
        }
      }
    }
    return moves
  }, [getLegalMoves, castlingRights, enPassantTarget])

  // Evaluate board position
  const evaluateBoard = useCallback((b) => {
    let score = 0

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = b[row][col]
        if (!piece) continue

        const color = getColor(piece)
        const type = getType(piece)
        const sign = color === 'w' ? 1 : -1

        // Material value
        score += sign * PIECE_VALUES[type]

        // Position bonus
        const posRow = color === 'w' ? row : 7 - row
        score += sign * (POSITION_BONUS[type]?.[posRow]?.[col] || 0)
      }
    }

    return score
  }, [])

  // Minimax with alpha-beta pruning
  const minimax = useCallback((b, depth, alpha, beta, isMaximizing, castle, epTarget) => {
    if (depth === 0) {
      return evaluateBoard(b)
    }

    const color = isMaximizing ? 'w' : 'b'
    const moves = getAllLegalMoves(b, color, castle, epTarget)

    if (moves.length === 0) {
      if (isInCheck(b, color)) {
        return isMaximizing ? -100000 + depth : 100000 - depth
      }
      return 0 // Stalemate
    }

    if (isMaximizing) {
      let maxEval = -Infinity
      for (const move of moves) {
        const newBoard = cloneBoard(b)
        const piece = newBoard[move.from.row][move.from.col]
        
        if (move.to.enPassant) {
          const capturedRow = 'w' === getColor(piece) ? move.to.row + 1 : move.to.row - 1
          newBoard[capturedRow][move.to.col] = null
        }
        
        if (move.to.castle) {
          const row = move.from.row
          if (move.to.castle === 'K') {
            newBoard[row][5] = newBoard[row][7]
            newBoard[row][7] = null
          } else {
            newBoard[row][3] = newBoard[row][0]
            newBoard[row][0] = null
          }
        }

        newBoard[move.to.row][move.to.col] = piece
        newBoard[move.from.row][move.from.col] = null

        // Handle pawn promotion
        if (getType(piece) === 'P' && (move.to.row === 0 || move.to.row === 7)) {
          newBoard[move.to.row][move.to.col] = getColor(piece) + 'Q'
        }

        const evalScore = minimax(newBoard, depth - 1, alpha, beta, false, castle, null)
        maxEval = Math.max(maxEval, evalScore)
        alpha = Math.max(alpha, evalScore)
        if (beta <= alpha) break
      }
      return maxEval
    } else {
      let minEval = Infinity
      for (const move of moves) {
        const newBoard = cloneBoard(b)
        const piece = newBoard[move.from.row][move.from.col]
        
        if (move.to.enPassant) {
          const capturedRow = 'b' === getColor(piece) ? move.to.row - 1 : move.to.row + 1
          newBoard[capturedRow][move.to.col] = null
        }
        
        if (move.to.castle) {
          const row = move.from.row
          if (move.to.castle === 'K') {
            newBoard[row][5] = newBoard[row][7]
            newBoard[row][7] = null
          } else {
            newBoard[row][3] = newBoard[row][0]
            newBoard[row][0] = null
          }
        }

        newBoard[move.to.row][move.to.col] = piece
        newBoard[move.from.row][move.from.col] = null

        if (getType(piece) === 'P' && (move.to.row === 0 || move.to.row === 7)) {
          newBoard[move.to.row][move.to.col] = getColor(piece) + 'Q'
        }

        const evalScore = minimax(newBoard, depth - 1, alpha, beta, true, castle, null)
        minEval = Math.min(minEval, evalScore)
        beta = Math.min(beta, evalScore)
        if (beta <= alpha) break
      }
      return minEval
    }
  }, [evaluateBoard, getAllLegalMoves, isInCheck])

  // AI move selection
  const getAIMove = useCallback((b, diff, castle, epTarget) => {
    const moves = getAllLegalMoves(b, 'b', castle, epTarget)
    if (moves.length === 0) return null

    if (diff === 'easy') {
      // Random move
      return moves[Math.floor(Math.random() * moves.length)]
    }

    if (diff === 'medium') {
      // Prefer captures and checks, some randomness
      const scoredMoves = moves.map(move => {
        let score = Math.random() * 50
        const targetPiece = b[move.to.row][move.to.col]
        if (targetPiece) {
          score += PIECE_VALUES[getType(targetPiece)] / 10
        }
        // Check if move gives check
        const newBoard = cloneBoard(b)
        newBoard[move.to.row][move.to.col] = b[move.from.row][move.from.col]
        newBoard[move.from.row][move.from.col] = null
        if (isInCheck(newBoard, 'w')) {
          score += 30
        }
        return { move, score }
      })
      scoredMoves.sort((a, b) => b.score - a.score)
      return scoredMoves[0].move
    }

    // Hard: use minimax
    let bestMove = null
    let bestScore = Infinity

    for (const move of moves) {
      const newBoard = cloneBoard(b)
      const piece = newBoard[move.from.row][move.from.col]
      
      if (move.to.enPassant) {
        newBoard[move.to.row + 1][move.to.col] = null
      }
      
      if (move.to.castle) {
        const row = move.from.row
        if (move.to.castle === 'K') {
          newBoard[row][5] = newBoard[row][7]
          newBoard[row][7] = null
        } else {
          newBoard[row][3] = newBoard[row][0]
          newBoard[row][0] = null
        }
      }

      newBoard[move.to.row][move.to.col] = piece
      newBoard[move.from.row][move.from.col] = null

      if (getType(piece) === 'P' && move.to.row === 7) {
        newBoard[move.to.row][move.to.col] = 'bQ'
      }

      const score = minimax(newBoard, 3, -Infinity, Infinity, true, castle, null)
      if (score < bestScore) {
        bestScore = score
        bestMove = move
      }
    }

    return bestMove
  }, [getAllLegalMoves, isInCheck, minimax])

  // Make a move
  const makeMove = useCallback((fromRow, fromCol, toRow, toCol, moveData = {}) => {
    const newBoard = cloneBoard(board)
    const piece = newBoard[fromRow][fromCol]
    const capturedPiece = newBoard[toRow][toCol]
    const color = getColor(piece)

    // Handle en passant
    if (moveData.enPassant) {
      const capturedRow = color === 'w' ? toRow + 1 : toRow - 1
      const epPiece = newBoard[capturedRow][toCol]
      newBoard[capturedRow][toCol] = null
      setCapturedPieces(prev => ({
        ...prev,
        [color]: [...prev[color], epPiece]
      }))
    } else if (capturedPiece) {
      setCapturedPieces(prev => ({
        ...prev,
        [color]: [...prev[color], capturedPiece]
      }))
    }

    // Handle castling
    if (moveData.castle) {
      if (moveData.castle === 'K') {
        newBoard[fromRow][5] = newBoard[fromRow][7]
        newBoard[fromRow][7] = null
      } else {
        newBoard[fromRow][3] = newBoard[fromRow][0]
        newBoard[fromRow][0] = null
      }
    }

    // Move piece
    newBoard[toRow][toCol] = piece
    newBoard[fromRow][fromCol] = null

    // Pawn promotion (auto-queen for now)
    if (getType(piece) === 'P' && (toRow === 0 || toRow === 7)) {
      newBoard[toRow][toCol] = color + 'Q'
    }

    // Update castling rights
    const newCastling = { ...castlingRights }
    if (piece === 'wK') { newCastling.wK = false; newCastling.wQ = false }
    if (piece === 'bK') { newCastling.bK = false; newCastling.bQ = false }
    if (piece === 'wR' && fromCol === 0) newCastling.wQ = false
    if (piece === 'wR' && fromCol === 7) newCastling.wK = false
    if (piece === 'bR' && fromCol === 0) newCastling.bQ = false
    if (piece === 'bR' && fromCol === 7) newCastling.bK = false
    setCastlingRights(newCastling)

    // Set en passant target
    if (getType(piece) === 'P' && Math.abs(toRow - fromRow) === 2) {
      setEnPassantTarget({ row: (fromRow + toRow) / 2, col: fromCol })
    } else {
      setEnPassantTarget(null)
    }

    setBoard(newBoard)
    setLastMove({ from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } })
    setMoveHistory(prev => [...prev, { piece, from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol }, captured: capturedPiece }])

    // Switch turn
    const nextTurn = color === 'w' ? 'b' : 'w'
    setTurn(nextTurn)

    // Check game status
    const nextMoves = getAllLegalMoves(newBoard, nextTurn, newCastling, null)
    if (nextMoves.length === 0) {
      if (isInCheck(newBoard, nextTurn)) {
        setGameStatus(color === 'w' ? 'white-wins' : 'black-wins')
      } else {
        setGameStatus('stalemate')
      }
    } else if (isInCheck(newBoard, nextTurn)) {
      setGameStatus('check')
    } else {
      setGameStatus('playing')
    }

    return { newBoard, newCastling }
  }, [board, castlingRights, getAllLegalMoves, isInCheck])

  // Handle square click
  const handleSquareClick = (row, col) => {
    if (gameStatus === 'white-wins' || gameStatus === 'black-wins' || gameStatus === 'stalemate') return
    if (turn !== 'w') return // Player is always white
    if (isThinking) return

    const piece = board[row][col]

    if (selectedSquare) {
      // Check if this is a valid move
      const moveData = validMoves.find(m => m.row === row && m.col === col)
      if (moveData) {
        makeMove(selectedSquare.row, selectedSquare.col, row, col, moveData)
        setSelectedSquare(null)
        setValidMoves([])
      } else if (piece && getColor(piece) === 'w') {
        // Select new piece
        setSelectedSquare({ row, col })
        setValidMoves(getLegalMoves(board, row, col))
      } else {
        setSelectedSquare(null)
        setValidMoves([])
      }
    } else if (piece && getColor(piece) === 'w') {
      setSelectedSquare({ row, col })
      setValidMoves(getLegalMoves(board, row, col))
    }
  }

  // AI turn
  useEffect(() => {
    if (turn === 'b' && difficulty && gameStatus === 'playing' || (gameStatus === 'check' && turn === 'b')) {
      setIsThinking(true)
      
      setTimeout(() => {
        const aiMove = getAIMove(board, difficulty, castlingRights, enPassantTarget)
        if (aiMove) {
          makeMove(aiMove.from.row, aiMove.from.col, aiMove.to.row, aiMove.to.col, aiMove.to)
        }
        setIsThinking(false)
      }, difficulty === 'hard' ? 1000 : 500)
    }
  }, [turn, difficulty, gameStatus, board, castlingRights, enPassantTarget, getAIMove, makeMove])

  // Reset game
  const resetGame = () => {
    setBoard(INITIAL_BOARD.map(row => [...row]))
    setSelectedSquare(null)
    setValidMoves([])
    setTurn('w')
    setGameStatus('playing')
    setMoveHistory([])
    setCapturedPieces({ w: [], b: [] })
    setLastMove(null)
    setCastlingRights({ wK: true, wQ: true, bK: true, bQ: true })
    setEnPassantTarget(null)
  }

  // Difficulty selection screen
  if (!difficulty) {
    return (
      <div className="chess-container">
        <h1 className="chess-title">♔ Chess ♚</h1>
        <p className="chess-subtitle">Choose your opponent</p>
        
        <div className="difficulty-selection">
          <button 
            className="difficulty-btn easy"
            onClick={() => setDifficulty('easy')}
          >
            <span className="diff-icon">🌱</span>
            <span className="diff-name">Easy</span>
            <span className="diff-desc">Random moves</span>
          </button>
          
          <button 
            className="difficulty-btn medium"
            onClick={() => setDifficulty('medium')}
          >
            <span className="diff-icon">⚔️</span>
            <span className="diff-name">Medium</span>
            <span className="diff-desc">Basic strategy</span>
          </button>
          
          <button 
            className="difficulty-btn hard"
            onClick={() => setDifficulty('hard')}
          >
            <span className="diff-icon">🧠</span>
            <span className="diff-name">Hard</span>
            <span className="diff-desc">Minimax AI</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="chess-container">
      <h1 className="chess-title">♔ Chess ♚</h1>
      
      <div className="chess-info">
        <div className="turn-indicator">
          <span className={`turn-dot ${turn === 'w' ? 'white-turn' : 'black-turn'}`}></span>
          <span>{turn === 'w' ? "Your turn" : "AI thinking..."}</span>
        </div>
        <div className="difficulty-badge">{difficulty.toUpperCase()}</div>
      </div>

      {(gameStatus === 'check') && (
        <div className="game-alert check">⚠️ Check!</div>
      )}
      
      {(gameStatus === 'white-wins' || gameStatus === 'black-wins' || gameStatus === 'stalemate') && (
        <div className={`game-alert ${gameStatus}`}>
          {gameStatus === 'white-wins' && '🎉 You Win!'}
          {gameStatus === 'black-wins' && '😔 AI Wins!'}
          {gameStatus === 'stalemate' && '🤝 Stalemate!'}
        </div>
      )}

      <div className="chess-game-area">
        <div className="captured-pieces black-captured">
          {capturedPieces.w.map((p, i) => (
            <span key={i} className="captured-piece">{PIECES[p]}</span>
          ))}
        </div>

        <div className="chess-board">
          {board.map((row, rowIdx) => (
            <div key={rowIdx} className="chess-row">
              <div className="rank-label">{8 - rowIdx}</div>
              {row.map((piece, colIdx) => {
                const isLight = (rowIdx + colIdx) % 2 === 0
                const isSelected = selectedSquare?.row === rowIdx && selectedSquare?.col === colIdx
                const isValidMove = validMoves.some(m => m.row === rowIdx && m.col === colIdx)
                const isLastMoveFrom = lastMove?.from.row === rowIdx && lastMove?.from.col === colIdx
                const isLastMoveTo = lastMove?.to.row === rowIdx && lastMove?.to.col === colIdx
                const isCapture = isValidMove && piece

                return (
                  <div
                    key={colIdx}
                    className={`chess-square ${isLight ? 'light' : 'dark'} 
                      ${isSelected ? 'selected' : ''} 
                      ${isValidMove ? 'valid-move' : ''}
                      ${isCapture ? 'capture-move' : ''}
                      ${isLastMoveFrom || isLastMoveTo ? 'last-move' : ''}`}
                    onClick={() => handleSquareClick(rowIdx, colIdx)}
                  >
                    {piece && (
                      <span className={`chess-piece ${getColor(piece) === 'w' ? 'white-piece' : 'black-piece'}`}>
                        {PIECES[piece]}
                      </span>
                    )}
                    {isValidMove && !piece && <div className="move-dot"></div>}
                  </div>
                )
              })}
            </div>
          ))}
          <div className="file-labels">
            <span></span>
            {['a','b','c','d','e','f','g','h'].map(f => <span key={f}>{f}</span>)}
          </div>
        </div>

        <div className="captured-pieces white-captured">
          {capturedPieces.b.map((p, i) => (
            <span key={i} className="captured-piece">{PIECES[p]}</span>
          ))}
        </div>
      </div>

      <div className="chess-controls">
        <button className="chess-btn" onClick={resetGame}>New Game</button>
        <button className="chess-btn" onClick={() => { resetGame(); setDifficulty(null); }}>Change Difficulty</button>
      </div>

      <div className="move-history">
        <h3>Move History</h3>
        <div className="moves-list">
          {moveHistory.map((move, idx) => (
            <span key={idx} className="move-notation">
              {idx % 2 === 0 && <span className="move-number">{Math.floor(idx/2) + 1}.</span>}
              {PIECES[move.piece]}{String.fromCharCode(97 + move.to.col)}{8 - move.to.row}
              {move.captured && 'x'}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

