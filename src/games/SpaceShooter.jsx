import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './SpaceShooter.css'

export default function SpaceShooter() {
  const mountRef = useRef(null)
  const sceneRef = useRef(null)
  const rendererRef = useRef(null)
  const cameraRef = useRef(null)
  const shipRef = useRef(null)
  const [score, setScore] = useState(0)
  const [health, setHealth] = useState(100)
  const [gameOver, setGameOver] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const keysRef = useRef({})
  const asteroidsRef = useRef([])
  const bulletsRef = useRef([])
  const particlesRef = useRef([])
  const animationFrameRef = useRef(null)
  const startGameRef = useRef(null)
  const touchStateRef = useRef({ x: 0, y: 0, shooting: false })
  const gameStateRef = useRef({ started: false, over: false })

  // Sync game state ref
  useEffect(() => {
    gameStateRef.current = { started: gameStarted, over: gameOver }
  }, [gameStarted, gameOver])

  useEffect(() => {
    if (!mountRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000011)
    scene.fog = new THREE.Fog(0x000011, 0, 1000)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    )
    camera.position.set(0, 5, 20)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mountRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(10, 10, 5)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    // Stars background
    const starsGeometry = new THREE.BufferGeometry()
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      transparent: true,
      opacity: 0.8
    })
    const starsVertices = []
    for (let i = 0; i < 5000; i++) {
      const x = (Math.random() - 0.5) * 2000
      const y = (Math.random() - 0.5) * 2000
      const z = (Math.random() - 0.5) * 2000
      starsVertices.push(x, y, z)
    }
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3))
    const stars = new THREE.Points(starsGeometry, starsMaterial)
    scene.add(stars)

    // Player ship
    const shipGroup = new THREE.Group()
    
    // Ship body
    const shipBodyGeometry = new THREE.ConeGeometry(1, 3, 8)
    const shipBodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x0044aa,
      emissiveIntensity: 0.5
    })
    const shipBody = new THREE.Mesh(shipBodyGeometry, shipBodyMaterial)
    shipBody.rotation.x = Math.PI
    shipBody.position.y = -1.5
    shipBody.castShadow = true
    shipGroup.add(shipBody)

    // Ship wings
    const wingGeometry = new THREE.BoxGeometry(0.5, 1, 2)
    const wingMaterial = new THREE.MeshStandardMaterial({
      color: 0x0088ff,
      metalness: 0.7,
      roughness: 0.3
    })
    
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial)
    leftWing.position.set(-1.2, -1, 0)
    leftWing.castShadow = true
    shipGroup.add(leftWing)

    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial)
    rightWing.position.set(1.2, -1, 0)
    rightWing.castShadow = true
    shipGroup.add(rightWing)

    // Ship engine glow
    const engineGeometry = new THREE.ConeGeometry(0.3, 1, 8)
    const engineMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8
    })
    const engineGlow = new THREE.Mesh(engineGeometry, engineMaterial)
    engineGlow.rotation.x = Math.PI
    engineGlow.position.y = -3
    shipGroup.add(engineGlow)

    shipGroup.position.set(0, 0, -10)
    scene.add(shipGroup)
    shipRef.current = shipGroup

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(200, 200)
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x001122,
      roughness: 0.8,
      metalness: 0.2
    })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -10
    ground.receiveShadow = true
    scene.add(ground)

    // Keyboard controls
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase()
      keysRef.current[key] = true
      
      // Handle arrow keys
      if (e.key === 'ArrowLeft') keysRef.current['arrowleft'] = true
      if (e.key === 'ArrowRight') keysRef.current['arrowright'] = true
      if (e.key === 'ArrowUp') keysRef.current['arrowup'] = true
      if (e.key === 'ArrowDown') keysRef.current['arrowdown'] = true
      
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        if (gameStateRef.current.started && !gameStateRef.current.over) {
          shoot()
        }
      }
    }

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase()
      keysRef.current[key] = false
      
      // Handle arrow keys
      if (e.key === 'ArrowLeft') keysRef.current['arrowleft'] = false
      if (e.key === 'ArrowRight') keysRef.current['arrowright'] = false
      if (e.key === 'ArrowUp') keysRef.current['arrowup'] = false
      if (e.key === 'ArrowDown') keysRef.current['arrowdown'] = false
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    // Touch controls
    const isMobile = window.matchMedia("(hover: none) and (pointer: coarse)").matches

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        touchStateRef.current.x = e.touches[0].clientX
        touchStateRef.current.y = e.touches[0].clientY
      }
    }

    const handleTouchMove = (e) => {
      if (e.touches.length === 1) {
        touchStateRef.current.x = e.touches[0].clientX
        touchStateRef.current.y = e.touches[0].clientY
      }
    }

    const handleTouchEnd = () => {
      touchStateRef.current.shooting = false
    }

    if (isMobile) {
      renderer.domElement.addEventListener('touchstart', handleTouchStart, { passive: false })
      renderer.domElement.addEventListener('touchmove', handleTouchMove, { passive: false })
      renderer.domElement.addEventListener('touchend', handleTouchEnd)
    }

    // Shooting function
    const shoot = () => {
      if (!gameStateRef.current.started || gameStateRef.current.over || !shipGroup) return
      if (bulletsRef.current.length >= 10) return // Limit bullets
      
      const bulletGeometry = new THREE.SphereGeometry(0.2, 8, 8)
      const bulletMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 1
      })
      const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial)
      bullet.position.copy(shipGroup.position)
      bullet.position.z += 2
      scene.add(bullet)
      bulletsRef.current.push(bullet)
    }

    // Create asteroid
    const createAsteroid = () => {
      if (!shipGroup || !gameStateRef.current.started) return
      
      const size = Math.random() * 2 + 1
      const geometry = new THREE.DodecahedronGeometry(size, 0)
      const material = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.8,
        metalness: 0.2
      })
      const asteroid = new THREE.Mesh(geometry, material)
      
      const angle = (Math.random() - 0.5) * Math.PI * 0.5
      const distance = 50
      asteroid.position.set(
        Math.sin(angle) * distance,
        (Math.random() - 0.5) * 20,
        shipGroup.position.z + 100 + Math.random() * 50
      )
      
      asteroid.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      )
      
      asteroid.userData = {
        velocity: new THREE.Vector3(
          -Math.sin(angle) * 0.3,
          (Math.random() - 0.5) * 0.2,
          -0.5 - Math.random() * 0.5
        ),
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1
        ),
        radius: size,
        isAsteroid: true
      }
      
      asteroid.castShadow = true
      scene.add(asteroid)
      asteroidsRef.current.push(asteroid)
    }

    // Explosion particles
    const createExplosion = (position) => {
      const particleCount = 20
      for (let i = 0; i < particleCount; i++) {
        const geometry = new THREE.SphereGeometry(0.1, 4, 4)
        const material = new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(Math.random(), 1, 0.5),
          transparent: true,
          opacity: 1
        })
        const particle = new THREE.Mesh(geometry, material)
        particle.position.copy(position)
        particle.userData = {
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5
          ),
          life: 1
        }
        scene.add(particle)
        particlesRef.current.push(particle)
      }
    }

    // Start game function
    const startGame = () => {
      setGameStarted(true)
      setGameOver(false)
      setScore(0)
      setHealth(100)
      gameStateRef.current = { started: true, over: false }
      asteroidsRef.current = []
      bulletsRef.current = []
      particlesRef.current = []
      
      // Clear existing asteroids
      scene.children.forEach(child => {
        if (child.userData && child.userData.isAsteroid) {
          scene.remove(child)
        }
      })
      
      // Create initial asteroids
      for (let i = 0; i < 10; i++) {
        setTimeout(() => createAsteroid(), i * 500)
      }
    }
    
    startGameRef.current = startGame

    // Game loop
    let lastAsteroidTime = 0
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)

      if (gameStateRef.current.started && !gameStateRef.current.over && shipGroup) {
        // Ship movement
        const shipSpeed = 0.5
        if (keysRef.current['a'] || keysRef.current['arrowleft']) {
          shipGroup.position.x -= shipSpeed
        }
        if (keysRef.current['d'] || keysRef.current['arrowright']) {
          shipGroup.position.x += shipSpeed
        }
        if (keysRef.current['w'] || keysRef.current['arrowup']) {
          shipGroup.position.y += shipSpeed
        }
        if (keysRef.current['s'] || keysRef.current['arrowdown']) {
          shipGroup.position.y -= shipSpeed
        }

        // Touch controls
        if (isMobile && touchStateRef.current.x > 0) {
          const centerX = window.innerWidth / 2
          const centerY = window.innerHeight / 2
          const deltaX = (touchStateRef.current.x - centerX) / 100
          const deltaY = (centerY - touchStateRef.current.y) / 100
          shipGroup.position.x += deltaX * shipSpeed
          shipGroup.position.y += deltaY * shipSpeed
        }

        // Keep ship in bounds
        shipGroup.position.x = Math.max(-15, Math.min(15, shipGroup.position.x))
        shipGroup.position.y = Math.max(-5, Math.min(10, shipGroup.position.y))

        // Ship tilt animation
        shipGroup.rotation.z = (shipGroup.position.x / 15) * 0.3
        shipGroup.rotation.x = -(shipGroup.position.y / 10) * 0.2

        // Update bullets
        bulletsRef.current = bulletsRef.current.filter(bullet => {
          if (!bullet || !bullet.position) return false
          bullet.position.z += 1
          if (bullet.position.z > 100) {
            if (bullet.parent) {
              scene.remove(bullet)
            }
            bullet.geometry?.dispose()
            bullet.material?.dispose()
            return false
          }
          return true
        })

        // Update asteroids
        asteroidsRef.current = asteroidsRef.current.filter(asteroid => {
          asteroid.position.add(asteroid.userData.velocity)
          asteroid.rotation.x += asteroid.userData.rotationSpeed.x
          asteroid.rotation.y += asteroid.userData.rotationSpeed.y
          asteroid.rotation.z += asteroid.userData.rotationSpeed.z

          // Check collision with ship
          if (!shipGroup) return true
          const distance = asteroid.position.distanceTo(shipGroup.position)
          const asteroidRadius = asteroid.userData.radius || 1
          if (distance < asteroidRadius + 2) {
            createExplosion(asteroid.position)
            scene.remove(asteroid)
            setHealth(prev => {
              const newHealth = Math.max(0, prev - 20)
              if (newHealth <= 0) {
                setGameOver(true)
                gameStateRef.current.over = true
              }
              return newHealth
            })
            return false
          }

          // Check collision with bullets
          for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
            const bullet = bulletsRef.current[i]
            const bulletDistance = asteroid.position.distanceTo(bullet.position)
            const asteroidRadius = asteroid.geometry.parameters.radius || 1
            if (bulletDistance < asteroidRadius + 0.5) {
              createExplosion(asteroid.position)
              scene.remove(asteroid)
              scene.remove(bullet)
              bulletsRef.current.splice(i, 1)
              setScore(prev => prev + 10)
              return false
            }
          }

          if (asteroid.position.z < shipGroup.position.z - 20) {
            scene.remove(asteroid)
            return false
          }
          return true
        })

        // Spawn new asteroids
        const now = Date.now()
        if (now - lastAsteroidTime > 2000) {
          createAsteroid()
          lastAsteroidTime = now
        }

        // Update particles
        particlesRef.current = particlesRef.current.filter(particle => {
          if (!particle || !particle.userData) return false
          particle.position.add(particle.userData.velocity)
          particle.userData.life -= 0.02
          if (particle.material) {
            particle.material.opacity = particle.userData.life
          }
          if (particle.userData.life <= 0) {
            if (particle.parent) {
              scene.remove(particle)
            }
            particle.geometry?.dispose()
            particle.material?.dispose()
            return false
          }
          return true
        })

        // Auto-shoot on mobile (tap to shoot)
        if (isMobile && touchStateRef.current.shooting && bulletsRef.current.length < 5) {
          shoot()
          touchStateRef.current.shooting = false
        }
      }

      // Rotate stars
      if (stars) {
        stars.rotation.y += 0.0005
      }

      // Update camera
      if (shipGroup) {
        camera.position.x += (shipGroup.position.x - camera.position.x) * 0.1
        camera.position.y += (shipGroup.position.y + 5 - camera.position.y) * 0.1
        camera.lookAt(shipGroup.position)
      }

      renderer.render(scene, camera)
    }

    animate()

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('resize', handleResize)
      if (isMobile) {
        renderer.domElement.removeEventListener('touchstart', handleTouchStart)
        renderer.domElement.removeEventListener('touchmove', handleTouchMove)
        renderer.domElement.removeEventListener('touchend', handleTouchEnd)
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [])

  return (
    <div className="space-shooter-container">
      <div ref={mountRef} className="space-shooter-canvas" />
      
      {!gameStarted && (
        <div className="space-shooter-start">
          <h1>🌙 Space Shooter</h1>
          <p>Use WASD or Arrow Keys to move</p>
          <p>Press SPACE to shoot</p>
          <p>Destroy asteroids to score points!</p>
          <button className="start-button" onClick={() => {
            if (startGameRef.current) {
              startGameRef.current()
            }
          }}>
            Start Game
          </button>
        </div>
      )}

      {gameStarted && (
        <div className="space-shooter-ui">
          <div className="ui-stat">
            <span className="stat-label">Score:</span>
            <span className="stat-value">{score}</span>
          </div>
          <div className="ui-stat">
            <span className="stat-label">Health:</span>
            <div className="health-bar">
              <div 
                className="health-fill" 
                style={{ width: `${health}%` }}
              ></div>
            </div>
            <span className="stat-value">{health}%</span>
          </div>
        </div>
      )}

      {gameOver && (
        <div className="space-shooter-gameover">
          <h2>Game Over!</h2>
          <p>Final Score: {score}</p>
          <button className="restart-button" onClick={() => {
            setGameStarted(false)
            setGameOver(false)
            gameStateRef.current = { started: false, over: false }
            if (startGameRef.current) {
              setTimeout(() => {
                if (startGameRef.current) {
                  startGameRef.current()
                }
              }, 100)
            }
          }}>
            Play Again
          </button>
        </div>
      )}

      {/* Mobile controls */}
      {gameStarted && !gameOver && (
        <div className="mobile-space-controls">
          <button 
            className="mobile-shoot-btn"
            onTouchStart={(e) => {
              e.preventDefault()
              touchStateRef.current.shooting = true
            }}
          >
            🔫 SHOOT
          </button>
        </div>
      )}
    </div>
  )
}

