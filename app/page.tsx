"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Timer, Award, Twitter, Copy } from "lucide-react"
import Image from "next/image"
import { VT323 } from "next/font/google"

const vt323 = VT323({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
})

// Define popup type
type Popup = {
  id: number
  type: "good" | "excellent" | "nice" | "great"
  x: number
  y: number
  opacity: number
  scale: number
}

type Coin = {
  id: number
  x: number
  y: number
  scale: number
  collected: boolean
}

export default function LumberjackGame() {
  const [gameStarted, setGameStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [chopProgress, setChopProgress] = useState(0)
  const [treesChopped, setTreesChopped] = useState(0)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [highscores, setHighscores] = useState<{ score: number; trees: number; wallet: string }[]>([])
  const [spriteIndex, setSpriteIndex] = useState(0)
  const [isWalking, setIsWalking] = useState(false)
  const [walkPosition, setWalkPosition] = useState(-100) // Start off-screen
  const [gameReady, setGameReady] = useState(false)
  const [popups, setPopups] = useState<Popup[]>([])
  const [coins, setCoins] = useState<Coin[]>([])
  const [treeShake, setTreeShake] = useState(false)
  const [showCopied, setShowCopied] = useState(false)
  const contractAddress = "0x000000000000000000000000000000000000dEaD"
  const popupIdRef = useRef(0)
  const coinIdRef = useRef(0)
  const gameAreaRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const walkAnimationRef = useRef<number | null>(null)
  const lastCoinSpawnRef = useRef(0) // Track last coin spawn time

  // Sprite animation constants
  const SPRITE_WIDTH = 64
  const SPRITE_HEIGHT = 64
  const SPRITE_FRAMES = 5
  const WALK_FRAMES = 6
  const ANIMATION_SPEED = 30 // ms per frame
  const WALK_ANIMATION_SPEED = 50 // ms per frame (reduced from 100)
  const COIN_DURATION = 2000 // ms
  const COIN_SPAWN_COOLDOWN = 1500 // ms between possible spawns

  // Start game
  const startGame = () => {
    setGameStarted(true)
    setGameOver(false)
    setScore(0)
    setTimeLeft(30)
    setChopProgress(0)
    setTreesChopped(0)
    setCurrentStreak(0)
    setBestStreak(0)
    setSpriteIndex(0)
    setIsWalking(true)
    setWalkPosition(-100)
    setGameReady(false)
    setPopups([])
    setCoins([])
    setTreeShake(false)

    // Start walking animation
    startWalkingAnimation()
  }

  // Start walking animation
  const startWalkingAnimation = () => {
    let walkFrame = 0
    let position = -100

    const animateWalk = () => {
      // Update walk frame
      walkFrame = (walkFrame + 1) % WALK_FRAMES
      setSpriteIndex(walkFrame)

      // Update position
      position += 4 // Increased from 2
      setWalkPosition(position)

      // Continue walking until reaching the tree
      if (position < 30) {
        walkAnimationRef.current = window.setTimeout(animateWalk, WALK_ANIMATION_SPEED)
      } else {
        // Reached the tree, stop walking and start game
        setIsWalking(false)
        setGameReady(true)
        // Set to idle pose (first frame of chopping animation)
        setSpriteIndex(0)

        // Focus the game area for keyboard events
        if (gameAreaRef.current) {
          gameAreaRef.current.focus()
        }
      }
    }

    animateWalk()
  }

  // Create a popup
  const createPopup = () => {
    // Choose popup type based on streak
    let type: "good" | "excellent" | "nice" | "great" = "good"

    if (currentStreak >= 10) {
      type = "excellent"
    } else if (currentStreak >= 7) {
      type = "great"
    } else if (currentStreak >= 4) {
      type = "nice"
    } else {
      // Randomize between good and nice for lower streaks
      type = Math.random() > 0.5 ? "good" : "nice"
    }

    // Random position near the tree
    const x = Math.random() * 40 + 30 // 30-70%
    const y = Math.random() * 30 + 30 // 30-60%

    const newPopup: Popup = {
      id: popupIdRef.current++,
      type,
      x,
      y,
      opacity: 1,
      scale: 0.8 + Math.random() * 0.4, // Scale between 0.8 and 1.2
    }

    setPopups((prev) => [...prev, newPopup])

    // Remove popup after animation
    setTimeout(() => {
      setPopups((prev) => prev.filter((popup) => popup.id !== newPopup.id))
    }, 1000)
  }

  // Create a coin
  const createCoin = () => {
    const now = Date.now()
    if (now - lastCoinSpawnRef.current < COIN_SPAWN_COOLDOWN) return

    // Random position closer to the tree
    const x = Math.random() * 20 + 40 // 40-60%
    const y = Math.random() * 20 + 40 // 40-60%

    const newCoin: Coin = {
      id: coinIdRef.current++,
      x,
      y,
      scale: 1.5 + Math.random() * 0.3,
      collected: false
    }

    setCoins((prev) => [...prev, newCoin])
    lastCoinSpawnRef.current = now

    // Remove coin after 2 seconds
    setTimeout(() => {
      setCoins((prev) => prev.filter((coin) => coin.id !== newCoin.id))
    }, 2000)
  }

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!gameStarted || gameOver || !gameReady) return

    if (e.code === "Space") {
      e.preventDefault() // Prevent scrolling

      // Start animation sequence
      startChopAnimation()

      // Create popup
      createPopup()

      // Create coin with 15% chance
      if (Math.random() < 0.15) {
        createCoin()
      }

      // Shake tree
      setTreeShake(true)
      setTimeout(() => setTreeShake(false), 150)

      // Add to chop progress
      setChopProgress((prev) => {
        const newProgress = prev + 5

        // If tree is chopped
        if (newProgress >= 100) {
          setTreesChopped((prev) => prev + 1)
          setScore((prev) => prev + 10)
          setCurrentStreak((prev) => {
            const newStreak = prev + 1
            if (newStreak > bestStreak) {
              setBestStreak(newStreak)
            }
            return newStreak
          })
          return 0 // Reset progress for next tree
        }

        return newProgress
      })
    }
  }

  // Start chopping animation
  const startChopAnimation = () => {
    // Cancel any existing animation
    if (animationRef.current) {
      clearTimeout(animationRef.current)
    }

    // Reset to first frame
    setSpriteIndex(0)

    // Start animation sequence - super fast
    const animateSprite = (frame: number) => {
      setSpriteIndex(frame)

      if (frame < SPRITE_FRAMES - 1) {
        animationRef.current = window.setTimeout(() => {
          animateSprite(frame + 1)
        }, ANIMATION_SPEED)
      } else {
        // Reset to idle pose immediately
        setSpriteIndex(0)
      }
    }

    animateSprite(0)
  }

  // Handle coin click
  const handleCoinClick = (coinId: number) => {
    setCoins((prev) => prev.filter(coin => coin.id !== coinId))
    setScore((prev) => prev + 10)
  }

  // Timer
  useEffect(() => {
    if (!gameStarted || gameOver || !gameReady) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setGameOver(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameStarted, gameOver, gameReady])

  // Decrease streak if not chopping
  useEffect(() => {
    if (!gameStarted || gameOver || !gameReady) return

    const streakTimer = setInterval(() => {
      if (chopProgress === 0) {
        setCurrentStreak(0) // Reset streak if not actively chopping
      }
    }, 1500)

    return () => clearInterval(streakTimer)
  }, [gameStarted, gameOver, gameReady, chopProgress])

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current)
      }
      if (walkAnimationRef.current) {
        clearTimeout(walkAnimationRef.current)
      }
    }
  }, [])

  // Get popup image based on type
  const getPopupImage = (type: string) => {
    switch (type) {
      case "good":
        return "/images/popup-good.png"
      case "excellent":
        return "/images/popup-excellent.png"
      case "nice":
        return "/images/popup-nice.png"
      case "great":
        return "/images/popup-great.png"
      default:
        return "/images/popup-good.png"
    }
  }

  // Generate random Solana wallet address
  const generateWalletAddress = () => {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    let address = ''
    for (let i = 0; i < 44; i++) {
      address += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return address
  }

  // Simulate live highscores updates
  useEffect(() => {
    if (gameStarted) {
      const interval = setInterval(() => {
        const newScore = Math.floor(Math.random() * 200) + 50 // 50-250 points
        const newTrees = Math.floor(Math.random() * 15) + 5 // 5-20 trees
        const newEntry = {
          score: newScore,
          trees: newTrees,
          wallet: generateWalletAddress()
        }
        
        setHighscores(prev => {
          const updated = [...prev, newEntry]
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
          return updated
        })
      }, 3000) // Update every 3 seconds

      return () => clearInterval(interval)
    }
  }, [gameStarted])

  // Update highscores when game ends
  useEffect(() => {
    if (gameOver && score > 0) {
      const newHighscore = {
        score,
        trees: treesChopped,
        wallet: generateWalletAddress()
      }
      
      setHighscores(prev => {
        const updated = [...prev, newHighscore]
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
        return updated
      })
    }
  }, [gameOver, score, treesChopped])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(contractAddress)
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 2000)
  }

  return (
    <div className={`relative flex min-h-screen flex-col items-center justify-center p-4 ${vt323.className}`}>
      {/* Full-screen background image */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/images/forest-background.jpeg"
          alt="Forest Background"
          fill
          style={{ objectFit: "cover" }}
          priority
        />
      </div>

      <div className="mb-16 text-center relative">
        {/* Wooden Title Logo - Made bigger */}
        <div className="relative w-[450px] h-[250px] mx-auto">
          <Image
            src="/images/timber-trails-logo.png"
            alt="Timber Trails"
            fill
            className="object-contain drop-shadow-lg"
          />
        </div>
      </div>

      {!gameStarted && !gameOver && (
        <div className="relative flex justify-center items-center">
          {/* Wooden frame */}
          <div className="relative w-[500px] h-[500px]">
            <Image src="/images/wooden-frame.png" alt="Wooden Frame" fill className="object-contain" />

            {/* Card inside wooden frame */}
            <div className="absolute inset-[40px] flex flex-col items-center justify-center">
              <div className="mb-4 rounded-full bg-amber-100 p-4">
                <div className="relative h-16 w-16 overflow-hidden">
                  <Image
                    src="/images/lumberjack-walk.png"
                    alt="Lumberjack"
                    width={SPRITE_WIDTH * WALK_FRAMES}
                    height={SPRITE_HEIGHT}
                    className="absolute"
                    style={{
                      objectFit: "cover",
                      objectPosition: "0 0",
                      width: SPRITE_WIDTH,
                      height: SPRITE_HEIGHT,
                    }}
                  />
                </div>
              </div>
              <h2 className="wood-text mb-6 text-4xl tracking-wider font-black text-amber-950 bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 px-8 py-4 rounded-xl border-4 border-amber-900/20 shadow-lg transform -rotate-2 relative">
                <span className="absolute inset-0 bg-amber-500/10 rounded-xl"></span>
                <span className="relative drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]">Ready to chop some trees?</span>
              </h2>
              <div className="mb-6 space-y-2 text-left text-amber-950 text-lg font-bold">
                <p>• Press the SPACEBAR as fast as you can to chop trees</p>
                <p>• Each tree chopped is worth 10 points</p>
                <p>• Keep your chopping streak going for bonus points!</p>
                <p>• Harvest $LUMBER coins that appear while chopping</p>
                <p>• Click on coins to collect them and become rich!</p>
                <p>• How many trees can you chop in 30 seconds?</p>
              </div>
              <Button size="lg" onClick={startGame} className="bg-amber-700 hover:bg-amber-800 font-extrabold text-lg">
                Start Chopping!
              </Button>
            </div>
          </div>
        </div>
      )}

      {gameStarted && (
        <div className="flex gap-8 items-start mt-[-50px]">
          <div
            className="relative w-full max-w-4xl outline-none"
            ref={gameAreaRef}
            onKeyDown={handleKeyDown}
            tabIndex={0}
          >
            <div className="mb-4 flex items-center justify-between rounded-lg bg-amber-950/90 p-4 text-white backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <svg className="size-6 text-amber-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12 22V16M7 8.5V7C7 5.89543 7.89543 5 9 5H15C16.1046 5 17 5.89543 17 7V8.5M7 8.5V16.5M7 8.5H3M17 8.5V16.5M17 8.5H21M7 16.5V18C7 19.1046 7.89543 20 9 20H15C16.1046 20 17 19.1046 17 18V16.5M7 16.5H3M17 16.5H21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="currentColor"
                  />
                </svg>
                <span className="text-2xl font-extrabold tracking-wider drop-shadow-lg">{score} points</span>
                <Badge variant="outline" className="ml-2 bg-amber-600 text-white text-lg font-bold">
                  {treesChopped} trees
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-600 text-lg font-bold">Streak: {currentStreak}</Badge>
                <Badge variant="outline" className="text-lg font-bold">Best: {bestStreak}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Timer className="size-6 text-red-400" />
                <span className="text-2xl font-extrabold tracking-wider drop-shadow-lg">{gameReady ? timeLeft : 30}s</span>
              </div>
            </div>

            <Progress value={gameReady ? (timeLeft / 30) * 100 : 100} className="mb-4 h-2" />

            <div className="relative flex h-[60vh] flex-col items-center justify-center overflow-hidden rounded-lg shadow-inner">
              {/* Pixel Art Backdrop */}
              <div className="absolute inset-0 h-full w-full">
                <Image
                  src="/images/game-backdrop.png"
                  alt="Game Background"
                  fill
                  style={{ objectFit: "cover" }}
                  priority
                  className="pixelated"
                />
              </div>

              {/* Tree and lumberjack scene */}
              <div className="relative flex h-[70%] w-full max-w-md flex-col items-center justify-center">
                {/* Tree sprite */}
                <div
                  className={`absolute bottom-[20%] transition-transform ${treeShake ? "animate-tree-shake" : ""}`}
                  style={{
                    filter: `brightness(${100 - chopProgress * 0.3}%)`,
                  }}
                >
                  <Image
                    src="/images/tree-sprite-new.png"
                    alt="Tree"
                    width={128}
                    height={128}
                    className="h-auto w-auto scale-[2.5] pixelated"
                  />

                  {/* Chopping progress bar */}
                  <div className="absolute -bottom-8 left-1/2 h-4 w-32 -translate-x-1/2 overflow-hidden rounded-full bg-gray-800/50">
                    <div
                      className="h-full bg-red-500 transition-all duration-100"
                      style={{ width: `${chopProgress}%` }}
                    />
                  </div>
                </div>

                {/* Lumberjack sprite */}
                <div className="absolute bottom-[20%] transition-all duration-300" style={{ left: `${walkPosition}%` }}>
                  <div className="relative h-16 w-16 scale-[2] transform">
                    <Image
                      src={isWalking ? "/images/lumberjack-walk.png" : "/images/lumberjack-sprite.png"}
                      alt="Lumberjack"
                      width={isWalking ? SPRITE_WIDTH * WALK_FRAMES : SPRITE_WIDTH * SPRITE_FRAMES}
                      height={SPRITE_HEIGHT}
                      className="absolute pixelated"
                      style={{
                        objectFit: "cover",
                        objectPosition: `-${spriteIndex * SPRITE_WIDTH}px 0px`,
                        width: isWalking ? SPRITE_WIDTH * WALK_FRAMES : SPRITE_WIDTH * SPRITE_FRAMES,
                        height: SPRITE_HEIGHT,
                      }}
                    />
                  </div>
                </div>

                {/* Popups */}
                {popups.map((popup) => (
                  <div
                    key={popup.id}
                    className="absolute pointer-events-none animate-bounce-slow"
                    style={{
                      left: `${popup.x}%`,
                      top: `${popup.y}%`,
                      opacity: popup.opacity,
                      transform: `scale(${popup.scale})`,
                      transition: "all 0.5s ease-out",
                    }}
                  >
                    <Image
                      src={getPopupImage(popup.type) || "/placeholder.svg"}
                      alt={popup.type}
                      width={150}
                      height={60}
                      className="drop-shadow-lg"
                    />
                  </div>
                ))}

                {/* Coins */}
                {coins.map((coin) => (
                  <div
                    key={coin.id}
                    className="absolute cursor-pointer hover:brightness-110"
                    onClick={() => handleCoinClick(coin.id)}
                    style={{
                      left: `${coin.x}%`,
                      top: `${coin.y}%`,
                      transform: `scale(${coin.scale})`,
                      filter: "drop-shadow(0 0 8px rgba(255, 215, 0, 0.8))"
                    }}
                  >
                    <Image
                      src="/images/coin_1.png"
                      alt="Coin"
                      width={48}
                      height={48}
                      className="pixelated"
                    />
                  </div>
                ))}
              </div>

              {/* Spacebar prompt */}
              {gameReady && (
                <div className="absolute bottom-[5%] left-0 right-0 mx-auto w-64 text-center">
                  <div className="animate-bounce rounded-lg border-2 border-white bg-white/30 p-2 text-white backdrop-blur-sm text-lg font-bold drop-shadow-lg">
                    Press SPACEBAR rapidly!
                  </div>
                </div>
              )}

              {/* Walking prompt */}
              {!gameReady && gameStarted && (
                <div className="absolute bottom-[5%] left-0 right-0 mx-auto w-64 text-center">
                  <div className="rounded-lg border-2 border-white bg-white/30 p-2 text-white backdrop-blur-sm text-lg font-bold drop-shadow-lg">
                    Lumberjack approaching...
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Highscores section */}
          <div className="relative w-[1200px] h-[1200px] mt-[-250px]">
            {/* Contract Address and X Icon Section */}
            <div className="absolute top-[200px] left-1/2 -translate-x-1/2 z-[100] flex items-center justify-center gap-4">
              <a
                href="https://www.x.com/lumberCoin_"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-900/90 hover:bg-amber-800/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110"
              >
                <Twitter className="w-8 h-8 text-white" />
              </a>
              <div 
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-amber-900/90 hover:bg-amber-800/90 transition-all duration-300 cursor-pointer group shadow-lg hover:shadow-xl"
              >
                <span className="text-white font-bold text-xl">CA:</span>
                <span className="text-amber-200 font-mono text-xl">{contractAddress}</span>
                <Copy className="w-5 h-5 text-amber-200 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {showCopied && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-green-500 text-white rounded-lg animate-fade-out text-lg">
                  Copied!
                </div>
              )}
            </div>

            <Image
              src="/images/highscores.png"
              alt="Highscores Board"
              fill
              className="object-contain"
              priority
            />
            <div className="absolute inset-[120px] inset-top-[1500px] flex flex-col">
              <div className="space-y-[63px] overflow-y-auto pr-6 mt-[320px]">
                {highscores.map((highscore, index) => (
                  <div key={index} className="flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-3xl text-amber-950 tracking-wider drop-shadow-lg">#{index + 1}</span>
                      <span className="text-amber-950 font-extrabold text-xl truncate max-w-[250px] tracking-wider drop-shadow-lg">
                        ...{highscore.wallet.slice(-12)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-green-950 font-extrabold text-xl tracking-wider drop-shadow-lg">+{highscore.trees}</span>
                      <span className="text-amber-950 font-extrabold text-3xl tracking-wider drop-shadow-lg">{highscore.score}</span>
                    </div>
                  </div>
                ))}
                {highscores.length === 0 && (
                  <p className="text-center text-amber-950 font-extrabold text-3xl tracking-wider drop-shadow-lg">No scores yet!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {gameOver && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
          <div className="relative w-[500px] h-[500px]">
            <Image src="/images/wooden-frame.png" alt="Wooden Frame" fill className="object-contain" />

            {/* Game over content inside wooden frame */}
            <div className="absolute inset-[40px] flex flex-col items-center justify-center text-center">
              <div className="relative w-16 h-16 mb-4">
                <Image
                  src="/images/award-icon.png"
                  alt="Award"
                  width={64}
                  height={64}
                  className="object-contain"
                />
              </div>
              <h2 className="wood-text mb-4 text-4xl tracking-wider font-black text-amber-950">Time's Up!</h2>
              <p className="mb-4 text-2xl text-amber-950 font-bold tracking-wide">
                Final Score: <span className="text-amber-600">{score} points</span>!
              </p>
              <p className="mb-6 text-xl text-amber-950 font-bold">
                You chopped down <span className="text-green-600">{treesChopped} trees</span>!
              </p>
              <div className="mb-8 text-lg text-amber-950 font-medium">
                {treesChopped < 5 && <p>Keep practicing! Your arms will get stronger.</p>}
                {treesChopped >= 5 && treesChopped < 10 && <p>Good job! You're becoming a skilled lumberjack.</p>}
                {treesChopped >= 10 && <p>Incredible! You're a legendary lumberjack with arms of steel!</p>}
              </div>
              <Button 
                size="lg" 
                onClick={startGame} 
                className="bg-amber-700 hover:bg-amber-800 font-extrabold text-lg px-8 py-4 rounded-xl shadow-lg transform transition hover:scale-105"
              >
                Play Again
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

