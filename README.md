# 🎮 React Arcade

A collection of classic arcade games built with React, Three.js, and modern web technologies.

## 🎯 Current Games

1. **🎮 Downhill Balance** - 3D physics game where you balance a ball down a hill (Super Monkey Ball style)
2. **🐍 Classic Snake** - The classic snake game with modern styling
3. **🎯 Breakout** - Break all the blocks with your paddle!

## 🚀 Getting Started

```bash
npm install
npm run dev
```

The arcade will open at `http://localhost:3000`

## 🎨 Game Ideas for Future Development

### Easy to Implement
- **Pong** - Classic two-player paddle game
- **Tic-Tac-Toe** - Simple strategy game
- **Memory Game** - Card matching game
- **Whack-a-Mole** - Click the moles as they appear
- **2048** - Number puzzle game

### Medium Difficulty
- **Tetris** - Falling block puzzle game
- **Asteroids** - Space shooter with rotation
- **Frogger** - Cross the road game
- **Pac-Man** - Maze navigation game
- **Space Invaders** - Classic shooter
- **Flappy Bird** - Tap to fly game

### Advanced
- **Racing Game** - 3D car racing with Three.js
- **Fruit Ninja** - Slice fruits with gestures
- **Angry Birds** - Physics-based puzzle game
- **Mario-style Platformer** - Side-scrolling platform game
- **Chess** - Full chess implementation
- **Poker** - Card game with AI

### Multiplayer Ideas
- **Multiplayer Snake** - Compete with friends
- **Battleship** - Turn-based strategy
- **Online Pong** - Real-time multiplayer
- **Quiz Game** - Trivia with friends

## 🛠️ Technologies

- **React 18** - UI framework
- **Three.js** - 3D graphics
- **Cannon.js** - Physics engine
- **Vite** - Build tool
- **Canvas API** - 2D game rendering

## 📁 Project Structure

```
src/
  ├── App.jsx          # Main arcade menu
  ├── App.css          # Arcade styling
  └── games/
      ├── MonkeyBall.jsx   # 3D physics game
      ├── Snake.jsx         # Snake game
      └── Breakout.jsx      # Breakout game
```

## 🎮 Adding a New Game

1. Create a new component in `src/games/YourGame.jsx`
2. Export it as default
3. Add it to the `GAMES` array in `App.jsx`
4. Style it with your game's unique colors!

## 🚀 Build

```bash
npm run build
```

## 📝 License

MIT
