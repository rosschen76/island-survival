// 玩家系統
import { Game } from '../core/Game.js'
import { PlayerState, InventoryItem, ItemType, ItemDef, EndingType, Vec2, PlayerStats } from '../core/Types.js'
import { DEFAULT_CONFIG } from '../data/Constants.js'
import { ITEM_DEFS } from '../data/Items.js'

export class PlayerSystem {
  private game: Game
  public player: PlayerState

  constructor(game: Game) {
    this.game = game
    this.player = this.createInitialState()
  }

  /** 建立初始狀態 */
  private createInitialState(): PlayerState {
    return {
      position: { x: 0, y: 0 },
      stamina: DEFAULT_CONFIG.maxStamina,
      maxStamina: DEFAULT_CONFIG.maxStamina,
      health: DEFAULT_CONFIG.maxHealth,
      maxHealth: DEFAULT_CONFIG.maxHealth,
      inventory: [],
      discoveredTiles: new Set(),
      visitedLocations: new Set(),
      flags: {},
      stats: this.createInitialStats()
    }
  }

  private createInitialStats(): PlayerStats {
    return {
      daysSurvived: 0,
      tilesExplored: 0,
      eventsCompleted: 0,
      combatsWon: 0,
      itemsCrafted: 0,
      endingsUnlocked: []
    }
  }

  /** 重置玩家狀態 */
  reset(): void {
    this.player = this.createInitialState()
  }

  /** 更新 (每幀呼叫) */
  update(dt: number): void {
    // 體力自然恢復 (緩慢)
    if (this.player.stamina < this.player.maxStamina) {
      this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + dt * 0.005)
    }

