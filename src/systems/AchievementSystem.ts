// 成就系統 (31項全方位成就：探索、收集、生存、製造、戰鬥、結局)
import { Game } from '../core/Game.js'
import { AchievementDef, PlayerStats, InventoryItem, MapTile, EndingType } from '../core/Types.js'

export class AchievementSystem {
  private game: Game
  private achievements: AchievementDef[] = []
  private unlockedSet: Set<string> = new Set()
  private recentUnlock: { id: string; title: string; icon: string; timer: number } | null = null

  constructor(game: Game) {
    this.game = game
    this.initAchievements()
    this.loadProgress()
  }

  /** 初始化所有 31 項成就 */
  private initAchievements(): void {
    this.achievements = [
      // === 探索類 (8項) ===
      { id: 'explore_10', title: '初來乍到', description: '探索 10 個島嶼地塊', icon: '👟', category: 'exploration', maxProgress: 10 },
      { id: 'explore_100', title: '島嶼探險家', description: '累計探索 100 個地塊', icon: '🧭', category: 'exploration', maxProgress: 100 },
      { id: 'explore_300', title: '荒野測繪師', description: '累計探索 300 個地塊', icon: '🗺️', category: 'exploration', maxProgress: 300 },
      { id: 'explore_600', title: '破除迷霧', description: '累計探索 600 個地塊', icon: '🔭', category: 'exploration', maxProgress: 600 },
      { id: 'explore_all', title: '全島踏破', description: '探索整座無人島 1000 個地塊 (全地圖搜索)', icon: '🏝️', category: 'exploration', maxProgress: 1000 },
      { id: 'find_cave', title: '洞窟窺探', description: '發現並踏入神秘的地下洞穴', icon: '🕳️', category: 'exploration', maxProgress: 1 },
      { id: 'find_ruins', title: '遠古文明', description: '發現並踏入古代神廟廢墟', icon: '🏛️', category: 'exploration', maxProgress: 1 },
      { id: 'climb_peak', title: '屹立絕頂', description: '攀登至海島最高峰的山頂視野', icon: '⛰️', category: 'exploration', maxProgress: 1 },

      // === 收集類 (8項) ===
      { id: 'wood_50', title: '伐木新手', description: '累計採集 50 份木材', icon: '🪵', category: 'gathering', maxProgress: 50 },
      { id: 'wood_300', title: '伐木大師', description: '累計採集 300 份木材', icon: '🪓', category: 'gathering', maxProgress: 300 },
      { id: 'wood_1000', title: '森林主宰', description: '累計採集 1000 份木材 (海島木材大戶)', icon: '🌲', category: 'gathering', maxProgress: 1000 },
      { id: 'stone_50', title: '採石學徒', description: '累計採集 50 份石頭', icon: '🪨', category: 'gathering', maxProgress: 50 },
      { id: 'stone_200', title: '地質專家', description: '累計採集 200 份石頭', icon: '⛏️', category: 'gathering', maxProgress: 200 },
      { id: 'fiber_50', title: '編織能手', description: '累計收集 50 份植物纖維', icon: '🌿', category: 'gathering', maxProgress: 50 },
      { id: 'beachcomber', title: '海灘尋寶', description: '在背包中同時擁有超過 10 份貝殼或椰子', icon: '🥥', category: 'gathering', maxProgress: 10 },
      { id: 'scavenger', title: '廢鐵淘金', description: '收集獲得 10 份廢金屬或零件', icon: '⚙️', category: 'gathering', maxProgress: 10 },

      // === 生存類 (6項) ===
      { id: 'survive_night_1', title: '活過第一夜', description: '平安度過第一個夜晚並迎來 06:00 日出', icon: '🌅', category: 'survival', maxProgress: 2 },
      { id: 'survival_5', title: '荒野求生家', description: '在無人島上成功生存達到 5 天', icon: '⛺', category: 'survival', maxProgress: 5 },
      { id: 'survival_15', title: '海島老兵', description: '在無人島上成功生存達到 15 天', icon: '🎖️', category: 'survival', maxProgress: 15 },
      { id: 'survival_30', title: '孤島霸主', description: '在無人島上成功生存達到 30 天', icon: '👑', category: 'survival', maxProgress: 30 },
      { id: 'feast_15', title: '荒野饕客', description: '累計進食 15 次以補充體能', icon: '🍖', category: 'survival', maxProgress: 15 },
      { id: 'hydrated_15', title: '甘泉不竭', description: '累計飲水或椰子汁 15 次', icon: '💧', category: 'survival', maxProgress: 15 },

      // === 製造與戰鬥類 (6項) ===
      { id: 'craft_first', title: '工匠初試', description: '製作出第一件生存工具', icon: '🔨', category: 'craft_combat', maxProgress: 1 },
      { id: 'craft_spear', title: '全副武裝', description: '成功打造出一柄防身木長矛', icon: '🏹', category: 'craft_combat', maxProgress: 1 },
      { id: 'craft_25', title: '巧奪天工', description: '累計製作物品達到 25 次', icon: '⚒️', category: 'craft_combat', maxProgress: 25 },
      { id: 'kill_boar', title: '獵豬勇者', description: '在戰鬥中成功擊敗兇猛野豬', icon: '🐗', category: 'craft_combat', maxProgress: 1 },
      { id: 'kill_snake', title: '斬蛇英雄', description: '在戰鬥中成功擊敗劇毒巨蟒', icon: '🐍', category: 'craft_combat', maxProgress: 1 },
      { id: 'combat_10', title: '百戰百勝', description: '累計戰鬥勝利次數達到 10 次', icon: '⚔️', category: 'craft_combat', maxProgress: 10 },

      // === 結局與傳奇類 (3項) ===
      { id: 'escape_any', title: '逃出生天', description: '成功達成任何一種逃離海島結局', icon: '⛵', category: 'endings', maxProgress: 1 },
      { id: 'ending_thrive', title: '島嶼定居', description: '達成「島上繁榮」永久定居結局', icon: '🏡', category: 'endings', maxProgress: 1 },
      { id: 'all_endings_6', title: '傳奇全結局', description: '解鎖全 6 種結局完整圖鑑', icon: '🌟', category: 'endings', maxProgress: 6 }
    ]
  }

