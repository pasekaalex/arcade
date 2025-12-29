import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import '../App.css'

export default function MonkeyBall() {
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const [stats, setStats] = useState({
    velocity: 0,
    position: '0, 0, 0',
    fps: 60,
    distance: 0
  })
  
  // Mobile touch controls
  const touchControlsRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const getCanvasSize = () => {
      const rect = canvas.getBoundingClientRect()
      const style = window.getComputedStyle(canvas)
      return {
        width: rect.width || parseInt(style.width) || 1200,
        height: rect.height || parseInt(style.height) || 600
      }
    }

    const { width, height } = getCanvasSize()

    // Scene setup with vibrant colors
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x87CEEB) // Sky blue
    scene.fog = new THREE.Fog(0x87CEEB, 20, 150)

    // Camera setup
    const aspect = width / height
    const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000)
    camera.position.set(0, 20, 35)
    camera.lookAt(0, 0, 0)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvas,
      antialias: true
    })
    renderer.setSize(width, height, false)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    // Physics world - more stable settings
    const world = new CANNON.World()
    world.gravity.set(0, -15, 0) // Reduced gravity for more control
    world.broadphase = new CANNON.NaiveBroadphase()
    world.solver.iterations = 15
    world.defaultContactMaterial.friction = 0.5
    world.defaultContactMaterial.restitution = 0.1

    // Enhanced lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
    directionalLight.position.set(15, 30, 15)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 100
    directionalLight.shadow.camera.left = -30
    directionalLight.shadow.camera.right = 30
    directionalLight.shadow.camera.top = 30
    directionalLight.shadow.camera.bottom = -30
    scene.add(directionalLight)

    // Create downhill track
    const trackLength = 50
    const trackWidth = 8
    const trackHeight = 0.3
    // Slope is now simulated via gravity, not physical tilt

    // Visual track - create a solid floor box
    const trackGeometry = new THREE.BoxGeometry(trackWidth, 0.5, trackLength)
    const trackVisualMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4CAF50, // Bright green
      metalness: 0.1,
      roughness: 0.8
    })
    const trackMesh = new THREE.Mesh(trackGeometry, trackVisualMaterial)
    trackMesh.position.set(0, -0.25, 0)
    trackMesh.receiveShadow = true
    trackMesh.castShadow = true
    scene.add(trackMesh)

    // Physics track - solid box floor
    const trackShape = new CANNON.Box(new CANNON.Vec3(trackWidth / 2, 0.25, trackLength / 2))
    const trackBody = new CANNON.Body({ mass: 0 })
    trackBody.addShape(trackShape)
    trackBody.position.set(0, -0.25, 0)
    world.addBody(trackBody)

    // Side barriers (walls) with colorful design
    const barrierHeight = 2
    const barrierThickness = 0.5
    const barrierColors = [0xFF6B6B, 0x4ECDC4, 0x45B7D1, 0xFFA07A] // Red, Teal, Blue, Salmon

    // Left and right barriers along the track
    const barrierXPositions = [trackWidth / 2 + barrierThickness / 2, -trackWidth / 2 - barrierThickness / 2]
    
    barrierXPositions.forEach((xPos, i) => {
      // Create multiple barrier segments for visual appeal
      for (let j = 0; j < 10; j++) {
        const segmentLength = trackLength / 10
        const zPos = -trackLength / 2 + j * segmentLength + segmentLength / 2
        
        const barrierGeometry = new THREE.BoxGeometry(barrierThickness, barrierHeight, segmentLength)
        const barrierMaterial = new THREE.MeshStandardMaterial({ 
          color: barrierColors[j % barrierColors.length],
          metalness: 0.3,
          roughness: 0.7
        })
        const barrierMesh = new THREE.Mesh(barrierGeometry, barrierMaterial)
        barrierMesh.position.set(xPos, barrierHeight / 2, zPos)
        barrierMesh.castShadow = true
        barrierMesh.receiveShadow = true
        scene.add(barrierMesh)

        const barrierShape = new CANNON.Box(new CANNON.Vec3(barrierThickness / 2, barrierHeight / 2, segmentLength / 2))
        const barrierBody = new CANNON.Body({ mass: 0 })
        barrierBody.addShape(barrierShape)
        barrierBody.position.set(xPos, barrierHeight / 2, zPos)
        world.addBody(barrierBody)
      }
    })

    // Ball with vibrant color
    const ballRadius = 0.6
    
    const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32)
    const ballVisualMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFD700, // Gold
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x332200,
      emissiveIntensity: 0.2
    })
    const ballMesh = new THREE.Mesh(ballGeometry, ballVisualMaterial)
    ballMesh.castShadow = true
    ballMesh.receiveShadow = true
    // Start at one end of the track
    ballMesh.position.set(0, ballRadius + 0.1, -trackLength / 2 + 5)
    scene.add(ballMesh)

    const ballShape = new CANNON.Sphere(ballRadius)
    const ballBody = new CANNON.Body({ 
      mass: 1,
      linearDamping: 0.2, // Add damping to slow down
      angularDamping: 0.2
    })
    ballBody.addShape(ballShape)
    ballBody.position.set(0, ballRadius + 0.1, -trackLength / 2 + 5)
    ballBody.velocity.set(0, 0, 0) // Start stationary
    const ballMaterial = new CANNON.Material('ball')
    ballMaterial.friction = 0.5
    ballMaterial.restitution = 0.1
    ballBody.material = ballMaterial
    world.addBody(ballBody)
    
    // Contact material between ball and track for better control
    const trackMaterial = new CANNON.Material('track')
    trackBody.material = trackMaterial
    const ballTrackContact = new CANNON.ContactMaterial(ballMaterial, trackMaterial, {
      friction: 0.6,
      restitution: 0.1
    })
    world.addContactMaterial(ballTrackContact)

    // Colorful obstacles along the track
    const obstacles = []
    const obstacleCount = 6
    
    for (let i = 0; i < obstacleCount; i++) {
      const zPos = -trackLength / 2 + (i + 2) * (trackLength / (obstacleCount + 2))
      const xPos = (Math.random() - 0.5) * (trackWidth * 0.5) // Random position across track
      const size = 0.5 + Math.random() * 0.3
      const obstacleHeight = 1 + Math.random() * 0.5
      
      const hue = (i / obstacleCount) * 0.4 + 0.05 // Varying hues
      const obstacleGeometry = new THREE.CylinderGeometry(size * 0.3, size, obstacleHeight, 8)
      const obstacleMaterial = new THREE.MeshStandardMaterial({ 
        color: new THREE.Color().setHSL(hue, 0.9, 0.5),
        metalness: 0.5,
        roughness: 0.5
      })
      const obstacleMesh = new THREE.Mesh(obstacleGeometry, obstacleMaterial)
      obstacleMesh.position.set(xPos, obstacleHeight / 2, zPos)
      obstacleMesh.castShadow = true
      obstacleMesh.receiveShadow = true
      scene.add(obstacleMesh)

      // Use cylinder shape for physics
      const obstacleShape = new CANNON.Cylinder(size * 0.3, size, obstacleHeight, 8)
      const obstacleBody = new CANNON.Body({ mass: 0 })
      obstacleBody.addShape(obstacleShape)
      obstacleBody.position.set(xPos, obstacleHeight / 2, zPos)
      world.addBody(obstacleBody)

      obstacles.push({ mesh: obstacleMesh, body: obstacleBody })
    }

    // Goal/Finish line at the bottom
    const goalGeometry = new THREE.BoxGeometry(trackWidth, 0.2, 2)
    const goalMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFD700, // Gold
      emissive: 0xFFD700,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2
    })
    const goalMesh = new THREE.Mesh(goalGeometry, goalMaterial)
    goalMesh.position.set(0, 0.1, trackLength / 2 - 1)
    goalMesh.rotation.x = -Math.PI / 2
    goalMesh.receiveShadow = true
    scene.add(goalMesh)

    // Helper function to create a tree
    const createTree = (x, z, scale = 1) => {
      const treeGroup = new THREE.Group()
      
      // Trunk
      const trunkGeometry = new THREE.CylinderGeometry(0.3 * scale, 0.4 * scale, 2 * scale, 8)
      const trunkMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513, // Brown
        roughness: 0.9
      })
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
      trunk.position.y = scale
      trunk.castShadow = true
      trunk.receiveShadow = true
      treeGroup.add(trunk)
      
      // Leaves (multiple spheres for a fuller look)
      const leafMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x228B22, // Forest green
        roughness: 0.8
      })
      
      for (let i = 0; i < 3; i++) {
        const leafSize = (1.5 - i * 0.3) * scale
        const leafGeometry = new THREE.ConeGeometry(leafSize, 2 * scale, 8)
        const leaves = new THREE.Mesh(leafGeometry, leafMaterial)
        leaves.position.y = (2 + i * 1.2) * scale
        leaves.castShadow = true
        leaves.receiveShadow = true
        treeGroup.add(leaves)
      }
      
      treeGroup.position.set(x, 0, z)
      // treeGroup rotation removed - flat track
      return treeGroup
    }

    // Add trees along the sides of the track
    for (let i = 0; i < 12; i++) {
      const zPos = -trackLength / 2 + (i + 1) * (trackLength / 13)
      const side = i % 2 === 0 ? 1 : -1
      const xPos = side * (trackWidth / 2 + 3 + Math.random() * 2)
      const scale = 0.8 + Math.random() * 0.4
      const tree = createTree(xPos, zPos, scale)
      scene.add(tree)
    }

    // Helper function to create a rock
    const createRock = (x, z, size = 1) => {
      const rockGroup = new THREE.Group()
      
      // Main rock body (irregular shape using multiple boxes)
      const rockMaterial = new THREE.MeshStandardMaterial({ 
        color: new THREE.Color().setHSL(0.1, 0.3, 0.4), // Dark gray-brown
        roughness: 0.9,
        metalness: 0.1
      })
      
      for (let i = 0; i < 3; i++) {
        const rockSize = size * (0.6 + Math.random() * 0.4)
        const rockGeometry = new THREE.OctahedronGeometry(rockSize, 0)
        const rock = new THREE.Mesh(rockGeometry, rockMaterial)
        rock.position.set(
          (Math.random() - 0.5) * size * 0.5,
          rockSize * 0.5 + (i * rockSize * 0.3),
          (Math.random() - 0.5) * size * 0.5
        )
        rock.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        )
        rock.castShadow = true
        rock.receiveShadow = true
        rockGroup.add(rock)
      }
      
      rockGroup.position.set(x, 0, z)
      // rockGroup rotation removed - flat track
      return rockGroup
    }

    // Add rocks along the track sides
    for (let i = 0; i < 8; i++) {
      const zPos = -trackLength / 2 + (i + 1) * (trackLength / 9)
      const side = i % 2 === 0 ? 1 : -1
      const xPos = side * (trackWidth / 2 + 2 + Math.random() * 1.5)
      const size = 0.4 + Math.random() * 0.3
      const rock = createRock(xPos, zPos, size)
      scene.add(rock)
    }

    // Create decorative flags
    const createFlag = (x, z, color) => {
      const flagGroup = new THREE.Group()
      
      // Pole
      const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 3, 8)
      const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 })
      const pole = new THREE.Mesh(poleGeometry, poleMaterial)
      pole.position.y = 1.5
      pole.castShadow = true
      flagGroup.add(pole)
      
      // Flag
      const flagGeometry = new THREE.PlaneGeometry(1, 0.6)
      const flagMaterial = new THREE.MeshStandardMaterial({ 
        color: color,
        side: THREE.DoubleSide,
        emissive: color,
        emissiveIntensity: 0.3
      })
      const flag = new THREE.Mesh(flagGeometry, flagMaterial)
      flag.position.set(0.5, 2.2, 0)
      flag.rotation.y = Math.PI / 4
      flag.castShadow = true
      flagGroup.add(flag)
      
      flagGroup.position.set(x, 0, z)
      // flagGroup rotation removed - flat track
      return flagGroup
    }

    // Add colorful flags along the track
    const flagColors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF]
    for (let i = 0; i < 6; i++) {
      const zPos = -trackLength / 2 + (i + 1) * (trackLength / 7)
      const xPos = (Math.random() - 0.5) * trackWidth * 0.3
      const flag = createFlag(xPos, zPos, flagColors[i % flagColors.length])
      scene.add(flag)
    }

    // Create clouds in the sky
    const createCloud = (x, y, z, size = 1) => {
      const cloudGroup = new THREE.Group()
      const cloudMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.8,
        roughness: 1.0,
        metalness: 0.0
      })
      
      // Multiple spheres to form a cloud
      for (let i = 0; i < 5; i++) {
        const cloudSize = size * (0.6 + Math.random() * 0.4)
        const cloudGeometry = new THREE.SphereGeometry(cloudSize, 16, 16)
        const cloudPart = new THREE.Mesh(cloudGeometry, cloudMaterial)
        cloudPart.position.set(
          (Math.random() - 0.5) * size * 2,
          (Math.random() - 0.5) * size * 0.5,
          (Math.random() - 0.5) * size * 2
        )
        cloudGroup.add(cloudPart)
      }
      
      cloudGroup.position.set(x, y, z)
      return cloudGroup
    }

    // Add clouds in the background
    for (let i = 0; i < 8; i++) {
      const x = (Math.random() - 0.5) * 60
      const y = 15 + Math.random() * 10
      const z = -30 + Math.random() * 40
      const size = 2 + Math.random() * 3
      const cloud = createCloud(x, y, z, size)
      scene.add(cloud)
    }

    // Create a decorative archway at the start
    const createArch = (z) => {
      const archGroup = new THREE.Group()
      
      // Left pillar
      const pillarGeometry = new THREE.BoxGeometry(0.5, 4, 0.5)
      const pillarMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFF6B6B,
        metalness: 0.3,
        roughness: 0.7
      })
      const leftPillar = new THREE.Mesh(pillarGeometry, pillarMaterial)
      leftPillar.position.set(-trackWidth / 2 - 1, 2, z)
      leftPillar.castShadow = true
      leftPillar.receiveShadow = true
      archGroup.add(leftPillar)
      
      // Right pillar
      const rightPillar = new THREE.Mesh(pillarGeometry, pillarMaterial)
      rightPillar.position.set(trackWidth / 2 + 1, 2, z)
      rightPillar.castShadow = true
      rightPillar.receiveShadow = true
      archGroup.add(rightPillar)
      
      // Top beam
      const beamGeometry = new THREE.BoxGeometry(trackWidth + 3, 0.5, 0.5)
      const beamMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x4ECDC4,
        metalness: 0.5,
        roughness: 0.5
      })
      const beam = new THREE.Mesh(beamGeometry, beamMaterial)
      beam.position.set(0, 4, z)
      beam.castShadow = true
      beam.receiveShadow = true
      archGroup.add(beam)
      
      // archGroup rotation removed - flat track
      return archGroup
    }

    // Add start archway
    const startArch = createArch(-trackLength / 2 + 1)
    scene.add(startArch)

    // Add finish archway
    const finishArch = createArch(trackLength / 2 - 1)
    scene.add(finishArch)

    // Platform tilt for balancing
    let platformTiltX = 0
    let platformTiltZ = 0
    const maxTilt = 0.12 // Reduced for more control

    // Camera controls
    let isDragging = false
    let previousMousePosition = { x: 0, y: 0 }
    let cameraAngle = 0
    let cameraDistance = 30
    let cameraHeight = 20

    const handleMouseDown = (e) => {
      isDragging = true
      previousMousePosition = { x: e.clientX, y: e.clientY }
    }

    const handleMouseMove = (e) => {
      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x
        const deltaY = e.clientY - previousMousePosition.y
        
        cameraAngle += deltaX * 0.01
        cameraHeight = Math.max(10, Math.min(40, cameraHeight - deltaY * 0.1))
        
        previousMousePosition = { x: e.clientX, y: e.clientY }
      }
    }

    const handleMouseUp = () => {
      isDragging = false
    }

    const handleWheel = (e) => {
      e.preventDefault()
      cameraDistance = Math.max(15, Math.min(60, cameraDistance + e.deltaY * 0.1))
    }

    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('mouseleave', handleMouseUp)
    canvas.addEventListener('wheel', handleWheel)

    // Keyboard controls for balancing
    const keys = {}

    const handleKeyDown = (e) => {
      keys[e.key.toLowerCase()] = true
    }

    const handleKeyUp = (e) => {
      keys[e.key.toLowerCase()] = false
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    function updatePlatformTilt() {
      const tiltSpeed = 0.02
      const returnSpeed = 0.1
      
      // Get touch input from ref
      const touchX = touchControlsRef.current.x
      const touchY = touchControlsRef.current.y

      if (keys['arrowleft'] || keys['a'] || touchX < -0.2) {
        platformTiltZ = Math.min(maxTilt, platformTiltZ + tiltSpeed * (touchX < -0.2 ? Math.abs(touchX) * 2 : 1))
      } else if (keys['arrowright'] || keys['d'] || touchX > 0.2) {
        platformTiltZ = Math.max(-maxTilt, platformTiltZ - tiltSpeed * (touchX > 0.2 ? touchX * 2 : 1))
      } else {
        platformTiltZ *= (1 - returnSpeed)
      }

      if (keys['arrowup'] || keys['w'] || touchY < -0.2) {
        platformTiltX = Math.min(maxTilt, platformTiltX + tiltSpeed * (touchY < -0.2 ? Math.abs(touchY) * 2 : 1))
      } else if (keys['arrowdown'] || keys['s'] || touchY > 0.2) {
        platformTiltX = Math.max(-maxTilt, platformTiltX - tiltSpeed * (touchY > 0.2 ? touchY * 2 : 1))
      } else {
        platformTiltX *= (1 - returnSpeed)
      }

      // Tilt the visual track for feedback
      trackMesh.rotation.x = platformTiltX * 0.5
      trackMesh.rotation.z = platformTiltZ * 0.5

      // Control ball through gravity - this simulates tilting the platform
      const gravityX = -platformTiltZ * 12 // Left/right tilt
      const gravityZ = platformTiltX * 12  // Forward/back tilt  
      world.gravity.set(gravityX, -15, gravityZ)
    }

    function syncPhysics() {
      ballMesh.position.copy(ballBody.position)
      ballMesh.quaternion.copy(ballBody.quaternion)
    }

    function updateCamera() {
      // Follow the ball down the track
      const targetX = ballBody.position.x
      const targetZ = ballBody.position.z
      
      camera.position.x = targetX + Math.cos(cameraAngle) * cameraDistance
      camera.position.z = targetZ + Math.sin(cameraAngle) * cameraDistance
      camera.position.y = cameraHeight
      camera.lookAt(targetX, ballBody.position.y + 2, targetZ)
    }

    // Stats
    let lastTime = performance.now()
    let frameCount = 0
    let fps = 60

    function updateStats() {
      const velocity = ballBody.velocity.length()
      const startZ = -trackLength / 2 + 2
      const currentZ = ballBody.position.z
      const distance = Math.max(0, currentZ - startZ)
      
      frameCount++
      const now = performance.now()
      if (now - lastTime >= 1000) {
        fps = frameCount
        frameCount = 0
        lastTime = now
      }

      setStats({
        velocity: velocity.toFixed(2),
        position: `${ballBody.position.x.toFixed(1)}, ${ballBody.position.y.toFixed(1)}, ${ballBody.position.z.toFixed(1)}`,
        fps,
        distance: distance.toFixed(1)
      })
    }

    // Handle resize
    const handleResize = () => {
      const { width: newWidth, height: newHeight } = getCanvasSize()
      camera.aspect = newWidth / newHeight
      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, newHeight, false)
    }

    window.addEventListener('resize', handleResize)

    // Game loop
    const clock = new THREE.Clock()
    let animationFrameId
    
    function animate() {
      animationFrameId = requestAnimationFrame(animate)
      
      const deltaTime = Math.min(clock.getDelta(), 0.05) // Cap delta to prevent physics explosion
      
      updatePlatformTilt()
      world.step(1/60, deltaTime, 5) // More substeps for stability
      syncPhysics()
      updateCamera()
      updateStats()
      
      // Limit ball velocity to prevent it flying off
      const maxSpeed = 20
      const speed = ballBody.velocity.length()
      if (speed > maxSpeed) {
        ballBody.velocity.scale(maxSpeed / speed, ballBody.velocity)
      }
      
      renderer.render(scene, camera)
    }

    renderer.render(scene, camera)
    animate()

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('mouseleave', handleMouseUp)
      canvas.removeEventListener('wheel', handleWheel)
      
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          if (object.material instanceof THREE.Material) {
            object.material.dispose()
          }
        }
      })

      renderer.dispose()
    }
  }, [])

  // Mobile joystick handlers
  const joystickRef = useRef(null)
  const [joystickActive, setJoystickActive] = useState(false)
  
  const handleJoystickStart = (e) => {
    e.preventDefault()
    setJoystickActive(true)
  }
  
  const handleJoystickMove = (e) => {
    if (!joystickActive) return
    e.preventDefault()
    
    const joystick = joystickRef.current
    if (!joystick) return
    
    const rect = joystick.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const touch = e.touches[0]
    const deltaX = (touch.clientX - centerX) / (rect.width / 2)
    const deltaY = (touch.clientY - centerY) / (rect.height / 2)
    
    touchControlsRef.current = {
      x: Math.max(-1, Math.min(1, deltaX)),
      y: Math.max(-1, Math.min(1, deltaY))
    }
  }
  
  const handleJoystickEnd = () => {
    setJoystickActive(false)
    touchControlsRef.current = { x: 0, y: 0 }
  }

  return (
    <div className="container">
      <h1>🎮 Downhill Balance Challenge</h1>
      <p className="subtitle">Balance the ball as it rolls downhill! Use arrow keys to steer.</p>
      <canvas ref={canvasRef} className="game-canvas" />
      <div className="stats">
        <div className="stat">
          <div className="stat-label">Speed</div>
          <div className="stat-value">{stats.velocity}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Distance</div>
          <div className="stat-value">{stats.distance}m</div>
        </div>
        <div className="stat">
          <div className="stat-label">FPS</div>
          <div className="stat-value">{stats.fps}</div>
        </div>
      </div>
      
      {/* Mobile Joystick */}
      <div 
        ref={joystickRef}
        className="mobile-joystick"
        onTouchStart={handleJoystickStart}
        onTouchMove={handleJoystickMove}
        onTouchEnd={handleJoystickEnd}
        style={{
          display: 'none',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background: 'rgba(78, 205, 196, 0.2)',
          border: '3px solid rgba(78, 205, 196, 0.5)',
          margin: '20px auto',
          position: 'relative',
          touchAction: 'none'
        }}
      >
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(calc(-50% + ${touchControlsRef.current.x * 40}px), calc(-50% + ${touchControlsRef.current.y * 40}px))`,
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: joystickActive ? 'rgba(78, 205, 196, 0.8)' : 'rgba(78, 205, 196, 0.5)',
          border: '2px solid #4ecdc4',
          transition: joystickActive ? 'none' : 'transform 0.2s'
        }} />
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '1.5em'
        }}>▲</div>
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '1.5em'
        }}>▼</div>
        <div style={{
          position: 'absolute',
          left: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '1.5em'
        }}>◀</div>
        <div style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '1.5em'
        }}>▶</div>
      </div>
      
      <style>{`
        @media (max-width: 900px), (hover: none) and (pointer: coarse) {
          .mobile-joystick {
            display: block !important;
          }
        }
      `}</style>
      
      <div className="controls">
        <p><strong>Controls:</strong> Use Arrow Keys or WASD to balance and steer</p>
        <p>📱 On mobile: Use the joystick to tilt the platform</p>
        <p>Mouse: Click and drag to rotate camera view | Goal: Reach the golden finish line!</p>
      </div>
    </div>
  )
}
