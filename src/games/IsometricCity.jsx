import { useState, useEffect, useCallback, useRef } from 'react'
import './IsometricCity.css'

const GRID_SIZE = 12
const TILE_WIDTH = 64
const TILE_HEIGHT = 32

const BUILDING_TYPES = {
  residential: {
    id: 'residential',
    name: 'House',
    icon: '🏠',
    cost: 100,
    income: 10,
    population: 4,
    color: '#4ECDC4',
    height: 2,
    emoji: '🏡'
  },
  commercial: {
    id: 'commercial',
    name: 'Shop',
    icon: '🏪',
    cost: 200,
    income: 25,
    population: 0,
    jobs: 8,
    color: '#FFE66D',
    height: 2,
    emoji: '🏬'
  },
  industrial: {
    id: 'industrial',
    name: 'Factory',
    icon: '🏭',
    cost: 350,
    income: 40,
    population: 0,
    jobs: 15,
    color: '#95E1D3',
    height: 3,
    emoji: '🏭'
  },
  office: {
    id: 'office',
    name: 'Office',
    icon: '🏢',
    cost: 500,
    income: 60,
    population: 0,
    jobs: 25,
    color: '#A8E6CF',
    height: 4,
    emoji: '🏢'
  },
  park: {
    id: 'park',
    name: 'Park',
    icon: '🌳',
    cost: 75,
    income: 0,
    happiness: 10,
    color: '#7CB342',
    height: 1,
    emoji: '🌲'
  },
  road: {
    id: 'road',
    name: 'Road',
    icon: '🛣️',
    cost: 25,
    income: 0,
    color: '#546E7A',
    height: 0,
    emoji: '🛤️'
  },
  hospital: {
    id: 'hospital',
    name: 'Hospital',
    icon: '🏥',
    cost: 800,
    income: 20,
    happiness: 20,
    color: '#EF5350',
    height: 3,
    emoji: '🏥'
  },
  school: {
    id: 'school',
    name: 'School',
    icon: '🏫',
    cost: 400,
    income: 5,
    happiness: 15,
    color: '#FF7043',
    height: 2,
    emoji: '🏫'
  },
  stadium: {
    id: 'stadium',
    name: 'Stadium',
    icon: '🏟️',
    cost: 1500,
    income: 100,
    happiness: 30,
    color: '#AB47BC',
    height: 2,
    emoji: '🏟️'
  },
  powerplant: {
    id: 'powerplant',
    name: 'Power Plant',
    icon: '⚡',
    cost: 1000,
    income: 50,
    power: 100,
    color: '#FFA726',
    height: 4,
    emoji: '⚡'
  }
}

const ACHIEVEMENTS = [
  { id: 'first_building', name: 'First Steps', description: 'Place your first building', check: (s) => s.totalBuildings >= 1 },
  { id: 'village', name: 'Village', description: 'Reach 50 population', check: (s) => s.population >= 50 },
  { id: 'town', name: 'Town', description: 'Reach 200 population', check: (s) => s.population >= 200 },
  { id: 'city', name: 'City', description: 'Reach 500 population', check: (s) => s.population >= 500 },
  { id: 'metropolis', name: 'Metropolis', description: 'Reach 1000 population', check: (s) => s.population >= 1000 },
  { id: 'rich', name: 'Wealthy', description: 'Accumulate $10,000', check: (s) => s.money >= 10000 },
  { id: 'green_city', name: 'Green City', description: 'Build 10 parks', check: (s) => s.parks >= 10 },
]

