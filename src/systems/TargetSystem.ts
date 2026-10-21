// 目標模式系統 (Automation & Auto-Play System)
// 支援選定目標 (如長矛、木材等)，自動探索、採集、日落/體力不足自動返營睡覺，直至達成
// 功能增強：
// 1. 遇到突發事件預設自動選擇選項 1
// 2. 遇到野獸啟動自動戰鬥，戰鬥結束直接關閉視窗
// 3. 優先製造武器、防具，藥材少於 3 份時自動製造藥材
import { Game } from '../core/Game.js'
import { TargetGoalDef, TileType, ItemType, GameState } from '../core/Types.js'
import { ITEM_DEFS } from '../data/Items.js'
import { MapSystem } from './MapSystem.js'

const DIRS: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]]

export class TargetSystem {
  private game: Game
  private activeGoalId: string | null = null
  private stepInterval: number = 260 // 每步間隔毫秒
  private stepTimer: number = 0
  private currentPath: { x: number; y: number }[] = []
  private statusMessage: string = ''
  /** 距離營地超過此步數時，視為「遠離營地」，傍晚改為就地紮營 */
  private static readonly FAR_CAMP_DISTANCE = 10
  /** 以玩家為起點的 BFS 距離場 / 父節點 (每步重算) */
  private distField: Int32Array | null = null
  private parentField: Int32Array | null = null
  /** 最近一次計算的「到最近營地步數」 */
  private lastStepsToCamp: number = 0

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

    // 每步重新計算整張地圖的 BFS 距離場 (50x38 約 1900 格，運算量極小)
    this.computeDistanceField()

    // === 步驟 1：檢查目標是否已經達成 ===
    if (this.isGoalCompleted(goal)) {
      this.game.audioSystem.playSFX('victory')
      this.game.uiSystem.addMessage(`🎉【目標達成】已成功完成【${goal.title}】！自動模式結束。`, 'success', 6000)
      this.stopGoal('目標已達成！')
      return
    }

    // === 步驟 2：日落 / 體力管理 — 依距離提早回最近營地，或視情況就地建造新營地 ===
    if (this.handleRestAndCamp()) return

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

    // 1.5 遠離營地時，預先備妥紮營材料 (木材x5、植物纖維x3)
    if (this.lastStepsToCamp > TargetSystem.FAR_CAMP_DISTANCE - 3) {
      for (const c of MapSystem.CAMP_COST) {
        if (this.getItemCount(c.itemId) < c.quantity) return c.itemId
      }
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

  /** 日落 / 體力管理：回最近營地或就地紮營。回傳 true 代表本步已執行動作 */
  private handleRestAndCamp(): boolean {
    const player = this.game.playerSystem.player
    const mapSystem = this.game.mapSystem
    const hour = player.stats.currentHour ?? 8
    const minute = player.stats.currentMinute ?? 0
    const isNight = hour >= 18 || hour < 6
    const minutesToDusk = isNight ? 0 : 18 * 60 - (hour * 60 + minute)
    const onRestTile = mapSystem.isRestTile(mapSystem.getTile(player.position.x, player.position.y))

    const nearest = this.findNearestRestPoint()
    const stepsToCamp = nearest ? nearest.dist : Infinity
    this.lastStepsToCamp = stepsToCamp

    const tired = player.stamina <= 18
    const duskSoon = hour >= 17 || isNight
    const farFromCamp = stepsToCamp > TargetSystem.FAR_CAMP_DISTANCE
    const campCheck = mapSystem.canBuildCampHere()

    // 計畫 A：遠離營地且帶著紮營材料 → 白天照常工作，傍晚 / 體力不足時就地紮營
    if (farFromCamp && mapSystem.hasCampMaterials() && !onRestTile) {
      if (!duskSoon && !tired) return false
      if (campCheck.ok) {
        this.buildCampHere(stepsToCamp)
        return true
      }
      // 當前地形不適合 (洞穴 / 廢墟 / 太靠近其他營地) → 往旁邊找空地
      if ((campCheck.code === 'TERRAIN' || campCheck.code === 'NEAR_CAMP') && this.stepToCampableNeighbor()) {
        this.statusMessage = '🔍 此處不宜紮營，正在尋找附近適合紮營的空地...'
        return true
      }
      // 其餘情況改走計畫 B
    }

    // 計畫 B：依距離估算回程時間 (每步 15 分鐘)，提早出發回最近營地
    const needReturn = isNight || tired || duskSoon ||
      (stepsToCamp !== Infinity && (stepsToCamp * 15 + 45 >= minutesToDusk || player.stamina <= stepsToCamp + 8))
    if (!needReturn) return false

    if (onRestTile) {
      this.statusMessage = '🌙 在營地安穩休息至 06:00 日出...'
      mapSystem.restAtBase()
      return true
    }

    // 判斷是否趕得回去：天黑、時間不足、體力不足或無路可達
    const canMakeIt = stepsToCamp !== Infinity && !isNight &&
      stepsToCamp * 15 <= minutesToDusk && player.stamina >= stepsToCamp + 2
    if (!canMakeIt && campCheck.ok) {
      this.buildCampHere(stepsToCamp)
      return true
    }

    if (nearest) {
      this.statusMessage = canMakeIt
        ? `🌆 距離最近營地 ${stepsToCamp} 格，提早出發趕回營地...`
        : `⚠️ 趕不及回營且無法紮營 (${campCheck.reason || '條件不足'})，冒險趕路中...`
      this.moveTowards(nearest.x, nearest.y)
      return true
    }
    return false
  }

  /** 就地建造營地 (下一步即會在營地上休息) */
  private buildCampHere(stepsToCamp: number): void {
    if (this.game.mapSystem.buildCamp(true)) {
      const distText = stepsToCamp === Infinity ? '無法到達' : `${stepsToCamp} 格`
      this.statusMessage = '🏕️ 距離營地太遠，已就地搭建新營地準備過夜...'
      this.game.uiSystem.addMessage(`🏕️【目標模式】最近營地距離 ${distText}，就地搭建新營地過夜！`, 'success', 3500)
    }
  }

  /** 移動到相鄰的可紮營格子 */
  private stepToCampableNeighbor(): boolean {
    const player = this.game.playerSystem.player
    const mapSystem = this.game.mapSystem
    const blocked = [TileType.CAVE, TileType.RUINS, TileType.WATER, TileType.EMPTY]
    const order = [...DIRS].sort(() => Math.random() - 0.5)
    for (const [dx, dy] of order) {
      const t = mapSystem.getTile(player.position.x + dx, player.position.y + dy)
      if (t && !blocked.includes(t.type) && !mapSystem.isRestTile(t)) {
        if (mapSystem.tryMovePlayer(dx, dy)) return true
      }
    }
    return false
  }

  /** 找出 BFS 路徑距離最近的營地 (主基地或自建營地) */
  private findNearestRestPoint(): { x: number; y: number; dist: number } | null {
    let best: { x: number; y: number; dist: number } | null = null
    for (const p of this.game.mapSystem.getRestPoints()) {
      const d = this.getDist(p.x, p.y)
      if (d < 0) continue
      if (!best || d < best.dist) best = { x: p.x, y: p.y, dist: d }
    }
    return best
  }

  /** 是否可通行 (與 MapSystem 一致：水域與未知區域不可走) */
  private isWalkable(type: TileType): boolean {
    return type !== TileType.WATER && type !== TileType.EMPTY
  }

  /** 以玩家為起點，對整張地圖做 BFS，取得每格的步數距離與父節點 */
  private computeDistanceField(): void {
    const map = this.game.mapSystem.getMap()
    const { mapWidth: W, mapHeight: H } = this.game.config
    const player = this.game.playerSystem.player
    const total = W * H
    const dist = new Int32Array(total).fill(-1)
    const parent = new Int32Array(total).fill(-1)
    const queue = new Int32Array(total)
    let head = 0
    let tail = 0

    const start = player.position.y * W + player.position.x
    dist[start] = 0
    queue[tail++] = start

    while (head < tail) {
      const cur = queue[head++]
      const cx = cur % W
      const cy = (cur - cx) / W
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx
        const ny = cy + dy
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue
        const ni = ny * W + nx
        if (dist[ni] !== -1) continue
        if (!this.isWalkable(map[ny][nx].type)) continue
        dist[ni] = dist[cur] + 1
        parent[ni] = cur
        queue[tail++] = ni
      }
    }

    this.distField = dist
    this.parentField = parent
  }

