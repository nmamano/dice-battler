"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Crown, Zap, Heart, Star, Sword } from "lucide-react"

// Types
interface Die {
  minValue: number
  maxValue: number
  critRate: number
  critDamage: number
}

interface PowerUp {
  id: string
  name: string
  description: string
  type: "die" | "stack" | "life" | "oneoff" | "permanent"
  rarity: "common" | "rare" | "exceptional"
  effect: any
}

interface GameState {
  screen: "start" | "battle" | "powerup"
  currentLevel: number
  playerDie: Die
  playerLives: number
  stackPowerUps: PowerUp[]
  oneOffPowerUps: { [key: string]: number } // Changed to track usage counts
  permanentPowerUps: PowerUp[]
  selectedOneOff: PowerUp | null
  opponent: {
    die: Die
    lives: number
    isBoss: boolean
  }
  battleResult: {
    playerRoll: number
    opponentRoll: number
    playerFinalValue: number
    stackTransformations: { powerUp: string; value: number }[]
    outcome: "win" | "lose" | "draw"
    message: string
  } | null
  runsAttempted: number
  highestLevel: number
  defeatedBosses: number[]
  availablePowerUps: PowerUp[]
  lostLifePreviousLevel: boolean
  rolledOver100PreviousLevel: boolean
}

// Power-up definitions
const POWER_UPS: PowerUp[] = [
  // Die modifications
  {
    id: "max-plus-1",
    name: "Enhanced Maximum",
    description: "Increases highest possible roll by 1",
    type: "die",
    rarity: "common",
    effect: { type: "maxValue", value: 1 },
  },
  {
    id: "min-plus-1",
    name: "Enhanced Minimum",
    description: "Increases lowest possible roll by 1",
    type: "die",
    rarity: "common",
    effect: { type: "minValue", value: 1 },
  },
  {
    id: "max-plus-2-min-minus-1",
    name: "Risk Taker",
    description: "Max Value +2, Min Value -1",
    type: "die",
    rarity: "common",
    effect: { type: "range", maxValue: 2, minValue: -1 },
  },
  {
    id: "min-plus-1-max-minus-1",
    name: "Consistency",
    description: "Min Value +1, Max Value -1",
    type: "die",
    rarity: "common",
    effect: { type: "range", maxValue: -1, minValue: 1 },
  },
  {
    id: "crit-rate-5",
    name: "Lucky Strike",
    description: "Critical strike rate +5%",
    type: "die",
    rarity: "common",
    effect: { type: "critRate", value: 5 },
  },
  {
    id: "crit-damage-01",
    name: "Devastating Blow",
    description: "Critical strike damage +0.1",
    type: "die",
    rarity: "common",
    effect: { type: "critDamage", value: 0.1 },
  },

  // Stack power-ups
  {
    id: "odd-plus-2",
    name: "Odd Boost",
    description: "If rolled value is odd, +2",
    type: "stack",
    rarity: "common",
    effect: { type: "conditional", condition: "odd", value: 2 },
  },
  {
    id: "even-plus-2",
    name: "Even Boost",
    description: "If rolled value is even, +2",
    type: "stack",
    rarity: "common",
    effect: { type: "conditional", condition: "even", value: 2 },
  },
  {
    id: "percentage-boost",
    name: "Amplifier",
    description: "Increase rolled value by 10%, rounded down",
    type: "stack",
    rarity: "exceptional",
    effect: { type: "percentage", value: 0.1 },
  },
  {
    id: "extra-die",
    name: "Dual Roll",
    description: "Add roll from an extra 1-4 die",
    type: "stack",
    rarity: "exceptional",
    effect: { type: "extraDie", min: 1, max: 4 },
  },
  {
    id: "life-loss-bonus",
    name: "Vengeance",
    description: "+10 if lost a life in previous level",
    type: "stack",
    rarity: "rare",
    effect: { type: "conditional", condition: "lostLife", value: 10 },
  },
  {
    id: "high-roll-bonus",
    name: "Momentum",
    description: "+10 if rolled over 100 in previous level",
    type: "stack",
    rarity: "exceptional",
    effect: { type: "conditional", condition: "highRoll", value: 10 },
  },
  {
    id: "even-level",
    name: "Even Advantage",
    description: "+2 if level number is even",
    type: "stack",
    rarity: "common",
    effect: { type: "conditional", condition: "evenLevel", value: 2 },
  },
  {
    id: "odd-level",
    name: "Odd Advantage",
    description: "+2 if level number is odd",
    type: "stack",
    rarity: "rare",
    effect: { type: "conditional", condition: "oddLevel", value: 2 },
  },
  {
    id: "lower-half",
    name: "Underdog",
    description: "+2 if rolled value is in lower half of range",
    type: "stack",
    rarity: "rare",
    effect: { type: "conditional", condition: "lowerHalf", value: 2 },
  },
  {
    id: "upper-half",
    name: "High Roller",
    description: "+2 if rolled value is in upper half of range",
    type: "stack",
    rarity: "common",
    effect: { type: "conditional", condition: "upperHalf", value: 2 },
  },
  {
    id: "boss-bonus",
    name: "Boss Slayer",
    description: "+2 against bosses",
    type: "stack",
    rarity: "exceptional",
    effect: { type: "conditional", condition: "boss", value: 2 },
  },

  // Life power-ups
  {
    id: "extra-life",
    name: "Second Chance",
    description: "Gain one life",
    type: "life",
    rarity: "exceptional",
    effect: { type: "life", value: 1 },
  },

  // One-off power-ups
  {
    id: "player-reroll",
    name: "Lucky Charm",
    description: "Reroll your die if you lose this battle",
    type: "oneoff",
    rarity: "rare",
    effect: { type: "playerReroll" },
  },
  {
    id: "enemy-reroll",
    name: "Jinx",
    description: "Force opponent to reroll if you lose",
    type: "oneoff",
    rarity: "rare",
    effect: { type: "enemyReroll" },
  },
  {
    id: "double-roll",
    name: "Twin Strike",
    description: "Roll twice and sum the results",
    type: "oneoff",
    rarity: "exceptional",
    effect: { type: "doubleRoll" },
  },
  {
    id: "dice-multiplication",
    name: "Power Surge",
    description: "Multiply your roll by 2",
    type: "oneoff",
    rarity: "exceptional",
    effect: { type: "multiply", value: 2 },
  },
]

