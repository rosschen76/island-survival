// 目標模式系統 (Automation & Auto-Play System)
// 支援選定目標 (如長矛、木材等)，自動探索、採集、日落/體力不足自動返營睡覺，直至達成
import { Game } from '../core/Game.js'
import { TargetGoalDef, TileType } from '../core/Types.js'
import { ITEM_DEFS } from '../data/Items.js'

export class TargetSystem {
  private game: Game
  private activeGoalId: string | null = null
  private stepInterval: number = 280 // 每步間隔毫秒
  private stepTimer: number = 0
  private currentPath: { x: number; y: number }[] = []
  private statusMessage: string = ''

  public readonly goals: TargetGoalDef[] = [
    {
      id: 'CRAFT_SPEAR',
      title: '目標製造：木長矛',
      description: '自動採集木材x3與纖維x2，天黑前自動回帳篷就寢，材料齊全時自動製造防身木長矛。',
      icon: '🏹',
      type: 'craft',
      targetItem: 'wooden_spear'
    },
    {
      id: 'COLLECT_WOOD_20',
      title: '目標收集：木材 x20',
      description: '自動尋找樹木與森林採集木材，滿 20 份為止。',
      icon: '🪵',
      type: 'gather',
      targetItem: 'wood',
      targetQuantity: 20
    },
    {
      id: 'COLLECT_WOOD_50',
      title: '目標收集：木材 x50',
      description: '大量儲備木材資源，滿 50 份為止。',
      icon: '🌲',
      type: 'gather',
      targetItem: 'wood',
      targetQuantity: 50
    },
    {
      id: 'COLLECT_STONE_20',
      title: '目標收集：石頭 x20',
      description: '自動前往岩石地採集石頭，滿 20 份為止。',
      icon: '🪨',
      type: 'gather',
      targetItem: 'stone',
      targetQuantity: 20
    },
    {
      id: 'COLLECT_FIBER_20',
      title: '目標收集：植物纖維 x20',
      description: '自動前往草地與叢林採集纖維，滿 20 份為止。',
      icon: '🌿',
      type: 'gather',
      targetItem: 'fiber',
      targetQuantity: 20
    },
    {
      id: 'CRAFT_AXE',
      title: '目標製造：石斧',
      description: '自動採集木材與石頭，完成砍樹工具石斧製作。',
      icon: '🪓',
      type: 'craft',
      targetItem: 'stone_axe'
    },
    {
      id: 'CRAFT_PICKAXE',
      title: '目標製造：石鎬',
      description: '自動採集木材與石頭，完成採礦工具石鎬製作。',
      icon: '⛏️',
      type: 'craft',
      targetItem: 'stone_pickaxe'
    },
    {
      id: 'AUTO_EXPLORE',
      title: '目標：全島地圖探索',
      description: '自動探索未開啟迷霧地塊，夜間主動回帳篷過夜，持續探索整座無人島。',
      icon: '🧭',
      type: 'explore'
    }
  ]

  constructor(game: Game) {
    this.game = game
  }

  /** 是否正在執行目標模式 */
  isActive(): boolean {
    return this.activeGoalId !== null
  }

  /** 取得當前目標 */
  getActiveGoal(): TargetGoalDef | null {
    if (!this.activeGoalId) return null
    return this.goals.find(g => g.id === this.activeGoalId) || null
  }

  /** 取得當前狀態訊息 */
  getStatusMessage(): string {
    return this.statusMessage
  }

  /** 啟動目標模式 */
  startGoal(goalId: string): boolean {
    const goal = this.goals.find(g => g.id === goalId)
    if (!goal) return false

    this.activeGoalId = goalId
    this.currentPath = []
    this.stepTimer = 0
    this.statusMessage = `已啟動【${goal.title}】自動模式`
    this.game['uiSystem']?.addMessage(`🎯【目標模式啟動】${goal.title}！按 T 或 ESC 鍵可隨時停止。`, 'success', 4000)
    return true
  }