  /** 載入成就解鎖進度 (從 localStorage 持久化保存) */
  loadProgress(): void {
    try {
      const data = localStorage.getItem('island_survival_achievements')
      if (data) {
        const arr = JSON.parse(data)
        if (Array.isArray(arr)) {
          this.unlockedSet = new Set(arr)
        }
      }
    } catch {
      this.unlockedSet = new Set()
    }
  }

  /** 保存成就解鎖進度 */
  private saveProgress(): void {
    try {
      localStorage.setItem('island_survival_achievements', JSON.stringify(Array.from(this.unlockedSet)))
    } catch (e) {
      console.warn('無法保存成就資料:', e)
    }
  }

  /** 取得當前成就的即時進度數值 */
  getAchievementProgress(id: string): { current: number; max: number; unlocked: boolean } {
    const ach = this.achievements.find(a => a.id === id)
    if (!ach) return { current: 0, max: 1, unlocked: false }

    const isUnlocked = this.unlockedSet.has(id)
    if (isUnlocked) return { current: ach.maxProgress, max: ach.maxProgress, unlocked: true }

    const player = this.game['playerSystem']?.player
    if (!player) return { current: 0, max: ach.maxProgress, unlocked: false }
    const stats = player.stats

    let val = 0
    switch (id) {
      case 'explore_10':
      case 'explore_100':
      case 'explore_300':
      case 'explore_600':
      case 'explore_all':
        val = stats.tilesExplored || 0
        break
      case 'find_cave':
        val = player.discoveredTiles && Array.from(player.discoveredTiles).some(t => {
          const [x, y] = t.split(',').map(Number)
          return this.game.mapSystem.getTile(x, y)?.type === 6 // CAVE
        }) ? 1 : 0
        break
      case 'find_ruins':
        val = player.discoveredTiles && Array.from(player.discoveredTiles).some(t => {
          const [x, y] = t.split(',').map(Number)
          return this.game.mapSystem.getTile(x, y)?.type === 7 // RUINS
        }) ? 1 : 0
        break
      case 'climb_peak':
        val = player.discoveredTiles && Array.from(player.discoveredTiles).some(t => {
          const [x, y] = t.split(',').map(Number)
          return this.game.mapSystem.getTile(x, y)?.type === 10 // MOUNTAIN
        }) ? 1 : 0
        break
      case 'wood_50':
      case 'wood_300':
      case 'wood_1000':
        val = Math.max(stats.woodCollected || 0, this.getItemCount('wood'))
        break
      case 'stone_50':
      case 'stone_200':
        val = Math.max(stats.stoneCollected || 0, this.getItemCount('stone'))
        break
      case 'fiber_50':
        val = Math.max(stats.fiberCollected || 0, this.getItemCount('fiber'))
        break
      case 'beachcomber':
        val = this.getItemCount('coconut') + this.getItemCount('shell')
        break
      case 'scavenger':
        val = this.getItemCount('metal_scrap') + this.getItemCount('radio_parts')
        break
      case 'survive_night_1':
      case 'survival_5':
      case 'survival_15':
      case 'survival_30':
        val = stats.daysSurvived || 1
        break
      case 'feast_15':
        val = stats.foodEaten || 0
        break
      case 'hydrated_15':
        val = stats.waterDrank || 0
        break
      case 'craft_first':
      case 'craft_25':
        val = stats.itemsCrafted || 0
        break
      case 'craft_spear':
        val = this.getItemCount('wooden_spear') > 0 ? 1 : 0
        break
      case 'kill_boar':
        val = player.flags['combat_wild_boar_won'] ? 1 : 0
        break
      case 'kill_snake':
        val = player.flags['combat_jungle_snake_won'] ? 1 : 0
        break
      case 'combat_10':
        val = stats.combatsWon || 0
        break
      case 'escape_any':
        val = stats.endingsUnlocked?.some(e => e === EndingType.ESCAPE_RAFT || e === EndingType.ESCAPE_SIGNAL || e === EndingType.ESCAPE_RESCUE) ? 1 : 0
        break
      case 'ending_thrive':
        val = stats.endingsUnlocked?.includes(EndingType.THRIVE) ? 1 : 0
        break
      case 'all_endings_6':
        val = stats.endingsUnlocked?.length || 0
        break
    }

    const clamped = Math.min(ach.maxProgress, val)
    return { current: clamped, max: ach.maxProgress, unlocked: clamped >= ach.maxProgress }
  }