const RARITY_WEIGHTS = {
  common: 25,
  rare: 5,
  exceptional: 1,
}

const RARITY_COLORS = {
  common: "bg-gray-100 border-gray-300",
  rare: "bg-blue-100 border-blue-300",
  exceptional: "bg-purple-100 border-purple-300",
}

const TYPE_ICONS = {
  die: Sword,
  stack: Zap,
  life: Heart,
  oneoff: Star,
  permanent: Crown,
}

export default function DiceBattler() {
  const [gameState, setGameState] = useState<GameState>({
    screen: "start",
    currentLevel: 1,
    playerDie: { minValue: 1, maxValue: 6, critRate: 0, critDamage: 1.1 },
    playerLives: 3,
    stackPowerUps: [],
    oneOffPowerUps: {
      "player-reroll": 0,
      "enemy-reroll": 0,
      "double-roll": 0,
      "dice-multiplication": 0,
    },
    permanentPowerUps: [],
    selectedOneOff: null,
    opponent: {
      die: { minValue: 1, maxValue: 2, critRate: 0, critDamage: 1.1 },
      lives: 1,
      isBoss: false,
    },
    battleResult: null,
    runsAttempted: 0,
    highestLevel: 0,
    defeatedBosses: [],
    availablePowerUps: [],
    lostLifePreviousLevel: false,
    rolledOver100PreviousLevel: false,
  })

  const rollDie = (die: Die, useOneOff: PowerUp | null = null): { value: number; isCrit: boolean } => {
    let value = Math.floor(Math.random() * (die.maxValue - die.minValue + 1)) + die.minValue

    if (useOneOff?.effect.type === "doubleRoll") {
      const secondRoll = Math.floor(Math.random() * (die.maxValue - die.minValue + 1)) + die.minValue
      value += secondRoll
    }

    const isCrit = Math.random() < die.critRate / 100
    if (isCrit) {
      value = Math.ceil(value * die.critDamage)
    }

    if (useOneOff?.effect.type === "multiply") {
      value *= useOneOff.effect.value
    }

    return { value, isCrit }
  }

  const applyStackPowerUps = (
    initialValue: number,
    stackPowerUps: PowerUp[],
    level: number,
    isBoss: boolean,
    lostLife: boolean,
    rolledOver100: boolean,
  ): { finalValue: number; transformations: { powerUp: string; value: number }[] } => {
    let currentValue = initialValue
    const transformations: { powerUp: string; value: number }[] = []

    for (const powerUp of stackPowerUps) {
      const effect = powerUp.effect
      let newValue = currentValue

      switch (effect.type) {
        case "conditional":
          switch (effect.condition) {
            case "odd":
              if (currentValue % 2 === 1) newValue += effect.value
              break
            case "even":
              if (currentValue % 2 === 0) newValue += effect.value
              break
            case "lostLife":
              if (lostLife) newValue += effect.value
              break
            case "highRoll":
              if (rolledOver100) newValue += effect.value
              break
            case "evenLevel":
              if (level % 2 === 0) newValue += effect.value
              break
            case "oddLevel":
              if (level % 2 === 1) newValue += effect.value
              break
            case "lowerHalf":
              if (initialValue <= (gameState.playerDie.minValue + gameState.playerDie.maxValue) / 2)
                newValue += effect.value
              break
            case "upperHalf":
              if (initialValue > (gameState.playerDie.minValue + gameState.playerDie.maxValue) / 2)
                newValue += effect.value
              break
            case "boss":
              if (isBoss) newValue += effect.value
              break
          }
          break
        case "percentage":
          newValue = Math.floor(currentValue * (1 + effect.value))
          break
        case "extraDie":
          const extraRoll = Math.floor(Math.random() * (effect.max - effect.min + 1)) + effect.min
          newValue += extraRoll
          break
      }

      transformations.push({ powerUp: powerUp.name, value: newValue })
      currentValue = newValue
    }

    return { finalValue: currentValue, transformations }
  }

  const generateRandomPowerUps = (count = 2): PowerUp[] => {
    const availablePowerUps = POWER_UPS.filter((powerUp) => {
      // Filter based on current game state
      if (powerUp.id === "min-plus-1" && gameState.playerDie.maxValue <= gameState.playerDie.minValue + 1) return false
      if (powerUp.id === "max-plus-2-min-minus-1" && gameState.playerDie.minValue <= 1) return false
      if (powerUp.id === "min-plus-1-max-minus-1" && gameState.playerDie.maxValue <= gameState.playerDie.minValue + 2)
        return false
      return true
    })

    if (availablePowerUps.length === 0) {
      console.log("No available power-ups!")
      return []
    }

    // Separate one-off and other power-ups
    const oneOffPowerUps = availablePowerUps.filter((p) => p.type === "oneoff")
    const otherPowerUps = availablePowerUps.filter((p) => p.type !== "oneoff")

    const selected: PowerUp[] = []
    const usedIds = new Set<string>()

    // First, maybe add one one-off power-up (50% chance)
    if (oneOffPowerUps.length > 0 && Math.random() < 0.5) {
      const weightedOneOffs: PowerUp[] = []
      oneOffPowerUps.forEach((powerUp) => {
        const weight = RARITY_WEIGHTS[powerUp.rarity]
        for (let i = 0; i < weight; i++) {
          weightedOneOffs.push(powerUp)
        }
      })

      if (weightedOneOffs.length > 0) {
        const randomIndex = Math.floor(Math.random() * weightedOneOffs.length)
        const selectedOneOff = weightedOneOffs[randomIndex]
        selected.push(selectedOneOff)
        usedIds.add(selectedOneOff.id)
      }
    }

    // Fill remaining slots with other power-ups
    const weightedOthers: PowerUp[] = []
    otherPowerUps.forEach((powerUp) => {
      if (!usedIds.has(powerUp.id)) {
        const weight = RARITY_WEIGHTS[powerUp.rarity]
        for (let i = 0; i < weight; i++) {
          weightedOthers.push(powerUp)
        }
      }
    })

    while (selected.length < count && weightedOthers.length > 0) {
      const availableOptions = weightedOthers.filter((p) => !usedIds.has(p.id))
      if (availableOptions.length === 0) break

      const randomIndex = Math.floor(Math.random() * availableOptions.length)
      const selectedPowerUp = availableOptions[randomIndex]
      selected.push(selectedPowerUp)
      usedIds.add(selectedPowerUp.id)

      // Remove all instances of this power-up to avoid duplicates
      for (let j = weightedOthers.length - 1; j >= 0; j--) {
        if (weightedOthers[j].id === selectedPowerUp.id) {
          weightedOthers.splice(j, 1)
        }
      }
    }

    // Sort so one-off appears on the right (last)
    selected.sort((a, b) => {
      if (a.type === "oneoff" && b.type !== "oneoff") return 1
      if (a.type !== "oneoff" && b.type === "oneoff") return -1
      return 0
    })

    console.log(
      "Generated power-ups:",
      selected.map((p) => p.name),
    )
    return selected
  }

  const startNewRun = () => {
    const baseDie = { minValue: 1, maxValue: 6, critRate: 0, critDamage: 1.1 }

    // Apply permanent power-ups
    gameState.permanentPowerUps.forEach((powerUp) => {
      baseDie.minValue += 1
      baseDie.maxValue += 1
    })

    setGameState((prev) => ({
      ...prev,
      screen: "battle",
      currentLevel: 1,
      playerDie: baseDie,
      playerLives: 3,
      stackPowerUps: [],
      oneOffPowerUps: {
        "player-reroll": 0,
        "enemy-reroll": 0,
        "double-roll": 0,
        "dice-multiplication": 0,
      },
      selectedOneOff: null,
      opponent: {
        die: { minValue: 1, maxValue: 2, critRate: 0, critDamage: 1.1 },
        lives: 1,
        isBoss: false,
      },
      battleResult: null,
      runsAttempted: prev.runsAttempted + 1,
      lostLifePreviousLevel: false,
      rolledOver100PreviousLevel: false,
    }))
  }

  const rollBattle = () => {
    const playerRollResult = rollDie(gameState.playerDie, gameState.selectedOneOff)
    const opponentRollResult = rollDie(gameState.opponent.die)

    const stackResult = applyStackPowerUps(
      playerRollResult.value,
      gameState.stackPowerUps,
      gameState.currentLevel,
      gameState.opponent.isBoss,
      gameState.lostLifePreviousLevel,
      gameState.rolledOver100PreviousLevel,
    )

    const playerFinalValue = stackResult.finalValue
    const opponentFinalValue = opponentRollResult.value

    let outcome: "win" | "lose" | "draw"
    let message = ""

    if (playerFinalValue > opponentFinalValue) {
      outcome = "win"
      if (gameState.opponent.lives > 1) {
        message = "You win! The opponent lost a life."
      } else {
        if (gameState.opponent.isBoss) {
          const isFirstTimeBoss = !gameState.defeatedBosses.includes(gameState.currentLevel)
          if (isFirstTimeBoss) {
            message =
              "You win! Boss defeated. You have earned a permanent power-up for defeating this boss for the first time: +1 to all rolls. This power-up persists after game-over. Choose a power-up and proceed to next battle."
          } else {
            message =
              "You win! Boss defeated. You don't earn a permanent power-up because it is not the first time you defeat the boss. Choose a power-up and proceed to next battle."
          }
        } else {
          message = "You win! Opponent defeated. Choose a power-up and proceed to next battle."
        }
      }
    } else if (playerFinalValue < opponentFinalValue) {
      outcome = "lose"
      if (gameState.playerLives > 1) {
        message = "You lost a life!"
      } else {
        message = "Game over!"
      }
    } else {
      outcome = "draw"
      message = "Draw!"
    }

    // Consume the selected one-off power-up
    const newOneOffPowerUps = { ...gameState.oneOffPowerUps }
    if (gameState.selectedOneOff && newOneOffPowerUps[gameState.selectedOneOff.id] > 0) {
      newOneOffPowerUps[gameState.selectedOneOff.id] -= 1
    }

    setGameState((prev) => ({
      ...prev,
      oneOffPowerUps: newOneOffPowerUps,
      battleResult: {
        playerRoll: playerRollResult.value,
        opponentRoll: opponentRollResult.value,
        playerFinalValue,
        stackTransformations: stackResult.transformations,
        outcome,
        message,
      },
    }))
  }

  const nextRound = () => {
    if (!gameState.battleResult) return

    if (gameState.battleResult.outcome === "win") {
      if (gameState.opponent.lives > 1) {
        // Continue battle
        setGameState((prev) => ({
          ...prev,
          opponent: {
            ...prev.opponent,
            lives: prev.opponent.lives - 1,
          },
          battleResult: null,
          selectedOneOff: null,
        }))
      } else {
        // Victory - show power-up selection
        const availablePowerUps = generateRandomPowerUps(2)

        const newState = {
          ...gameState,
          screen: "powerup" as const,
          availablePowerUps,
          rolledOver100PreviousLevel: gameState.battleResult.playerFinalValue > 100,
          battleResult: null,
          selectedOneOff: null,
        }

        // Handle boss victory
        if (gameState.opponent.isBoss && !gameState.defeatedBosses.includes(gameState.currentLevel)) {
          newState.defeatedBosses = [...gameState.defeatedBosses, gameState.currentLevel]
          newState.permanentPowerUps = [
            ...gameState.permanentPowerUps,
            {
              id: `permanent-${gameState.currentLevel}`,
              name: "Boss Reward",
              description: "+1 to min and max range",
              type: "permanent",
              rarity: "exceptional",
              effect: { type: "permanent" },
            },
          ]
        }

        setGameState(newState)
      }
    } else if (gameState.battleResult.outcome === "lose") {
      if (gameState.playerLives > 1) {
        // Lost a life, continue
        setGameState((prev) => ({
          ...prev,
          playerLives: prev.playerLives - 1,
          battleResult: null,
          selectedOneOff: null,
          lostLifePreviousLevel: true,
        }))
      } else {
        // Game over
        setGameState((prev) => ({
          ...prev,
          screen: "start",
          highestLevel: Math.max(prev.highestLevel, prev.currentLevel),
          battleResult: null,
        }))
      }
    } else {
      // Draw - roll again
      setGameState((prev) => ({
        ...prev,
        battleResult: null,
        selectedOneOff: null,
      }))
    }
  }

  const selectPowerUp = (powerUp: PowerUp) => {
    const newPlayerDie = { ...gameState.playerDie }
    const newStackPowerUps = [...gameState.stackPowerUps]
    const newOneOffPowerUps = { ...gameState.oneOffPowerUps }
    let newPlayerLives = gameState.playerLives

    switch (powerUp.type) {
      case "die":
        if (powerUp.effect.type === "maxValue") {
          newPlayerDie.maxValue += powerUp.effect.value
        } else if (powerUp.effect.type === "minValue") {
          newPlayerDie.minValue += powerUp.effect.value
        } else if (powerUp.effect.type === "range") {
          newPlayerDie.maxValue += powerUp.effect.maxValue
          newPlayerDie.minValue += powerUp.effect.minValue
        } else if (powerUp.effect.type === "critRate") {
          newPlayerDie.critRate += powerUp.effect.value
        } else if (powerUp.effect.type === "critDamage") {
          newPlayerDie.critDamage += powerUp.effect.value
        }
        break
      case "stack":
        newStackPowerUps.push(powerUp)
        break
      case "life":
        newPlayerLives += powerUp.effect.value
        break
      case "oneoff":
        newOneOffPowerUps[powerUp.id] += 1
        break
    }

    // Advance to next level
    const nextLevel = gameState.currentLevel + 1
    const isBoss = nextLevel % 10 === 9

    setGameState((prev) => ({
      ...prev,
      screen: "battle",
      currentLevel: nextLevel,
      playerDie: newPlayerDie,
      playerLives: newPlayerLives,
      stackPowerUps: newStackPowerUps,
      oneOffPowerUps: newOneOffPowerUps,
      opponent: {
        die: { minValue: 1, maxValue: nextLevel + 1, critRate: 0, critDamage: 1.1 },
        lives: isBoss ? 3 : 1,
        isBoss,
      },
      battleResult: null,
      selectedOneOff: null,
      lostLifePreviousLevel: false,
    }))
  }

  const selectOneOffPowerUp = (powerUp: PowerUp) => {
    if (gameState.oneOffPowerUps[powerUp.id] > 0) {
      setGameState((prev) => ({
        ...prev,
        selectedOneOff: prev.selectedOneOff?.id === powerUp.id ? null : powerUp,
      }))
    }
  }

  const getDiceIcon = (value: number) => {
    const icons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6]
    return icons[Math.min(value - 1, 5)] || Dice6
  }

  if (gameState.screen === "start") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-4xl font-bold text-purple-800">Dice Battler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-blue-600">{gameState.runsAttempted}</div>
                    <div className="text-sm text-gray-600">Runs Attempted</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">{gameState.highestLevel}</div>
                    <div className="text-sm text-gray-600">Highest Level</div>
                  </CardContent>
                </Card>
              </div>

              {gameState.permanentPowerUps.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Permanent Power-ups</h3>
                  <div className="space-y-2">
                    {gameState.permanentPowerUps.map((powerUp, index) => (
                      <Badge key={index} variant="outline" className="bg-yellow-100 border-yellow-300">
                        <Crown className="w-4 h-4 mr-1" />
                        {powerUp.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={startNewRun} size="lg" className="w-full">
                Start Run
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Battle screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Player Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Player ({gameState.playerLives} lives)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Player Die */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-semibold mb-2">Your Die</h4>
              <div className="text-sm space-y-1">
                <div>
                  Range: {gameState.playerDie.minValue}-{gameState.playerDie.maxValue}
                </div>
                <div>Crit Rate: {gameState.playerDie.critRate}%</div>
                <div>Crit Damage: {gameState.playerDie.critDamage}x</div>
              </div>
              {gameState.battleResult && (
                <div className="mt-2 p-2 bg-white rounded border">
                  <div className="font-bold text-lg">Rolled: {gameState.battleResult.playerRoll}</div>
                </div>
              )}
            </div>

            {/* Stack Power-ups */}
            {gameState.stackPowerUps.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Power-up Stack</h4>
                <div className="space-y-2">
                  {gameState.stackPowerUps.map((powerUp, index) => (
                    <div
                      key={index}
                      className="p-2 bg-yellow-50 rounded border relative group cursor-help"
                      title={powerUp.description}
                    >
                      <div className="text-sm font-medium">{powerUp.name}</div>
                      {gameState.battleResult && gameState.battleResult.stackTransformations[index] && (
                        <div className="text-lg font-bold text-green-600">
                          → {gameState.battleResult.stackTransformations[index].value}
                        </div>
                      )}
                      {/* Tooltip */}
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                        {powerUp.description}
                      </div>
                    </div>
                  ))}
                </div>
                {gameState.battleResult && (
                  <div className="mt-2 p-2 bg-green-100 rounded border">
                    <div className="font-bold text-lg">Final: {gameState.battleResult.playerFinalValue}</div>
                  </div>
                )}
              </div>
            )}

            {/* One-off Power-ups */}
            <div>
              <h4 className="font-semibold mb-2">One-off Power-ups</h4>
              <div className="space-y-2">
                {POWER_UPS.filter((p) => p.type === "oneoff").map((powerUp) => (
                  <Button
                    key={powerUp.id}
                    variant={gameState.selectedOneOff?.id === powerUp.id ? "default" : "outline"}
                    size="sm"
                    className="w-full text-left justify-between"
                    onClick={() => selectOneOffPowerUp(powerUp)}
                    disabled={!!gameState.battleResult || gameState.oneOffPowerUps[powerUp.id] === 0}
                  >
                    <div className="flex items-center">
                      <Star className="w-4 h-4 mr-2" />
                      {powerUp.name}
                    </div>
                    <Badge variant="secondary">{gameState.oneOffPowerUps[powerUp.id]}</Badge>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Center - Battle Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              Level {gameState.currentLevel}
              {gameState.opponent.isBoss && (
                <Badge className="ml-2 bg-red-500">
                  <Crown className="w-4 h-4 mr-1" />
                  BOSS
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {!gameState.battleResult ? (
              <Button onClick={rollBattle} size="lg" className="w-full">
                Roll!
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-lg">{gameState.battleResult.message}</p>
                </div>

                {gameState.battleResult.outcome === "draw" && (
                  <Button onClick={nextRound} size="lg" className="w-full">
                    Roll Again
                  </Button>
                )}

                {gameState.battleResult.outcome === "win" && gameState.opponent.lives > 1 && (
                  <Button onClick={nextRound} size="lg" className="w-full">
                    Next Round
                  </Button>
                )}

                {gameState.battleResult.outcome === "lose" && gameState.playerLives > 1 && (
                  <Button onClick={nextRound} size="lg" className="w-full">
                    Go Again
                  </Button>
                )}

                {gameState.battleResult.outcome === "lose" && gameState.playerLives <= 1 && (
                  <Button
                    onClick={() =>
                      setGameState((prev) => ({
                        ...prev,
                        screen: "start",
                        highestLevel: Math.max(prev.highestLevel, prev.currentLevel),
                      }))
                    }
                    size="lg"
                    className="w-full"
                  >
                    Go back to Start screen
                  </Button>
                )}

                {gameState.battleResult.outcome === "win" && gameState.opponent.lives <= 1 && (
                  <Button onClick={nextRound} size="lg" className="w-full">
                    {gameState.battleResult.message.includes("Choose a power-up") ? "Choose Power-up" : "Next Level"}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Opponent Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {gameState.opponent.isBoss ? (
                <Crown className="w-5 h-5 text-yellow-500" />
              ) : (
                <Sword className="w-5 h-5 text-gray-500" />
              )}
              Opponent ({gameState.opponent.lives} lives)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 bg-red-50 rounded-lg">
              <h4 className="font-semibold mb-2">Opponent Die</h4>
              <div className="text-sm space-y-1">
                <div>
                  Range: {gameState.opponent.die.minValue}-{gameState.opponent.die.maxValue}
                </div>
                <div>Crit Rate: 0%</div>
              </div>
              {gameState.battleResult && (
                <div className="mt-2 p-2 bg-white rounded border">
                  <div className="font-bold text-lg">Rolled: {gameState.battleResult.opponentRoll}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Power-up Selection Modal */}
      {gameState.screen === "powerup" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="text-center">Choose a Power-up</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gameState.availablePowerUps.map((powerUp, index) => {
                  const IconComponent = TYPE_ICONS[powerUp.type]
                  return (
                    <Card
                      key={index}
                      className={`cursor-pointer hover:shadow-lg transition-shadow ${RARITY_COLORS[powerUp.rarity]}`}
                      onClick={() => selectPowerUp(powerUp)}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                          <IconComponent className="w-5 h-5" />
                          <Badge variant="outline">{powerUp.rarity}</Badge>
                        </div>
                        <h3 className="font-semibold mb-2">{powerUp.name}</h3>
                        <p className="text-sm text-gray-600">{powerUp.description}</p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
