// UI 系統
import { Game } from '../core/Game.js'
import { GameState, ItemType, InventoryItem, EndingType } from '../core/Types.js'
import { ITEM_DEFS } from '../data/Items.js'
import { UI_COLORS, KEY_BINDINGS } from '../data/Constants.js'
import { assetManager } from '../core/AssetManager.js'

interface Message {
  text: string
  type: 'info' | 'warning' | 'success' | 'error'
  timestamp: number
  duration: number
}

export class UISystem {
  private game: Game
  private messages: Message[] = []
  private menuSelection: number = 0
  private menuOptions: string[] = []
  private showMainMenuFlag: boolean = true
  private saveLoadMode: 'save' | 'load' = 'load'
  private saveLoadSelection: number = 0
  private inventorySelection: number = 0
  private inventoryScroll: number = 0

  constructor(game: Game) {
    this.game = game
  }

  async init(): Promise<void> {
    this.showMainMenuFlag = true
    // 載入圖示對照表 (AssetManager 會自動加上 basePath 'assets/')
    try {
      this.itemIconsMap = await assetManager.loadJSON('item_icons_map', 'data/item_icons_map.json')
    } catch (e) {
      console.warn('無法載入物品圖示對照表')
    }
  }

  update(dt: number): void {
    // 更新訊息壽命
    const now = Date.now()
    this.messages = this.messages.filter(msg => now - msg.timestamp < msg.duration)
  }

  /** 渲染主 UI (HUD) */
  render(ctx: CanvasRenderingContext2D): void {
    const { viewWidth, viewHeight } = this.game['renderer'] as any
    const w = viewWidth
    const h = viewHeight
    const player = this.game['playerSystem'].player

    // 左上角：狀態列
    this.renderStatusBar(ctx, 10, 10, w, h)

    // 右上角：快捷鍵提示
    this.renderKeyHints(ctx, w, h)

    // 訊息列表
    this.renderMessages(ctx, w, h)

    // 遊戲狀態特定 UI
    switch (this.game.getState()) {
      case GameState.MAIN_MENU:
        // 主選單仍顯示通知訊息 (例如圖鑑/音效狀態提示)
        this.renderMessages(ctx, w, h)
        break
      case GameState.PAUSED:
        // 暫停覆蓋由 Renderer 處理
        break
    }
  }

  /** 渲染狀態列 */
  private renderStatusBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    const player = this.game['playerSystem'].player
    const barW = 210
    const barH = 18
    const gap = 7
    let curY = y

    const hour = player.stats.currentHour ?? 8
    const minute = player.stats.currentMinute ?? 0
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    const isNight = this.game.isNight()

    // 背景面板
    ctx.fillStyle = 'rgba(15, 15, 26, 0.92)'
    ctx.fillRect(x - 5, y - 5, barW + 10, 118)
    ctx.strokeStyle = isNight ? '#ff7675' : UI_COLORS.panelBorder
    ctx.lineWidth = 1.5
    ctx.strokeRect(x - 5, y - 5, barW + 10, 118)

    // 體力
    this.renderBar(ctx, x, curY, barW, barH, player.stamina, player.maxStamina, UI_COLORS.stamina, '體力')
    curY += barH + gap

    // 健康
    this.renderBar(ctx, x, curY, barW, barH, player.health, player.maxHealth, UI_COLORS.health, '健康')
    curY += barH + gap

    // 時間與晝夜 (24小時制: 06:00日出, 18:00日落)
    ctx.font = 'bold 13px "Microsoft JhengHei", sans-serif'
    ctx.textAlign = 'left'
    if (isNight) {
      ctx.fillStyle = '#ff7675'
      ctx.fillText(`⏰ ${timeStr} 🌙 夜間 (野獸出沒⚠️)`, x, curY + 14)
    } else {
      ctx.fillStyle = '#ffe66d'
      ctx.fillText(`⏰ ${timeStr} ☀️ 白天 (06:00-18:00)`, x, curY + 14)
    }
    curY += 20

