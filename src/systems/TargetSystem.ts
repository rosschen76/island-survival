// 目標模式系統 (Automation & Auto-Play System)
// 支援選定目標 (如長矛、木材等)，自動探索、採集、日落/體力不足自動返營睡覺，直至達成
// 功能增強：
// 1. 遇到突發事件預設自動選擇選項 1
// 2. 遇到野獸啟動自動戰鬥，戰鬥結束直接關閉視窗
// 3. 優先製造武器、防具，藥材少於 3 份時自動製造藥材
import { Game } from '../core/Game.js'
import { TargetGoalDef, TileType, ItemType, GameState } from '../core/Types.js'
import { ITEM_DEFS } from '../data/Items.js'

export class TargetSystem {
  private game: Game
  private activeGoalId: string | null = null
  private stepInterval: number = 260 // 每步間隔毫秒
  private stepTimer: number = 0
  private currentPath: { x: number; y: number }[] = []
  private statusMessage: string = ''

  public readonly goals: TargetGoalDef[] = [
    {
      id: 'CRAFT_SPEAR',
      title: '目標製造：木長矛',
      description: '自動採集木材x4、石頭x1與纖維x2，天黑前自動回帳篷就寢，材料齊全時自動製造防身木矛。',
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
    this.game.uiSystem?.addMessage(`🎯【目標模式啟動】${goal.title}！按 T 或 WASD 鍵可隨時接管停止。`, 'success', 4000)
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
    this.game.uiSystem?.addMessage(`🛑【目標模式已停止】${msg}`, 'info', 3000)
  }

  /** 每幀自動執行決策邏輯 */
  update(dt: number): void {
    if (!this.isActive()) return

    const currentState = this.game.getState()

    // 1. 若玩家正在戰鬥中，執行自動戰鬥
    if (currentState === GameState.COMBAT) {
      const combat = this.game.combatSystem
      // 戰鬥若已結束，直接關閉視窗返回地圖！
      if (combat.isCombatEnded() || !combat.isInCombat()) {
        const won = this.game.playerSystem.player.health > 0
        this.game.endCombat(won)
        this.stepTimer = 0
        return
      }

      this.stepTimer += dt
      if (this.stepTimer >= 300) {
        this.stepTimer = 0
        const player = this.game.playerSystem.player
        // 血量偏低時自動使用藥品
        if (player.health < player.maxHealth * 0.5) {
          if (this.game.playerSystem.hasItem('herbal_medicine')) {
            this.game.playerSystem.useItem('herbal_medicine')
            this.game.uiSystem.addMessage('💊【自動戰鬥】血量偏低，使用草藥恢復生命！', 'info')
          } else if (this.game.playerSystem.hasItem('bandage')) {
            this.game.playerSystem.useItem('bandage')
            this.game.uiSystem.addMessage('🩹【自動戰鬥】血量偏低，使用繃帶包紮傷口！', 'info')
          }
        }

        // 普通攻擊
        combat.playerAction('attack')

        // 檢查是否已擊敗敵人，若是則直接關閉視窗返回地圖！
        if (combat.isCombatEnded()) {
          const won = this.game.playerSystem.player.health > 0
          this.game.endCombat(won)
        }
      }
      return
    }

    // 2. 若處於事件中，預設自動選擇選項 1
    if (currentState === GameState.EVENT) {
      this.stepTimer += dt
      if (this.stepTimer >= 400) {
        this.stepTimer = 0
        const choices = this.game.eventSystem.getAvailableChoices()
        if (choices && choices.length > 0) {
          const firstChoice = choices[0]
          this.game.uiSystem.addMessage(`🎯【目標模式】突發事件自動選擇選項 1：${firstChoice.text}`, 'info', 2500)
          this.game.eventSystem.chooseOption(firstChoice.id)
        } else {
          this.game.endEvent()
        }
      }
      return
    }

    // 只在正常遊玩狀態進行地圖移動與採集決策
    if (currentState !== GameState.PLAYING) return

    this.stepTimer += dt
    if (this.stepTimer < this.stepInterval) return
    this.stepTimer = 0

    this.executeAutomationStep()
  }

  /** 執行單步自動化行動 */
  private executeAutomationStep(): void {
    const goal = this.getActiveGoal()
    if (!goal) return

    const player = this.game.playerSystem.player
    const mapSystem = this.game.mapSystem
    const craftSystem = this.game.craftSystem
    const map = mapSystem.getMap()
    if (!map || map.length === 0) return

    // === 步驟 1：檢查目標是否已經達成 ===
    if (this.isGoalCompleted(goal)) {
      this.game.audioSystem.playSFX('victory')
      this.game.uiSystem.addMessage(`🎉【目標達成】已成功完成【${goal.title}】！自動模式結束。`, 'success', 6000)
      this.stopGoal('目標已達成！')
      return
    }

    // === 步驟 2：時間與安全考量 — 17:00 傍晚或體力不足 18 時，自動回帳篷就寢 ===
    const hour = player.stats.currentHour ?? 8
    const basePos = this.findBasePosition()

    if (basePos && (hour >= 17 || hour < 6 || player.stamina <= 18)) {
      if (player.position.x === basePos.x && player.position.y === basePos.y) {
        this.statusMessage = '🌙 夜幕降臨，在帳篷安穩休息至 06:00 日出...'
        mapSystem.restAtBase()
        this.currentPath = []
        return
      } else {
        this.statusMessage = hour >= 17 ? '🌆 接近 18:00 日落，正在全速趕回營地躲避野獸...' : '⚡ 體力不足，正在返回基地休息...'
        this.moveTowards(basePos.x, basePos.y)
        return
      }
    }

    // === 步驟 3：緊急自癒 — 若血量偏低且有藥品，自動使用 ===
    if (player.health <= 60) {
      if (this.game.playerSystem.hasItem('herbal_medicine')) {
        this.game.playerSystem.useItem('herbal_medicine')
        this.game.uiSystem.addMessage('💊【自癒維護】血量偏低，自動使用草藥恢復健康！', 'info')
        return
      } else if (this.game.playerSystem.hasItem('bandage')) {
        this.game.playerSystem.useItem('bandage')
        this.game.uiSystem.addMessage('🩹【自癒維護】血量偏低，自動使用繃帶包紮傷口！', 'info')
        return
      }
    }

    // === 步驟 4：優先製造武器 (若手上無任何武器) ===
    const hasWeapon = player.inventory.some(i => i.type === ItemType.WEAPON)
    if (!hasWeapon) {
      const spearRecipe = craftSystem.getAllRecipes().find(r => r.resultItemId === 'wooden_spear')
      if (spearRecipe && craftSystem.canCraft(spearRecipe)) {
        craftSystem.craft(spearRecipe.id)
        this.game.uiSystem.addMessage('⚔️【武器優先】防身第一！自動製造武器：木矛！', 'success')
        this.statusMessage = '已優先製造並裝備武器木矛！'
        return
      }
    }

    // === 步驟 5：優先製造防具 (若無任何防具) ===
    const hasArmor = player.inventory.some(i => i.type === ItemType.ARMOR)
    if (!hasArmor) {
      const shieldRecipe = craftSystem.getAllRecipes().find(r => r.resultItemId === 'wooden_shield')
      if (shieldRecipe && craftSystem.canCraft(shieldRecipe)) {
        craftSystem.craft(shieldRecipe.id)
        this.game.uiSystem.addMessage('🛡️【防具優先】生存第一！自動製造防具：木盾！', 'success')
        this.statusMessage = '已優先製造並裝備防具木盾！'
        return
      }
      const leatherRecipe = craftSystem.getAllRecipes().find(r => r.resultItemId === 'leather_armor')
      if (leatherRecipe && craftSystem.canCraft(leatherRecipe)) {
        craftSystem.craft(leatherRecipe.id)
        this.game.uiSystem.addMessage('🛡️【防具優先】生存第一！自動製造防具：皮甲！', 'success')
        this.statusMessage = '已優先製造並裝備防具皮甲！'
        return
      }
    }

    // === 步驟 6：藥材少於 3 份時，優先自動製造藥材 ===
    const medicineCount = player.inventory
      .filter(i => i.id === 'herbal_medicine' || i.id === 'bandage' || i.type === ItemType.MEDICINE)
      .reduce((s, i) => s + i.quantity, 0)

    if (medicineCount < 3) {
      // 優先調配草藥
      const herbMedRecipe = craftSystem.getAllRecipes().find(r => r.resultItemId === 'herbal_medicine')
      if (herbMedRecipe && craftSystem.canCraft(herbMedRecipe)) {
        craftSystem.craft(herbMedRecipe.id)
        this.game.uiSystem.addMessage(`🧪【藥材優先】藥材不足 3 份 (${medicineCount}/3)，自動製造草藥！`, 'success')
        this.statusMessage = `已調配草藥 (現有 ${medicineCount + 1}/3)`
        return
      }
      // 其次製作繃帶
      const bandageRecipe = craftSystem.getAllRecipes().find(r => r.resultItemId === 'bandage')
      if (bandageRecipe && craftSystem.canCraft(bandageRecipe)) {
        craftSystem.craft(bandageRecipe.id)
        this.game.uiSystem.addMessage(`🩹【藥材優先】藥材不足 3 份 (${medicineCount}/3)，自動製作繃帶 x2！`, 'success')
        this.statusMessage = `已製作繃帶 (現有 ${medicineCount + 2}/3)`
        return
      }
    }

    // === 步驟 7：合成類目標 — 若材料已備齊，直接自動製作 ===
    if (goal.type === 'craft' && goal.targetItem) {
      const recipe = craftSystem.getAllRecipes().find(r => r.resultItemId === goal.targetItem)
      if (recipe && craftSystem.canCraft(recipe)) {
        craftSystem.craft(recipe.id)
        this.game.uiSystem.addMessage(`🔨【自動製作】所需材料齊全，成功製作 ${ITEM_DEFS[goal.targetItem]?.name || goal.targetItem}！`, 'success')
        if (this.isGoalCompleted(goal)) {
          this.game.audioSystem.playSFX('victory')
          this.game.uiSystem.addMessage(`🎉【目標達成】已成功製作【${goal.title}】！`, 'success', 6000)
          this.stopGoal('目標已達成！')
        }
        return
      }
    }

    // === 步驟 8：採集當前地塊資源 ===
    const currentTile = map[player.position.y][player.position.x]
    const neededItem = this.getNeededItemForGoal(goal)

    if (currentTile.resources && currentTile.resources.length > 0) {
      const targetRes = currentTile.resources.find(r => r.quantity > 0 && (!neededItem || r.itemId === neededItem || ['wood', 'stone', 'fiber', 'herbs'].includes(r.itemId)))
      if (targetRes) {
        this.statusMessage = `正在採集 ${targetRes.itemId}...`
        mapSystem.exploreCurrentTile()
        return
      }
    }

    // === 步驟 9：若當前地塊是目標地形且尚未搜索，就地搜尋採集 ===
    if (neededItem && this.isMatchingTerrain(currentTile.type, neededItem)) {
      if (Math.random() < 0.45 && player.stamina >= 5) {
        this.statusMessage = `正在四周搜尋 ${neededItem}...`
        mapSystem.exploreCurrentTile()
        return
      }
    }

    // === 步驟 10：尋路前往最近的目標資源地塊 ===
    if (neededItem) {
      const nearestResTile = this.findNearestTileWithItemOrTerrain(neededItem)
      if (nearestResTile) {
        this.statusMessage = `正在前往採集點 (${nearestResTile.x}, ${nearestResTile.y})...`
        this.moveTowards(nearestResTile.x, nearestResTile.y)
        return
      }
    }

    // === 步驟 11：若無已知採集點或目標為探索，尋路前往最近未探索迷霧 ===
    const nearestUnexplored = this.findNearestUnexploredTile()
    if (nearestUnexplored) {
      this.statusMessage = `正在探索未知迷霧區域 (${nearestUnexplored.x}, ${nearestUnexplored.y})...`
      this.moveTowards(nearestUnexplored.x, nearestUnexplored.y)
      return
    }

    this.statusMessage = '等待資源刷新或手動接管...'
  }

  /** 檢查目標是否完成 */
  private isGoalCompleted(goal: TargetGoalDef): boolean {
    const player = this.game.playerSystem.player
    if (goal.type === 'craft' && goal.targetItem) {
      return player.inventory.some(i => i.id === goal.targetItem && i.quantity >= 1)
    }
    if (goal.type === 'gather' && goal.targetItem && goal.targetQuantity) {
      const count = player.inventory.filter(i => i.id === goal.targetItem).reduce((sum, i) => sum + i.quantity, 0)
      return count >= goal.targetQuantity
    }
    if (goal.type === 'explore') {
      return player.stats.tilesExplored >= 1000
    }
    return false
  }

  /** 取得目標當前最急需的材料物品 ID (優先級：武器材料 > 藥材材料 > 目標材料) */
  private getNeededItemForGoal(goal: TargetGoalDef): string | null {
    const player = this.game.playerSystem.player

    // 1. 優先補齊武器材料 (wooden_spear 需要木材x4, 石頭x1, 纖維x2)
    const hasWeapon = player.inventory.some(i => i.type === ItemType.WEAPON)
    if (!hasWeapon) {
      const woodCount = this.getItemCount('wood')
      if (woodCount < 4) return 'wood'
      const stoneCount = this.getItemCount('stone')
      if (stoneCount < 1) return 'stone'
      const fiberCount = this.getItemCount('fiber')
      if (fiberCount < 2) return 'fiber'
    }

    // 2. 優先補齊藥材材料 (若藥材少於 3 份，優先收集植物纖維或藥草)
    const medicineCount = player.inventory
      .filter(i => i.id === 'herbal_medicine' || i.id === 'bandage' || i.type === ItemType.MEDICINE)
      .reduce((s, i) => s + i.quantity, 0)
    if (medicineCount < 3) {
      const fiberCount = this.getItemCount('fiber')
      if (fiberCount < 3) return 'fiber'
      const herbsCount = this.getItemCount('herbs')
      if (herbsCount < 3) return 'herbs'
    }

    // 3. 一般目標所需材料
    if (goal.type === 'gather') return goal.targetItem || null
    if (goal.type === 'craft' && goal.targetItem) {
      const recipe = this.game.craftSystem.getAllRecipes().find(r => r.resultItemId === goal.targetItem)
      if (recipe) {
        for (const ing of recipe.ingredients) {
          const currentCount = this.getItemCount(ing.itemId)
          if (currentCount < ing.quantity) {
            return ing.itemId
          }
        }
      }
    }
    return null
  }

  private getItemCount(itemId: string): number {
    const player = this.game.playerSystem.player
    return player.inventory.filter(i => i.id === itemId).reduce((s, i) => s + i.quantity, 0)
  }

  /** 地形是否能產出該物品 */
  private isMatchingTerrain(type: TileType, itemId: string): boolean {
    if (itemId === 'wood') return type === TileType.FOREST || type === TileType.JUNGLE
    if (itemId === 'stone') return type === TileType.ROCK || type === TileType.MOUNTAIN || type === TileType.CAVE
    if (itemId === 'fiber') return type === TileType.GRASS || type === TileType.JUNGLE || type === TileType.FOREST
    if (itemId === 'herbs') return type === TileType.FOREST || type === TileType.JUNGLE || type === TileType.GRASS
    return false
  }

  /** 朝目標坐標前進一格 (含 BFS 尋路演算法) */
  private moveTowards(targetX: number, targetY: number): boolean {
    const player = this.game.playerSystem.player
    const mapSystem = this.game.mapSystem

    if (player.position.x === targetX && player.position.y === targetY) {
      return true
    }

    const path = this.findPath(player.position.x, player.position.y, targetX, targetY)
    if (!path || path.length < 2) {
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
    const map = this.game.mapSystem.getMap()
    const { mapWidth, mapHeight } = this.game.config

    const queue: { x: number; y: number }[] = [{ x: startX, y: startY }]
    const visited = new Set<string>()
    const parentMap = new Map<string, { x: number; y: number }>()

    visited.add(`${startX},${startY}`)

    const dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }]

    let found = false
    let maxSteps = 400

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
        if (tile.type === TileType.WATER || tile.type === TileType.EMPTY) continue

        visited.add(key)
        parentMap.set(key, current)
        queue.push({ x: nx, y: ny })
      }
    }

    if (!found) return null

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
    const map = this.game.mapSystem.getMap()
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
    const player = this.game.playerSystem.player
    const map = this.game.mapSystem.getMap()
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
    const player = this.game.playerSystem.player
    const map = this.game.mapSystem.getMap()
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
