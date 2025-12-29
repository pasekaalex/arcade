import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import '../App.css'
import './HighwayRacer.css'

const LANE_COUNT = 3
const LANE_WIDTH = 4
const HIGHWAY_WIDTH = LANE_COUNT * LANE_WIDTH

export default function HighwayRacer() {
  const canvasRef = useRef(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [speed, setSpeed] = useState(0)
  const [rpm, setRpm] = useState(0)
  const [distance, setDistance] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [gear, setGear] = useState(1)
  const [crashed, setCrashed] = useState(false)
  const gameRef = useRef({ cleanup: null })
  
  // Mobile touch controls
  const mobileControlsRef = useRef({ left: false, right: false, gas: false, brake: false })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (gameRef.current.cleanup) {
      gameRef.current.cleanup()
    }

    const width = canvas.clientWidth || 1200
    const height = canvas.clientHeight || 600

    // Scene with refined gradient sky
    const scene = new THREE.Scene()
    
    // Create smooth gradient sky
    const skyCanvas = document.createElement('canvas')
    skyCanvas.width = 4
    skyCanvas.height = 1024
    const skyCtx = skyCanvas.getContext('2d')
    const gradient = skyCtx.createLinearGradient(0, 0, 0, 1024)
    gradient.addColorStop(0, '#050510')
    gradient.addColorStop(0.2, '#0a0a20')
    gradient.addColorStop(0.4, '#151535')
    gradient.addColorStop(0.6, '#201540')
    gradient.addColorStop(0.8, '#2a1a4a')
    gradient.addColorStop(1, '#1a1030')
    skyCtx.fillStyle = gradient
    skyCtx.fillRect(0, 0, 4, 1024)
    const skyTexture = new THREE.CanvasTexture(skyCanvas)
    scene.background = skyTexture
    // Smooth atmospheric fog - blends distance into sky
    scene.fog = new THREE.FogExp2(0x151530, 0.003)

    // Camera - lower and further back so car and gauges are visible
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 500)
    camera.position.set(0, 5, 14)
    camera.lookAt(0, 0, -8)

    // Renderer with polished settings
    const renderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance'
    })
    renderer.setSize(width, height, false)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2 // Slightly brighter for smoother visibility
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.physicallyCorrectLights = true // Better light falloff

    // Create environment map for reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    pmremGenerator.compileEquirectangularShader()
    
    // Create a simple neon-lit environment texture
    const envCanvas = document.createElement('canvas')
    envCanvas.width = 256
    envCanvas.height = 128
    const envCtx = envCanvas.getContext('2d')
    
    // Gradient sky for environment
    const envGradient = envCtx.createLinearGradient(0, 0, 0, 128)
    envGradient.addColorStop(0, '#0a0a2e')
    envGradient.addColorStop(0.3, '#1a1a4e')
    envGradient.addColorStop(0.5, '#2d1b4e')
    envGradient.addColorStop(0.7, '#1a1a4e')
    envGradient.addColorStop(1, '#0a0a2e')
    envCtx.fillStyle = envGradient
    envCtx.fillRect(0, 0, 256, 128)
    
    // Add neon color splashes
    const neonSplashes = [
      { x: 30, color: '#ff00ff' },
      { x: 80, color: '#00ffff' },
      { x: 130, color: '#ff0066' },
      { x: 180, color: '#00ff99' },
      { x: 220, color: '#ff00ff' }
    ]
    neonSplashes.forEach(splash => {
      const splashGrad = envCtx.createRadialGradient(splash.x, 64, 0, splash.x, 64, 40)
      splashGrad.addColorStop(0, splash.color + '66')
      splashGrad.addColorStop(1, 'transparent')
      envCtx.fillStyle = splashGrad
      envCtx.fillRect(0, 0, 256, 128)
    })
    
    const envTexture = new THREE.CanvasTexture(envCanvas)
    envTexture.mapping = THREE.EquirectangularReflectionMapping
    const envMap = pmremGenerator.fromEquirectangular(envTexture).texture
    scene.environment = envMap
    pmremGenerator.dispose()

    // Enhanced smooth lighting setup
    
    // Strong ambient for base visibility - warm tint
    const ambientLight = new THREE.AmbientLight(0x667799, 0.8)
    scene.add(ambientLight)

    // Hemisphere light - creates smooth sky-to-ground gradient
    // Sky color (purple/blue), ground color (dark purple), intensity
    const hemiLight = new THREE.HemisphereLight(0x8888cc, 0x332244, 0.7)
    scene.add(hemiLight)

    // Main directional light - soft moonlight from above-left
    const mainLight = new THREE.DirectionalLight(0xaabbee, 0.6)
    mainLight.position.set(-30, 60, -20)
    mainLight.castShadow = true
    mainLight.shadow.mapSize.width = 2048
    mainLight.shadow.mapSize.height = 2048
    mainLight.shadow.camera.near = 1
    mainLight.shadow.camera.far = 200
    mainLight.shadow.camera.left = -60
    mainLight.shadow.camera.right = 60
    mainLight.shadow.camera.top = 60
    mainLight.shadow.camera.bottom = -60
    mainLight.shadow.bias = -0.0005
    mainLight.shadow.normalBias = 0.02
    mainLight.shadow.radius = 3 // Soft shadow edges
    scene.add(mainLight)

    // Warm rim light from behind - creates edge glow on cars
    const rimLight = new THREE.DirectionalLight(0xffaa88, 0.4)
    rimLight.position.set(0, 15, 40)
    scene.add(rimLight)

    // Cool fill light from front - illuminates car faces
    const fillLight = new THREE.DirectionalLight(0x6688cc, 0.35)
    fillLight.position.set(0, 8, -60)
    scene.add(fillLight)

    // Secondary fill from right - reduces harsh shadows
    const fillLight2 = new THREE.DirectionalLight(0x8866aa, 0.25)
    fillLight2.position.set(40, 20, 0)
    scene.add(fillLight2)

    // Low ground bounce light - simulates light reflecting off road
    const bounceLight = new THREE.DirectionalLight(0x444466, 0.2)
    bounceLight.position.set(0, -10, 0)
    scene.add(bounceLight)

    // Neon ambient glow - adds colored atmosphere
    const neonAmbient1 = new THREE.PointLight(0xff00ff, 0.3, 100)
    neonAmbient1.position.set(-30, 15, -50)
    scene.add(neonAmbient1)

    const neonAmbient2 = new THREE.PointLight(0x00ffff, 0.3, 100)
    neonAmbient2.position.set(30, 15, -50)
    scene.add(neonAmbient2)

    // Moon light - key light from distance
    const moonLight = new THREE.DirectionalLight(0xccccff, 0.5)
    moonLight.position.set(-50, 80, -100)
    scene.add(moonLight)

    // Glowing moon
    const moonGeom = new THREE.SphereGeometry(8, 32, 32)
    const moonMat = new THREE.MeshBasicMaterial({ 
      color: 0xffffee,
      transparent: true,
      opacity: 0.9
    })
    const moon = new THREE.Mesh(moonGeom, moonMat)
    moon.position.set(-80, 80, -200)
    scene.add(moon)

    // Moon glow
    const moonGlow = new THREE.Mesh(
      new THREE.SphereGeometry(12, 32, 32),
      new THREE.MeshBasicMaterial({ 
        color: 0xffaaff,
        transparent: true,
        opacity: 0.2
      })
    )
    moonGlow.position.copy(moon.position)
    scene.add(moonGlow)

    // Realistic street lights - warm sodium/LED style
    const streetLightColors = [0xffdd99, 0xffeebb, 0xffcc88, 0xfff0cc] // Warm whites/yellows
    const neonAccentColors = [0xff00ff, 0x00ffff, 0xff0066, 0x00ff99] // Keep some neon accents
    const neonLights = []
    const glowOrbs = []
    
    // Shared materials for performance
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.8, roughness: 0.3 })
    const lampHousingMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.4 })
    
    for (let i = 0; i < 25; i++) {
      const lightColor = streetLightColors[i % streetLightColors.length]
      const side = i % 2 === 0 ? -1 : 1
      const xPos = side * (HIGHWAY_WIDTH / 2 + 2.5)
      const zPos = -i * 30
      
      // Realistic street light - softer, warmer
      const light = new THREE.PointLight(lightColor, 3, 40)
      light.position.set(xPos, 7, zPos)
      light.decay = 2 // Realistic light falloff
      scene.add(light)
      neonLights.push(light)

      // Street lamp pole - taller, thinner
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 8, 8),
        poleMat
      )
      pole.position.set(xPos, 4, zPos)
      pole.castShadow = true
      scene.add(pole)

      // Lamp arm extending over road
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.08, 0.08),
        poleMat
      )
      arm.position.set(xPos - side * 1, 7.8, zPos)
      scene.add(arm)

      // Lamp housing (rectangular fixture)
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.3, 0.5),
        lampHousingMat
      )
      housing.position.set(xPos - side * 2, 7.6, zPos)
      scene.add(housing)

      // Lamp diffuser (glowing part) - subtle warm glow
      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.1, 0.4),
        new THREE.MeshBasicMaterial({ 
          color: lightColor,
          transparent: true,
          opacity: 0.9
        })
      )
      lamp.position.set(xPos - side * 2, 7.4, zPos)
      scene.add(lamp)
      glowOrbs.push({ mesh: lamp, baseColor: lightColor })

      // Subtle light pool on ground - realistic spread
      const groundGlow = new THREE.Mesh(
        new THREE.CircleGeometry(5, 24),
        new THREE.MeshBasicMaterial({ 
          color: lightColor, 
          transparent: true, 
          opacity: 0.15 
        })
      )
      groundGlow.rotation.x = -Math.PI / 2
      groundGlow.position.set(xPos - side * 1.5, 0.02, zPos)
      scene.add(groundGlow)

      // Neon accent signs only on every 8th pole (less frequent)
      if (i % 8 === 0) {
        const signColor = neonAccentColors[Math.floor(i / 8) % neonAccentColors.length]
        const sign = new THREE.Mesh(
          new THREE.BoxGeometry(2, 0.8, 0.1),
          new THREE.MeshBasicMaterial({ color: signColor, transparent: true, opacity: 0.8 })
        )
        sign.position.set(xPos, 5, zPos)
        sign.rotation.y = side * 0.2
        scene.add(sign)
        
        // Sign glow light
        const signLight = new THREE.PointLight(signColor, 1, 15)
        signLight.position.set(xPos, 5, zPos + side * 0.5)
        scene.add(signLight)
      }
    }

    // Fewer floating neon rings for performance
    for (let i = 0; i < 5; i++) {
      const ringColor = neonColors[i % neonColors.length]
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(20, 0.4, 6, 24),
        new THREE.MeshBasicMaterial({ 
          color: ringColor,
          transparent: true,
          opacity: 0.4
        })
      )
      ring.position.set(
        (Math.random() - 0.5) * 80,
        40 + Math.random() * 30,
        -150 - i * 80
      )
      ring.rotation.x = Math.PI / 2
      scene.add(ring)
    }

    // Stars
    const starGeometry = new THREE.BufferGeometry()
    const starPositions = []
    const starColors = []
    for (let i = 0; i < 800; i++) {
      starPositions.push(
        (Math.random() - 0.5) * 500,
        Math.random() * 120 + 25,
        (Math.random() - 0.5) * 500
      )
      // Varied star colors - white, blue, purple tints
      const colorChoice = Math.random()
      if (colorChoice > 0.7) {
        starColors.push(0.8, 0.8, 1.0) // Blue tint
      } else if (colorChoice > 0.4) {
        starColors.push(1.0, 0.95, 0.9) // Warm white
      } else {
        starColors.push(0.9, 0.7, 1.0) // Purple tint
      }
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3))
    starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3))
    const starMaterial = new THREE.PointsMaterial({ 
      size: 0.6, 
      transparent: true, 
      opacity: 0.9,
      vertexColors: true,
      sizeAttenuation: true
    })
    const stars = new THREE.Points(starGeometry, starMaterial)
    scene.add(stars)

    // Rain particles for atmosphere
    const rainGeometry = new THREE.BufferGeometry()
    const rainPositions = []
    const rainVelocities = []
    for (let i = 0; i < 2000; i++) {
      rainPositions.push(
        (Math.random() - 0.5) * 100,
        Math.random() * 50,
        (Math.random() - 0.5) * 200 - 50
      )
      rainVelocities.push(0.5 + Math.random() * 0.5)
    }
    rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rainPositions, 3))
    const rainMaterial = new THREE.PointsMaterial({
      color: 0x8899bb,
      size: 0.08,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    })
    const rain = new THREE.Points(rainGeometry, rainMaterial)
    scene.add(rain)

    // Road - high quality asphalt look
    const roadLength = 100
    
    // Create road texture programmatically
    const roadCanvas = document.createElement('canvas')
    roadCanvas.width = 512
    roadCanvas.height = 512
    const roadCtx = roadCanvas.getContext('2d')
    
    // Base asphalt color
    roadCtx.fillStyle = '#3a3a4a'
    roadCtx.fillRect(0, 0, 512, 512)
    
    // Add subtle noise/texture
    for (let x = 0; x < 512; x += 2) {
      for (let y = 0; y < 512; y += 2) {
        const noise = Math.random() * 20 - 10
        const gray = 58 + noise
        roadCtx.fillStyle = `rgb(${gray}, ${gray}, ${gray + 10})`
        roadCtx.fillRect(x, y, 2, 2)
      }
    }
    
    const roadTexture = new THREE.CanvasTexture(roadCanvas)
    roadTexture.wrapS = THREE.RepeatWrapping
    roadTexture.wrapT = THREE.RepeatWrapping
    roadTexture.repeat.set(2, 10)
    
    const roadMaterial = new THREE.MeshStandardMaterial({ 
      map: roadTexture,
      metalness: 0.4,
      roughness: 0.5,
      emissive: 0x111122,
      emissiveIntensity: 0.2,
      envMapIntensity: 0.8
    })

    // Shared materials
    const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 })
    const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const pinkGlowMat = new THREE.MeshBasicMaterial({ color: 0xff00ff })
    const cyanGlowMat = new THREE.MeshBasicMaterial({ color: 0x00ffff })
    
    for (let i = 0; i < 6; i++) {
      // Main road surface
      const road = new THREE.Mesh(
        new THREE.PlaneGeometry(HIGHWAY_WIDTH + 2, roadLength),
        roadMaterial
      )
      road.rotation.x = -Math.PI / 2
      road.position.z = -i * roadLength
      road.position.y = -0.01
      road.receiveShadow = true
      scene.add(road)

      // Rain puddles for reflections
      const puddleMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        metalness: 0.95,
        roughness: 0.05,
        envMapIntensity: 2.0,
        transparent: true,
        opacity: 0.7
      })
      
      for (let p = 0; p < 4; p++) {
        const puddle = new THREE.Mesh(
          new THREE.CircleGeometry(1.5 + Math.random() * 2, 16),
          puddleMat
        )
        puddle.rotation.x = -Math.PI / 2
        puddle.position.set(
          (Math.random() - 0.5) * (HIGHWAY_WIDTH - 2),
          0.02,
          -i * roadLength - Math.random() * roadLength
        )
        scene.add(puddle)
      }

      // Shoulder/edge strip (darker)
      const leftShoulder = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, roadLength),
        new THREE.MeshStandardMaterial({ color: 0x222230, roughness: 1 })
      )
      leftShoulder.rotation.x = -Math.PI / 2
      leftShoulder.position.set(-HIGHWAY_WIDTH / 2 - 0.75, 0, -i * roadLength - roadLength / 2)
      scene.add(leftShoulder)

      const rightShoulder = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, roadLength),
        new THREE.MeshStandardMaterial({ color: 0x222230, roughness: 1 })
      )
      rightShoulder.rotation.x = -Math.PI / 2
      rightShoulder.position.set(HIGHWAY_WIDTH / 2 + 0.75, 0, -i * roadLength - roadLength / 2)
      scene.add(rightShoulder)

      // Dashed lane markings (white)
      for (let lane = 1; lane < LANE_COUNT; lane++) {
        const laneX = -HIGHWAY_WIDTH / 2 + lane * LANE_WIDTH
        for (let z = 0; z < roadLength; z += 12) {
          const dash = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.03, 4),
            whiteLineMat
          )
          dash.position.set(laneX, 0.02, -i * roadLength - z - 2)
          scene.add(dash)
        }
      }

      // Solid edge lines (yellow)
      const leftLine = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.03, roadLength),
        yellowLineMat
      )
      leftLine.position.set(-HIGHWAY_WIDTH / 2 + 0.2, 0.02, -i * roadLength - roadLength / 2)
      scene.add(leftLine)

      const rightLine = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.03, roadLength),
        yellowLineMat
      )
      rightLine.position.set(HIGHWAY_WIDTH / 2 - 0.2, 0.02, -i * roadLength - roadLength / 2)
      scene.add(rightLine)

      // Neon edge strips (on barrier side)
      const leftNeon = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.1, roadLength),
        pinkGlowMat
      )
      leftNeon.position.set(-HIGHWAY_WIDTH / 2 - 0.3, 0.05, -i * roadLength - roadLength / 2)
      scene.add(leftNeon)

      const rightNeon = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.1, roadLength),
        cyanGlowMat
      )
      rightNeon.position.set(HIGHWAY_WIDTH / 2 + 0.3, 0.05, -i * roadLength - roadLength / 2)
      scene.add(rightNeon)

      // Reflective road studs every lane
      for (let lane = 0; lane <= LANE_COUNT; lane++) {
        const laneX = -HIGHWAY_WIDTH / 2 + lane * LANE_WIDTH
        for (let z = 0; z < roadLength; z += 8) {
          const stud = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.05, 0.15),
            new THREE.MeshBasicMaterial({ 
              color: lane === 0 || lane === LANE_COUNT ? 0xff0000 : 0xffffaa 
            })
          )
          stud.position.set(laneX, 0.03, -i * roadLength - z)
          scene.add(stud)
        }
      }
    }

    // Modern sleek guardrails with neon
    const metalMat = new THREE.MeshStandardMaterial({ 
      color: 0x2a2a35,
      metalness: 0.95,
      roughness: 0.1,
      envMapIntensity: 1.5
    })
    
    for (let i = 0; i < 6; i++) {
      const zBase = -i * roadLength - roadLength / 2

      // === LEFT SIDE ===
      // Sleek metal rail (horizontal bar)
      const leftRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.4, roadLength),
        metalMat
      )
      leftRail.position.set(-HIGHWAY_WIDTH / 2 - 0.8, 0.7, zBase)
      scene.add(leftRail)

      // Second rail below
      const leftRail2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.3, roadLength),
        metalMat
      )
      leftRail2.position.set(-HIGHWAY_WIDTH / 2 - 0.8, 0.25, zBase)
      scene.add(leftRail2)

      // Neon strip running along rail
      const leftNeonStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.08, roadLength),
        new THREE.MeshBasicMaterial({ color: 0xff0066 })
      )
      leftNeonStrip.position.set(-HIGHWAY_WIDTH / 2 - 0.75, 0.9, zBase)
      scene.add(leftNeonStrip)

      // Posts every 8 meters
      for (let p = 0; p < roadLength; p += 8) {
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 1.1, 0.12),
          metalMat
        )
        post.position.set(-HIGHWAY_WIDTH / 2 - 0.8, 0.55, -i * roadLength - p)
        scene.add(post)
      }

      // === RIGHT SIDE ===
      const rightRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.4, roadLength),
        metalMat
      )
      rightRail.position.set(HIGHWAY_WIDTH / 2 + 0.8, 0.7, zBase)
      scene.add(rightRail)

      const rightRail2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.3, roadLength),
        metalMat
      )
      rightRail2.position.set(HIGHWAY_WIDTH / 2 + 0.8, 0.25, zBase)
      scene.add(rightRail2)

      const rightNeonStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.08, roadLength),
        new THREE.MeshBasicMaterial({ color: 0x00ccff })
      )
      rightNeonStrip.position.set(HIGHWAY_WIDTH / 2 + 0.75, 0.9, zBase)
      scene.add(rightNeonStrip)

      for (let p = 0; p < roadLength; p += 8) {
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 1.1, 0.12),
          metalMat
        )
        post.position.set(HIGHWAY_WIDTH / 2 + 0.8, 0.55, -i * roadLength - p)
        scene.add(post)
      }
    }

    // === NEON CITYSCAPE BACKGROUND ===
    const cityNeonColors = [0xff00ff, 0x00ffff, 0xff0066, 0x00ff99, 0xffff00, 0xff6600]
    
    // Create window grid texture
    function createWindowTexture(width, height, windowColor) {
      const canvas = document.createElement('canvas')
      canvas.width = 128
      canvas.height = 256
      const ctx = canvas.getContext('2d')
      
      // Building base - dark with slight texture
      ctx.fillStyle = '#12141a'
      ctx.fillRect(0, 0, 128, 256)
      
      // Add some noise/texture
      for (let i = 0; i < 200; i++) {
        const x = Math.random() * 128
        const y = Math.random() * 256
        const gray = Math.floor(Math.random() * 15) + 10
        ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray + 5})`
        ctx.fillRect(x, y, 2, 2)
      }
      
      // Window grid
      const windowW = 10
      const windowH = 14
      const gapX = 6
      const gapY = 8
      const cols = Math.floor(128 / (windowW + gapX))
      const rows = Math.floor(256 / (windowH + gapY))
      
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const lit = Math.random() > 0.4 // 60% chance lit
          if (lit) {
            const warmCool = Math.random()
            if (warmCool > 0.6) {
              ctx.fillStyle = '#ffffcc' // Warm yellow
            } else if (warmCool > 0.3) {
              ctx.fillStyle = '#aaddff' // Cool blue
            } else {
              ctx.fillStyle = '#ffccaa' // Warm orange
            }
            ctx.globalAlpha = 0.6 + Math.random() * 0.4
          } else {
            ctx.fillStyle = '#1a1c22'
            ctx.globalAlpha = 1
          }
          const x = col * (windowW + gapX) + gapX / 2
          const y = row * (windowH + gapY) + gapY / 2
          ctx.fillRect(x, y, windowW, windowH)
          ctx.globalAlpha = 1
        }
      }
      
      const texture = new THREE.CanvasTexture(canvas)
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      return texture
    }
    
    // === SIDEWALKS ===
    const sidewalkWidth = 6
    
    // Create procedural sidewalk texture with concrete tiles
    const sidewalkCanvas = document.createElement('canvas')
    sidewalkCanvas.width = 128
    sidewalkCanvas.height = 128
    const swCtx = sidewalkCanvas.getContext('2d')
    
    // Base concrete color
    swCtx.fillStyle = '#4a4a55'
    swCtx.fillRect(0, 0, 128, 128)
    
    // Add noise/grain texture
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * 128
      const y = Math.random() * 128
      const gray = Math.floor(Math.random() * 20) + 60
      swCtx.fillStyle = `rgb(${gray}, ${gray}, ${gray + 5})`
      swCtx.fillRect(x, y, 1 + Math.random(), 1 + Math.random())
    }
    
    // Draw tile grid lines (darker grout)
    swCtx.strokeStyle = '#2a2a35'
    swCtx.lineWidth = 2
    
    // Horizontal lines (tiles along the sidewalk)
    for (let y = 0; y <= 128; y += 32) {
      swCtx.beginPath()
      swCtx.moveTo(0, y)
      swCtx.lineTo(128, y)
      swCtx.stroke()
    }
    
    // Vertical lines (tiles across the sidewalk)
    for (let x = 0; x <= 128; x += 64) {
      swCtx.beginPath()
      swCtx.moveTo(x, 0)
      swCtx.lineTo(x, 128)
      swCtx.stroke()
    }
    
    // Add some variation to tiles
    for (let ty = 0; ty < 4; ty++) {
      for (let tx = 0; tx < 2; tx++) {
        // Random slight color variation per tile
        if (Math.random() > 0.7) {
          const tileGray = Math.floor(Math.random() * 15) + 55
          swCtx.fillStyle = `rgba(${tileGray}, ${tileGray}, ${tileGray + 5}, 0.3)`
          swCtx.fillRect(tx * 64 + 2, ty * 32 + 2, 60, 28)
        }
        // Random cracks
        if (Math.random() > 0.85) {
          swCtx.strokeStyle = '#333340'
          swCtx.lineWidth = 1
          swCtx.beginPath()
          const startX = tx * 64 + Math.random() * 50 + 5
          const startY = ty * 32 + Math.random() * 20 + 5
          swCtx.moveTo(startX, startY)
          swCtx.lineTo(startX + Math.random() * 20 - 10, startY + Math.random() * 15)
          swCtx.stroke()
        }
      }
    }
    
    // Add subtle wet spots/stains
    for (let i = 0; i < 3; i++) {
      const spotX = Math.random() * 100 + 10
      const spotY = Math.random() * 100 + 10
      const gradient = swCtx.createRadialGradient(spotX, spotY, 0, spotX, spotY, 8 + Math.random() * 8)
      gradient.addColorStop(0, 'rgba(40, 40, 50, 0.3)')
      gradient.addColorStop(1, 'rgba(40, 40, 50, 0)')
      swCtx.fillStyle = gradient
      swCtx.fillRect(0, 0, 128, 128)
    }
    
    const sidewalkTexture = new THREE.CanvasTexture(sidewalkCanvas)
    sidewalkTexture.wrapS = THREE.RepeatWrapping
    sidewalkTexture.wrapT = THREE.RepeatWrapping
    sidewalkTexture.repeat.set(sidewalkWidth / 4, roadLength / 8)
    
    const sidewalkMat = new THREE.MeshStandardMaterial({
      map: sidewalkTexture,
      color: 0x666677,
      metalness: 0.05,
      roughness: 0.9,
      envMapIntensity: 0.2
    })
    
    // Curb with subtle texture
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0x5a5a65,
      metalness: 0.15,
      roughness: 0.7,
      envMapIntensity: 0.3
    })
    
    for (let i = 0; i < 6; i++) {
      const zBase = -i * roadLength - roadLength / 2
      
      // Left sidewalk
      const leftSidewalk = new THREE.Mesh(
        new THREE.PlaneGeometry(sidewalkWidth, roadLength),
        sidewalkMat
      )
      leftSidewalk.rotation.x = -Math.PI / 2
      leftSidewalk.position.set(-HIGHWAY_WIDTH / 2 - 1 - sidewalkWidth / 2, 0.05, zBase)
      leftSidewalk.receiveShadow = true
      scene.add(leftSidewalk)
      
      // Left curb (raised edge)
      const leftCurb = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.2, roadLength),
        curbMat
      )
      leftCurb.position.set(-HIGHWAY_WIDTH / 2 - 1, 0.15, zBase)
      scene.add(leftCurb)
      
      // Left outer curb
      const leftOuterCurb = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.15, roadLength),
        curbMat
      )
      leftOuterCurb.position.set(-HIGHWAY_WIDTH / 2 - 1 - sidewalkWidth, 0.12, zBase)
      scene.add(leftOuterCurb)
      
      // Right sidewalk
      const rightSidewalk = new THREE.Mesh(
        new THREE.PlaneGeometry(sidewalkWidth, roadLength),
        sidewalkMat
      )
      rightSidewalk.rotation.x = -Math.PI / 2
      rightSidewalk.position.set(HIGHWAY_WIDTH / 2 + 1 + sidewalkWidth / 2, 0.05, zBase)
      rightSidewalk.receiveShadow = true
      scene.add(rightSidewalk)
      
      // Right curb
      const rightCurb = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.2, roadLength),
        curbMat
      )
      rightCurb.position.set(HIGHWAY_WIDTH / 2 + 1, 0.15, zBase)
      scene.add(rightCurb)
      
      // Right outer curb
      const rightOuterCurb = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.15, roadLength),
        curbMat
      )
      rightOuterCurb.position.set(HIGHWAY_WIDTH / 2 + 1 + sidewalkWidth, 0.12, zBase)
      scene.add(rightOuterCurb)
    }
    
    // Close buildings (both sides of road) - positioned after sidewalks
    // First row - right next to sidewalk (separate loops for each side)
    // Left side buildings - row 1
    for (let i = 0; i < 30; i++) {
      const buildingHeight = 20 + Math.random() * 40
      const buildingWidth = 8 + Math.random() * 6
      const buildingDepth = 10
      const xOffset = HIGHWAY_WIDTH / 2 + 1 + sidewalkWidth + buildingWidth / 2 + 1
      const zPos = -i * (buildingDepth + 2) - 15 // Proper spacing based on depth
      
      // Create textured building material
      const windowTex = createWindowTexture(buildingWidth, buildingHeight)
      windowTex.repeat.set(buildingWidth / 10, buildingHeight / 20)
      
      const buildingMaterials = [
        new THREE.MeshStandardMaterial({ map: windowTex, emissive: 0x222244, emissiveIntensity: 0.3 }), // right
        new THREE.MeshStandardMaterial({ map: windowTex, emissive: 0x222244, emissiveIntensity: 0.3 }), // left
        new THREE.MeshStandardMaterial({ color: 0x1a1a22 }), // top
        new THREE.MeshStandardMaterial({ color: 0x0a0a10 }), // bottom
        new THREE.MeshStandardMaterial({ map: windowTex, emissive: 0x222244, emissiveIntensity: 0.3 }), // front
        new THREE.MeshStandardMaterial({ map: windowTex, emissive: 0x222244, emissiveIntensity: 0.3 })  // back
      ]
      
      const building = new THREE.Mesh(
        new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingDepth),
        buildingMaterials
      )
      building.position.set(-xOffset, buildingHeight / 2, zPos)
      scene.add(building)

      // Neon roof accent
      const roofColor = cityNeonColors[i % cityNeonColors.length]
      const roofAccent = new THREE.Mesh(
        new THREE.BoxGeometry(buildingWidth + 0.5, 0.3, buildingDepth + 0.5),
        new THREE.MeshBasicMaterial({ color: roofColor })
      )
      roofAccent.position.set(building.position.x, buildingHeight + 0.15, building.position.z)
      scene.add(roofAccent)

      // Vertical neon strips on some buildings
      if (Math.random() > 0.5) {
        const stripColor = cityNeonColors[Math.floor(Math.random() * cityNeonColors.length)]
        const neonStrip = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, buildingHeight, 0.2),
          new THREE.MeshBasicMaterial({ color: stripColor })
        )
        neonStrip.position.set(
          building.position.x + buildingWidth / 2,
          buildingHeight / 2,
          building.position.z
        )
        scene.add(neonStrip)
      }
    }
    
    // Right side buildings - row 1
    for (let i = 0; i < 30; i++) {
      const buildingHeight = 20 + Math.random() * 40
      const buildingWidth = 8 + Math.random() * 6
      const buildingDepth = 10
      const xOffset = HIGHWAY_WIDTH / 2 + 1 + sidewalkWidth + buildingWidth / 2 + 1
      const zPos = -i * (buildingDepth + 2) - 15
      
      const windowTex = createWindowTexture(buildingWidth, buildingHeight)
      windowTex.repeat.set(buildingWidth / 10, buildingHeight / 20)
      
      const building = new THREE.Mesh(
        new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingDepth),
        [
          new THREE.MeshStandardMaterial({ map: windowTex, emissive: 0x222244, emissiveIntensity: 0.3 }),
          new THREE.MeshStandardMaterial({ map: windowTex, emissive: 0x222244, emissiveIntensity: 0.3 }),
          new THREE.MeshStandardMaterial({ color: 0x1a1a22 }),
          new THREE.MeshStandardMaterial({ color: 0x0a0a10 }),
          new THREE.MeshStandardMaterial({ map: windowTex, emissive: 0x222244, emissiveIntensity: 0.3 }),
          new THREE.MeshStandardMaterial({ map: windowTex, emissive: 0x222244, emissiveIntensity: 0.3 })
        ]
      )
      building.position.set(xOffset, buildingHeight / 2, zPos)
      scene.add(building)

      const roofColor = cityNeonColors[(i + 3) % cityNeonColors.length]
      const roofAccent = new THREE.Mesh(
        new THREE.BoxGeometry(buildingWidth + 0.5, 0.3, buildingDepth + 0.5),
        new THREE.MeshBasicMaterial({ color: roofColor })
      )
      roofAccent.position.set(building.position.x, buildingHeight + 0.15, building.position.z)
      scene.add(roofAccent)
    }

    // Second row of buildings - left side
    for (let i = 0; i < 20; i++) {
      const buildingHeight = 35 + Math.random() * 50
      const buildingWidth = 10 + Math.random() * 8
      const buildingDepth = 12
      const xOffset = HIGHWAY_WIDTH / 2 + 1 + sidewalkWidth + 20 + buildingWidth / 2
      const zPos = -i * (buildingDepth + 3) - 10
      
      const windowTex = createWindowTexture(buildingWidth, buildingHeight)
      windowTex.repeat.set(buildingWidth / 10, buildingHeight / 20)
      
      const building = new THREE.Mesh(
        new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingDepth),
        [
          new THREE.MeshStandardMaterial({ map: windowTex, emissive: 0x222244, emissiveIntensity: 0.3 }),
          new THREE.MeshStandardMaterial({ map: windowTex, emissive: 0x222244, emissiveIntensity: 0.3 }),
          new THREE.MeshStandardMaterial({ color: 0x1a1a22 }),
          new THREE.MeshStandardMaterial({ color: 0x0a0a10 }),
          new THREE.MeshStandardMaterial({ map: windowTex, emissive: 0x222244, emissiveIntensity: 0.3 }),
          new THREE.MeshStandardMaterial({ map: windowTex, emissive: 0x222244, emissiveIntensity: 0.3 })
        ]
      )
      building.position.set(-xOffset, buildingHeight / 2, zPos)
      scene.add(building)

      const roofColor = cityNeonColors[(i + 2) % cityNeonColors.length]
      const roofAccent = new THREE.Mesh(
        new THREE.BoxGeometry(buildingWidth + 0.5, 0.3, buildingDepth + 0.5),
        new THREE.MeshBasicMaterial({ color: roofColor })
      )
      roofAccent.position.set(building.position.x, buildingHeight + 0.15, building.position.z)
      scene.add(roofAccent)
    }
    
    // Second row of buildings - right side
    for (let i = 0; i < 20; i++) {
      const buildingHeight = 35 + Math.random() * 50
      const buildingWidth = 10 + Math.random() * 8
      const buildingDepth = 12
      const xOffset = HIGHWAY_WIDTH / 2 + 1 + sidewalkWidth + 20 + buildingWidth / 2
      const zPos = -i * (buildingDepth + 3) - 10
      
      const windowTex = createWindowTexture(buildingWidth, buildingHeight)
      windowTex.repeat.set(buildingWidth / 10, buildingHeight / 20)
      
      const building = new THREE.Mesh(
        new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingDepth),
        [
          new THREE.MeshStandardMaterial({ map: windowTex, emissive: 0x222244, emissiveIntensity: 0.3 }),
          new THREE.MeshStandardMaterial({ map: windowTex, emissive: 0x222244, emissiveIntensity: 0.3 }),
          new THREE.MeshStandardMaterial({ color: 0x1a1a22 }),
          new THREE.MeshStandardMaterial({ color: 0x0a0a10 }),
          new THREE.MeshStandardMaterial({ map: windowTex, emissive: 0x222244, emissiveIntensity: 0.3 }),
          new THREE.MeshStandardMaterial({ map: windowTex, emissive: 0x222244, emissiveIntensity: 0.3 })
        ]
      )
      building.position.set(xOffset, buildingHeight / 2, zPos)
      scene.add(building)

      const roofColor = cityNeonColors[(i + 4) % cityNeonColors.length]
      const roofAccent = new THREE.Mesh(
        new THREE.BoxGeometry(buildingWidth + 0.5, 0.3, buildingDepth + 0.5),
        new THREE.MeshBasicMaterial({ color: roofColor })
      )
      roofAccent.position.set(building.position.x, buildingHeight + 0.15, building.position.z)
      scene.add(roofAccent)
    }

    // Third row - even taller, further back - left side
    for (let i = 0; i < 15; i++) {
      const buildingHeight = 50 + Math.random() * 60
      const buildingWidth = 12 + Math.random() * 10
      const buildingDepth = 15
      const xOffset = HIGHWAY_WIDTH / 2 + 1 + sidewalkWidth + 45 + buildingWidth / 2
      const zPos = -i * (buildingDepth + 4) - 5
      
      const windowTex = createWindowTexture(buildingWidth, buildingHeight)
      windowTex.repeat.set(buildingWidth / 10, buildingHeight / 20)
      
      const building = new THREE.Mesh(
        new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingDepth),
        [
          new THREE.MeshStandardMaterial({ map: windowTex, emissive: 0x222244, emissiveIntensity: 0.3 }),
          new THREE.MeshStandardMaterial({ map: windowTex, emissive: 0x222244, emissiveIntensity: 0.3 }),
          new THREE.MeshStandardMaterial({ color: 0x1a1a22 }),
          new THREE.MeshStandardMaterial({ color: 0x0a0a10 }),
          new THREE.MeshStandardMaterial({ map: windowTex, emissive: 0x222244, emissiveIntensity: 0.3 }),
          new THREE.MeshStandardMaterial({ map: windowTex, emissive: 0x222244, emissiveIntensity: 0.3 })
        ]
      )
      building.position.set(-xOffset, buildingHeight / 2, zPos)
      scene.add(building)

      const roofColor = cityNeonColors[(i + 4) % cityNeonColors.length]
      const roofAccent = new THREE.Mesh(
        new THREE.BoxGeometry(buildingWidth + 0.5, 0.4, buildingDepth + 0.5),
        new THREE.MeshBasicMaterial({ color: roofColor })
      )
      roofAccent.position.set(building.position.x, buildingHeight + 0.2, building.position.z)
      scene.add(roofAccent)
    }
    
    // Third row - right side
    for (let i = 0; i < 15; i++) {
      const buildingHeight = 50 + Math.random() * 60
      const buildingWidth = 12 + Math.random() * 10
      const buildingDepth = 15
      const xOffset = HIGHWAY_WIDTH / 2 + 1 + sidewalkWidth + 45 + buildingWidth / 2
      const zPos = -i * (buildingDepth + 4) - 5
      
      const windowTex = createWindowTexture(buildingWidth, buildingHeight)
      windowTex.repeat.set(buildingWidth / 10, buildingHeight / 20)
      
      const building = new THREE.Mesh(
        new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingDepth),
        [
          new THREE.MeshStandardMaterial({ map: windowTex, emissive: 0x222244, emissiveIntensity: 0.3 }),
          new THREE.MeshStandardMaterial({ map: windowTex, emissive: 0x222244, emissiveIntensity: 0.3 }),
          new THREE.MeshStandardMaterial({ color: 0x1a1a22 }),
          new THREE.MeshStandardMaterial({ color: 0x0a0a10 }),
          new THREE.MeshStandardMaterial({ map: windowTex, emissive: 0x222244, emissiveIntensity: 0.3 }),
          new THREE.MeshStandardMaterial({ map: windowTex, emissive: 0x222244, emissiveIntensity: 0.3 })
        ]
      )
      building.position.set(xOffset, buildingHeight / 2, zPos)
      scene.add(building)

      const roofColor = cityNeonColors[(i + 5) % cityNeonColors.length]
      const roofAccent = new THREE.Mesh(
        new THREE.BoxGeometry(buildingWidth + 0.5, 0.4, buildingDepth + 0.5),
        new THREE.MeshBasicMaterial({ color: roofColor })
      )
      roofAccent.position.set(building.position.x, buildingHeight + 0.2, building.position.z)
      scene.add(roofAccent)
    }

    // Far background skyscrapers with window textures - left side
    for (let i = 0; i < 20; i++) {
      const height = 50 + Math.random() * 100
      const width = 12 + Math.random() * 15
      const xPos = -(80 + Math.random() * 40)
      const zPos = -i * 30 - 100
      
      // Create textured skyscraper
      const skyTex = createWindowTexture(width, height)
      skyTex.repeat.set(width / 12, height / 25)
      
      const skyMaterials = [
        new THREE.MeshBasicMaterial({ map: skyTex }), // right
        new THREE.MeshBasicMaterial({ map: skyTex }), // left
        new THREE.MeshBasicMaterial({ color: 0x1a1a25 }), // top
        new THREE.MeshBasicMaterial({ color: 0x080810 }), // bottom
        new THREE.MeshBasicMaterial({ map: skyTex }), // front
        new THREE.MeshBasicMaterial({ map: skyTex })  // back
      ]
      
      const skyscraper = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, 15),
        skyMaterials
      )
      skyscraper.position.set(xPos, height / 2, zPos)
      scene.add(skyscraper)

      // Neon outline on top
      const outlineColor = cityNeonColors[Math.floor(Math.random() * cityNeonColors.length)]
      const topLine = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.5, 0.4, 0.4),
        new THREE.MeshBasicMaterial({ color: outlineColor })
      )
      topLine.position.set(xPos, height, zPos + 7.5)
      scene.add(topLine)
      
      // Side neon edge
      const sideEdge = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, height, 0.3),
        new THREE.MeshBasicMaterial({ color: outlineColor, transparent: true, opacity: 0.7 })
      )
      sideEdge.position.set(xPos - width / 2, height / 2, zPos + 7.5)
      scene.add(sideEdge)
      
      const sideEdge2 = sideEdge.clone()
      sideEdge2.position.x = xPos + width / 2
      scene.add(sideEdge2)
    }
    
    // Far background skyscrapers - right side
    for (let i = 0; i < 20; i++) {
      const height = 50 + Math.random() * 100
      const width = 12 + Math.random() * 15
      const xPos = 80 + Math.random() * 40
      const zPos = -i * 30 - 100
      
      const skyTex = createWindowTexture(width, height)
      skyTex.repeat.set(width / 12, height / 25)
      
      const skyscraper = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, 15),
        [
          new THREE.MeshBasicMaterial({ map: skyTex }),
          new THREE.MeshBasicMaterial({ map: skyTex }),
          new THREE.MeshBasicMaterial({ color: 0x1a1a25 }),
          new THREE.MeshBasicMaterial({ color: 0x080810 }),
          new THREE.MeshBasicMaterial({ map: skyTex }),
          new THREE.MeshBasicMaterial({ map: skyTex })
        ]
      )
      skyscraper.position.set(xPos, height / 2, zPos)
      scene.add(skyscraper)

      const outlineColor = cityNeonColors[Math.floor(Math.random() * cityNeonColors.length)]
      const topLine = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.5, 0.4, 0.4),
        new THREE.MeshBasicMaterial({ color: outlineColor })
      )
      topLine.position.set(xPos, height, zPos + 7.5)
      scene.add(topLine)
      
      const sideEdge = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, height, 0.3),
        new THREE.MeshBasicMaterial({ color: outlineColor, transparent: true, opacity: 0.7 })
      )
      sideEdge.position.set(xPos - width / 2, height / 2, zPos + 7.5)
      scene.add(sideEdge)
      
      const sideEdge2 = sideEdge.clone()
      sideEdge2.position.x = xPos + width / 2
      scene.add(sideEdge2)
    }

    // Neon billboard signs
    const billboardTexts = ['NEON', 'CYBER', '2099', 'DRIVE', 'SPEED', 'TURBO']
    for (let i = 0; i < 10; i++) {
      const side = i % 2 === 0 ? -1 : 1
      const signColor = cityNeonColors[i % cityNeonColors.length]
      
      // Billboard frame
      const billboard = new THREE.Mesh(
        new THREE.BoxGeometry(8, 4, 0.5),
        new THREE.MeshBasicMaterial({ color: signColor })
      )
      billboard.position.set(
        side * (HIGHWAY_WIDTH / 2 + 15 + Math.random() * 10),
        15 + Math.random() * 10,
        -i * 80 - 50
      )
      billboard.rotation.y = side * 0.2
      scene.add(billboard)

      // Billboard glow
      const glowLight = new THREE.PointLight(signColor, 2, 20)
      glowLight.position.copy(billboard.position)
      scene.add(glowLight)
      neonLights.push(glowLight)
    }

    // Distant city glow on horizon
    const horizonGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 80),
      new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide
      })
    )
    horizonGlow.position.set(0, 30, -550)
    scene.add(horizonGlow)

    const horizonGlow2 = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 50),
      new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide
      })
    )
    horizonGlow2.position.set(0, 50, -500)
    scene.add(horizonGlow2)

    // === SIDE FILL - Mountains/Hills with neon edges ===
    const mountainMat = new THREE.MeshBasicMaterial({
      color: 0x0a0a18,
      transparent: true,
      opacity: 0.95
    })
    
    // Left mountain range
    for (let i = 0; i < 8; i++) {
      const height = 40 + Math.random() * 60
      const width = 60 + Math.random() * 40
      const mountain = new THREE.Mesh(
        new THREE.ConeGeometry(width / 2, height, 4),
        mountainMat
      )
      mountain.position.set(
        -80 - Math.random() * 50,
        height / 2 - 5,
        -i * 80 - 100
      )
      mountain.rotation.y = Math.random() * Math.PI
      scene.add(mountain)
      
      // Neon edge glow
      const edgeColor = cityNeonColors[i % cityNeonColors.length]
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.7, 0.5, 0.5),
        new THREE.MeshBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.6 })
      )
      edge.position.set(mountain.position.x, height - 5, mountain.position.z)
      edge.rotation.z = Math.PI / 6
      scene.add(edge)
    }
    
    // Right mountain range
    for (let i = 0; i < 8; i++) {
      const height = 40 + Math.random() * 60
      const width = 60 + Math.random() * 40
      const mountain = new THREE.Mesh(
        new THREE.ConeGeometry(width / 2, height, 4),
        mountainMat
      )
      mountain.position.set(
        80 + Math.random() * 50,
        height / 2 - 5,
        -i * 80 - 100
      )
      mountain.rotation.y = Math.random() * Math.PI
      scene.add(mountain)
      
      const edgeColor = cityNeonColors[(i + 3) % cityNeonColors.length]
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.7, 0.5, 0.5),
        new THREE.MeshBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.6 })
      )
      edge.position.set(mountain.position.x, height - 5, mountain.position.z)
      edge.rotation.z = -Math.PI / 6
      scene.add(edge)
    }

    // === Floating neon rings on sides ===
    for (let i = 0; i < 12; i++) {
      const side = i % 2 === 0 ? -1 : 1
      const ringColor = cityNeonColors[i % cityNeonColors.length]
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(8 + Math.random() * 6, 0.3, 8, 24),
        new THREE.MeshBasicMaterial({
          color: ringColor,
          transparent: true,
          opacity: 0.5
        })
      )
      ring.position.set(
        side * (50 + Math.random() * 40),
        15 + Math.random() * 25,
        -i * 60 - 50
      )
      ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.5
      ring.rotation.z = Math.random() * Math.PI
      scene.add(ring)
    }

    // === Vertical neon beams on sides ===
    for (let i = 0; i < 10; i++) {
      const side = i % 2 === 0 ? -1 : 1
      const beamColor = cityNeonColors[i % cityNeonColors.length]
      const beamHeight = 50 + Math.random() * 40
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, beamHeight, 0.4),
        new THREE.MeshBasicMaterial({
          color: beamColor,
          transparent: true,
          opacity: 0.7
        })
      )
      beam.position.set(
        side * (40 + Math.random() * 30),
        beamHeight / 2,
        -i * 70 - 40
      )
      scene.add(beam)
      
      // Glow at top
      const topGlow = new THREE.PointLight(beamColor, 3, 30)
      topGlow.position.set(beam.position.x, beamHeight, beam.position.z)
      scene.add(topGlow)
    }

    // === Wide side buildings (extra far) ===
    for (let i = 0; i < 20; i++) {
      const side = i % 2 === 0 ? -1 : 1
      const height = 30 + Math.random() * 50
      const width = 15 + Math.random() * 20
      
      const farBuilding = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, 15),
        new THREE.MeshBasicMaterial({ color: 0x08080f })
      )
      farBuilding.position.set(
        side * (100 + Math.random() * 60),
        height / 2,
        -i * 50 - 100
      )
      scene.add(farBuilding)
      
      // Roof neon
      const roofColor = cityNeonColors[i % cityNeonColors.length]
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(width + 1, 0.4, 16),
        new THREE.MeshBasicMaterial({ color: roofColor })
      )
      roof.position.set(farBuilding.position.x, height, farBuilding.position.z)
      scene.add(roof)
    }

    // === Neon grid floor extending to sides ===
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      transparent: true,
      opacity: 0.15
    })
    
    // Left grid
    for (let i = 0; i < 20; i++) {
      const gridLine = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 600),
        gridMat
      )
      gridLine.position.set(-30 - i * 5, 0.05, -200)
      scene.add(gridLine)
    }
    
    // Right grid
    for (let i = 0; i < 20; i++) {
      const gridLine = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 600),
        gridMat
      )
      gridLine.position.set(30 + i * 5, 0.05, -200)
      scene.add(gridLine)
    }
    
    // Cross grid lines
    for (let i = 0; i < 15; i++) {
      const crossLine = new THREE.Mesh(
        new THREE.BoxGeometry(200, 0.1, 0.1),
        gridMat
      )
      crossLine.position.set(0, 0.05, -i * 40 - 50)
      scene.add(crossLine)
    }

    // Floating holographic ads
    for (let i = 0; i < 6; i++) {
      const side = i % 2 === 0 ? -1 : 1
      const adColor = cityNeonColors[i % cityNeonColors.length]
      
      const holoAd = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 4),
        new THREE.MeshBasicMaterial({
          color: adColor,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide
        })
      )
      holoAd.position.set(
        side * (HIGHWAY_WIDTH / 2 + 6),
        8,
        -i * 100 - 80
      )
      holoAd.rotation.y = side * 0.3
      scene.add(holoAd)
    }

    // Ground plane extending to horizon (city floor)
    const groundPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 700),
      new THREE.MeshStandardMaterial({
        color: 0x0a0a12,
        emissive: 0x050508,
        emissiveIntensity: 0.2
      })
    )
    groundPlane.rotation.x = -Math.PI / 2
    groundPlane.position.set(0, -0.1, -300)
    scene.add(groundPlane)

    // Player car
    const playerCar = new THREE.Group()
    playerCar.position.set(0, 0, 0)
    scene.add(playerCar)

    // Player lowbeam headlights - angled down onto road
    // Left headlight
    const headlightL = new THREE.SpotLight(0xfff8e0, 8, 50, Math.PI / 6, 0.5, 1.5)
    headlightL.position.set(-1.2, 1.2, -3.5)
    headlightL.target.position.set(-2, -0.5, -20) // Aimed down at road
    headlightL.castShadow = true
    headlightL.shadow.mapSize.width = 512
    headlightL.shadow.mapSize.height = 512
    playerCar.add(headlightL)
    playerCar.add(headlightL.target)

    // Right headlight
    const headlightR = new THREE.SpotLight(0xfff8e0, 8, 50, Math.PI / 6, 0.5, 1.5)
    headlightR.position.set(1.2, 1.2, -3.5)
    headlightR.target.position.set(2, -0.5, -20) // Aimed down at road
    headlightR.castShadow = true
    headlightR.shadow.mapSize.width = 512
    headlightR.shadow.mapSize.height = 512
    playerCar.add(headlightR)
    playerCar.add(headlightR.target)

    // Visible headlight lenses (glowing)
    const headlightLensMat = new THREE.MeshBasicMaterial({ 
      color: 0xffffee,
      transparent: true,
      opacity: 0.95
    })
    const lensGeom = new THREE.CircleGeometry(0.25, 16)
    
    const lensL = new THREE.Mesh(lensGeom, headlightLensMat)
    lensL.position.set(-1.2, 1.2, -4.2)
    lensL.rotation.y = Math.PI
    playerCar.add(lensL)
    
    const lensR = new THREE.Mesh(lensGeom, headlightLensMat)
    lensR.position.set(1.2, 1.2, -4.2)
    lensR.rotation.y = Math.PI
    playerCar.add(lensR)

    // Headlight glow halos
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffcc,
      transparent: true,
      opacity: 0.3
    })
    const glowGeom = new THREE.CircleGeometry(0.5, 16)
    
    const glowL = new THREE.Mesh(glowGeom, glowMat)
    glowL.position.set(-1.2, 1.2, -4.15)
    glowL.rotation.y = Math.PI
    playerCar.add(glowL)
    
    const glowR = new THREE.Mesh(glowGeom, glowMat)
    glowR.position.set(1.2, 1.2, -4.15)
    glowR.rotation.y = Math.PI
    playerCar.add(glowR)

    // Road light pools from headlights (projected onto road)
    const headlightPoolMat = new THREE.MeshBasicMaterial({
      color: 0xffffdd,
      transparent: true,
      opacity: 0.2
    })
    
    const poolL = new THREE.Mesh(
      new THREE.EllipseGeometry ? new THREE.CircleGeometry(4, 16) : new THREE.CircleGeometry(4, 16),
      headlightPoolMat
    )
    poolL.rotation.x = -Math.PI / 2
    poolL.position.set(-2, 0.03, -12)
    poolL.scale.set(1, 2.5, 1) // Elongated oval
    playerCar.add(poolL)
    
    const poolR = new THREE.Mesh(
      new THREE.CircleGeometry(4, 16),
      headlightPoolMat
    )
    poolR.rotation.x = -Math.PI / 2
    poolR.position.set(2, 0.03, -12)
    poolR.scale.set(1, 2.5, 1)
    playerCar.add(poolR)

    // Player car underglow
    const underGlow = new THREE.PointLight(0x00ffff, 3, 15)
    underGlow.position.set(0, 0.5, 0)
    playerCar.add(underGlow)

    // Exhaust particles
    const exhaustGeometry = new THREE.BufferGeometry()
    const exhaustPositions = []
    const exhaustLifetimes = []
    for (let i = 0; i < 50; i++) {
      exhaustPositions.push(0, 0, 0)
      exhaustLifetimes.push(0)
    }
    exhaustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(exhaustPositions, 3))
    const exhaustMaterial = new THREE.PointsMaterial({
      color: 0xff6600,
      size: 0.3,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    })
    const exhaust = new THREE.Points(exhaustGeometry, exhaustMaterial)
    scene.add(exhaust)
    let exhaustIndex = 0

    // Tire smoke for braking
    const smokeGeometry = new THREE.BufferGeometry()
    const smokePositions = []
    const smokeLifetimes = []
    for (let i = 0; i < 30; i++) {
      smokePositions.push(0, 0, 0)
      smokeLifetimes.push(0)
    }
    smokeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(smokePositions, 3))
    const smokeMaterial = new THREE.PointsMaterial({
      color: 0xaaaaaa,
      size: 0.5,
      transparent: true,
      opacity: 0.4
    })
    const smoke = new THREE.Points(smokeGeometry, smokeMaterial)
    scene.add(smoke)
    let smokeIndex = 0

    // Load player model
    const loader = new GLTFLoader()
    let playerModel = null

    loader.load(
      '/old_rusty_car.glb',
      (gltf) => {
        playerModel = gltf.scene
        playerModel.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = false
            // Make car reflective
            if (child.material) {
              child.material.metalness = 0.7
              child.material.roughness = 0.3
              child.material.envMapIntensity = 1.2
            }
          }
        })
        
        const box = new THREE.Box3().setFromObject(playerModel)
        const size = box.getSize(new THREE.Vector3())
        const scale = 9 / Math.max(size.x, size.y, size.z)
        playerModel.scale.setScalar(scale)
        
        box.setFromObject(playerModel)
        const center = box.getCenter(new THREE.Vector3())
        playerModel.position.sub(center)
        playerModel.position.y = 1.5
        playerModel.rotation.y = Math.PI
        
        playerCar.add(playerModel)
      },
      undefined,
      () => {
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(4.5, 3, 9),
          new THREE.MeshStandardMaterial({ 
            color: 0xFF6B6B, 
            metalness: 0.8, 
            roughness: 0.2,
            emissive: 0x330000
          })
        )
        box.position.y = 1.5
        box.castShadow = true
        playerCar.add(box)
      }
    )

    // Speed lines effect
    const speedLineGeometry = new THREE.BufferGeometry()
    const speedLinePositions = []
    const speedLineVelocities = []
    for (let i = 0; i < 100; i++) {
      speedLinePositions.push(
        (Math.random() - 0.5) * 30,
        Math.random() * 5 + 1,
        -Math.random() * 50
      )
      speedLineVelocities.push(Math.random() * 0.5 + 0.5)
    }
    speedLineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(speedLinePositions, 3))
    const speedLineMaterial = new THREE.PointsMaterial({ 
      color: 0xffffff, 
      size: 0.1, 
      transparent: true, 
      opacity: 0
    })
    const speedLines = new THREE.Points(speedLineGeometry, speedLineMaterial)
    scene.add(speedLines)

    // Traffic cars
    const trafficCars = []
    const carModels = { van: null, truck: null, cop: null }

    loader.load('/van.glb', gltf => { carModels.van = gltf.scene }, undefined, () => {})
    loader.load('/truck.glb', gltf => { carModels.truck = gltf.scene }, undefined, () => {})
    loader.load('/cop.glb', gltf => { carModels.cop = gltf.scene }, undefined, () => {})

    function createTrafficCar(lane, z) {
      const group = new THREE.Group()
      // Clamp lane to valid range to prevent out-of-bounds spawning
      const clampedLane = Math.max(0, Math.min(LANE_COUNT - 1, Math.floor(lane)))
      const laneX = -HIGHWAY_WIDTH / 2 + clampedLane * LANE_WIDTH + LANE_WIDTH / 2

      // Only use model files - no fallback boxes
      const availableModels = []
      if (carModels.van) availableModels.push('van')
      if (carModels.truck) availableModels.push('truck')
      if (carModels.cop) availableModels.push('cop')
      
      // If no models loaded yet, return null
      if (availableModels.length === 0) {
        return null
      }
      
      const modelType = availableModels[Math.floor(Math.random() * availableModels.length)]
      const modelToUse = carModels[modelType]
      
      try {
        const model = modelToUse.clone()
        model.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
            // Make traffic cars reflective
            if (child.material) {
              child.material.metalness = 0.6
              child.material.roughness = 0.35
              child.material.envMapIntensity = 1.0
            }
          }
        })
        
        // Scale the model
        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        const scale = 7 / Math.max(size.x, size.y, size.z)
        model.scale.setScalar(scale)
        
        // Adjust rotation based on model type FIRST (before positioning)
        if (modelType === 'van' || modelType === 'cop') {
          model.rotation.y = Math.PI / 2 // 90 degrees
        } else {
          model.rotation.y = Math.PI // 180 degrees for truck
        }
        
        // Now calculate bounding box after rotation
        box.setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        
        // Center horizontally and depth-wise, but position on ground
        model.position.x = -center.x
        model.position.z = -center.z
        
        // Recalculate box after centering and set Y so bottom sits on road
        box.setFromObject(model)
        model.position.y = -box.min.y + 0.02 // Tiny offset to prevent z-fighting
        
        group.add(model)
      } catch (e) {
        return null
      }

      group.position.set(laneX, 0, z)
      scene.add(group)
      return { group, z, lane, type: modelType }
    }

    // Spawn initial traffic after delay - fewer cars with more gaps
    setTimeout(() => {
      for (let i = 0; i < 8; i++) {
        const lane = Math.floor(Math.random() * LANE_COUNT)
        const z = -40 - i * 45 // More space between cars
        const car = createTrafficCar(lane, z)
        if (car) trafficCars.push(car)
      }
    }, 1000)

    // Game state
    let playerX = 0
    let playerZ = 0
    let playerSpeed = 0
    let targetLane = 1 // Middle lane (0, 1, 2)
    let currentLane = 1
    let gameDistance = 0
    let isRunning = false
    let shakeAmount = 0
    
    // Sway/tilt animation
    let currentTilt = 0
    let currentSway = 0
    let currentPitch = 0
    
    // Smooth camera tracking
    let cameraX = 0
    let cameraY = 5
    let cameraZ = 14
    let lookAtX = 0
    let lookAtZ = -10

    // Input
    const keys = {}
    function onKeyDown(e) {
      keys[e.key.toLowerCase()] = true
      if (e.key === ' ') e.preventDefault()
    }
    function onKeyUp(e) {
      keys[e.key.toLowerCase()] = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    const saved = localStorage.getItem('highwayRacerHighScore')
    if (saved) setHighScore(parseInt(saved))

    // Animation
    const clock = new THREE.Clock()
    let animationId
    let time = 0

    function animate() {
      animationId = requestAnimationFrame(animate)
      const delta = Math.min(clock.getDelta(), 0.05)
      time += delta

      isRunning = gameStarted && !gameOver

      // Animate street lights with subtle flicker (realistic sodium lamp behavior)
      neonLights.forEach((light, i) => {
        // Very subtle variation - realistic street lights don't pulse much
        const flicker = Math.sin(time * 0.5 + i * 0.3) * 0.1 + Math.random() * 0.05
        light.intensity = 2.8 + flicker
      })

      // Animate lamp diffusers with subtle glow variation
      glowOrbs.forEach((orb, i) => {
        const pulse = 0.85 + Math.sin(time * 0.8 + i * 0.5) * 0.1
        orb.mesh.material.opacity = pulse
      })

      // Animate moon glow
      moonGlow.material.opacity = 0.15 + Math.sin(time * 0.5) * 0.05
      moonGlow.scale.setScalar(1 + Math.sin(time * 0.3) * 0.05)

      // Animate stars
      stars.rotation.y += delta * 0.01
      starMaterial.opacity = 0.7 + Math.sin(time * 2) * 0.2

      // Animate rain
      const rainPos = rainGeometry.attributes.position.array
      for (let i = 0; i < rainPos.length; i += 3) {
        rainPos[i + 1] -= rainVelocities[i / 3] * 2
        rainPos[i + 2] += playerSpeed * 20 * delta
        if (rainPos[i + 1] < 0) {
          rainPos[i + 1] = 50
          rainPos[i] = playerX + (Math.random() - 0.5) * 100
          rainPos[i + 2] = playerZ - Math.random() * 150
        }
      }
      rainGeometry.attributes.position.needsUpdate = true
      rainMaterial.opacity = 0.3 + playerSpeed * 0.2

      if (isRunning) {
        const mobile = mobileControlsRef.current
        const accel = keys['w'] || keys['arrowup'] || mobile.gas
        const brake = keys['s'] || keys['arrowdown'] || mobile.brake
        const left = keys['a'] || keys['arrowleft'] || mobile.left
        const right = keys['d'] || keys['arrowright'] || mobile.right

        if (accel) {
          playerSpeed = Math.min(1, playerSpeed + delta * 0.5)
        } else if (brake) {
          playerSpeed = Math.max(0, playerSpeed - delta * 1.5)
        } else {
          playerSpeed = Math.max(0, playerSpeed - delta * 0.2)
        }

        if (left) targetLane = Math.max(0, targetLane - delta * 3)
        if (right) targetLane = Math.min(LANE_COUNT - 1, targetLane + delta * 3)

        currentLane += (targetLane - currentLane) * delta * 5
        playerX = -HIGHWAY_WIDTH / 2 + currentLane * LANE_WIDTH + LANE_WIDTH / 2
        
        const moveSpeed = playerSpeed * 35 * delta
        playerZ -= moveSpeed
        gameDistance += moveSpeed

        playerCar.position.x = playerX
        playerCar.position.z = playerZ

        // Smooth sway animation
        const turnDirection = targetLane - currentLane
        const targetTilt = -turnDirection * 0.25 // Body roll when turning
        const targetSway = turnDirection * 0.12 // Steering angle
        const targetPitch = (accel ? -0.08 : brake ? 0.1 : 0) * playerSpeed // Nose dive/lift
        
        // Smooth interpolation for fluid motion
        currentTilt += (targetTilt - currentTilt) * delta * 8
        currentSway += (targetSway - currentSway) * delta * 6
        currentPitch += (targetPitch - currentPitch) * delta * 10
        
        playerCar.rotation.z = currentTilt
        playerCar.rotation.y = currentSway
        playerCar.rotation.x = currentPitch

        // Exhaust particles when accelerating
        if (accel && playerSpeed > 0.2) {
          const exPos = exhaustGeometry.attributes.position.array
          exPos[exhaustIndex * 3] = playerX + (Math.random() - 0.5) * 0.5
          exPos[exhaustIndex * 3 + 1] = 0.5 + Math.random() * 0.3
          exPos[exhaustIndex * 3 + 2] = playerZ + 4 + Math.random()
          exhaustLifetimes[exhaustIndex] = 1.0
          exhaustIndex = (exhaustIndex + 1) % 50
        }
        
        // Update exhaust particles
        const exPos = exhaustGeometry.attributes.position.array
        for (let i = 0; i < exhaustLifetimes.length; i++) {
          if (exhaustLifetimes[i] > 0) {
            exhaustLifetimes[i] -= delta * 3
            exPos[i * 3 + 1] += delta * 2 // Rise up
            exPos[i * 3 + 2] += delta * 5 // Move back
          }
        }
        exhaustGeometry.attributes.position.needsUpdate = true
        exhaustMaterial.opacity = 0.6 * playerSpeed

        // Tire smoke when braking hard
        if (brake && playerSpeed > 0.3) {
          const smPos = smokeGeometry.attributes.position.array
          smPos[smokeIndex * 3] = playerX + (Math.random() - 0.5) * 2
          smPos[smokeIndex * 3 + 1] = 0.2 + Math.random() * 0.2
          smPos[smokeIndex * 3 + 2] = playerZ + 3
          smokeLifetimes[smokeIndex] = 1.0
          smokeIndex = (smokeIndex + 1) % 30
        }
        
        // Update smoke particles
        const smPos = smokeGeometry.attributes.position.array
        for (let i = 0; i < smokeLifetimes.length; i++) {
          if (smokeLifetimes[i] > 0) {
            smokeLifetimes[i] -= delta * 1.5
            smPos[i * 3 + 1] += delta * 1.5 // Rise slowly
            smPos[i * 3 + 2] += delta * 3
          }
        }
        smokeGeometry.attributes.position.needsUpdate = true
        smokeMaterial.opacity = 0.4 * (brake ? 1 : 0.3)

        // Speed lines effect
        speedLineMaterial.opacity = playerSpeed * 0.6
        const positions = speedLineGeometry.attributes.position.array
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 2] += playerSpeed * 2
          if (positions[i + 2] > playerZ + 10) {
            positions[i + 2] = playerZ - 50
            positions[i] = playerX + (Math.random() - 0.5) * 30
          }
        }
        speedLineGeometry.attributes.position.needsUpdate = true

        // Update traffic
        const trafficSpeed = playerSpeed * 30 * delta

        for (let i = trafficCars.length - 1; i >= 0; i--) {
          const car = trafficCars[i]
          car.z += trafficSpeed * 0.3
          car.group.position.z = car.z

          const dx = Math.abs(car.group.position.x - playerCar.position.x)
          const dz = Math.abs(car.z - playerZ)
          
          if (dx < 3.5 && dz < 7) {
            shakeAmount = 1.5
            setCrashed(true)
            setTimeout(() => setCrashed(false), 500)
            setGameOver(true)
            const finalScore = Math.floor(gameDistance * 10)
            setScore(finalScore)
            if (finalScore > highScore) {
              setHighScore(finalScore)
              localStorage.setItem('highwayRacerHighScore', finalScore.toString())
            }
          }

          if (car.z > playerZ + 30) {
            scene.remove(car.group)
            trafficCars.splice(i, 1)
          }
        }

        const furthestZ = trafficCars.length > 0 
          ? Math.min(...trafficCars.map(c => c.z))
          : playerZ - 50

        if (playerZ - furthestZ < 200) {
          const lane = Math.floor(Math.random() * LANE_COUNT)
          const newZ = furthestZ - 35 - Math.random() * 25 // More gap between cars
          const car = createTrafficCar(lane, newZ)
          if (car) trafficCars.push(car)
        }

        const currentSpeed = Math.floor(playerSpeed * 140)
        setSpeed(currentSpeed)
        
        // Calculate gear based on speed (4-speed transmission)
        const currentGear = currentSpeed < 35 ? 1 : 
                           currentSpeed < 70 ? 2 : 
                           currentSpeed < 105 ? 3 : 4
        setGear(currentGear)
        
        // RPM cycles through gears - slower buildup
        const gearSpeeds = [0, 35, 70, 105, 140]
        const gearMin = gearSpeeds[currentGear - 1]
        const gearMax = gearSpeeds[currentGear]
        const gearProgress = Math.min(1, (currentSpeed - gearMin) / (gearMax - gearMin))
        // Slower RPM climb - eased curve
        const easedProgress = gearProgress * gearProgress * (3 - 2 * gearProgress)
        const rpmValue = 1500 + easedProgress * 5500 // 1500-7000 RPM range per gear
        setRpm(Math.floor(Math.max(800, rpmValue)))
        
        setDistance(Math.floor(gameDistance))
        setScore(Math.floor(gameDistance * 10))
      }

      // Camera - smooth tracking with cinematic lag
      shakeAmount *= 0.85
      const shakeX = shakeAmount * (Math.random() - 0.5) * 2
      const shakeY = shakeAmount * (Math.random() - 0.5) * 1.5
      
      // Target positions - lower and further back
      const targetCamX = playerX * 0.3
      const targetCamY = 5 + playerSpeed * 1.5
      const targetCamZ = playerZ + 14
      const targetLookX = playerX * 0.6
      const targetLookZ = playerZ - 10
      
      // Smooth interpolation (cinematic camera lag)
      const camSmooth = delta * 4
      cameraX += (targetCamX - cameraX) * camSmooth
      cameraY += (targetCamY - cameraY) * camSmooth * 0.8
      cameraZ += (targetCamZ - cameraZ) * camSmooth * 2
      lookAtX += (targetLookX - lookAtX) * camSmooth * 1.5
      lookAtZ += (targetLookZ - lookAtZ) * camSmooth * 2
      
      camera.position.x = cameraX + shakeX
      camera.position.y = cameraY + shakeY
      camera.position.z = cameraZ
      camera.lookAt(lookAtX + shakeX * 0.5, 0, lookAtZ)

      renderer.render(scene, camera)
    }

    animate()

    const cleanup = () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      cancelAnimationFrame(animationId)
      renderer.dispose()
    }

    gameRef.current.cleanup = cleanup
    return cleanup
  }, [gameStarted, gameOver, highScore])

  return (
    <div className="highway-racer-container">
      <h1 style={{
        textAlign: 'center',
        fontSize: '2.8em',
        marginBottom: '8px',
        marginTop: '0'
      }}>
        NEON HIGHWAY
      </h1>
      <p style={{
        textAlign: 'center',
        color: 'rgba(150, 200, 255, 0.8)',
        fontSize: '1.1em',
        marginBottom: '25px',
        letterSpacing: '4px',
        textTransform: 'uppercase',
        fontWeight: '300'
      }}>
        Outrun the Night
      </p>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '20px', 
        marginBottom: '25px', 
        flexWrap: 'wrap' 
      }}>
        <div className="stat-card">
          <div className="stat-label" style={{ color: 'rgba(100, 200, 255, 0.8)' }}>Speed</div>
          <div className="stat-value" style={{ color: '#66ccff' }}>{speed} <span style={{ fontSize: '0.5em', opacity: 0.7 }}>km/h</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ color: 'rgba(255, 100, 200, 0.8)' }}>Distance</div>
          <div className="stat-value" style={{ color: '#ff66cc' }}>{distance}<span style={{ fontSize: '0.5em', opacity: 0.7 }}>m</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ color: 'rgba(255, 200, 100, 0.8)' }}>Score</div>
          <div className="stat-value" style={{ color: '#ffcc66' }}>{score.toLocaleString()}</div>
        </div>
        {highScore > 0 && (
          <div className="stat-card">
            <div className="stat-label" style={{ color: 'rgba(255, 215, 100, 0.8)' }}>Best</div>
            <div className="stat-value" style={{ color: '#ffd700' }}>{highScore.toLocaleString()}</div>
          </div>
        )}
      </div>

      <div className="game-canvas-wrapper" style={{ position: 'relative' }}>
        <canvas ref={canvasRef} style={{ 
          width: '100%', 
          height: '500px',
          display: 'block'
        }} />
        
        {/* Crash flash overlay */}
        {crashed && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle, rgba(255,100,50,0.8) 0%, rgba(255,0,0,0.6) 100%)',
            pointerEvents: 'none',
            animation: 'crashFlash 0.5s ease-out'
          }} />
        )}
        
        {/* Dashboard Gauges */}
        {gameStarted && !gameOver && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '30px',
            pointerEvents: 'none'
          }}>
            {/* RPM Gauge */}
            <div style={{
              width: '120px',
              height: '120px',
              background: 'radial-gradient(circle, rgba(20,20,40,0.95) 0%, rgba(10,10,25,0.98) 100%)',
              borderRadius: '50%',
              border: '3px solid #ff0066',
              boxShadow: '0 0 20px rgba(255,0,102,0.5), inset 0 0 30px rgba(0,0,0,0.8)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* Gauge markings */}
              {[0,1,2,3,4,5,6,7,8].map(i => (
                <div key={i} style={{
                  position: 'absolute',
                  width: '2px',
                  height: i >= 6 ? '12px' : '8px',
                  background: i >= 6 ? '#ff0066' : '#666',
                  top: '8px',
                  left: '50%',
                  transformOrigin: '50% 52px',
                  transform: `translateX(-50%) rotate(${-135 + i * 33.75}deg)`
                }} />
              ))}
              {/* Needle */}
              <div style={{
                position: 'absolute',
                width: '3px',
                height: '40px',
                background: 'linear-gradient(to top, #ff0066, #ff6699)',
                bottom: '50%',
                left: '50%',
                transformOrigin: '50% 100%',
                transform: `translateX(-50%) rotate(${-135 + (rpm / 8000) * 270}deg)`,
                borderRadius: '2px',
                boxShadow: '0 0 10px #ff0066'
              }} />
              {/* Center cap */}
              <div style={{
                width: '16px',
                height: '16px',
                background: 'radial-gradient(circle, #333 0%, #111 100%)',
                borderRadius: '50%',
                border: '2px solid #ff0066',
                zIndex: 10
              }} />
              {/* Label */}
              <div style={{
                position: 'absolute',
                bottom: '18px',
                fontSize: '10px',
                color: '#ff0066',
                fontFamily: 'Orbitron, monospace',
                textShadow: '0 0 5px #ff0066'
              }}>RPM</div>
              {/* Value */}
              <div style={{
                position: 'absolute',
                bottom: '30px',
                fontSize: '11px',
                color: '#fff',
                fontFamily: 'Orbitron, monospace'
              }}>{rpm}</div>
            </div>

            {/* Speedometer Gauge */}
            <div style={{
              width: '140px',
              height: '140px',
              background: 'radial-gradient(circle, rgba(20,20,40,0.95) 0%, rgba(10,10,25,0.98) 100%)',
              borderRadius: '50%',
              border: '3px solid #00ffff',
              boxShadow: '0 0 20px rgba(0,255,255,0.5), inset 0 0 30px rgba(0,0,0,0.8)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* Gauge markings */}
              {[0,20,40,60,80,100,120,140].map((v, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  width: '2px',
                  height: v >= 100 ? '14px' : '10px',
                  background: v >= 100 ? '#00ffff' : '#666',
                  top: '8px',
                  left: '50%',
                  transformOrigin: '50% 62px',
                  transform: `translateX(-50%) rotate(${-135 + i * 38.5}deg)`
                }} />
              ))}
              {/* Speed numbers */}
              {[0,40,80,120].map((v, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  fontSize: '9px',
                  color: '#888',
                  fontFamily: 'Orbitron, monospace',
                  top: '22px',
                  left: '50%',
                  transformOrigin: '50% 48px',
                  transform: `translateX(-50%) rotate(${-135 + i * 77}deg)`
                }}>{v}</div>
              ))}
              {/* Needle */}
              <div style={{
                position: 'absolute',
                width: '3px',
                height: '50px',
                background: 'linear-gradient(to top, #00ffff, #66ffff)',
                bottom: '50%',
                left: '50%',
                transformOrigin: '50% 100%',
                transform: `translateX(-50%) rotate(${-135 + (Math.min(speed, 140) / 140) * 270}deg)`,
                borderRadius: '2px',
                boxShadow: '0 0 10px #00ffff'
              }} />
              {/* Center cap */}
              <div style={{
                width: '18px',
                height: '18px',
                background: 'radial-gradient(circle, #333 0%, #111 100%)',
                borderRadius: '50%',
                border: '2px solid #00ffff',
                zIndex: 10
              }} />
              {/* Label */}
              <div style={{
                position: 'absolute',
                bottom: '22px',
                fontSize: '10px',
                color: '#00ffff',
                fontFamily: 'Orbitron, monospace',
                textShadow: '0 0 5px #00ffff'
              }}>KM/H</div>
              {/* Value */}
              <div style={{
                position: 'absolute',
                bottom: '36px',
                fontSize: '14px',
                color: '#fff',
                fontFamily: 'Orbitron, monospace',
                fontWeight: 'bold'
              }}>{speed}</div>
            </div>

            {/* Gear Indicator */}
            <div style={{
              width: '80px',
              height: '120px',
              background: 'radial-gradient(circle, rgba(20,20,40,0.95) 0%, rgba(10,10,25,0.98) 100%)',
              borderRadius: '12px',
              border: '3px solid #ff9900',
              boxShadow: '0 0 20px rgba(255,153,0,0.5), inset 0 0 30px rgba(0,0,0,0.8)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px'
            }}>
              <div style={{
                fontSize: '10px',
                color: '#ff9900',
                fontFamily: 'Orbitron, monospace',
                textShadow: '0 0 5px #ff9900',
                letterSpacing: '2px'
              }}>GEAR</div>
              <div style={{
                fontSize: '48px',
                fontWeight: 'bold',
                fontFamily: 'Orbitron, monospace',
                color: '#fff',
                textShadow: '0 0 15px #ff9900, 0 0 30px rgba(255,153,0,0.5)'
              }}>{gear}</div>
              {/* Gear dots */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '5px' }}>
                {[1,2,3,4].map(g => (
                  <div key={g} style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: g <= gear ? '#ff9900' : '#333',
                    boxShadow: g <= gear ? '0 0 6px #ff9900' : 'none'
                  }} />
                ))}
              </div>
            </div>

            {/* Odometer */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                display: 'flex',
                gap: '2px',
                background: 'linear-gradient(180deg, rgba(10,10,20,0.98) 0%, rgba(20,20,35,0.95) 50%, rgba(10,10,20,0.98) 100%)',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '2px solid #ffcc00',
                boxShadow: '0 0 15px rgba(255,204,0,0.4), inset 0 0 20px rgba(0,0,0,0.8)'
              }}>
                {/* Digit slots */}
                {String(distance).padStart(6, '0').split('').map((digit, i) => (
                  <div key={i} style={{
                    width: '22px',
                    height: '32px',
                    background: 'linear-gradient(180deg, #0a0a12 0%, #1a1a25 20%, #1a1a25 80%, #0a0a12 100%)',
                    borderRadius: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Orbitron, monospace',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#fff',
                    textShadow: '0 0 8px rgba(255,255,255,0.5)',
                    border: '1px solid #333',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6), inset 0 -2px 4px rgba(0,0,0,0.6)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Roller effect lines */}
                    <div style={{
                      position: 'absolute',
                      top: '0',
                      left: '0',
                      right: '0',
                      height: '8px',
                      background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
                      pointerEvents: 'none'
                    }} />
                    <div style={{
                      position: 'absolute',
                      bottom: '0',
                      left: '0',
                      right: '0',
                      height: '8px',
                      background: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
                      pointerEvents: 'none'
                    }} />
                    {digit}
                  </div>
                ))}
                {/* Decimal point area */}
                <div style={{
                  width: '8px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  paddingBottom: '6px',
                  color: '#ffcc00',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>.</div>
                {/* Last digit (tenths) - highlighted */}
                <div style={{
                  width: '22px',
                  height: '32px',
                  background: 'linear-gradient(180deg, #1a0a00 0%, #2a1a08 20%, #2a1a08 80%, #1a0a00 100%)',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'Orbitron, monospace',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#ffcc00',
                  textShadow: '0 0 8px rgba(255,204,0,0.8)',
                  border: '1px solid #553300',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6), inset 0 -2px 4px rgba(0,0,0,0.6)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    height: '8px',
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
                    pointerEvents: 'none'
                  }} />
                  <div style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '0',
                    right: '0',
                    height: '8px',
                    background: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
                    pointerEvents: 'none'
                  }} />
                  {Math.floor((distance * 10) % 10)}
                </div>
              </div>
              <div style={{
                marginTop: '4px',
                fontSize: '10px',
                color: '#ffcc00',
                fontFamily: 'Orbitron, monospace',
                letterSpacing: '2px',
                textShadow: '0 0 5px rgba(255,204,0,0.5)'
              }}>DISTANCE (m)</div>
            </div>
          </div>
        )}
      </div>

      {!gameStarted && (
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <button className="game-button" onClick={() => setGameStarted(true)}>
            Start Race
          </button>
          <p style={{ 
            marginTop: '20px', 
            color: 'rgba(255, 255, 255, 0.4)', 
            fontSize: '0.9em',
            letterSpacing: '1px'
          }}>
            Press W or ↑ to accelerate
          </p>
        </div>
      )}

      {gameOver && (
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <div className="game-over-text">WRECKED</div>
          <p className="final-score">
            Final Score: <span>{score.toLocaleString()}</span>
          </p>
          {score >= highScore && score > 0 && (
            <div className="high-score-badge">
              ★ NEW HIGH SCORE ★
            </div>
          )}
          <div style={{ marginTop: '20px' }}>
            <button className="game-button" onClick={() => {
              setGameStarted(false)
              setGameOver(false)
              setScore(0)
              setDistance(0)
              setSpeed(0)
              setGear(1)
              setRpm(0)
              setCrashed(false)
            }}>
              Race Again
            </button>
          </div>
        </div>
      )}

      {/* Mobile Controls */}
      <div className="highway-mobile-controls" style={{
        display: 'none',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        padding: '15px 20px',
        marginTop: '15px'
      }}>
        {/* Steering */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="mobile-ctrl-btn"
            onTouchStart={() => mobileControlsRef.current.left = true}
            onTouchEnd={() => mobileControlsRef.current.left = false}
            onMouseDown={() => mobileControlsRef.current.left = true}
            onMouseUp={() => mobileControlsRef.current.left = false}
            onMouseLeave={() => mobileControlsRef.current.left = false}
            style={{
              width: '70px',
              height: '70px',
              borderRadius: '15px',
              border: '3px solid #00ffff',
              background: 'rgba(0, 255, 255, 0.15)',
              color: '#00ffff',
              fontSize: '2em',
              cursor: 'pointer',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
          >◀</button>
          <button
            className="mobile-ctrl-btn"
            onTouchStart={() => mobileControlsRef.current.right = true}
            onTouchEnd={() => mobileControlsRef.current.right = false}
            onMouseDown={() => mobileControlsRef.current.right = true}
            onMouseUp={() => mobileControlsRef.current.right = false}
            onMouseLeave={() => mobileControlsRef.current.right = false}
            style={{
              width: '70px',
              height: '70px',
              borderRadius: '15px',
              border: '3px solid #00ffff',
              background: 'rgba(0, 255, 255, 0.15)',
              color: '#00ffff',
              fontSize: '2em',
              cursor: 'pointer',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
          >▶</button>
        </div>
        
        {/* Gas/Brake */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="mobile-ctrl-btn brake"
            onTouchStart={() => mobileControlsRef.current.brake = true}
            onTouchEnd={() => mobileControlsRef.current.brake = false}
            onMouseDown={() => mobileControlsRef.current.brake = true}
            onMouseUp={() => mobileControlsRef.current.brake = false}
            onMouseLeave={() => mobileControlsRef.current.brake = false}
            style={{
              width: '70px',
              height: '70px',
              borderRadius: '15px',
              border: '3px solid #ff4444',
              background: 'rgba(255, 68, 68, 0.15)',
              color: '#ff4444',
              fontSize: '1em',
              fontWeight: 'bold',
              cursor: 'pointer',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
          >BRAKE</button>
          <button
            className="mobile-ctrl-btn gas"
            onTouchStart={() => mobileControlsRef.current.gas = true}
            onTouchEnd={() => mobileControlsRef.current.gas = false}
            onMouseDown={() => mobileControlsRef.current.gas = true}
            onMouseUp={() => mobileControlsRef.current.gas = false}
            onMouseLeave={() => mobileControlsRef.current.gas = false}
            style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              border: '4px solid #00ff66',
              background: 'rgba(0, 255, 102, 0.2)',
              color: '#00ff66',
              fontSize: '1.1em',
              fontWeight: 'bold',
              cursor: 'pointer',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
          >GAS</button>
        </div>
      </div>
      
      <style>{`
        @media (max-width: 900px), (hover: none) and (pointer: coarse) {
          .highway-mobile-controls {
            display: flex !important;
          }
        }
        .mobile-ctrl-btn:active {
          transform: scale(0.95);
          filter: brightness(1.3);
        }
      `}</style>

      <div className="controls-info">
        <p>
          <strong>W / ↑</strong> Accelerate &nbsp;&nbsp;
          <strong>S / ↓</strong> Brake &nbsp;&nbsp;
          <strong>A / ←</strong> Left &nbsp;&nbsp;
          <strong>D / →</strong> Right
        </p>
        <p style={{ fontSize: '0.85em', opacity: 0.6, marginTop: '5px' }}>
          📱 On mobile: Use on-screen buttons to drive
        </p>
      </div>
    </div>
  )
}