    // 天數與座標
    ctx.fillStyle = '#ddd'
    ctx.font = '12px "Microsoft JhengHei", monospace'
    ctx.fillText(`第 ${player.stats.daysSurvived} 天 | 座標: (${player.position.x}, ${player.position.y})`, x, curY + 14)
  }

  /** 渲染單一狀態條 */
  private renderBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
    current: number, max: number, color: string, label: string): void {
    // 背景
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(x, y, w, h)

    // 數值
    const percent = Math.max(0, Math.min(1, current / max))
    const grad = ctx.createLinearGradient(x, y, x + w, y)
    grad.addColorStop(0, color)
    grad.addColorStop(1, this.darkenColor(color, 0.4))
    ctx.fillStyle = grad
    ctx.fillRect(x, y, w * percent, h)

    // 邊框
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, w, h)

    // 文字
    ctx.fillStyle = '#fff'
    ctx.font = `bold ${h - 2}px "Microsoft JhengHei", sans-serif`
    ctx.textAlign = 'left'
    ctx.fillText(`${label}: ${Math.floor(current)}/${max}`, x + 5, y + h - 2)
  }

  /** 渲染快捷鍵提示 */
  private renderKeyHints(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const hints = [
      { key: 'WASD/↑↓←→', desc: '移動' },
      { key: 'E/Space', desc: '採集/探索' },
      { key: 'R', desc: '休息(基地)' },
      { key: 'I', desc: '背包' },
      { key: 'C', desc: '製作' },
      { key: 'M', desc: '存檔/讀檔' },
      { key: 'ESC', desc: '暫停/選單' }
    ]

    const hintW = 160
    const hintH = hints.length * 22 + 10
    const x = w - hintW - 10
    const y = 10

    ctx.fillStyle = 'rgba(15, 15, 26, 0.85)'
    ctx.fillRect(x - 5, y - 5, hintW + 10, hintH)
    ctx.strokeStyle = UI_COLORS.panelBorder
    ctx.lineWidth = 1
    ctx.strokeRect(x - 5, y - 5, hintW + 10, hintH)

    hints.forEach((hint, i) => {
      const hy = y + 5 + i * 22
      ctx.fillStyle = '#888'
      ctx.font = '11px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(hint.key, x + 10, hy + 14)
      ctx.fillStyle = '#ccc'
      ctx.fillText(hint.desc, x + 80, hy + 14)
    })
  }

  /** 僅渲染通知訊息 (供主選單等畫面使用) */
  renderMessagesOnly(ctx: CanvasRenderingContext2D): void {
    const { viewWidth, viewHeight } = this.game['renderer'] as any
    this.renderMessages(ctx, viewWidth, viewHeight)
  }

  /** 渲染訊息列表 */
  private renderMessages(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (this.messages.length === 0) return

    const msgW = 400
    const msgH = 28
    const x = (w - msgW) / 2
    const y = 60

    this.messages.forEach((msg, i) => {
      const alpha = 1 - Math.min(1, (Date.now() - msg.timestamp) / msg.duration)
      const my = y + i * (msgH + 4)

      // 背景
      let bgColor = 'rgba(15,15,26,0.9)'
      if (msg.type === 'warning') bgColor = 'rgba(255,200,50,0.2)'
      if (msg.type === 'success') bgColor = 'rgba(100,200,100,0.2)'
      if (msg.type === 'error') bgColor = 'rgba(255,100,100,0.2)'

      ctx.globalAlpha = alpha
      ctx.fillStyle = bgColor
      ctx.fillRect(x, my, msgW, msgH)
      ctx.strokeStyle = this.getMessageBorderColor(msg.type)
      ctx.globalAlpha = alpha * 0.5
      ctx.lineWidth = 1
      ctx.strokeRect(x, my, msgW, msgH)
      ctx.globalAlpha = 1

      // 文字
      ctx.fillStyle = this.getMessageTextColor(msg.type)
      ctx.font = '13px "Microsoft JhengHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.globalAlpha = alpha
      ctx.fillText(msg.text, w / 2, my + 18)
      ctx.globalAlpha = 1
    })
  }

  private getMessageBorderColor(type: Message['type']): string {
    switch (type) {
      case 'warning': return '#ffc832'
      case 'success': return '#6bcb77'
      case 'error': return '#ff6b6b'
      default: return '#4ecdc4'
    }
  }

  private getMessageTextColor(type: Message['type']): string {
    switch (type) {
      case 'warning': return '#ffe66d'
      case 'success': return '#6bcb77'
      case 'error': return '#ff6b6b'
      default: return '#4ecdc4'
    }
  }

  /** 添加訊息 */
  addMessage(text: string, type: Message['type'] = 'info', duration: number = 3000): void {
    this.messages.push({ text, type, timestamp: Date.now(), duration })
    // 限制訊息數量
    if (this.messages.length > 5) this.messages.shift()
  }

  /** 渲染主選單 */
  renderMainMenu(ctx: CanvasRenderingContext2D): void {
    // 由 Renderer 處理
  }

  /** 渲染暫停選單 */
  renderPauseMenu(ctx: CanvasRenderingContext2D): void {
    // 由 Renderer 處理
  }

  /** 渲染背包介面 */
  renderInventory(ctx: CanvasRenderingContext2D): void {
    const { viewWidth, viewHeight } = this.game['renderer'] as any
    const w = viewWidth
    const h = viewHeight
    const player = this.game['playerSystem'].player
    const inventory = player.inventory

    ctx.save()

    // 半透明背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
    ctx.fillRect(0, 0, w, h)

    // 背包面板 (左右雙欄配置)
    const panelW = Math.min(720, w - 40)
    const panelH = Math.min(540, h - 40)
    const panelX = (w - panelW) / 2
    const panelY = (h - panelH) / 2

    const grad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH)
    grad.addColorStop(0, '#1a1a2e')
    grad.addColorStop(1, '#0f0f1a')
    ctx.fillStyle = grad
    ctx.fillRect(panelX, panelY, panelW, panelH)
    ctx.strokeStyle = '#4ecdc4'
    ctx.lineWidth = 2
    ctx.strokeRect(panelX, panelY, panelW, panelH)

    // 標題
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#4ecdc4'
    ctx.font = 'bold 24px "Microsoft JhengHei", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('🎒 背包', panelX + 20, panelY + 38)

    // 體力/健康顯示
    ctx.fillStyle = '#fff'
    ctx.font = '14px "Microsoft JhengHei", sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`體力: ${Math.floor(player.stamina)}/${player.maxStamina}   健康: ${player.health}/${player.maxHealth}`, panelX + panelW - 20, panelY + 36)

    // 雙欄區域
    const contentY = panelY + 60
    const contentH = panelH - 95
    const listX = panelX + 18
    const listW = Math.floor((panelW - 36) * 0.56)
    const detailX = listX + listW + 12
    const detailW = (panelW - 36) - listW - 12

    // 左欄：物品列表背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.fillRect(listX, contentY, listW, contentH)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    ctx.strokeRect(listX, contentY, listW, contentH)

    const itemH = 50
    const maxVisible = Math.max(1, Math.floor((contentH - 10) / itemH))
    const visibleCount = Math.min(maxVisible, Math.max(0, inventory.length - this.inventoryScroll))

    if (inventory.length === 0) {
      ctx.fillStyle = '#666'
      ctx.font = '16px "Microsoft JhengHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('背包是空的', listX + listW / 2, contentY + contentH / 2)
      ctx.textBaseline = 'alphabetic'
    } else {
      for (let i = 0; i < visibleCount; i++) {
        const item = inventory[this.inventoryScroll + i]
        const itemY = contentY + 6 + i * itemH
        const isSelected = this.inventorySelection === this.inventoryScroll + i
        const def = ITEM_DEFS[item.id]

        // 選中高亮
        if (isSelected) {
          ctx.fillStyle = 'rgba(78, 205, 196, 0.22)'
          ctx.fillRect(listX + 6, itemY, listW - 18, itemH - 4)
          ctx.strokeStyle = '#4ecdc4'
          ctx.lineWidth = 1.5
          ctx.strokeRect(listX + 6, itemY, listW - 18, itemH - 4)
        }

        // 圖示
        this.drawItemIcon(ctx, item.id, listX + 12, itemY + 8, 34)

        // 名稱
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 15px "Microsoft JhengHei", sans-serif'
        ctx.fillText(def?.name || item.id, listX + 54, itemY + 20)

        // 數量/耐久度
        ctx.font = '12px "Microsoft JhengHei", sans-serif'
        if (def?.stackable && item.quantity >= 1) {
          ctx.fillStyle = '#aaa'
          ctx.fillText(`數量: x${item.quantity}`, listX + 54, itemY + 39)
        } else if (def?.durability && item.durability !== undefined) {
          const durPercent = item.durability / (item.maxDurability || 1)
          ctx.fillStyle = durPercent > 0.3 ? '#6bcb77' : (durPercent > 0 ? '#ffe66d' : '#ff6b6b')
          ctx.fillText(`耐久: ${item.durability}/${item.maxDurability}`, listX + 54, itemY + 39)

          // 耐久度條
          ctx.fillStyle = 'rgba(0,0,0,0.5)'
          ctx.fillRect(listX + 165, itemY + 31, 70, 6)
          ctx.fillStyle = durPercent > 0.3 ? '#6bcb77' : (durPercent > 0 ? '#ffe66d' : '#ff6b6b')
          ctx.fillRect(listX + 165, itemY + 31, 70 * durPercent, 6)
        }

        // 類型標籤
        if (def) {
          const typeColors: Record<ItemType, string> = {
            FOOD: '#6bcb77', WATER: '#4ecdc4', MATERIAL: '#a29bfe',
            TOOL: '#ffe66d', WEAPON: '#ff6b6b', ARMOR: '#a29bfe',
            MEDICINE: '#4ecdc4', SPECIAL: '#fd79a8'
          }
          ctx.fillStyle = typeColors[def.type] || '#888'
          ctx.font = '11px "Microsoft JhengHei", sans-serif'
          ctx.textAlign = 'right'
          ctx.fillText(def.type, listX + listW - 18, itemY + 20)
        }
      }

      // 捲動條
      if (inventory.length > visibleCount) {
        const trackH = contentH - 12
        ctx.fillStyle = '#222'
        ctx.fillRect(listX + listW - 8, contentY + 6, 5, trackH)
        const thumbH = Math.max(24, (visibleCount / inventory.length) * trackH)
        const thumbY = contentY + 6 + (this.inventoryScroll / inventory.length) * trackH
        ctx.fillStyle = '#4ecdc4'
        ctx.fillRect(listX + listW - 8, thumbY, 5, thumbH)
      }
    }

    // 右欄：物品詳細資訊
    const selectedItem = inventory[this.inventorySelection]
    this.renderItemDetail(ctx, detailX, contentY, detailW, contentH, selectedItem)

    // 操作提示
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#888'
    ctx.font = '12px "Microsoft JhengHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('↑↓/WS 選擇  |  Enter/Space 使用物品  |  PgUp/PgDown 捲動  |  I/ESC 關閉', w / 2, panelY + panelH - 12)

    ctx.restore()
  }

  /** 渲染物品詳細資訊 (右欄) */
  private renderItemDetail(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, item?: InventoryItem): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, w, h)

    if (!item) {
      ctx.fillStyle = '#666'
      ctx.font = '14px "Microsoft JhengHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('選擇物品以檢視詳情', x + w / 2, y + h / 2)
      ctx.textBaseline = 'alphabetic'
      return
    }

    const def = ITEM_DEFS[item.id]
    if (!def) return

    this.drawItemIcon(ctx, item.id, x + 16, y + 16, 48)

    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 19px "Microsoft JhengHei", sans-serif'
    ctx.fillText(def.name, x + 72, y + 44)

    // 說明
    ctx.fillStyle = '#ccc'
    ctx.font = '14px "Microsoft JhengHei", sans-serif'
    this.wrapText(ctx, def.description, x + 16, y + 72, w - 32, 22)

    // 效果
    if (def.effects && def.effects.length > 0) {
      let effY = y + 140
      ctx.fillStyle = '#4ecdc4'
      ctx.font = 'bold 14px "Microsoft JhengHei", sans-serif'
      ctx.fillText('使用效果:', x + 16, effY)

      def.effects.forEach(eff => {
        effY += 24
        ctx.fillStyle = '#6bcb77'
        ctx.font = '14px "Microsoft JhengHei", sans-serif'
        const effText = this.getEffectText(eff)
        ctx.fillText(`• ${effText}`, x + 20, effY)
      })
    }

    // 操作提示
    if (def.effects && def.effects.length > 0) {
      const btnY = y + h - 50
      ctx.fillStyle = 'rgba(78, 205, 196, 0.2)'
      ctx.fillRect(x + 16, btnY, w - 32, 36)
      ctx.strokeStyle = '#4ecdc4'
      ctx.lineWidth = 1.5
      ctx.strokeRect(x + 16, btnY, w - 32, 36)

      ctx.fillStyle = '#4ecdc4'
      ctx.font = 'bold 15px "Microsoft JhengHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('按 Enter 食用 / 使用', x + w / 2, btnY + 18)
      ctx.textBaseline = 'alphabetic'
    }
  }

  private getEffectText(eff: { type: string; value: number; duration?: number }): string {
    switch (eff.type) {
      case 'health': return `恢復健康 ${eff.value > 0 ? '+' : ''}${eff.value}`
      case 'stamina': return `恢復體力 ${eff.value > 0 ? '+' : ''}${eff.value}`
      case 'heal': return `治療 ${eff.value}`
      case 'buff': return `增益 ${eff.value}% (${eff.duration}秒)`
      case 'cure': return `治癒異常狀態`
      default: return `${eff.type}: ${eff.value}`
    }
  }

  /** 繪製物品圖示 (使用資產系統) */
  private drawItemIcon(ctx: CanvasRenderingContext2D, itemId: string, x: number, y: number, size: number = 36): void {
    // 嘗試從資產系統獲取圖示
    if (this.itemIconsMap && assetManager.hasAsset('ui_icons')) {
      const iconDef = this.itemIconsMap.items[itemId]
      if (iconDef) {
        const sheet = assetManager.getSpriteSheet('ui_icons')
        if (sheet) {
          const frame = sheet.frames.get(iconDef.frame)
          if (frame) {
            const scale = size / (this.itemIconsMap.frameSize * this.itemIconsMap.scale)
            ctx.drawImage(
              sheet.image,
              frame.x, frame.y, frame.width, frame.height,
              x, y, size, size
            )
            return
          }
        }
      }
    }

    // 回退：使用 emoji
    ctx.save()
    const icons: Record<string, string> = {
      coconut: '🥥', berries: '🍓', fish: '🐟', cooked_fish: '🍢', mushroom: '🍄', meat: '🥩', cooked_meat: '🍖',
      water_bottle: '💧', coconut_water: '🥤',
      wood: '🪵', stone: '🪨', fiber: '🌿', hide: '🧥', bone: '🦴', metal_scrap: '⚙️', crystal: '💎', shell: '🐚', herbs: '🌿',
      stone_axe: '🪓', stone_pickaxe: '⛏️', stone_knife: '🔪', wooden_spear: '🪃', fishing_rod: '🎣', torch: '🔥',
      spear: '🏹', bow: '🏹',
      leather_armor: '🧥', wooden_shield: '🛡️',
      herbal_medicine: '🧪', bandage: '🩹',
      map_fragment: '🗺️', radio_parts: '📻', signal_flare: '🚨', raft_blueprint: '📐'
    }
    ctx.font = `${size}px "Microsoft JhengHei", sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillStyle = '#fff'
    ctx.fillText(icons[itemId] || '📦', x, y)
    ctx.restore()
  }

  /** 載入物品圖示對照表 */
  private itemIconsMap: any = null

  /** 設定存讀檔選單模式 */
  setSaveLoadMode(mode: 'save' | 'load'): void {
    this.saveLoadMode = mode
  }

  /** 渲染存檔/讀檔介面 */
  renderSaveLoad(ctx: CanvasRenderingContext2D): void {
    const { viewWidth, viewHeight } = this.game['renderer'] as any
    const w = viewWidth
    const h = viewHeight

    ctx.save()
    ctx.textBaseline = 'alphabetic'

    // 半透明背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
    ctx.fillRect(0, 0, w, h)

    // 面板
    const panelW = Math.min(620, w - 40)
    const panelH = Math.min(580, h - 40)
    const panelX = (w - panelW) / 2
    const panelY = (h - panelH) / 2

    const grad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH)
    grad.addColorStop(0, '#1a1a2e')
    grad.addColorStop(1, '#0f0f1a')
    ctx.fillStyle = grad
    ctx.fillRect(panelX, panelY, panelW, panelH)
    ctx.strokeStyle = '#4ecdc4'
    ctx.lineWidth = 2
    ctx.strokeRect(panelX, panelY, panelW, panelH)

    // 標題
    ctx.fillStyle = '#4ecdc4'
    ctx.font = 'bold 24px "Microsoft JhengHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(this.saveLoadMode === 'save' ? '💾 存檔管理 (儲存進度)' : '📂 存檔管理 (讀取進度)', w / 2, panelY + 38)

    // 模式切換標籤 (修正對稱座標)
    const tabY = panelY + 52
    const tabW = 140
    const tabGap = 16
    ;(['save', 'load'] as const).forEach((mode, i) => {
      const tabX = w / 2 - tabW - tabGap / 2 + i * (tabW + tabGap)
      const isActive = this.saveLoadMode === mode
      ctx.fillStyle = isActive ? 'rgba(78, 205, 196, 0.22)' : 'rgba(255, 255, 255, 0.04)'
      ctx.fillRect(tabX, tabY, tabW, 30)
      ctx.strokeStyle = isActive ? '#4ecdc4' : '#444'
      ctx.lineWidth = isActive ? 1.5 : 1
      ctx.strokeRect(tabX, tabY, tabW, 30)

      ctx.fillStyle = isActive ? '#4ecdc4' : '#aaa'
      ctx.font = isActive ? 'bold 14px "Microsoft JhengHei", sans-serif' : '14px "Microsoft JhengHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(mode === 'save' ? '💾 存檔模式' : '📂 讀檔模式', tabX + tabW / 2, tabY + 20)
    })

    // 槽位列表
    const listY = panelY + 94
    const slotH = 52

    for (let i = 0; i < 8; i++) {
      const slotY = listY + i * (slotH + 4)
      const isSelected = this.saveLoadSelection === i
      const meta = this.game.saveSystem.getSaveMetaSync(i)

      // 背景
      ctx.fillStyle = isSelected ? 'rgba(78, 205, 196, 0.18)' : 'rgba(0, 0, 0, 0.25)'
      ctx.fillRect(panelX + 20, slotY, panelW - 40, slotH)
      ctx.strokeStyle = isSelected ? '#4ecdc4' : 'rgba(255, 255, 255, 0.08)'
      ctx.lineWidth = isSelected ? 1.5 : 1
      ctx.strokeRect(panelX + 20, slotY, panelW - 40, slotH)

      // 槽位號碼
      ctx.fillStyle = isSelected ? '#4ecdc4' : '#ccc'
      ctx.font = 'bold 15px "Microsoft JhengHei", sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`槽位 ${i}${i === 0 ? ' (F5 快速存檔)' : ''}`, panelX + 35, slotY + 21)

      // 右側操作提示
      if (isSelected) {
        ctx.fillStyle = '#4ecdc4'
        ctx.font = '12px "Microsoft JhengHei", sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText(this.saveLoadMode === 'save' ? '[Enter 寫入存檔]' : (meta ? '[Enter 讀取進度]' : ''), panelX + panelW - 35, slotY + 21)
      }

      // 顯示存檔中繼資料
      ctx.textAlign = 'left'
      ctx.font = '12px "Microsoft JhengHei", sans-serif'
      if (meta) {
        ctx.fillStyle = '#ddd'
        const dateStr = new Date(meta.timestamp).toLocaleString('zh-TW', { hour12: false })
        ctx.fillText(
          `第 ${meta.daysSurvived} 天 | 座標(${meta.position.x},${meta.position.y}) | 體力:${Math.floor(meta.stamina)} 健康:${meta.health} | ${dateStr}`,
          panelX + 35,
          slotY + 41
        )
      } else {
        ctx.fillStyle = '#666'
        ctx.fillText('(空白槽位)', panelX + 35, slotY + 41)
      }
    }

    // 操作提示
    ctx.fillStyle = '#888'
    ctx.font = '12px "Microsoft JhengHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('↑↓/滑鼠 選擇槽位  |  Tab/左右鍵 切換存讀模式  |  Enter/點擊 確認  |  E 匯出  L 匯入  |  ESC 返回', w / 2, panelY + panelH - 12)

    ctx.restore()
  }

  /** 渲染遊戲結束畫面 */
  renderGameOver(ctx: CanvasRenderingContext2D): void {
    const { viewWidth, viewHeight } = this.game['renderer'] as any
    const w = viewWidth
    const h = viewHeight

    // 全螢幕覆蓋
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'
    ctx.fillRect(0, 0, w, h)

    // 遊戲結束文字
    ctx.fillStyle = '#ff6b6b'
    ctx.font = 'bold 48px "Microsoft JhengHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('☠ 遊戲結束', w / 2, h / 2 - 60)

    // 統計
    const player = this.game['playerSystem'].player
    ctx.fillStyle = '#ddd'
    ctx.font = '18px "Microsoft JhengHei", sans-serif'
    ctx.fillText(`生存天數: ${player.stats.daysSurvived}`, w / 2, h / 2 + 10)
    ctx.fillText(`探索格子: ${player.stats.tilesExplored}`, w / 2, h / 2 + 40)
    ctx.fillText(`完成事件: ${player.stats.eventsCompleted}`, w / 2, h / 2 + 70)
    ctx.fillText(`戰鬥勝利: ${player.stats.combatsWon}`, w / 2, h / 2 + 100)
    ctx.fillText(`製作物品: ${player.stats.itemsCrafted}`, w / 2, h / 2 + 130)

    // 解鎖結局
    if (player.stats.endingsUnlocked.length > 0) {
      ctx.fillStyle = '#fdcb6e'
      ctx.fillText(`已解鎖結局: ${player.stats.endingsUnlocked.length}/6`, w / 2, h / 2 + 160)
    }

    // 選項
    ctx.fillStyle = '#888'
    ctx.font = '16px "Microsoft JhengHei", sans-serif'
    ctx.fillText('按 R 重新開始  |  ESC 返回主選單', w / 2, h / 2 + 220)
  }

  /** 渲染勝利畫面 */
  renderVictory(ctx: CanvasRenderingContext2D): void {
    const { viewWidth, viewHeight } = this.game['renderer'] as any
    const w = viewWidth
    const h = viewHeight
    const player = this.game['playerSystem'].player

    // 全螢幕覆蓋 (漸層)
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#0a1a2a')
    grad.addColorStop(0.5, '#1a2a3a')
    grad.addColorStop(1, '#0a1a2a')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // 慶祝粒子
    this.renderVictoryParticles(ctx, w, h)

    // 勝利文字
    ctx.fillStyle = '#fdcb6e'
    ctx.font = 'bold 56px "Microsoft JhengHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🎉 獲 利 脫 困 !', w / 2, h / 2 - 100)

    // 結局類型
    const lastEnding = player.stats.endingsUnlocked[player.stats.endingsUnlocked.length - 1]
    const endingNames: Record<string, string> = {
      'ESCAPE_RAFT': '筏子逃生',
      'ESCAPE_SIGNAL': '信號求救',
      'ESCAPE_RESCUE': '無線電聯繫',
      'THRIVE': '島上繁榮',
      'MYSTERY': '神祕真相'
    }
    ctx.fillStyle = '#4ecdc4'
    ctx.font = '24px "Microsoft JhengHei", sans-serif'
    ctx.fillText(`結局: ${endingNames[lastEnding] || lastEnding}`, w / 2, h / 2 - 40)

    // 統計
    ctx.fillStyle = '#ddd'
    ctx.font = '18px "Microsoft JhengHei", sans-serif'
    ctx.fillText(`生存天數: ${player.stats.daysSurvived}`, w / 2, h / 2 + 20)
    ctx.fillText(`總共解鎖結局: ${player.stats.endingsUnlocked.length}/6`, w / 2, h / 2 + 50)

    // 選項
    ctx.fillStyle = '#888'
    ctx.font = '16px "Microsoft JhengHei", sans-serif'
    ctx.fillText('按 R 重新開始 (繼承圖鑑)  |  ESC 返回主選單', w / 2, h / 2 + 120)
  }

  /** 渲染勝利粒子 */
  private renderVictoryParticles(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const time = Date.now() / 1000
    for (let i = 0; i < 30; i++) {
      const x = (Math.sin(time * 0.3 + i) * 0.5 + 0.5) * w
      const y = (Math.cos(time * 0.2 + i * 1.3) * 0.5 + 0.5) * h
      const size = 2 + Math.sin(time * 2 + i) * 1.5
      const colors = ['#fdcb6e', '#4ecdc4', '#a29bfe', '#ff7675', '#74b9ff']
      ctx.fillStyle = colors[i % colors.length]
      ctx.globalAlpha = 0.6 + Math.sin(time * 3 + i) * 0.2
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  /** 加深顏色 */
  private darkenColor(color: string, factor: number): string {
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

  /** 文字換行 */
  private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
    const words = text.split('')
    let line = ''
    let currentY = y

    for (const char of words) {
      const testLine = line + char
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth && line !== '') {
        ctx.fillText(line, x, currentY)
        line = char
        currentY += lineHeight
      } else {
        line = testLine
      }
    }
    ctx.fillText(line, x, currentY)
  }

  /** 顯示主選單 */
  showMainMenu(): void {
    this.showMainMenuFlag = true
    this.menuSelection = 0
  }

  /** 檢查主選單選項懸停 */
  isMenuOptionHovered(index: number): boolean {
    return this.menuSelection === index
  }

  /** 設定主選單選項 */
  setMenuSelection(index: number): void {
    this.menuSelection = index
  }

  /** 取得主選單選項 */
  getMenuSelection(): number {
    return this.menuSelection
  }

  /** 處理滑鼠移動 (主選單與事件選項懸停) */
  handleMouseMove(mx: number, my: number): void {
    const { viewWidth, viewHeight } = this.game['renderer'] as any
    const w = viewWidth
    const h = viewHeight
    const state = this.game.getState()

    if (state === GameState.MAIN_MENU) {
      const startY = h / 2 + 20
      for (let i = 0; i < 5; i++) {
        const y = startY + i * 50
        if (mx >= w / 2 - 120 && mx <= w / 2 + 120 && my >= y - 18 && my <= y + 18) {
          if (this.menuSelection !== i) {
            this.menuSelection = i
            this.game['audioSystem'].playSFX('menu_select')
          }
          break
        }
      }
    } else if (state === GameState.EVENT) {
      const choices = this.game.eventSystem.getAvailableChoices()
      const boxW = Math.min(600, w - 40)
      const boxH = 380
      const boxX = (w - boxW) / 2
      const boxY = (h - boxH) / 2
      const startY = boxY + 180
      for (let i = 0; i < choices.length; i++) {
        const y = startY + i * 50
        if (mx >= boxX + 20 && mx <= boxX + boxW - 20 && my >= y - 8 && my <= y + 32) {
          this.game.eventSystem['currentChoiceIndex'] = i
          break
        }
      }
    } else if (state === GameState.SAVE_LOAD) {
      const panelW = Math.min(620, w - 40)
      const panelH = Math.min(580, h - 40)
      const panelX = (w - panelW) / 2
      const panelY = (h - panelH) / 2
      const listY = panelY + 94
      const slotH = 52
      for (let i = 0; i < 8; i++) {
        const slotY = listY + i * (slotH + 4)
        if (mx >= panelX + 20 && mx <= panelX + panelW - 20 && my >= slotY && my <= slotY + slotH) {
          if (this.saveLoadSelection !== i) {
            this.saveLoadSelection = i
            this.game['audioSystem'].playSFX('menu_select')
          }
          break
        }
      }
    }
  }

  /** 處理滑鼠點擊 */
  handleMouseClick(mx: number, my: number): void {
    const { viewWidth, viewHeight } = this.game['renderer'] as any
    const w = viewWidth
    const h = viewHeight
    const state = this.game.getState()

    if (state === GameState.MAIN_MENU) {
      const options = ['new_game', 'continue', 'saves', 'gallery', 'settings']
      const startY = h / 2 + 20
      for (let i = 0; i < options.length; i++) {
        const y = startY + i * 50
        if (mx >= w / 2 - 120 && mx <= w / 2 + 120 && my >= y - 18 && my <= y + 18) {
          this.menuSelection = i
          this.executeMainMenuAction(options[i])
          return
        }
      }
    } else if (state === GameState.EVENT) {
      const choices = this.game.eventSystem.getAvailableChoices()
      const boxW = Math.min(600, w - 40)
      const boxH = 380
      const boxX = (w - boxW) / 2
      const boxY = (h - boxH) / 2
      const startY = boxY + 180
      for (let i = 0; i < choices.length; i++) {
        const y = startY + i * 50
        if (mx >= boxX + 20 && mx <= boxX + boxW - 20 && my >= y - 8 && my <= y + 32) {
          this.game.eventSystem.chooseOption(choices[i].id)
          return
        }
      }
    } else if (state === GameState.SAVE_LOAD) {
      const panelW = Math.min(620, w - 40)
      const panelH = Math.min(580, h - 40)
      const panelX = (w - panelW) / 2
      const panelY = (h - panelH) / 2
      const tabY = panelY + 52
      const tabW = 140
      const tabGap = 16
      // 點擊存/讀檔分頁標籤
      ;(['save', 'load'] as const).forEach((mode, i) => {
        const tabX = w / 2 - tabW - tabGap / 2 + i * (tabW + tabGap)
        if (mx >= tabX && mx <= tabX + tabW && my >= tabY && my <= tabY + 30) {
          this.saveLoadMode = mode
          this.game['audioSystem'].playSFX('menu_select')
        }
      })
      // 點擊槽位執行存檔或讀檔
      const listY = panelY + 94
      const slotH = 52
      for (let i = 0; i < 8; i++) {
        const slotY = listY + i * (slotH + 4)
        if (mx >= panelX + 20 && mx <= panelX + panelW - 20 && my >= slotY && my <= slotY + slotH) {
          this.saveLoadSelection = i
          this.executeSaveLoadAction()
          return
        }
      }
    }
  }

  /** 處理主選單輸入 */
  handleMainMenuInput(key: string): boolean {
    const options = ['new_game', 'continue', 'saves', 'gallery', 'settings']
    switch (key) {
      case 'ArrowUp':
      case 'KeyW':
        this.menuSelection = (this.menuSelection - 1 + options.length) % options.length
        this.game['audioSystem'].playSFX('menu_select')
        return true
      case 'ArrowDown':
      case 'KeyS':
        this.menuSelection = (this.menuSelection + 1) % options.length
        this.game['audioSystem'].playSFX('menu_select')
        return true
      case 'Enter':
      case 'Space':
        this.executeMainMenuAction(options[this.menuSelection])
        return true
    }
    return false
  }

  /** 執行主選單動作 */
  private executeMainMenuAction(action: string): void {
    this.game['audioSystem'].playSFX('menu_confirm')
    switch (action) {
      case 'new_game':
        this.game.newGame()
        break
      case 'continue':
        this.game.openSaveLoad('load')
        break
      case 'saves':
        this.game.openSaveLoad('load')
        break
      case 'gallery':
        this.game['playerSystem'].loadEndingProgress()
        const unlocked = this.game['playerSystem'].player.stats.endingsUnlocked
        this.addMessage(`已解鎖結局 (${unlocked.length}/6): ${unlocked.length > 0 ? unlocked.join(', ') : '尚無紀錄'}`, 'info', 4000)
        break
      case 'settings':
        const enabled = this.game['audioSystem'].toggleMute()
        this.addMessage(enabled ? '🔊 音效已開啟' : '🔇 音效已靜音', 'info')
        break
    }
  }

  /** 處理存檔/讀檔輸入 */
  handleSaveLoadInput(key: string): boolean {
    const maxSlots = 8
    switch (key) {
      case 'ArrowUp':
      case 'KeyW':
        this.saveLoadSelection = (this.saveLoadSelection - 1 + maxSlots) % maxSlots
        this.game['audioSystem'].playSFX('menu_select')
        return true
      case 'ArrowDown':
      case 'KeyS':
        this.saveLoadSelection = (this.saveLoadSelection + 1) % maxSlots
        this.game['audioSystem'].playSFX('menu_select')
        return true
      case 'Tab':
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'KeyA':
      case 'KeyD':
        this.saveLoadMode = this.saveLoadMode === 'save' ? 'load' : 'save'
        this.game['audioSystem'].playSFX('menu_select')
        return true
      case 'KeyE':
        this.game.saveSystem.exportSave(this.saveLoadSelection).then(ok => {
          this.addMessage(ok ? `已匯出槽位 ${this.saveLoadSelection} 存檔` : '該槽位無存檔可匯出', ok ? 'success' : 'warning')
        })
        return true
      case 'KeyL':
        this.game.saveSystem.importSave().then(async data => {
          if (data) {
            await this.game.saveSystem.save(this.saveLoadSelection, data)
            this.addMessage(`已匯入存檔至槽位 ${this.saveLoadSelection}`, 'success')
          }
        })
        return true
      case 'Enter':
      case 'Space':
        this.executeSaveLoadAction()
        return true
      case 'Escape':
      case 'KeyM':
        this.game.closeSaveLoad()
        return true
    }
    return false
  }

  /** 執行存檔/讀檔動作 */
  private async executeSaveLoadAction(): Promise<void> {
    this.game['audioSystem'].playSFX('menu_confirm')
    if (this.saveLoadMode === 'save') {
      const ok = await this.game.saveGame(this.saveLoadSelection)
      if (ok) {
        this.addMessage(`💾 存檔至槽位 ${this.saveLoadSelection} 完成！`, 'success')
      } else {
        this.addMessage('請先開始新遊戲再進行存檔！', 'warning')
      }
    } else {
      const success = await this.game.loadGame(this.saveLoadSelection)
      if (success) {
        this.addMessage(`📂 讀取槽位 ${this.saveLoadSelection} 成功！`, 'success')
      } else {
        this.addMessage('該槽位無有效存檔', 'error')
      }
    }
  }

  /** 處理背包輸入 */
  handleInventoryInput(key: string): boolean {
    const inventory = this.game['playerSystem'].player.inventory
    const maxIndex = inventory.length - 1

    switch (key) {
      case 'ArrowUp':
      case 'KeyW':
        this.inventorySelection = Math.max(0, this.inventorySelection - 1)
        if (this.inventorySelection < this.inventoryScroll) this.inventoryScroll = this.inventorySelection
        this.game['audioSystem'].playSFX('menu_select')
        return true
      case 'ArrowDown':
      case 'KeyS':
        this.inventorySelection = Math.min(maxIndex, this.inventorySelection + 1)
        if (this.inventorySelection >= this.inventoryScroll + 9) this.inventoryScroll = this.inventorySelection - 8
        this.game['audioSystem'].playSFX('menu_select')
        return true
      case 'PageUp':
        this.inventorySelection = Math.max(0, this.inventorySelection - 9)
        this.inventoryScroll = Math.max(0, this.inventoryScroll - 9)
        return true
      case 'PageDown':
        this.inventorySelection = Math.min(maxIndex, this.inventorySelection + 9)
        this.inventoryScroll = Math.min(maxIndex - 8, this.inventoryScroll + 9)
        return true
      case 'Enter':
      case 'Space':
        if (inventory[this.inventorySelection]) {
          this.game['playerSystem'].useItem(inventory[this.inventorySelection].id)
        }
        return true
      case 'Escape':
      case 'KeyI':
        this.game.closeInventory()
        return true
    }
    return false
  }

  /** 重置 UI 狀態 */
  reset(): void {
    this.messages = []
    this.menuSelection = 0
    this.saveLoadSelection = 0
    this.inventorySelection = 0
    this.inventoryScroll = 0
    this.saveLoadMode = 'load'
  }

  /** 視窗大小調整 */
  onResize(width: number, height: number): void {
    // UI 會自適應
  }
}