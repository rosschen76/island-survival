// 戰鬥系統 (自動戰鬥/文字描述)
import { Game } from '../core/Game.js'
import { InventoryItem, ItemType } from '../core/Types.js'
import { ITEM_DEFS } from '../data/Items.js'
import { SeededRandom } from '../utils/SeededRandom.js'

export interface Enemy {
  id: string
  name: string
  description: string
  maxHealth: number
  health: number
  attack: number
  defense: number
  speed: number
  expReward: number
  loot: { itemId: string; chance: number; minQty: number; maxQty: number }[]
  flavorText: {
    intro: string
    attack: string[]
    hit: string[]
    miss: string[]
    defeat: string
    victory: string
  }
}

export interface CombatLogEntry {
  text: string
  type: 'info' | 'player_attack' | 'enemy_attack' | 'damage' | 'heal' | 'victory' | 'defeat' | 'loot'
  timestamp: number
}

export class CombatSystem {
  private game: Game
  private enemy: Enemy | null = null
  private combatLog: CombatLogEntry[] = []
  private turn: number = 0
  private isPlayerTurn: boolean = true
  private combatEnded: boolean = false
  private random: SeededRandom
  private autoCombat: boolean = false
  private turnTimer: number = 0
  private readonly TURN_INTERVAL = 650 // 自動戰鬥或敵人回延遲 (ms)
  private isDefending: boolean = false

  // 敵人資料庫
  private enemies: Record<string, Enemy> = {}

  constructor(game: Game) {
    this.game = game
    this.random = new SeededRandom('combat')
    this.initEnemies()
  }

  /** 初始化敵人資料 */
  private initEnemies(): void {
    this.enemies = {
      wild_boar: {
        id: 'wild_boar',
        name: '野豬',
        description: '兇猛的野豬，獠牙鋒利，衝擊力驚人',
        maxHealth: 40,
        health: 40,
        attack: 12,
        defense: 3,
        speed: 8,
        expReward: 20,
        loot: [
          { itemId: 'hide', chance: 0.6, minQty: 1, maxQty: 2 },
          { itemId: 'bone', chance: 0.3, minQty: 1, maxQty: 1 },
          { itemId: 'meat', chance: 0.4, minQty: 1, maxQty: 2 }
        ],
        flavorText: {
          intro: '野豬發出低沉的吼聲，蹄子刨動著泥土，隨時準備衝鋒！',
          attack: ['野豬低頭衝刺，獠牙閃著寒光！', '野豬發出怒吼，猛烈撞擊過來！'],
          hit: ['你靈活閃躲，野豬撞空了！', '你舉起武器格擋，震得雙臂發麻。'],
          miss: ['你的攻擊擊中野豬要害！', '野豬慘叫一聲，踉蹌後退。'],
          defeat: '野豬沉重地倒下，不再動彈。',
          victory: '你精疲力竭，倒在野豬腳下...'
        }
      },
      jungle_snake: {
        id: 'jungle_snake',
        name: '劇毒巨蟒',
        description: '體長數米的巨蟒，牙齒含有強烈神經毒素',
        maxHealth: 35,
        health: 35,
        attack: 15,
        defense: 2,
        speed: 12,
        expReward: 30,
        loot: [
          { itemId: 'hide', chance: 0.7, minQty: 2, maxQty: 3 },
          { itemId: 'bone', chance: 0.5, minQty: 1, maxQty: 2 },
          { itemId: 'herbs', chance: 0.3, minQty: 1, maxQty: 2 }
        ],
        flavorText: {
          intro: '巨蟒從樹枝垂下，垂涎三尺地盯著你，信子頻頻吐出！',
          attack: ['巨蟒閃電般彈出，毒牙直逼你的頸動脈！', '巨蟒纏繞過來，巨大的壓力讓你窒息！'],
          hit: ['你在千鈞一髮之際側身閃過！', '你用武器頂住巨蟒的大嘴！'],
          miss: ['你刺中巨蟒七寸要害！', '巨蟒痛苦地扭動，鱗片飛濺。'],
          defeat: '巨蟒無力地鬆開身軀，緩緩滑落地面。',
          victory: '劇毒迅速蔓延，視線模糊，意識逐漸消失...'
        }
      },
      cave_bat_swarm: {
        id: 'cave_bat_swarm',
        name: '蝙蝠群',
        description: '數百隻蝙蝠組成的群體，尖銳的叫聲讓人頭暈目眩',
        maxHealth: 30,
        health: 30,
        attack: 8,
        defense: 1,
        speed: 15,
        expReward: 15,
        loot: [
          { itemId: 'bone', chance: 0.8, minQty: 3, maxQty: 5 },
          { itemId: 'herbs', chance: 0.2, minQty: 1, maxQty: 1 }
        ],
        flavorText: {
          intro: '洞穴深處湧出大群蝙蝠，像黑色的雲霧撲面而來！',
          attack: ['蝙蝠群發出超音波，你感到頭暈目眩！', '無數利爪同時撕扯你的皮膚！'],
          hit: ['你揮舞武器驅趕蝙蝠群！', '你縮成一團保護要害部位。'],
          miss: ['揮擊擊落數隻蝙蝠！', '蝙蝠群陣型大亂，暫時散開。'],
          defeat: '蝙蝠群發出尖銳哀鳴，四散逃竄。',
          victory: '被無數利齒撕咬，你在黑暗中倒下...'
        }
      },
      ruins_guardian: {
        id: 'ruins_guardian',
        name: '廢墟守衛',
        description: '古代機關人偶，雖然鏽蝕但仍保持殺戮程式',
        maxHealth: 60,
        health: 60,
        attack: 18,
        defense: 8,
        speed: 5,
        expReward: 50,
        loot: [
          { itemId: 'metal_scrap', chance: 0.9, minQty: 3, maxQty: 5 },
          { itemId: 'crystal', chance: 0.4, minQty: 1, maxQty: 1 },
          { itemId: 'map_fragment', chance: 0.3, minQty: 1, maxQty: 1 }
        ],
        flavorText: {
          intro: '石像突然睜開雙眼，關節發出嘎吱聲轉向你，手中巨斧高舉！',
          attack: ['機關人偶揮舞鏽斧，帶起呼嘯風聲！', '蒸汽從關節噴出，巨斧劈面而來！'],
          hit: ['你敏捷地滾開，巨斧砸碎地面石板！', '你舉盾格擋，震動傳遍全身！'],
          miss: ['你找到關節縫隙刺入！', '金屬碰撞聲中，人偶動作變慢了！'],
          defeat: '機關人偶發出最後一聲轟鳴，癱軟倒地。',
          victory: '冰冷的金屬無情地收割了你的生命...'
        }
      }
    }
  }