    // 記錄訪問過的位置
    const posKey = `${this.player.position.x},${this.player.position.y}`
    this.player.visitedLocations.add(posKey)
  }

  /** 增加物品到背包 */
  addItem(itemId: string, quantity: number = 1): boolean {
    const def = ITEM_DEFS[itemId]
    if (!def) {
      console.warn(`未知物品: ${itemId}`)
      return false
    }

    // 尋找現有堆疊
    if (def.stackable) {
      const existing = this.player.inventory.find(i => i.id === itemId)
      if (existing) {
        const canAdd = Math.min(quantity, def.maxStack - existing.quantity)
        existing.quantity += canAdd
        quantity -= canAdd
        if (quantity <= 0) return true
      }
    }

    // 新增堆疊
    while (quantity > 0) {
      const stackSize = def.stackable ? Math.min(quantity, def.maxStack) : 1
      const item: InventoryItem = {
        id: itemId,
        type: def.type,
        quantity: stackSize,
        durability: def.durability,
        maxDurability: def.durability
      }
      this.player.inventory.push(item)
      quantity -= stackSize
    }

    this.game['audioSystem'].playSFX('pickup')
    return true
  }

  /** 移除物品 */
  removeItem(itemId: string, quantity: number = 1): boolean {
    let remaining = quantity

    for (let i = this.player.inventory.length - 1; i >= 0; i--) {
      const item = this.player.inventory[i]
      if (item.id === itemId) {
        const removeQty = Math.min(item.quantity, remaining)
        item.quantity -= removeQty
        remaining -= removeQty

        if (item.quantity <= 0) {
          this.player.inventory.splice(i, 1)
        }

        if (remaining <= 0) return true
      }
    }

    return false
  }

  /** 取得物品數量 */
  getItemCount(itemId: string): number {
    return this.player.inventory
      .filter(i => i.id === itemId)
      .reduce((sum, i) => sum + i.quantity, 0)
  }

  /** 檢查是否有物品 */
  hasItem(itemId: string, quantity: number = 1): boolean {
    return this.getItemCount(itemId) >= quantity
  }

  /** 使用物品 */
  useItem(itemId: string): boolean {
    const def = ITEM_DEFS[itemId]
    if (!def) return false

    const index = this.player.inventory.findIndex(i => i.id === itemId)
    if (index === -1) return false

    const item = this.player.inventory[index]

    // 應用效果
    if (def.effects) {
      for (const effect of def.effects) {
        this.applyEffect(effect)
      }
    }

    // 扣除耐久度
    if (def.durability && item.durability !== undefined) {
      item.durability--
      if (item.durability <= 0) {
        this.player.inventory.splice(index, 1)
        this.game['audioSystem'].playSFX('error')
        return true
      }
    } else if (def.stackable) {
      item.quantity--
      if (item.quantity <= 0) {
        this.player.inventory.splice(index, 1)
      }
    } else {
      this.player.inventory.splice(index, 1)
    }

    this.game['audioSystem'].playSFX(def.type === ItemType.FOOD || def.type === ItemType.WATER ? 'eat' : 'drink')
    return true
  }

  /** 應用物品效果 */
  private applyEffect(effect: { type: string; value: number; duration?: number }): void {
    switch (effect.type) {
      case 'health':
        this.player.health = Math.min(this.player.maxHealth, this.player.health + effect.value)
        break
      case 'stamina':
        this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + effect.value)
        break
      case 'heal':
        this.player.health = Math.min(this.player.maxHealth, this.player.health + effect.value)
        break
    }
  }

  /** 受到傷害 */
  takeDamage(amount: number): boolean {
    this.player.health -= amount
    this.game['audioSystem'].playSFX('hurt')

    if (this.player.health <= 0) {
      this.player.health = 0
      this.game.gameOver()
      return true // 死亡
    }
    return false
  }

  /** 恢復健康 */
  heal(amount: number): void {
    this.player.health = Math.min(this.player.maxHealth, this.player.health + amount)
  }

  /** 恢復體力 */
  restoreStamina(amount: number): void {
    this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + amount)
  }

  /** 設定旗標 */
  setFlag(key: string, value: boolean): void {
    this.player.flags[key] = value
  }

  /** 取得旗標 */
  getFlag(key: string): boolean {
    return this.player.flags[key] ?? false
  }

  /** 切換旗標 */
  toggleFlag(key: string): boolean {
    const newValue = !this.getFlag(key)
    this.setFlag(key, newValue)
    return newValue
  }

  /** 解鎖結局 */
  unlockEnding(endingType: string): void {
    if (!this.player.stats.endingsUnlocked.includes(endingType as EndingType)) {
      this.player.stats.endingsUnlocked.push(endingType as EndingType)
      // 存檔成就
      this.saveEndingProgress()
    }
  }

  /** 檢查結局是否解鎖 */
  isEndingUnlocked(endingType: string): boolean {
    return this.player.stats.endingsUnlocked.includes(endingType as EndingType)
  }

  /** 儲存結局進度 (localStorage) */
  private saveEndingProgress(): void {
    try {
      const data = {
        endings: this.player.stats.endingsUnlocked,
        timestamp: Date.now()
      }
      localStorage.setItem('island_survival_endings', JSON.stringify(data))
    } catch (e) {
      console.warn('無法儲存結局進度:', e)
    }
  }

  /** 載入結局進度 */
  loadEndingProgress(): void {
    try {
      const data = localStorage.getItem('island_survival_endings')
      if (data) {
        const parsed = JSON.parse(data)
        this.player.stats.endingsUnlocked = parsed.endings || []
      }
    } catch (e) {
      console.warn('無法載入結局進度:', e)
    }
  }

  /** 取得玩家狀態 (存檔用) */
  getState(): PlayerState {
    return {
      ...this.player,
      discoveredTiles: new Set(this.player.discoveredTiles),
      visitedLocations: new Set(this.player.visitedLocations),
      flags: { ...this.player.flags },
      stats: { ...this.player.stats, endingsUnlocked: [...this.player.stats.endingsUnlocked] },
      inventory: this.player.inventory.map(item => ({ ...item }))
    }
  }

  /** 設定玩家狀態 (讀檔用) */
  setState(state: PlayerState): void {
    this.player = {
      ...state,
      discoveredTiles: new Set(state.discoveredTiles),
      visitedLocations: new Set(state.visitedLocations),
      flags: { ...state.flags },
      stats: { ...state.stats, endingsUnlocked: [...state.stats.endingsUnlocked] },
      inventory: state.inventory.map(item => ({ ...item }))
    }
    this.loadEndingProgress()
  }

  /** 取得背包物品列表 */
  getInventory(): InventoryItem[] {
    return this.player.inventory
  }

  /** 取得背包空間剩餘 */
  getFreeSlots(): number {
    // 簡化：無上限，但可擴充為有限制
    return 999
  }

  /** 整理背包 */
  sortInventory(): void {
    this.player.inventory.sort((a, b) => {
      // 先按類型排序，再按 ID
      const typeOrder = { FOOD: 0, WATER: 1, MEDICINE: 2, TOOL: 3, WEAPON: 4, ARMOR: 5, MATERIAL: 6, SPECIAL: 7 }
      const ta = typeOrder[a.type] ?? 99
      const tb = typeOrder[b.type] ?? 99
      if (ta !== tb) return ta - tb
      return a.id.localeCompare(b.id)
    })
  }

  /** 取得裝備中的武器 (第一個武器類物品) */
  getEquippedWeapon(): InventoryItem | null {
    return this.player.inventory.find(i => i.type === ItemType.WEAPON) || null
  }

  /** 取得裝備中的防具 (第一個防具類物品) */
  getEquippedArmor(): InventoryItem | null {
    return this.player.inventory.find(i => i.type === ItemType.ARMOR) || null
  }

  /** 計算攻擊力 */
  getAttackPower(): number {
    let atk = 5 // 基礎攻擊
    const weapon = this.getEquippedWeapon()
    if (weapon) {
      const def = ITEM_DEFS[weapon.id]
      atk += def?.value ?? 0
    }
    return atk
  }

  /** 計算防禦力 */
  getDefense(): number {
    let def = 0 // 基礎防禦
    const armor = this.getEquippedArmor()
    if (armor) {
      const defDef = ITEM_DEFS[armor.id]
      def += defDef?.value ?? 0
    }
    return def
  }

  /** 取得玩家位置 */
  getPosition(): Vec2 {
    return { ...this.player.position }
  }

  /** 設定玩家位置 */
  setPosition(pos: Vec2): void {
    this.player.position = { ...pos }
  }
}