  private getItemCount(itemId: string): number {
    const player = this.game['playerSystem']?.player
    if (!player || !player.inventory) return 0
    return player.inventory.filter(i => i.id === itemId).reduce((sum, i) => sum + i.quantity, 0)
  }

  /** 檢查所有成就並觸發新解鎖 */
  checkAchievements(): void {
    for (const ach of this.achievements) {
      if (this.unlockedSet.has(ach.id)) continue
      const { current, max, unlocked } = this.getAchievementProgress(ach.id)
      if (unlocked || current >= max) {
        this.unlock(ach.id)
      }
    }
  }

  /** 解鎖成就 */
  unlock(id: string): void {
    if (this.unlockedSet.has(id)) return
    const ach = this.achievements.find(a => a.id === id)
    if (!ach) return

    this.unlockedSet.add(id)
    this.saveProgress()

    // 播放提示音與訊息
    this.game['audioSystem']?.playSFX('levelup')
    this.game['uiSystem']?.addMessage(`🏆【解鎖成就】${ach.icon} ${ach.title}：${ach.description}！`, 'success', 5000)

    // 設定橫幅彈出計時器
    this.recentUnlock = {
      id: ach.id,
      title: ach.title,
      icon: ach.icon,
      timer: 3.5 // 顯示 3.5 秒
    }
  }

  /** 每幀更新解鎖橫幅動畫 */
  update(dt: number): void {
    if (this.recentUnlock) {
      this.recentUnlock.timer -= dt / 1000
      if (this.recentUnlock.timer <= 0) {
        this.recentUnlock = null
      }
    }
  }

  /** 取得最近解鎖橫幅 */
  getRecentUnlock(): { title: string; icon: string; timer: number } | null {
    return this.recentUnlock
  }

  /** 取得所有成就列表 */
  getAllAchievements(): AchievementDef[] {
    return this.achievements
  }

  /** 取得已解鎖總數 */
  getUnlockedCount(): number {
    return this.unlockedSet.size
  }

  /** 是否已解鎖 */
  isUnlocked(id: string): boolean {
    return this.unlockedSet.has(id)
  }
}
