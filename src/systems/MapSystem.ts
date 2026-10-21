// 地圖系統
import { Game } from '../core/Game.js'
import { MapTile, TileType, ResourceNode, Vec2, SeedData } from '../core/Types.js'
import { DEFAULT_CONFIG, TILE_SPRITES, DIRECTION_VECTORS } from '../data/Constants.js'
import { SeededRandom } from '../utils/SeededRandom.js'

export class MapSystem {
  private game: Game
  private map: MapTile[][] = []
  private random: SeededRandom
  private seedData: SeedData

  constructor(game: Game) {
    this.game = game
    this.random = new SeededRandom('')
    this.seedData = { map: [], events: {}, resources: {} }
  }

  /** 生成地圖 */
  generateMap(seed: string): void {
    this.random = new SeededRandom(seed)
    this.seedData = { map: [], events: {}, resources: {} }

    const { mapWidth, mapHeight } = this.game.config
    this.map = Array(mapHeight).fill(null).map(() => Array(mapWidth).fill(null))
    this.seedData.map = Array(mapHeight).fill(null).map(() => Array(mapWidth).fill(0))

    // 1. 使用柏林噪聲生成基礎地形
    this.generateBaseTerrain()

    // 2. 放置特殊地點 (基地、洞穴、廢墟等)
    this.placeSpecialLocations()

    // 3. 生成資源節點
    this.generateResources()

    // 4. 生成事件
    this.generateEvents()

    // 5. 設定起始位置 (基地附近)
    this.setStartingPosition()

    // 標記渲染器地圖需要更新
    this.game['renderer'].markMapDirty()

    console.log(`地圖生成完成: ${mapWidth}x${mapHeight}, Seed: ${seed}`)
  }