  /** 停止目標模式 */
  stopGoal(reason?: string): void {
    if (!this.activeGoalId) return
    const goal = this.getActiveGoal()
    this.activeGoalId = null
    this.currentPath = []
    const msg = reason || (goal ? `已停止【${goal.title}】` : '已停止目標模式')
    this.statusMessage = msg
    this.game['uiSystem']?.addMessage(`🛑【目標模式已停止】${msg}`, 'info', 3000)
  }

  /** 每幀自動執行決策邏輯 */
  update(dt: number): void {
    if (!this.isActive()) return

    // 若玩家正在戰鬥中，執行自動戰鬥 (普通攻擊)
    if (this.game.getState() === 'COMBAT') {
      this.stepTimer += dt
      if (this.stepTimer >= 600) {
        this.stepTimer = 0
        this.game['combatSystem']?.playerAction('attack')
      }
      return
    }

    // 若處於事件中，選擇第一個安全選項
    if (this.game.getState() === 'EVENT') {
      this.stepTimer += dt
      if (this.stepTimer >= 800) {
        this.stepTimer = 0
        const choices = this.game['eventSystem']?.getAvailableChoices()
        if (choices && choices.length > 0) {
          this.game['eventSystem']?.chooseOption(choices[0].id)
        }
      }
      return
    }

    // 只在正常遊玩狀態運作
    if (this.game.getState() !== 'PLAYING') return

    this.stepTimer += dt
    if (this.stepTimer < this.stepInterval) return
    this.stepTimer = 0

    this.executeAutomationStep()
  }

  /** 執行單步自動化行動 */
  private executeAutomationStep(): void {
    const goal = this.getActiveGoal()
    if (!goal) return

    const player = this.game['playerSystem'].player
    const mapSystem = this.game['mapSystem']
    const craftSystem = this.game['craftSystem']
    const map = mapSystem.getMap()
    if (!map || map.length === 0) return

    // === 步驟 1：檢查目標是否已經達成 ===
    if (this.isGoalCompleted(goal)) {
      this.game['audioSystem']?.playSFX('victory')
      this.game['uiSystem']?.addMessage(`🎉【目標達成】已成功完成【${goal.title}】！自動模式結束。`, 'success', 6000)
      this.stopGoal('目標已達成！')
      return
    }

    // === 步驟 2：合成類目標 — 若材料已備齊，直接自動製作 ===
    if (goal.type === 'craft' && goal.targetItem) {
      const recipe = craftSystem.getAllRecipes().find(r => r.resultItemId === goal.targetItem)
      if (recipe && craftSystem.canCraft(recipe)) {
        craftSystem.craft(recipe.id)
        this.game['uiSystem']?.addMessage(`🔨【自動製作】所需材料齊全，成功製作 ${ITEM_DEFS[goal.targetItem]?.name || goal.targetItem}！`, 'success')
        if (this.isGoalCompleted(goal)) {
          this.game['audioSystem']?.playSFX('victory')
          this.game['uiSystem']?.addMessage(`🎉【目標達成】已成功製作【${goal.title}】！`, 'success', 6000)
          this.stopGoal('目標已達成！')
        }
        return
      }
    }

    // === 步驟 3：時間與安全考量 — 17:00 傍晚或體力不足 18 時，自動回帳篷就寢 ===
    const hour = player.stats.currentHour ?? 8
    const basePos = this.findBasePosition()

    if (basePos && (hour >= 17 || hour < 6 || player.stamina <= 18)) {
      // 判斷是否已經在基地帳篷上
      if (player.position.x === basePos.x && player.position.y === basePos.y) {
        // 在基地中直接休息至 06:00 日出！
        this.statusMessage = '🌙 夜幕降臨，在帳篷安穩休息至 06:00 日出...'
        mapSystem.restAtBase()
        this.currentPath = []
        return
      } else {
        // 尋路返回基地
        this.statusMessage = hour >= 17 ? '🌆 接近 18:00 日落，正在全速趕回營地躲避野獸...' : '⚡ 體力不足，正在返回基地休息...'
        this.moveTowards(basePos.x, basePos.y)
        return
      }
    }

    // === 步驟 4：當前地塊是否有目標所需資源，有則優先採集 ===
    const currentTile = map[player.position.y][player.position.x]
    const neededItem = this.getNeededItemForGoal(goal)

    if (currentTile.resources && currentTile.resources.length > 0) {
      const targetRes = currentTile.resources.find(r => r.quantity > 0 && (!neededItem || r.itemId === neededItem))
      if (targetRes) {
        this.statusMessage = `正在採集 ${targetRes.itemId}...`
        mapSystem.exploreCurrentTile()
        return
      }
    }

    // === 步驟 5：若當前地塊是目標地形且尚未搜索，進行搜索採集 ===
    if (neededItem && this.isMatchingTerrain(currentTile.type, neededItem)) {
      // 50% 機率就地採集搜索
      if (Math.random() < 0.45 && player.stamina >= 5) {
        this.statusMessage = `正在四周搜尋 ${neededItem}...`
        mapSystem.exploreCurrentTile()
        return
      }
    }

    // === 步驟 6：尋路前往最近的目標資源地塊 ===
    if (neededItem) {
      const nearestResTile = this.findNearestTileWithItemOrTerrain(neededItem)
      if (nearestResTile) {
        this.statusMessage = `正在前往採集點 (${nearestResTile.x}, ${nearestResTile.y})...`
        this.moveTowards(nearestResTile.x, nearestResTile.y)
        return
      }
    }

    // === 步驟 7：若無已知採集點或目標為探索，尋路前往最近未探索迷霧 ===
    const nearestUnexplored = this.findNearestUnexploredTile()
    if (nearestUnexplored) {
      this.statusMessage = `正在探索未知迷霧區域 (${nearestUnexplored.x}, ${nearestUnexplored.y})...`
      this.moveTowards(nearestUnexplored.x, nearestUnexplored.y)
      return
    }

    // 若地圖完全探索完畢且未找到資源
    this.statusMessage = '等待資源刷新或手動接管...'
  }