  /** 開始戰鬥 */
  startCombat(enemyId: string): void {
    const enemyTemplate = this.enemies[enemyId]
    if (!enemyTemplate) {
      console.warn(`敵人不存在: ${enemyId}`)
      this.game.endCombat(false)
      return
    }

    // 複製敵人資料
    this.enemy = { ...enemyTemplate, health: enemyTemplate.maxHealth }
    this.combatLog = []
    this.turn = 0
    this.isPlayerTurn = true
    this.combatEnded = false
    this.turnTimer = 0
    this.isDefending = false

    this.addLog(this.enemy.flavorText.intro, 'info')
    this.game['audioSystem'].playSFX('combat_start')

    // 根據速度決定先手
    const playerSpeed = 10 // 玩家基礎速度
    this.isPlayerTurn = playerSpeed >= this.enemy.speed

    if (!this.isPlayerTurn) {
      this.addLog('敵人搶先發動攻擊！', 'info')
    }
  }

  /** 更新戰鬥邏輯 */
  update(dt: number): void {
    if (this.combatEnded || !this.enemy) return

    // 若輪到敵人，或開啟自動戰鬥，計時後執行回合
    if (!this.isPlayerTurn || this.autoCombat) {
      this.turnTimer += dt
      if (this.turnTimer >= this.TURN_INTERVAL) {
        this.turnTimer = 0
        this.processAutoTurn()
      }
    }
  }

  /** 處理自動回合 */
  private processAutoTurn(): void {
    if (this.combatEnded) return

    if (this.isPlayerTurn) {
      this.playerTurn()
    } else {
      this.enemyTurn()
    }

    // 檢查戰鬥結束
    this.checkCombatEnd()
  }

  /** 玩家回合 */
  private playerTurn(): void {
    if (!this.enemy) return

    this.turn++
    const player = this.game['playerSystem'].player

    // 計算玩家攻擊
    const playerAtk = this.game['playerSystem'].getAttackPower()
    const enemyDef = this.enemy.defense
    const damage = Math.max(1, playerAtk - enemyDef + this.random.nextInt(-2, 3))

    // 命中判定 (基礎 85% + 速度差)
    const hitChance = 0.85 + (10 - this.enemy.speed) * 0.01
    const isHit = this.random.chance(hitChance)

    if (isHit) {
      this.enemy.health -= damage
      this.addLog(`你攻擊${this.enemy.name}，造成 ${damage} 點傷害！`, 'player_attack')
      this.addLog(this.random.choice(this.enemy.flavorText.miss), 'damage')

      // 觸發武器耐久度消耗
      this.consumeWeaponDurability()
    } else {
      this.addLog(`你的攻擊落空了！`, 'player_attack')
      this.addLog(this.random.choice(this.enemy.flavorText.hit), 'damage')
    }

    this.isPlayerTurn = false
  }