  /** 生成基礎地形 (使用簡單的噪聲演算法) */
  private generateBaseTerrain(): void {
    const { mapWidth, mapHeight } = this.game.config

    // 生成噪聲圖
    const noiseMap = this.generateNoiseMap(mapWidth, mapHeight, 0.08)
    const moistureMap = this.generateNoiseMap(mapWidth, mapHeight, 0.12, 12345)
    const elevationMap = this.generateNoiseMap(mapWidth, mapHeight, 0.06, 54321)

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const noise = noiseMap[y][x]
        const moisture = moistureMap[y][x]
        const elevation = elevationMap[y][x]

        // 邊緣強制為水域
        const isEdge = x < 2 || x >= mapWidth - 2 || y < 2 || y >= mapHeight - 2

        let type: TileType
        if (isEdge) {
          type = TileType.WATER
        } else if (elevation > 0.75) {
          type = TileType.MOUNTAIN
        } else if (elevation > 0.6) {
          type = TileType.ROCK
        } else if (moisture > 0.7 && noise > 0.3) {
          type = TileType.JUNGLE
        } else if (moisture > 0.55 && noise > 0.2) {
          type = TileType.FOREST
        } else if (noise > 0.4) {
          type = TileType.GRASS
        } else if (noise > 0.1) {
          type = TileType.SAND
        } else {
          type = TileType.BEACH
        }

        this.map[y][x] = this.createTile(type)
        this.seedData.map[y][x] = type
      }
    }
  }

  /** 生成噪聲圖 (簡易版 value noise) */
  private generateNoiseMap(width: number, height: number, frequency: number, seedOffset: number = 0): number[][] {
    const map = Array(height).fill(null).map(() => Array(width).fill(0))
    const gridSize = Math.max(4, Math.floor(1 / frequency))

    // 生成網格點隨機值
    const gridW = Math.ceil(width / gridSize) + 1
    const gridH = Math.ceil(height / gridSize) + 1
    const grid = Array(gridH).fill(null).map(() =>
      Array(gridW).fill(null).map(() => this.random.next())
    )

    // 雙線性插值
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const gx = x / gridSize
        const gy = y / gridSize
        const gx0 = Math.floor(gx)
        const gy0 = Math.floor(gy)
        const gx1 = gx0 + 1
        const gy1 = gy0 + 1

        const fx = gx - gx0
        const fy = gy - gy0

        // 平滑插值
        const u = this.smoothstep(fx)
        const v = this.smoothstep(fy)

        const v00 = grid[gy0]?.[gx0] ?? 0
        const v10 = grid[gy0]?.[gx1] ?? 0
        const v01 = grid[gy1]?.[gx0] ?? 0
        const v11 = grid[gy1]?.[gx1] ?? 0

        const v0 = this.lerp(v00, v10, u)
        const v1 = this.lerp(v01, v11, u)
        map[y][x] = this.lerp(v0, v1, v)
      }
    }

    return map
  }

  private smoothstep(t: number): number {
    return t * t * (3 - 2 * t)
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  /** 放置特殊地點 */
  private placeSpecialLocations(): void {
    const { mapWidth, mapHeight } = this.game.config

    // 基地 - 置於地圖中心附近的草地/沙灘
    const basePos = this.findSuitableLocation(TileType.GRASS, TileType.SAND, TileType.BEACH)
    if (basePos) {
      this.map[basePos.y][basePos.x] = this.createTile(TileType.BASE)
      this.seedData.map[basePos.y][basePos.x] = TileType.BASE
    }

    // 洞穴 - 3-5 個，置於岩石/山脈附近
    for (let i = 0; i < 4; i++) {
      const pos = this.findSuitableLocation(TileType.ROCK, TileType.MOUNTAIN, TileType.CAVE)
      if (pos) {
        this.map[pos.y][pos.x] = this.createTile(TileType.CAVE)
        this.seedData.map[pos.y][pos.x] = TileType.CAVE
      }
    }

    // 廢墟 - 2-3 個，置於草地/森林
    for (let i = 0; i < 3; i++) {
      const pos = this.findSuitableLocation(TileType.GRASS, TileType.FOREST, TileType.SAND)
      if (pos) {
        this.map[pos.y][pos.x] = this.createTile(TileType.RUINS)
        this.seedData.map[pos.y][pos.x] = TileType.RUINS
      }
    }

    // 額外海灘區域
    this.expandBeaches()
  }

  /** 尋找適合的位置 */
  private findSuitableLocation(...preferredTypes: TileType[]): Vec2 | null {
    const { mapWidth, mapHeight } = this.game.config
    const candidates: Vec2[] = []

    for (let y = 3; y < mapHeight - 3; y++) {
      for (let x = 3; x < mapWidth - 3; x++) {
        const tile = this.map[y][x]
        if (preferredTypes.includes(tile.type)) {
          // 檢查周圍 2 格內是否已有特殊地點
          let hasSpecial = false
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const nx = x + dx, ny = y + dy
              if (nx >= 0 && nx < mapWidth && ny >= 0 && ny < mapHeight) {
                const nt = this.map[ny][nx].type
                if (nt === TileType.BASE || nt === TileType.CAVE || nt === TileType.RUINS) {
                  hasSpecial = true
                  break
                }
              }
            }
            if (hasSpecial) break
          }
          if (!hasSpecial) candidates.push({ x, y })
        }
      }
    }

    if (candidates.length === 0) return null
    return candidates[this.random.nextInt(candidates.length)]
  }

  /** 擴展海灘區域 (靠近水域) */
  private expandBeaches(): void {
    const { mapWidth, mapHeight } = this.game.config
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        if (this.map[y][x].type === TileType.SAND || this.map[y][x].type === TileType.GRASS) {
          // 檢查鄰近是否有水域
          for (const dir of Object.values(DIRECTION_VECTORS)) {
            const nx = x + dir.x, ny = y + dir.y
            if (nx >= 0 && nx < mapWidth && ny >= 0 && ny < mapHeight) {
              if (this.map[ny][nx].type === TileType.WATER) {
                if (this.random.next() < 0.3) {
                  this.map[y][x] = this.createTile(TileType.BEACH)
                  this.seedData.map[y][x] = TileType.BEACH
                }
                break
              }
            }
          }
        }
      }
    }
  }

  /** 生成資源節點 */
  private generateResources(): void {
    const { mapWidth, mapHeight } = this.game.config

    const resourceChances: Record<TileType, { itemId: string; chance: number; maxQty: number; respawnDays: number }[]> = {
      [TileType.SAND]: [
        { itemId: 'coconut', chance: 0.15, maxQty: 3, respawnDays: 2 },
        { itemId: 'fiber', chance: 0.1, maxQty: 2, respawnDays: 3 }
      ],
      [TileType.BEACH]: [
        { itemId: 'coconut', chance: 0.25, maxQty: 4, respawnDays: 2 },
        { itemId: 'shell', chance: 0.2, maxQty: 5, respawnDays: 1 },
        { itemId: 'metal_scrap', chance: 0.05, maxQty: 1, respawnDays: 7 }
      ],
      [TileType.GRASS]: [
        { itemId: 'berries', chance: 0.2, maxQty: 4, respawnDays: 2 },
        { itemId: 'fiber', chance: 0.15, maxQty: 3, respawnDays: 2 },
        { itemId: 'herbs', chance: 0.1, maxQty: 2, respawnDays: 3 }
      ],
      [TileType.FOREST]: [
        { itemId: 'wood', chance: 0.3, maxQty: 5, respawnDays: 3 },
        { itemId: 'berries', chance: 0.15, maxQty: 3, respawnDays: 2 },
        { itemId: 'mushroom', chance: 0.1, maxQty: 2, respawnDays: 3 },
        { itemId: 'hide', chance: 0.05, maxQty: 1, respawnDays: 5 }
      ],
      [TileType.JUNGLE]: [
        { itemId: 'wood', chance: 0.4, maxQty: 6, respawnDays: 2 },
        { itemId: 'fiber', chance: 0.25, maxQty: 4, respawnDays: 2 },
        { itemId: 'herbs', chance: 0.2, maxQty: 3, respawnDays: 2 },
        { itemId: 'crystal', chance: 0.03, maxQty: 1, respawnDays: 10 }
      ],
      [TileType.ROCK]: [
        { itemId: 'stone', chance: 0.35, maxQty: 4, respawnDays: 4 },
        { itemId: 'metal_scrap', chance: 0.1, maxQty: 2, respawnDays: 5 },
        { itemId: 'crystal', chance: 0.05, maxQty: 1, respawnDays: 8 }
      ],
      [TileType.MOUNTAIN]: [
        { itemId: 'stone', chance: 0.4, maxQty: 5, respawnDays: 3 },
        { itemId: 'metal_scrap', chance: 0.15, maxQty: 2, respawnDays: 4 },
        { itemId: 'crystal', chance: 0.08, maxQty: 1, respawnDays: 6 }
      ],
      [TileType.CAVE]: [
        { itemId: 'stone', chance: 0.3, maxQty: 4, respawnDays: 4 },
        { itemId: 'metal_scrap', chance: 0.2, maxQty: 3, respawnDays: 4 },
        { itemId: 'crystal', chance: 0.1, maxQty: 2, respawnDays: 5 },
        { itemId: 'bone', chance: 0.15, maxQty: 2, respawnDays: 5 }
      ],
      [TileType.RUINS]: [
        { itemId: 'metal_scrap', chance: 0.3, maxQty: 3, respawnDays: 7 },
        { itemId: 'map_fragment', chance: 0.1, maxQty: 1, respawnDays: 14 },
        { itemId: 'radio_parts', chance: 0.05, maxQty: 1, respawnDays: 21 },
        { itemId: 'herbs', chance: 0.1, maxQty: 2, respawnDays: 5 }
      ],
      [TileType.WATER]: [],
      [TileType.EMPTY]: [],
      [TileType.BASE]: [
        { itemId: 'water_bottle', chance: 0.1, maxQty: 1, respawnDays: 1 }
      ]
    }

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tile = this.map[y][x]
        const chances = resourceChances[tile.type] || []

        const resources: ResourceNode[] = []
        for (const rc of chances) {
          if (this.random.next() < rc.chance) {
            const qty = 1 + this.random.nextInt(rc.maxQty)
            resources.push({
              id: `${x},${y}:${rc.itemId}`,
              itemId: rc.itemId,
              quantity: qty,
              respawnDays: rc.respawnDays,
              lastHarvested: -rc.respawnDays // 最初可採集
            })
            this.seedData.resources[`${x},${y}:${rc.itemId}`] = qty
          }
        }
        tile.resources = resources
      }
    }
  }

  /** 生成事件 */
  private generateEvents(): void {
    // 事件生成邏輯會在 EventSystem 中處理
    // 這裡只標記特殊地點可能有事件
    const { mapWidth, mapHeight } = this.game.config

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tile = this.map[y][x]
        // 特殊地點有較高機率觸發事件
        if ([TileType.CAVE, TileType.RUINS, TileType.BASE].includes(tile.type)) {
          if (this.random.next() < 0.5) {
            tile.eventId = this.generateEventId(tile.type, x, y)
            this.seedData.events[tile.eventId] = true
          }
        } else if (this.random.next() < 0.05) {
          // 普通地塊小機率有隨機事件
          tile.eventId = this.generateEventId(tile.type, x, y)
          this.seedData.events[tile.eventId] = true
        }
      }
    }
  }

  /** 生成事件 ID */
  private generateEventId(type: TileType, _x: number, _y: number): string {
    const pools: Record<TileType, string[]> = {
      [TileType.CAVE]: ['cave_entrance', 'random_find_stone', 'random_lucky'],
      [TileType.RUINS]: ['ruins_research', 'radio_repair', 'random_lucky'],
      [TileType.BASE]: ['base_campfire', 'raft_building', 'radio_repair'],
      [TileType.FOREST]: ['berry_bush', 'wild_boar', 'random_find_wood'],
      [TileType.JUNGLE]: ['jungle_river', 'wild_boar', 'berry_bush', 'storm_approaching'],
      [TileType.MOUNTAIN]: ['mountain_peak', 'random_find_stone', 'storm_approaching'],
      [TileType.ROCK]: ['random_find_stone', 'random_trip', 'random_lucky'],
      [TileType.SAND]: ['beach_debris', 'coconut_tree', 'raft_building'],
      [TileType.BEACH]: ['beach_debris', 'coconut_tree', 'raft_building'],
      [TileType.GRASS]: ['berry_bush', 'random_find_wood', 'random_lucky'],
      [TileType.WATER]: ['beach_debris'],
      [TileType.EMPTY]: ['random_find_wood']
    }
    const list = pools[type] || ['random_find_wood']
    return list[this.random.nextInt(list.length)]
  }

  /** 設定起始位置 */
  private setStartingPosition(): void {
    const { mapWidth, mapHeight } = this.game.config

    // 找基地位置
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        if (this.map[y][x].type === TileType.BASE) {
          this.game['playerSystem'].player.position = { x, y }
          this.revealArea(x, y, 3) // 初始視野
          return
        }
      }
    }

    // 找不到基地則用地圖中心
    this.game['playerSystem'].player.position = { x: Math.floor(mapWidth / 2), y: Math.floor(mapHeight / 2) }
    this.revealArea(this.game['playerSystem'].player.position.x, this.game['playerSystem'].player.position.y, 3)
  }

  /** 建立空格子 */
  private createTile(type: TileType): MapTile {
    return {
      type,
      explored: false,
      visible: false,
      resources: []
    }
  }

  /** 揭露區域 (視野) */
  revealArea(centerX: number, centerY: number, radius: number): void {
    const { mapWidth, mapHeight } = this.game.config

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = centerX + dx
        const y = centerY + dy

        if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) continue

        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist <= radius) {
          const tile = this.map[y][x]
          tile.visible = true
          tile.explored = true
        }
      }
    }

    this.game['renderer'].markMapDirty()
  }

  /** 更新視野 (玩家移動時呼叫) */
  updateVision(): void {
    const player = this.game['playerSystem'].player
    const { mapWidth, mapHeight } = this.game.config

    // 先清除舊視野 (保留 explored)
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        this.map[y][x].visible = false
      }
    }

    // 重新計算視野 (視野半徑 3)
    this.revealArea(player.position.x, player.position.y, 3)

    // 基地永遠可見
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        if (this.map[y][x].type === TileType.BASE) {
          this.map[y][x].visible = true
          this.map[y][x].explored = true
        }
      }
    }
  }

  /** 嘗試移動玩家 */
  tryMovePlayer(dx: number, dy: number): boolean {
    const player = this.game['playerSystem'].player
    const { mapWidth, mapHeight } = this.game.config

    const newX = player.position.x + dx
    const newY = player.position.y + dy

    // 邊界檢查
    if (newX < 0 || newX >= mapWidth || newY < 0 || newY >= mapHeight) {
      return false
    }

    const targetTile = this.map[newY][newX]

    // 檢查可通行
    if (!TILE_SPRITES[targetTile.type].walkable) {
      return false
    }

    // 體力檢查
    const cost = TILE_SPRITES[targetTile.type].baseStaminaCost || 1
    if (player.stamina < cost) {
      this.game['audioSystem'].playSFX('error')
      this.game['uiSystem'].addMessage('體力不足！請回基地按 R 休息或使用背包食物', 'warning')
      return false
    }

    // 執行移動
    player.position.x = newX
    player.position.y = newY
    player.stamina -= cost
    player.stats.tilesExplored++
    player.discoveredTiles.add(`${newX},${newY}`)
    this.game.advanceTime(15)

    // 更新視野
    this.updateVision()

    // 檢查事件
    if (targetTile.eventId) {
      const eventId = targetTile.eventId
      targetTile.eventId = undefined // 事件只觸發一次 (除非可重複)
      this.game.triggerEvent(eventId)

    } else if (targetTile.type !== TileType.BASE) {
      const isNight = this.game.isNight()
      const ambushChance = isNight ? 0.18 : 0.03
      const canEncounter = isNight || [TileType.FOREST, TileType.JUNGLE, TileType.CAVE].includes(targetTile.type)

      if (canEncounter && this.random.next() < ambushChance) {
        const beasts = targetTile.type === TileType.CAVE
          ? ['cave_bat_swarm']
          : ['wild_boar', 'jungle_snake']
        const chosenBeast = beasts[this.random.nextInt(beasts.length)]
        if (isNight) {
          this.game['uiSystem'].addMessage('⚠️【夜間遭遇】黑暗中一雙血紅的雙眼猛然撲出！野獸發動了夜襲！', 'warning')
        } else {
          this.game['uiSystem'].addMessage('⚠️ 草叢中竄出兇猛的野獸！', 'warning')
        }
        this.game.startCombat(chosenBeast)
      }


    }

    // 播放移動音效
    this.game['audioSystem'].playSFX('move')

    // 標記地圖需要重繪
    this.game['renderer'].markMapDirty()

    return true
  }

  /** 在當前位置探索/搜尋 */
  exploreCurrentTile(): boolean {
    const player = this.game['playerSystem'].player
    const tile = this.map[player.position.y][player.position.x]

    // 優先採集當前格子的可見資源 (消耗 2 點體力)
    if (tile.resources && tile.resources.length > 0) {
      const availableRes = tile.resources.find(r => r.quantity > 0)
      if (availableRes) {
        if (player.stamina < 2) {
          this.game['audioSystem'].playSFX('error')
          this.game['uiSystem'].addMessage('體力不足以採集資源！', 'warning')
          return false
        }
        player.stamina -= 2
        this.game['playerSystem'].addItem(availableRes.itemId, 1)
        availableRes.quantity--
        availableRes.lastHarvested = player.stats.daysSurvived
        this.game['uiSystem'].addMessage(`採集獲得: ${availableRes.itemId} x1`, 'success')
        this.game.advanceTime(15)
        this.game['renderer'].markMapDirty()
        return true
        this.game['renderer'].markMapDirty()
  
      }
    }

    if (player.stamina < this.game.config.staminaCostExplore) {
      this.game['audioSystem'].playSFX('error')
      this.game['uiSystem'].addMessage('體力不足以探索周遭！', 'warning')
      return false
    }

    player.stamina -= this.game.config.staminaCostExplore
    this.game.advanceTime(30)

    // 探索可能發現隱藏資源或事件
    const roll = this.random.next()

    if (roll < 0.45) {
      // 觸發隨機事件
      const eventId = this.generateEventId(tile.type, player.position.x, player.position.y)
      this.game.triggerEvent(eventId)

    } else if (roll < 0.7) {
      // 根據地形隨機找到 1 個基礎資源
      const fallbackItem = tile.type === TileType.FOREST || tile.type === TileType.JUNGLE ? 'wood'
        : (tile.type === TileType.ROCK || tile.type === TileType.MOUNTAIN || tile.type === TileType.CAVE ? 'stone' : 'fiber')
      this.game['playerSystem'].addItem(fallbackItem, 1)
      this.game['uiSystem'].addMessage(`仔細搜尋後發現了 ${fallbackItem} x1`, 'success')
    } else {
      this.game['audioSystem'].playSFX('explore')
      this.game['uiSystem'].addMessage('在四周搜尋了一番，沒有特別發現', 'info')
    }

    this.game['renderer'].markMapDirty()
    return true
  }

  /** 在基地休息 */
  restAtBase(): boolean {
    const player = this.game['playerSystem'].player
    const tile = this.map[player.position.y][player.position.x]

    if (tile.type !== TileType.BASE) {
      this.game['uiSystem'].addMessage('只能在基地 (棕色營地) 按 R 休息！', 'warning')
      this.game['audioSystem'].playSFX('error')
      return false
    }

    // 恢復體力和健康
    player.stamina = Math.min(player.maxStamina, player.stamina + this.game.config.staminaRegenPerRest)
    player.health = Math.min(player.maxHealth, player.health + this.game.config.healthRegenPerRest)
    player.stats.daysSurvived++
    player.stats.currentHour = 6
    player.stats.currentMinute = 0

    // 檢查資源再生
    const currentDay = player.stats.daysSurvived
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
        const t = this.map[y][x]
        if (t.resources) {
          for (const res of t.resources) {
            if (res.quantity === 0 && currentDay - res.lastHarvested >= res.respawnDays) {
              res.quantity = 1 + this.random.nextInt(3)
            }
          }
        }
      }
    }

    this.game['audioSystem'].playSFX('heal')
    this.game['uiSystem'].addMessage(`在營地休息了一晚 (第 ${player.stats.daysSurvived} 天)，恢復了體力與健康！`, 'success')
    this.game['renderer'].markMapDirty()
    return true
  }

  /** 採集資源 */
  harvestResource(resourceId: string): boolean {
    const player = this.game['playerSystem'].player
    const tile = this.map[player.position.y][player.position.x]

    if (!tile.resources) return false

    const resource = tile.resources.find(r => r.id === resourceId)
    if (!resource || resource.quantity <= 0) return false

    // 給予物品
    this.game['playerSystem'].addItem(resource.itemId, 1)
    resource.quantity--
    resource.lastHarvested = 0 // 簡化：不實作天數系統

    this.game['audioSystem'].playSFX('pickup')
    this.game['renderer'].markMapDirty()
    return true
  }

  /** 取得地圖資料 */
  getMap(): MapTile[][] {
    return this.map
  }

  /** 取得指定座標的格子 */
  getTile(x: number, y: number): MapTile | null {
    const { mapWidth, mapHeight } = this.game.config
    if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) return null
    return this.map[y][x]
  }

  /** 序列化地圖 (存檔用) */
  serialize(): MapTile[][] {
    return this.map.map(row => row.map(tile => ({ ...tile })))
  }

  /** 反序列化地圖 (讀檔用) */
  deserialize(data: MapTile[][]): void {
    this.map = data.map(row => row.map(tile => ({ ...tile })))
    this.game['renderer'].markMapDirty()
  }

  /** 取得地圖寬度 */
  getWidth(): number {
    return this.game.config.mapWidth
  }

  /** 取得地圖高度 */
  getHeight(): number {
    return this.game.config.mapHeight
  }

  /** 更新 (每幀呼叫) */
  update(dt: number): void {
    // 可以在這裡處理資源再生、動態事件等
  }

  /** 重置地圖系統 */
  reset(): void {
    this.map = []
    this.seedData = { map: [], events: {}, resources: {} }
  }
}