  /** 檢查目標是否完成 */
  private isGoalCompleted(goal: TargetGoalDef): boolean {
    const player = this.game['playerSystem'].player
    if (goal.type === 'craft' && goal.targetItem) {
      return player.inventory.some(i => i.id === goal.targetItem && i.quantity >= 1)
    }
    if (goal.type === 'gather' && goal.targetItem && goal.targetQuantity) {
      const count = player.inventory.filter(i => i.id === goal.targetItem).reduce((s, i) => s + i.quantity, 0)
      return count >= goal.targetQuantity
    }
    if (goal.type === 'explore') {
      return player.stats.tilesExplored >= 1000
    }
    return false
  }

  /** 取得目標當前最急需的材料物品 ID */
  private getNeededItemForGoal(goal: TargetGoalDef): string | null {
    const player = this.game['playerSystem'].player
    if (goal.type === 'gather') return goal.targetItem || null
    if (goal.type === 'craft' && goal.targetItem) {
      const recipe = this.game['craftSystem'].getAllRecipes().find(r => r.resultItemId === goal.targetItem)
      if (recipe) {
        for (const ing of recipe.ingredients) {
          const currentCount = player.inventory.filter(i => i.id === ing.itemId).reduce((s, i) => s + i.quantity, 0)
          if (currentCount < ing.quantity) {
            return ing.itemId
          }
        }
      }
    }
    return null
  }

  /** 地形是否能產出該物品 */
  private isMatchingTerrain(type: TileType, itemId: string): boolean {
    if (itemId === 'wood') return type === TileType.FOREST || type === TileType.JUNGLE
    if (itemId === 'stone') return type === TileType.ROCK || type === TileType.MOUNTAIN || type === TileType.CAVE
    if (itemId === 'fiber') return type === TileType.GRASS || type === TileType.JUNGLE || type === TileType.FOREST
    return false
  }