  /** 敵人回合 */
  private enemyTurn(): void {
    if (!this.enemy) return

    const player = this.game['playerSystem'].player

    // 計算敵人攻擊
    const enemyAtk = this.enemy.attack
    const playerDef = this.game['playerSystem'].getDefense()
    let damage = Math.max(1, enemyAtk - playerDef + this.random.nextInt(-2, 3))
    if (this.isDefending) {
      damage = Math.max(1, Math.floor(damage * 0.5))
      this.isDefending = false
    }

    // 命中判定
    const hitChance = 0.75 + (this.enemy.speed - 10) * 0.01
    const isHit = this.random.chance(hitChance)

    if (isHit) {
      const died = this.game['playerSystem'].takeDamage(damage)
      this.addLog(`${this.enemy.name}攻擊你，造成 ${damage} 點傷害！`, 'enemy_attack')
      this.addLog(this.random.choice(this.enemy.flavorText.attack), 'damage')

      if (died) {
        this.addLog(this.enemy.flavorText.victory, 'defeat')
        this.combatEnded = true
        return
      }
    } else {
      this.addLog(`${this.enemy.name}的攻擊沒打中！`, 'enemy_attack')
      this.addLog(this.random.choice(this.enemy.flavorText.hit), 'damage')
    }

    this.isPlayerTurn = true
  }

  /** 檢查戰鬥結束 */
  private checkCombatEnd(): void {
    if (!this.enemy) return

    if (this.enemy.health <= 0) {
      this.enemy.health = 0
      this.addLog(this.enemy.flavorText.defeat, 'victory')
      this.processVictory()
      this.combatEnded = true
    }
  }

  /** 處理勝利 */
  private processVictory(): void {
    if (!this.enemy) return

    const player = this.game['playerSystem'].player

    // 經驗值 (這裡轉換為統計)
    player.stats.combatsWon++
    if (this.enemy.id === 'wild_boar') player.flags['combat_wild_boar_won'] = true
    if (this.enemy.id === 'jungle_snake') player.flags['combat_jungle_snake_won'] = true
    if (this.enemy.id === 'ruins_guardian') player.flags['combat_ruins_guardian_won'] = true
    this.game.achievementSystem?.checkAchievements()

    // 掉落物品
    for (const loot of this.enemy.loot) {
      if (this.random.chance(loot.chance)) {
        const qty = this.random.nextInt(loot.minQty, loot.maxQty + 1)
        this.game['playerSystem'].addItem(loot.itemId, qty)
        const def = ITEM_DEFS[loot.itemId]
        this.addLog(`獲得 ${def?.name || loot.itemId} x${qty}`, 'loot')
      }
    }

    this.game['audioSystem'].playSFX('combat_win')
  }

  /** 消耗武器耐久度 */
  private consumeWeaponDurability(): void {
    const weapon = this.game['playerSystem'].getEquippedWeapon()
    if (weapon && weapon.durability !== undefined && weapon.maxDurability) {
      weapon.durability--
      if (weapon.durability <= 0) {
        const def = ITEM_DEFS[weapon.id]
        this.addLog(`${def?.name || weapon.id} 损壞了！`, 'info')
        this.game['playerSystem'].removeItem(weapon.id, 1)
      }
    }
  }

  /** 結束戰鬥 */
  endCombat(_victory: boolean): void {
    this.combatEnded = true
    this.enemy = null
  }

  /** 處理鍵盤輸入 */
  handleKeyInput(key: string): boolean {
    if (!this.enemy) return false

    // 若戰鬥已結束，按任意確認或 ESC 離開戰鬥面板
    if (this.combatEnded) {
      if (['Enter', 'Space', 'Escape'].includes(key)) {
        const won = this.game['playerSystem'].player.health > 0
        this.game.endCombat(won)
        return true
      }
      return false
    }

    switch (key) {
      case 'KeyA':
      case 'Enter':
      case 'Space':
        this.playerAction('attack')
        return true
      case 'KeyD':
        this.playerAction('defend')
        return true
      case 'KeyI':
        this.playerAction('item')
        return true
      case 'KeyF':
      case 'Escape':
        this.playerAction('flee')
        return true
      case 'Tab':
        this.autoCombat = !this.autoCombat
        this.addLog(this.autoCombat ? '⚡ 已開啟自動戰鬥' : '✋ 已切換為手動戰鬥', 'info')
        return true
    }
    return false
  }