  /** 取得到指定格子的步數 (-1 代表無法到達) */
  private getDist(x: number, y: number): number {
    if (!this.distField) return -1
    const { mapWidth: W, mapHeight: H } = this.game.config
    if (x < 0 || x >= W || y < 0 || y >= H) return -1
    return this.distField[y * W + x]
  }

  /** 沿 BFS 最短路徑朝目標前進一格 (無路可達時隨機漫步) */
  private moveTowards(targetX: number, targetY: number): boolean {
    const player = this.game.playerSystem.player
    const mapSystem = this.game.mapSystem
    const { mapWidth: W } = this.game.config

    if (player.position.x === targetX && player.position.y === targetY) return true

    const start = player.position.y * W + player.position.x
    let cur = targetY * W + targetX
    const parent = this.parentField

    if (!parent || this.getDist(targetX, targetY) < 0) {
      const [dx, dy] = DIRS[Math.floor(Math.random() * DIRS.length)]
      return mapSystem.tryMovePlayer(dx, dy)
    }

    // 回溯到「起點的下一格」
    let guard = 0
    while (parent[cur] !== start && parent[cur] !== -1 && guard++ < parent.length) {
      cur = parent[cur]
    }
    if (parent[cur] !== start) {
      const [dx, dy] = DIRS[Math.floor(Math.random() * DIRS.length)]
      return mapSystem.tryMovePlayer(dx, dy)
    }

    const nx = cur % W
    const ny = (cur - nx) / W
    return mapSystem.tryMovePlayer(nx - player.position.x, ny - player.position.y)
  }

  /** 尋找 BFS 路徑最近、已探索且含有目標物品或匹配地形的地塊 */
  private findNearestTileWithItemOrTerrain(itemId: string): { x: number; y: number } | null {
    const map = this.game.mapSystem.getMap()
    let nearest: { x: number; y: number } | null = null
    let minDist = Infinity

    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        const tile = map[y][x]
        if (!tile.explored) continue

        const hasResource = tile.resources && tile.resources.some(r => r.itemId === itemId && r.quantity > 0)
        const isTerrain = this.isMatchingTerrain(tile.type, itemId)
        if (!hasResource && !isTerrain) continue

        const dist = this.getDist(x, y)
        if (dist > 0 && dist < minDist) {
          minDist = dist
          nearest = { x, y }
        }
      }
    }
    return nearest
  }

  /** 尋找 BFS 路徑最近、可到達的未探索地塊 */
  private findNearestUnexploredTile(): { x: number; y: number } | null {
    const map = this.game.mapSystem.getMap()
    let nearest: { x: number; y: number } | null = null
    let minDist = Infinity

    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        const tile = map[y][x]
        if (tile.explored || !this.isWalkable(tile.type)) continue
        const dist = this.getDist(x, y)
        if (dist > 0 && dist < minDist) {
          minDist = dist
          nearest = { x, y }
        }
      }
    }
    return nearest
  }
}