  /** 朝目標坐標前進一格 (含 BFS 尋路演算法) */
  private moveTowards(targetX: number, targetY: number): boolean {
    const player = this.game['playerSystem'].player
    const mapSystem = this.game['mapSystem']

    // 如果已經在目標旁邊或目標本身
    if (player.position.x === targetX && player.position.y === targetY) {
      return true
    }

    // 計算 BFS 最短路徑
    const path = this.findPath(player.position.x, player.position.y, targetX, targetY)
    if (!path || path.length < 2) {
      // 隨機漫步探索
      const dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }]
      const d = dirs[Math.floor(Math.random() * dirs.length)]
      return mapSystem.tryMovePlayer(d.dx, d.dy)
    }

    const nextStep = path[1]
    const dx = nextStep.x - player.position.x
    const dy = nextStep.y - player.position.y
    return mapSystem.tryMovePlayer(dx, dy)
  }

  /** 廣度優先搜尋 (BFS) 最短可通行路徑 */
  private findPath(startX: number, startY: number, endX: number, endY: number): { x: number; y: number }[] | null {
    const map = this.game['mapSystem'].getMap()
    const { mapWidth, mapHeight } = this.game.config

    const queue: { x: number; y: number }[] = [{ x: startX, y: startY }]
    const visited = new Set<string>()
    const parentMap = new Map<string, { x: number; y: number }>()

    visited.add(`${startX},${startY}`)

    const dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }]

    let found = false
    let maxSteps = 400 // 防止過度運算

    while (queue.length > 0 && maxSteps-- > 0) {
      const current = queue.shift()!
      if (current.x === endX && current.y === endY) {
        found = true
        break
      }

      for (const d of dirs) {
        const nx = current.x + d.dx
        const ny = current.y + d.dy

        if (nx < 0 || nx >= mapWidth || ny < 0 || ny >= mapHeight) continue
        const key = `${nx},${ny}`
        if (visited.has(key)) continue

        const tile = map[ny][nx]
        // 不可通行的地表 (如深水、未探索阻擋等)
        if (tile.type === TileType.WATER || tile.type === TileType.EMPTY) continue

        visited.add(key)
        parentMap.set(key, current)
        queue.push({ x: nx, y: ny })
      }
    }

    if (!found) return null

    // 回溯重建路徑
    const path: { x: number; y: number }[] = []
    let curr: { x: number; y: number } | undefined = { x: endX, y: endY }
    while (curr) {
      path.unshift(curr)
      if (curr.x === startX && curr.y === startY) break
      curr = parentMap.get(`${curr.x},${curr.y}`)
    }

    return path
  }

  /** 尋找基地 (帳篷營地) 位置 */
  private findBasePosition(): { x: number; y: number } | null {
    const map = this.game['mapSystem'].getMap()
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        if (map[y][x].type === TileType.BASE) {
          return { x, y }
        }
      }
    }
    return null
  }

  /** 尋找最近已知含有目標物品或匹配地形的地塊 */
  private findNearestTileWithItemOrTerrain(itemId: string): { x: number; y: number } | null {
    const player = this.game['playerSystem'].player
    const map = this.game['mapSystem'].getMap()
    let nearest: { x: number; y: number } | null = null
    let minDist = Infinity

    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        const tile = map[y][x]
        if (!tile.explored) continue

        const hasResource = tile.resources && tile.resources.some(r => r.itemId === itemId && r.quantity > 0)
        const isTerrain = this.isMatchingTerrain(tile.type, itemId)

        if (hasResource || isTerrain) {
          const dist = Math.abs(x - player.position.x) + Math.abs(y - player.position.y)
          if (dist < minDist && dist > 0) {
            minDist = dist
            nearest = { x, y }
          }
        }
      }
    }
    return nearest
  }

  /** 尋找最近未探索地塊 */
  private findNearestUnexploredTile(): { x: number; y: number } | null {
    const player = this.game['playerSystem'].player
    const map = this.game['mapSystem'].getMap()
    let nearest: { x: number; y: number } | null = null
    let minDist = Infinity

    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        const tile = map[y][x]
        if (!tile.explored && tile.type !== TileType.WATER) {
          const dist = Math.abs(x - player.position.x) + Math.abs(y - player.position.y)
          if (dist < minDist) {
            minDist = dist
            nearest = { x, y }
          }
        }
      }
    }
    return nearest
  }
}