  /** 重置戰鬥系統 */
  reset(): void {
    this.enemy = null
    this.combatLog = []
    this.turn = 0
    this.combatEnded = false
  }

  /** 添加戰鬥日誌 */
  addLog(text: string, type: CombatLogEntry['type'] = 'info'): void {
    this.combatLog.push({
      text,
      type,
      timestamp: Date.now()
    })

    // 限制日誌長度
    if (this.combatLog.length > 20) {
      this.combatLog.shift()
    }
  }

  /** 取得戰鬥日誌 */
  getLog(): CombatLogEntry[] {
    return [...this.combatLog]
  }

  /** 取得當前敵人 */
  getEnemy(): Enemy | null {
    return this.enemy
  }

  /** 取得敵人血量百分比 */
  getEnemyHealthPercent(): number {
    if (!this.enemy) return 0
    return this.enemy.health / this.enemy.maxHealth
  }

  /** 取得玩家血量百分比 */
  getPlayerHealthPercent(): number {
    const player = this.game['playerSystem'].player
    return player.health / player.maxHealth
  }

  /** 是否在戰鬥中 */
  isInCombat(): boolean {
    return this.enemy !== null && !this.combatEnded
  }

  /** 手動觸發玩家行動 (非自動戰鬥時) */
  playerAction(action: 'attack' | 'defend' | 'item' | 'flee'): void {
    if (this.combatEnded || !this.isPlayerTurn) return

    switch (action) {
      case 'attack':
        this.playerTurn()
        this.checkCombatEnd()
        this.turnTimer = 0
        break
      case 'defend':
        // 防禦：下一回合受傷減半
        this.isDefending = true
        this.addLog('你採取防禦姿態，準備承受衝擊！', 'info')
        this.isPlayerTurn = false
        this.turnTimer = 0
        break
      case 'item':
        // 使用物品 (簡化：自動使用最好的藥)
        this.useBestMedicine()
        this.turnTimer = 0
        break
      case 'flee':
        this.attemptFlee()
        this.turnTimer = 0
        break
    }
  }

  /** 嘗試逃跑 */
  private attemptFlee(): void {
    const fleeChance = 0.4 + (10 - (this.enemy?.speed || 10)) * 0.03
    if (this.random.chance(fleeChance)) {
      this.addLog('你成功逃脫了！', 'info')
      this.game['uiSystem'].addMessage('成功脫離戰鬥！', 'info')
      this.game.endCombat(false)
    } else {
      this.addLog('逃跑失敗！被敵人攔住了去路！', 'info')
      this.isPlayerTurn = false
    }
  }

  /** 使用最好的藥 */
  private useBestMedicine(): void {
    const player = this.game['playerSystem'].player

    // 優先使用草藥
    if (player.health < player.maxHealth * 0.5) {
      if (this.game['playerSystem'].hasItem('herbal_medicine')) {
        this.game['playerSystem'].useItem('herbal_medicine')
        this.addLog('你喝下草藥', 'heal')
        this.isPlayerTurn = false
        return
      }
      if (this.game['playerSystem'].hasItem('bandage')) {
        this.game['playerSystem'].useItem('bandage')
        this.addLog('你纏上繃帶', 'heal')
        this.isPlayerTurn = false
        return
      }
    }

    // 體力低用食物
    if (player.stamina < player.maxStamina * 0.3) {
      if (this.game['playerSystem'].hasItem('cooked_fish')) {
        this.game['playerSystem'].useItem('cooked_fish')
        this.addLog('你吃下烤魚', 'heal')
        this.isPlayerTurn = false
        return
      }
      if (this.game['playerSystem'].hasItem('coconut')) {
        this.game['playerSystem'].useItem('coconut')
        this.addLog('你吃下椰子', 'heal')
        this.isPlayerTurn = false
        return
      }
    }

    this.addLog('沒有可用的補給品', 'info')
  }