function IsometricCity() {
  const [grid, setGrid] = useState(() => 
    Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null))
  )
  const [selectedTool, setSelectedTool] = useState('residential')
  const [money, setMoney] = useState(2000)
  const [population, setPopulation] = useState(0)
  const [happiness, setHappiness] = useState(75)
  const [income, setIncome] = useState(0)
  const [day, setDay] = useState(1)
  const [hoveredTile, setHoveredTile] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [achievements, setAchievements] = useState([])
  const [showAchievement, setShowAchievement] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [gameSpeed, setGameSpeed] = useState(1)
  const [isPaused, setIsPaused] = useState(false)
  const [cityName, setCityName] = useState('New Haven')
  const [isEditingName, setIsEditingName] = useState(false)
  const [showToolsPanel, setShowToolsPanel] = useState(window.innerWidth > 768)
  const [showInfoPanel, setShowInfoPanel] = useState(window.innerWidth > 768)
  const [selectedBuilding, setSelectedBuilding] = useState(null)
  const [showUpgradeMenu, setShowUpgradeMenu] = useState(false)
  const gridRef = useRef(null)
  const gridForSaveRef = useRef(grid)
  
  // Update ref when grid changes
  useEffect(() => {
    gridForSaveRef.current = grid
  }, [grid])
  
  // Load saved game
  useEffect(() => {
    const saved = localStorage.getItem('isometricCitySave')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data.grid) setGrid(data.grid)
        if (data.money) setMoney(data.money)
        if (data.day) setDay(data.day)
        if (data.cityName) setCityName(data.cityName)
        if (data.achievements) setAchievements(data.achievements)
      } catch (e) {
        console.error('Failed to load save:', e)
      }
    }
  }, [])
  
  // Auto-save every 10 seconds
  useEffect(() => {
    const saveInterval = setInterval(() => {
      const saveData = {
        grid: gridForSaveRef.current,
        money,
        day,
        cityName,
        achievements
      }
      localStorage.setItem('isometricCitySave', JSON.stringify(saveData))
    }, 10000)
    return () => clearInterval(saveInterval)
  }, [money, day, cityName, achievements])
  
  // Update panel visibility on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setShowToolsPanel(true)
        setShowInfoPanel(true)
      } else {
        setShowToolsPanel(false)
        setShowInfoPanel(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Calculate stats
  const calculateStats = useCallback(() => {
    let totalPopulation = 0
    let totalIncome = 0
    let totalHappiness = 0
    let buildingCount = 0
    let parkCount = 0

    grid.forEach(row => {
      row.forEach(cell => {
        if (cell) {
          const type = BUILDING_TYPES[cell.type]
          const levelMultiplier = 1 + (cell.level - 1) * 0.5 // 50% increase per level
          if (type.population) totalPopulation += Math.floor(type.population * levelMultiplier)
          if (type.income) totalIncome += Math.floor(type.income * levelMultiplier)
          if (type.happiness) totalHappiness += Math.floor(type.happiness * levelMultiplier)
          if (cell.type === 'park') parkCount++
          buildingCount++
        }
      })
    })

    return { 
      population: totalPopulation, 
      income: totalIncome, 
      happiness: Math.min(100, 50 + totalHappiness),
      totalBuildings: buildingCount,
      parks: parkCount
    }
  }, [grid])

  // Update stats when grid changes
  useEffect(() => {
    const stats = calculateStats()
    setPopulation(stats.population)
    setIncome(stats.income)
    setHappiness(stats.happiness)

    // Check achievements
    ACHIEVEMENTS.forEach(achievement => {
      if (!achievements.includes(achievement.id) && achievement.check(stats)) {
        setAchievements(prev => [...prev, achievement.id])
        setShowAchievement(achievement)
        setTimeout(() => setShowAchievement(null), 3000)
      }
    })
  }, [grid, calculateStats, achievements])

  // Game loop - income and day progression
  useEffect(() => {
    if (isPaused) return
    
    const interval = setInterval(() => {
      setMoney(prev => prev + income)
      setDay(prev => prev + 1)
    }, 3000 / gameSpeed)

    return () => clearInterval(interval)
  }, [income, gameSpeed, isPaused])

  // Convert grid coordinates to isometric screen position
  const gridToScreen = (x, y) => {
    // Grid container is 900x550
    const containerWidth = 900
    const containerHeight = 550
    
    // Standard isometric projection formula
    // The center tile should be at the center of the container
    const centerTileX = Math.floor(GRID_SIZE / 2)
    const centerTileY = Math.floor(GRID_SIZE / 2)
    
    // Calculate offset from center tile
    const dx = x - centerTileX
    const dy = y - centerTileY
    
    // Isometric transformation
    // Horizontal: difference between x and y coordinates
    // Vertical: sum of x and y coordinates
    const isoX = (dx - dy) * (TILE_WIDTH / 2)
    const isoY = (dx + dy) * (TILE_HEIGHT / 2)
    
    // Center in container (accounting for tile centering transform)
    const screenX = (containerWidth / 2) + isoX
    const screenY = (containerHeight / 2) + isoY
    
    return { screenX, screenY }
  }

  // Check if tile has road access
  const hasRoadAccess = (x, y) => {
    const neighbors = [
      [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]
    ]
    return neighbors.some(([nx, ny]) => {
      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) return false
      return grid[ny][nx]?.type === 'road'
    })
  }

  // Handle tile click
  const handleTileClick = (x, y) => {
    const existingBuilding = grid[y][x]
    
    // If clicking on existing building, show upgrade menu
    if (existingBuilding && !isDeleting && selectedTool === existingBuilding.type) {
      setSelectedBuilding({ x, y, building: existingBuilding })
      setShowUpgradeMenu(true)
      return
    }
    
    if (isDeleting) {
      if (existingBuilding) {
        const newGrid = [...grid.map(row => [...row])]
        const refund = Math.floor(BUILDING_TYPES[existingBuilding.type].cost * 0.5 * existingBuilding.level)
        newGrid[y][x] = null
        setGrid(newGrid)
        setMoney(prev => prev + refund)
        addNotification(`Demolished for +$${refund}`, 'demolish')
      }
      return
    }

    const buildingType = BUILDING_TYPES[selectedTool]
    
    if (existingBuilding) {
      addNotification('Tile already occupied!', 'error')
      return
    }

    if (money < buildingType.cost) {
      addNotification('Not enough money!', 'error')
      return
    }

    // Check road access for non-road buildings
    if (selectedTool !== 'road' && !hasRoadAccess(x, y)) {
      addNotification('Buildings need road access!', 'error')
      return
    }

    const newGrid = [...grid.map(row => [...row])]
    newGrid[y][x] = { 
      type: selectedTool, 
      level: 1,
      placedAt: day
    }
    setGrid(newGrid)
    setMoney(prev => prev - buildingType.cost)
    addNotification(`Built ${buildingType.name} for $${buildingType.cost}`, 'success')
  }

  // Upgrade building
  const handleUpgrade = () => {
    if (!selectedBuilding) return
    
    const { x, y, building } = selectedBuilding
    const buildingType = BUILDING_TYPES[building.type]
    const upgradeCost = Math.floor(buildingType.cost * 1.5 * building.level)
    
    if (money < upgradeCost) {
      addNotification('Not enough money to upgrade!', 'error')
      return
    }

    if (building.level >= 5) {
      addNotification('Building is at max level!', 'error')
      return
    }

    const newGrid = [...grid.map(row => [...row])]
    newGrid[y][x] = {
      ...building,
      level: building.level + 1
    }
    setGrid(newGrid)
    setMoney(prev => prev - upgradeCost)
    addNotification(`Upgraded to level ${building.level + 1}!`, 'success')
    setShowUpgradeMenu(false)
    setSelectedBuilding(null)
  }

  const addNotification = (message, type) => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 2000)
  }

  // Render 3D isometric building with enhanced graphics
  const renderBuilding = (cell, x, y) => {
    if (!cell) return null
    const type = BUILDING_TYPES[cell.type]
    const { screenX, screenY } = gridToScreen(x, y)
    
    const buildingHeight = type.height * 25
    const buildingWidth = 48
    const numWindows = Math.min(type.height * 2, 8)
    
    // Special rendering for roads
    if (cell.type === 'road') {
      return (
        <div
          key={`building-${x}-${y}`}
          className="building building-road"
          style={{
            left: screenX,
            top: screenY,
            zIndex: 100 + x + y
          }}
        >
          <div className="building-body">
            <div className="road-surface">
              <div className="road-marking road-marking-1"></div>
              <div className="road-marking road-marking-2"></div>
            </div>
              <div className="road-shine"></div>
              <div className="road-reflection"></div>
              <div className="road-puddles"></div>
          </div>
        </div>
      )
    }
    
    // Special rendering for parks (trees with particles)
    if (cell.type === 'park') {
      return (
        <div
          key={`building-${x}-${y}`}
          className="building building-park"
          style={{
            left: screenX,
            top: screenY,
            zIndex: 100 + x + y
          }}
        >
          <div className="building-body">
            <div className="tree-container">
              <div className="tree-trunk"></div>
              <div className="tree-crown">
                <span className="building-emoji" style={{ fontSize: '2.8rem' }}>🌲</span>
              </div>
              {/* Sparkle particles */}
              {Array.from({ length: 6 }).map((_, i) => (
                <div 
                  key={i} 
                  className="park-sparkle"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    top: `${10 + Math.random() * 40}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 2}s`
                  }}
                >✨</div>
              ))}
            </div>
          </div>
          <div className="building-shadow"></div>
        </div>
      )
    }

    // Enhanced 3D building with particles
    // Use same coordinates as tiles - transform handles alignment
    return (
      <div
        key={`building-${x}-${y}`}
        className={`building building-${cell.type}`}
        style={{
          left: screenX,
          top: screenY,
          zIndex: 100 + x + y
        }}
      >
        {/* Advanced particle effects for industrial buildings */}
        {cell.type === 'industrial' && (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <div 
                key={`smoke-${i}`}
                className="smoke-particle"
                style={{
                  left: `${25 + i * 15}%`,
                  animationDelay: `${i * 0.6 + Math.random() * 0.5}s`,
                  animationDuration: `${3.5 + Math.random() * 2.5}s`
                }}
              >
                <div className="smoke-cloud smoke-cloud-1"></div>
                <div className="smoke-cloud smoke-cloud-2"></div>
                <div className="smoke-cloud smoke-cloud-3"></div>
              </div>
            ))}
            {/* Industrial steam */}
            {Array.from({ length: 2 }).map((_, i) => (
              <div 
                key={`steam-${i}`}
                className="steam-particle"
                style={{
                  left: `${35 + i * 25}%`,
                  animationDelay: `${i * 1.2}s`,
                  animationDuration: `${4 + Math.random() * 2}s`
                }}
              ></div>
            ))}
          </>
        )}
        
        {/* Advanced sparkles for power plant */}
        {cell.type === 'powerplant' && (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <div 
                key={`spark-${i}`}
                className="electric-spark"
                style={{
                  left: `${15 + (i % 3) * 25}%`,
                  top: `${35 + Math.floor(i / 3) * 35}%`,
                  animationDelay: `${i * 0.3}s`
                }}
              >
                <span>⚡</span>
                <div className="spark-trail"></div>
              </div>
            ))}
            {/* Power plant glow */}
            <div className="powerplant-aura"></div>
          </>
        )}
        
        {/* Light rays from windows at night */}
        {type.height >= 2 && Array.from({ length: Math.min(type.height, 3) }).map((_, i) => (
          <div 
            key={`light-ray-${i}`}
            className="window-light-ray"
            style={{
              left: `${20 + (i % 2) * 50}%`,
              bottom: `${10 + i * 25}%`,
              animationDelay: `${i * 0.5}s`
            }}
          ></div>
        ))}

        <div className="building-body">
          <div className="building-3d" style={{ width: buildingWidth, height: buildingHeight + 20 }}>
            {/* Roof / Top face with details */}
            <div 
              className="building-top"
              style={{
                width: buildingWidth,
                height: buildingWidth / 2,
                top: 0,
                left: 0
              }}
            >
              {/* Roof tiles pattern */}
              <div className="roof-tiles"></div>
              {/* Chimney for residential */}
              {cell.type === 'residential' && (
                <div className="chimney">
                  <div className="chimney-smoke"></div>
                </div>
              )}
            </div>
            
            {/* Left wall (lit side) */}
            <div 
              className="building-left"
              style={{
                width: buildingWidth / 2,
                height: buildingHeight,
                top: buildingWidth / 4,
                left: 0
              }}
            >
              {/* Detailed windows grid */}
              {type.height >= 2 && (
                <div className="building-windows-left">
                  {Array.from({ length: Math.floor(numWindows / 2) }).map((_, i) => (
                    <div key={i} className="window-row">
                      {Array.from({ length: 2 }).map((_, j) => (
                        <div 
                          key={j}
                          className={`window ${Math.random() > 0.7 ? 'window-off' : ''}`}
                          style={{ 
                            animationDelay: `${(i * 0.5 + j * 0.2 + Math.random() * 0.3)}s`,
                            animationDuration: `${3 + Math.random() * 2}s`
                          }}
                        >
                          <div className="window-pane"></div>
                          <div className="window-glow"></div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {/* Door on ground floor */}
              <div className="building-door-left">
                <div className="door">
                  <div className="door-panel door-panel-1"></div>
                  <div className="door-panel door-panel-2"></div>
                </div>
                <div className="door-frame"></div>
                <div className="door-knob"></div>
                <div className="door-handle"></div>
              </div>
              {/* Building signage/decoration */}
              {cell.type === 'commercial' && (
                <div className="building-sign">
                  <div className="sign-board"></div>
                </div>
              )}
              {/* Balcony for residential */}
              {cell.type === 'residential' && type.height >= 3 && (
                <div className="building-balcony">
                  <div className="balcony-rail"></div>
                  <div className="balcony-base"></div>
                </div>
              )}
              {/* Wall texture overlay */}
              <div className="wall-texture"></div>
              {/* Ambient occlusion */}
              <div className="wall-ao"></div>
            </div>
            
            {/* Right wall (shadow side) */}
            <div 
              className="building-right"
              style={{
                width: buildingWidth / 2,
                height: buildingHeight,
                top: buildingWidth / 4,
                left: buildingWidth / 2
              }}
            >
              {/* Windows */}
              {type.height >= 2 && (
                <div className="building-windows-right">
                  {Array.from({ length: Math.floor(numWindows / 2) }).map((_, i) => (
                    <div key={i} className="window-row">
                      {Array.from({ length: 2 }).map((_, j) => (
                        <div 
                          key={j}
                          className={`window ${Math.random() > 0.6 ? 'window-off' : ''}`}
                          style={{ 
                            animationDelay: `${(i * 0.4 + j * 0.25 + Math.random() * 0.4)}s`,
                            animationDuration: `${3.5 + Math.random() * 2}s`
                          }}
                        >
                          <div className="window-pane"></div>
                          <div className="window-glow"></div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {/* Wall texture overlay */}
              <div className="wall-texture"></div>
            </div>
            
            {/* Building icon/emoji overlay with glow */}
            <div className="building-icon-container">
              <span className="building-emoji">{type.emoji}</span>
              <div className="emoji-glow"></div>
              <div className="emoji-pulse"></div>
              {cell.level > 1 && (
                <div className="building-level-badge">
                  <span>Lv.{cell.level}</span>
                </div>
              )}
            </div>
            
            {/* Rim lighting effect */}
            <div className="building-rim-light"></div>
            
            {/* Ambient occlusion shadow */}
            <div className="building-ao-shadow"></div>
            
            {/* Volumetric lighting from sun */}
            <div className="building-volumetric-light"></div>
            
            {/* Reflection/gloss effect */}
            <div className="building-reflection"></div>
            
            {/* Specular highlights */}
            <div className="building-specular"></div>
          </div>
        </div>
        
        {/* Enhanced shadow with multiple layers */}
        <div className="building-shadow-building">
          <div className="shadow-inner"></div>
          <div className="shadow-outer"></div>
          <div className="shadow-contact"></div>
        </div>
        
        {/* Building base/ground contact with details */}
        <div className="building-base">
          <div className="base-detail base-detail-1"></div>
          <div className="base-detail base-detail-2"></div>
        </div>
        
        {/* Atmospheric fog/haze around building */}
        <div className="building-atmosphere"></div>
      </div>
    )
  }

  return (
    <div className="isometric-city">
      {/* Post-processing overlay for bloom effect */}
      <div className="post-process-overlay">
        <div className="bloom-layer"></div>
        <div className="chromatic-layer"></div>
        <div className="vignette-layer"></div>
        <div className="color-grading-layer"></div>
      </div>
      
      <div className="city-sky">
        <div className="stars"></div>
        <div className="sun">
          <div className="sun-core"></div>
          <div className="sun-rays"></div>
          <div className="sun-glow"></div>
        </div>
        <div className="cloud cloud-1">☁️</div>
        <div className="cloud cloud-2">☁️</div>
        <div className="cloud cloud-3">☁️</div>
        <div className="distant-city">
          <div className="distant-building" style={{ height: '60px', left: '5%' }}></div>
          <div className="distant-building" style={{ height: '90px', left: '8%' }}></div>
          <div className="distant-building" style={{ height: '45px', left: '12%' }}></div>
          <div className="distant-building" style={{ height: '110px', left: '15%' }}></div>
          <div className="distant-building" style={{ height: '70px', left: '19%' }}></div>
          <div className="distant-building" style={{ height: '55px', left: '75%' }}></div>
          <div className="distant-building" style={{ height: '85px', left: '78%' }}></div>
          <div className="distant-building" style={{ height: '120px', left: '82%' }}></div>
          <div className="distant-building" style={{ height: '65px', left: '87%' }}></div>
          <div className="distant-building" style={{ height: '95px', left: '91%' }}></div>
        </div>
        <div className="horizon-glow"></div>
        <div className="atmospheric-fog"></div>
        <div className="god-rays"></div>
      </div>

      {/* Top Stats Bar */}
      <div className="city-stats-bar">
        <div className="city-name-container">
          {isEditingName ? (
            <input
              type="text"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
              autoFocus
              className="city-name-input"
            />
          ) : (
            <h2 onClick={() => setIsEditingName(true)} className="city-name">
              {cityName} <span className="edit-hint">✏️</span>
            </h2>
          )}
        </div>
        
        <div className="stats-group">
          <div className="stat-item money">
            <span className="stat-icon">💰</span>
            <span className="stat-value">${money.toLocaleString()}</span>
            {income > 0 && <span className="stat-change">+${income}/day</span>}
          </div>
          <div className="stat-item population">
            <span className="stat-icon">👥</span>
            <span className="stat-value">{population.toLocaleString()}</span>
          </div>
          <div className="stat-item happiness">
            <span className="stat-icon">{happiness >= 70 ? '😊' : happiness >= 40 ? '😐' : '😢'}</span>
            <span className="stat-value">{happiness}%</span>
          </div>
          <div className="stat-item day">
            <span className="stat-icon">📅</span>
            <span className="stat-value">Day {day}</span>
          </div>
        </div>

        <div className="game-controls">
          <button 
            className={`speed-btn ${isPaused ? 'paused' : ''}`}
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? '▶️' : '⏸️'}
          </button>
          <button 
            className={`speed-btn ${gameSpeed === 1 ? 'active' : ''}`}
            onClick={() => setGameSpeed(1)}
          >
            1x
          </button>
          <button 
            className={`speed-btn ${gameSpeed === 2 ? 'active' : ''}`}
            onClick={() => setGameSpeed(2)}
          >
            2x
          </button>
          <button 
            className={`speed-btn ${gameSpeed === 3 ? 'active' : ''}`}
            onClick={() => setGameSpeed(3)}
          >
            3x
          </button>
          <button 
            className="save-btn"
            onClick={() => {
              const saveData = { grid, money, day, cityName, achievements }
              localStorage.setItem('isometricCitySave', JSON.stringify(saveData))
              addNotification('Game saved!', 'success')
            }}
            title="Save Game"
          >
            💾
          </button>
          <button 
            className="save-btn"
            onClick={() => {
              if (window.confirm('Load saved game? This will replace your current city.')) {
                const saved = localStorage.getItem('isometricCitySave')
                if (saved) {
                  try {
                    const data = JSON.parse(saved)
                    setGrid(data.grid || grid)
                    setMoney(data.money || 2000)
                    setDay(data.day || 1)
                    setCityName(data.cityName || 'New Haven')
                    setAchievements(data.achievements || [])
                    addNotification('Game loaded!', 'success')
                  } catch (e) {
                    addNotification('Failed to load save', 'error')
                  }
                } else {
                  addNotification('No save found', 'error')
                }
              }
            }}
            title="Load Game"
          >
            📂
          </button>
        </div>
      </div>

      {/* Building Tools Panel */}
      <div className={`tools-panel ${!showToolsPanel ? 'collapsed' : ''}`}>
        <button 
          className="panel-toggle"
          onClick={() => setShowToolsPanel(!showToolsPanel)}
          aria-label="Toggle tools panel"
        >
          {showToolsPanel ? '◀' : '▶'}
        </button>
        <h3>🏗️ Build</h3>
        <div className="tools-grid">
          {Object.values(BUILDING_TYPES).map(type => (
            <button
              key={type.id}
              className={`tool-btn ${selectedTool === type.id && !isDeleting ? 'selected' : ''}`}
              onClick={() => { setSelectedTool(type.id); setIsDeleting(false); }}
              disabled={money < type.cost}
              title={`${type.name} - $${type.cost}`}
            >
              <span className="tool-icon">{type.icon}</span>
              <span className="tool-name">{type.name}</span>
              <span className="tool-cost">${type.cost}</span>
            </button>
          ))}
        </div>
        <button 
          className={`demolish-btn ${isDeleting ? 'active' : ''}`}
          onClick={() => setIsDeleting(!isDeleting)}
        >
          🔨 Demolish Mode
        </button>
      </div>

      {/* Info Panel */}
      <div className={`info-panel ${!showInfoPanel ? 'collapsed' : ''}`}>
        <button 
          className="panel-toggle"
          onClick={() => setShowInfoPanel(!showInfoPanel)}
          aria-label="Toggle info panel"
        >
          {showInfoPanel ? '▶' : '◀'}
        </button>
        <h3>📊 City Info</h3>
        <div className="info-stats">
          <div className="info-row">
            <span>Buildings</span>
            <span>{grid.flat().filter(Boolean).length}</span>
          </div>
          <div className="info-row">
            <span>Daily Income</span>
            <span className="income-value">+${income}</span>
          </div>
          <div className="info-row">
            <span>Population</span>
            <span>{population}</span>
          </div>
        </div>
        
        <h4>🏆 Achievements</h4>
        <div className="achievements-list">
          {ACHIEVEMENTS.map(a => (
            <div 
              key={a.id} 
              className={`achievement-item ${achievements.includes(a.id) ? 'unlocked' : 'locked'}`}
              title={a.description}
            >
              {achievements.includes(a.id) ? '⭐' : '🔒'} {a.name}
            </div>
          ))}
        </div>
      </div>

      {/* Volumetric fog layer */}
      <div className="volumetric-fog">
        {Array.from({ length: 8 }).map((_, i) => (
          <div 
            key={i}
            className="fog-particle"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: `${Math.random() * 40}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${15 + Math.random() * 10}s`
            }}
          ></div>
        ))}
      </div>

      {/* Depth of field layer */}
      <div className="depth-of-field"></div>

      {/* Isometric Grid */}
      <div className="isometric-grid" ref={gridRef}>
        <div className="grid-container">
          {/* Render tiles */}
          {grid.map((row, y) =>
            row.map((cell, x) => {
              const { screenX, screenY } = gridToScreen(x, y)
              const isHovered = hoveredTile?.x === x && hoveredTile?.y === y
              
              return (
                <div
                  key={`tile-${x}-${y}`}
                  className={`iso-tile ${cell ? 'occupied' : 'empty'} ${isHovered ? 'hovered' : ''} ${isDeleting && cell ? 'delete-mode' : ''}`}
                  style={{
                    left: screenX,
                    top: screenY,
                    zIndex: x + y
                  }}
                  onClick={() => handleTileClick(x, y)}
                  onMouseEnter={() => setHoveredTile({ x, y })}
                  onMouseLeave={() => setHoveredTile(null)}
                >
                  <div className="tile-surface">
                    <div className="tile-grass-detail"></div>
                    <div className="tile-ground-shine"></div>
                    <div className="tile-wetness"></div>
                    <div className="tile-depth-shadow"></div>
                  </div>
                </div>
              )
            })
          )}
          
          {/* Render buildings */}
          {grid.map((row, y) =>
            row.map((cell, x) => cell && renderBuilding(cell, x, y))
          )}

          {/* Hover preview */}
          {hoveredTile && !grid[hoveredTile.y][hoveredTile.x] && !isDeleting && (
            <>
              <div
                className={`building-preview ${selectedTool !== 'road' && !hasRoadAccess(hoveredTile.x, hoveredTile.y) ? 'no-road-access' : ''}`}
                style={{
                  left: gridToScreen(hoveredTile.x, hoveredTile.y).screenX,
                  top: gridToScreen(hoveredTile.x, hoveredTile.y).screenY - (BUILDING_TYPES[selectedTool].height * 15),
                  zIndex: 1000
                }}
              >
                <div className="preview-body">
                  {BUILDING_TYPES[selectedTool].emoji}
                </div>
              </div>
              {selectedTool !== 'road' && !hasRoadAccess(hoveredTile.x, hoveredTile.y) && (
                <div
                  className="road-warning"
                  style={{
                    left: gridToScreen(hoveredTile.x, hoveredTile.y).screenX,
                    top: gridToScreen(hoveredTile.x, hoveredTile.y).screenY + 20,
                    zIndex: 1001
                  }}
                >
                  ⚠️ Needs Road Access
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div className="notifications">
        {notifications.map(n => (
          <div key={n.id} className={`notification ${n.type}`}>
            {n.message}
          </div>
        ))}
      </div>

      {/* Achievement popup */}
      {showAchievement && (
        <div className="achievement-popup">
          <div className="achievement-content">
            <span className="achievement-star">⭐</span>
            <div className="achievement-text">
              <h4>Achievement Unlocked!</h4>
              <p>{showAchievement.name}</p>
              <small>{showAchievement.description}</small>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Menu */}
      {showUpgradeMenu && selectedBuilding && (
        <div className="upgrade-menu-overlay" onClick={() => { setShowUpgradeMenu(false); setSelectedBuilding(null); }}>
          <div className="upgrade-menu" onClick={(e) => e.stopPropagation()}>
            <button className="close-upgrade-btn" onClick={() => { setShowUpgradeMenu(false); setSelectedBuilding(null); }}>×</button>
            <h3>🏗️ Upgrade Building</h3>
            <div className="upgrade-info">
              <div className="building-preview-upgrade">
                <span style={{ fontSize: '3rem' }}>{BUILDING_TYPES[selectedBuilding.building.type].emoji}</span>
                <div className="level-badge">Level {selectedBuilding.building.level}</div>
              </div>
              <div className="upgrade-stats">
                <p><strong>{BUILDING_TYPES[selectedBuilding.building.type].name}</strong></p>
                {selectedBuilding.building.level < 5 ? (
                  <>
                    <p>Current Level: {selectedBuilding.building.level}/5</p>
                    <p>Upgrade Cost: ${Math.floor(BUILDING_TYPES[selectedBuilding.building.type].cost * 1.5 * selectedBuilding.building.level).toLocaleString()}</p>
                    <p className="upgrade-benefit">
                      +50% income & population
                    </p>
                    <button 
                      className="upgrade-btn"
                      onClick={handleUpgrade}
                      disabled={money < Math.floor(BUILDING_TYPES[selectedBuilding.building.type].cost * 1.5 * selectedBuilding.building.level)}
                    >
                      ⬆️ Upgrade to Level {selectedBuilding.building.level + 1}
                    </button>
                  </>
                ) : (
                  <p className="max-level">🏆 Maximum Level Reached!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="game-instructions">
        <p>🖱️ Click tiles to build • 💡 Build roads first • 🏗️ Click building again to upgrade • 🏭 Add jobs with commercial/industrial</p>
      </div>
    </div>
  )
}

export default IsometricCity