  /** 渲染戰鬥介面 */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this.enemy) return

    const { viewWidth, viewHeight } = this.game['renderer'] as any
    const w = viewWidth
    const h = viewHeight

    // 半透明覆蓋
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, 0, w, h)

    // 戰鬥資訊面板
    const panelW = 500
    const panelH = 350
    const panelX = (w - panelW) / 2
    const panelY = (h - panelH) / 2

    // 背景
    const grad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH)
    grad.addColorStop(0, '#2a0a0a')
    grad.addColorStop(1, '#1a0505')
    ctx.fillStyle = grad
    ctx.fillRect(panelX, panelY, panelW, panelH)

    // 邊框
    ctx.strokeStyle = '#ff6b6b'
    ctx.lineWidth = 2
    ctx.strokeRect(panelX, panelY, panelW, panelH)

    // 標題
    ctx.fillStyle = '#ff6b6b'
    ctx.font = 'bold 22px "Microsoft JhengHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`⚔ 戰鬥: ${this.enemy.name}`, w / 2, panelY + 35)

    // 回合數
    ctx.fillStyle = '#aaa'
    ctx.font = '14px monospace'
    ctx.fillText(`回合: ${this.turn}`, w / 2, panelY + 55)

    // 敵人血條
    this.renderHealthBar(ctx, panelX + 30, panelY + 80, panelW - 60, 20,
      this.enemy.health, this.enemy.maxHealth, '#ff6b6b', this.enemy.name)

    // 玩家血條
    const player = this.game['playerSystem'].player
    this.renderHealthBar(ctx, panelX + 30, panelY + 115, panelW - 60, 16,
      player.health, player.maxHealth, '#4ecdc4', '你')

    // 玩家體力條
    this.renderHealthBar(ctx, panelX + 30, panelY + 140, panelW - 60, 10,
      player.stamina, player.maxStamina, '#ffe66d', '體力')

    // 戰鬥日誌
    const logY = panelY + 170
    const logHeight = 140
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(panelX + 15, logY, panelW - 30, logHeight)

    ctx.font = '13px "Microsoft JhengHei", sans-serif'
    ctx.textAlign = 'left'

    const recentLogs = this.combatLog.slice(-6)
    recentLogs.forEach((entry, i) => {
      const y = logY + 10 + i * 20
      switch (entry.type) {
        case 'player_attack': ctx.fillStyle = '#6bcb77'; break
        case 'enemy_attack': ctx.fillStyle = '#ff6b6b'; break
        case 'damage': ctx.fillStyle = '#ffd93d'; break
        case 'heal': ctx.fillStyle = '#4ecdc4'; break
        case 'loot': ctx.fillStyle = '#a29bfe'; break
        case 'victory': ctx.fillStyle = '#6bcb77'; break
        case 'defeat': ctx.fillStyle = '#ff6b6b'; break
        default: ctx.fillStyle = '#ccc';
      }
      ctx.fillText(entry.text, panelX + 20, y)
    })

    // 操作提示
    if (this.combatEnded) {
      ctx.fillStyle = '#fdcb6e'
      ctx.font = 'bold 14px "Microsoft JhengHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('戰鬥結束！按 Enter / Space / ESC 繼續', w / 2, panelY + panelH - 15)
    } else if (!this.autoCombat) {
      ctx.fillStyle = '#aaa'
      ctx.font = '12px "Microsoft JhengHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('A/Enter:攻擊  D:防禦  I:補給  F:逃跑  Tab:切換自動戰鬥', w / 2, panelY + panelH - 15)
    } else {
      ctx.fillStyle = '#4ecdc4'
      ctx.font = '12px "Microsoft JhengHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('⚡ 自動戰鬥進行中... (Tab:切換手動  F:逃跑)', w / 2, panelY + panelH - 15)
    }
  }

  /** 繪製血條 */
  private renderHealthBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
    current: number, max: number, color: string, label: string): void {
    // 背景
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(x, y, w, h)

    // 血量
    const percent = Math.max(0, Math.min(1, current / max))
    const grad = ctx.createLinearGradient(x, y, x + w, y)
    grad.addColorStop(0, color)
    grad.addColorStop(1, this.darkenColor(color, 0.3))
    ctx.fillStyle = grad
    ctx.fillRect(x, y, w * percent, h)

    // 邊框
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, w, h)

    // 文字
    ctx.fillStyle = '#fff'
    ctx.font = `bold ${h - 2}px "Microsoft JhengHei", sans-serif`
    ctx.textAlign = 'left'
    ctx.fillText(`${label}: ${current}/${max}`, x + 5, y + h - 2)
  }

  /** 加深顏色 */
  private darkenColor(color: string, factor: number): string {
    // 簡單處理：十六進位顏色
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16)
      const g = parseInt(color.slice(3, 5), 16)
      const b = parseInt(color.slice(5, 7), 16)
      return `#${Math.floor(r * (1 - factor)).toString(16).padStart(2, '0')}`
        + `${Math.floor(g * (1 - factor)).toString(16).padStart(2, '0')}`
        + `${Math.floor(b * (1 - factor)).toString(16).padStart(2, '0')}`
    }
    return color
  }
}