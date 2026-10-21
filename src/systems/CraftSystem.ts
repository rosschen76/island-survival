// 製作系統
import { Game } from '../core/Game.js'
import { CraftRecipe, CraftIngredient, ItemType, ItemDef } from '../core/Types.js'
import { ITEM_DEFS, getCraftableItems } from '../data/Items.js'
import { assetManager } from '../core/AssetManager.js'

export class CraftSystem {
  private game: Game
  private recipes: Map<string, CraftRecipe> = new Map()
  private selectedRecipeId: string | null = null
  private categoryFilter: ItemType | 'ALL' = 'ALL'
  private showOnlyCraftable: boolean = false
  private scrollOffset: number = 0

  constructor(game: Game) {
    this.game = game
  }

  /** 載入配方 */
  async loadRecipes(): Promise<void> {
    // 從物品定義中提取配方
    for (const item of getCraftableItems()) {
      if (item.craftRecipe) {
        this.recipes.set(item.craftRecipe.id, item.craftRecipe)
      }
    }
    console.log(`載入配方完成: ${this.recipes.size} 個`)
  }

  /** 取得所有配方 */
  getAllRecipes(): CraftRecipe[] {
    return Array.from(this.recipes.values())
  }

  /** 取得可見配方 (依分類過濾) */
  getVisibleRecipes(): CraftRecipe[] {
    let recipes = this.getAllRecipes()

    // 分類過濾
    if (this.categoryFilter !== 'ALL') {
      recipes = recipes.filter(recipe => {
        const resultItem = ITEM_DEFS[recipe.resultItemId]
        return resultItem?.type === this.categoryFilter
      })
    }

    // 只顯示可製作
    if (this.showOnlyCraftable) {
      recipes = recipes.filter(recipe => this.canCraft(recipe))
    }

    // 排序：可製作在前，再按類型、名稱
    recipes.sort((a, b) => {
      const aCraftable = this.canCraft(a) ? 0 : 1
      const bCraftable = this.canCraft(b) ? 0 : 1
      if (aCraftable !== bCraftable) return aCraftable - bCraftable

      const aItem = ITEM_DEFS[a.resultItemId]
      const bItem = ITEM_DEFS[b.resultItemId]
      const typeOrder = (t: ItemType) => ({ FOOD: 0, WATER: 1, MEDICINE: 2, TOOL: 3, WEAPON: 4, ARMOR: 5, MATERIAL: 6, SPECIAL: 7 })[t] || 99
      const ta = typeOrder(aItem?.type || 0)
      const tb = typeOrder(bItem?.type || 0)
      if (ta !== tb) return ta - tb
      return (aItem?.name || '').localeCompare(bItem?.name || '')
    })

    return recipes
  }

  /** 檢查是否可製作 */
  canCraft(recipe: CraftRecipe): boolean {
    // 檢查材料
    for (const ing of recipe.ingredients) {
      if (!this.game['playerSystem'].hasItem(ing.itemId, ing.quantity)) {
        return false
      }
    }

    // 檢查所需工具
    if (recipe.requiredTools) {
      for (const toolId of recipe.requiredTools) {
        if (!this.game['playerSystem'].hasItem(toolId)) {
          return false
        }
      }
    }

    // 檢查體力
    const player = this.game['playerSystem'].player
    if (player.stamina < recipe.staminaCost) {
      return false
    }

    // 檢查解鎖條件
    if (recipe.unlockedBy) {
      if (!this.game['playerSystem'].hasItem(recipe.unlockedBy)) {
        return false
      }
    }

    return true
  }

  /** 製作物品 */
  craft(recipeId: string): boolean {
    const recipe = this.recipes.get(recipeId)
    if (!recipe) return false

    if (!this.canCraft(recipe)) {
      this.game['audioSystem'].playSFX('error')
      return false
    }

    // 扣除材料
    for (const ing of recipe.ingredients) {
      this.game['playerSystem'].removeItem(ing.itemId, ing.quantity)
    }

    // 扣除體力
    this.game['playerSystem'].player.stamina -= recipe.staminaCost

    // 給予成品
    this.game['playerSystem'].addItem(recipe.resultItemId, recipe.resultQuantity)

    // 統計
    this.game['playerSystem'].player.stats.itemsCrafted++
    this.game.advanceTime(30)

    this.game['audioSystem'].playSFX('craft')

    const resultItem = ITEM_DEFS[recipe.resultItemId]
    this.game['uiSystem'].addMessage(`製作完成: ${resultItem?.name || recipe.resultItemId} x${recipe.resultQuantity}`)

    return true
  }

  /** 設定選中的配方 */
  selectRecipe(recipeId: string | null): void {
    this.selectedRecipeId = recipeId
  }

  /** 取得選中的配方 */
  getSelectedRecipe(): CraftRecipe | null {
    if (!this.selectedRecipeId) return null
    return this.recipes.get(this.selectedRecipeId) || null
  }

  /** 設定分類過濾 */
  setCategoryFilter(filter: ItemType | 'ALL'): void {
    this.categoryFilter = filter
    this.scrollOffset = 0
  }

  /** 切換只顯示可製作 */
  toggleShowOnlyCraftable(): void {
    this.showOnlyCraftable = !this.showOnlyCraftable
    this.scrollOffset = 0
  }

  /** 取得分類過濾 */
  getCategoryFilter(): ItemType | 'ALL' {
    return this.categoryFilter
  }

  /** 是否只顯示可製作 */
  isShowOnlyCraftable(): boolean {
    return this.showOnlyCraftable
  }

  /** 捲動列表 */
  scroll(delta: number): void {
    const recipes = this.getVisibleRecipes()
    const maxScroll = Math.max(0, recipes.length - 8)
    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset + delta))
  }

  /** 取得捲動偏移 */
  getScrollOffset(): number {
    return this.scrollOffset
  }

  /** 更新 */
  update(dt: number): void {
    // 製作系統主要由 UI 驅動
  }

  /** 渲染製作介面 */
  render(ctx: CanvasRenderingContext2D): void {
    const { viewWidth, viewHeight } = this.game['renderer'] as any
    const w = viewWidth
    const h = viewHeight

    // 若尚未選中任何配方，預設選中第一個可見配方
    const visibleRecipes = this.getVisibleRecipes()
    if (!this.selectedRecipeId && visibleRecipes.length > 0) {
      this.selectedRecipeId = visibleRecipes[0].id
    } else if (this.selectedRecipeId && !visibleRecipes.some(r => r.id === this.selectedRecipeId)) {
      this.selectedRecipeId = visibleRecipes[0]?.id || null
    }

    ctx.save()

    // 半透明背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
    ctx.fillRect(0, 0, w, h)

    // 製作面板 (加大寬度以容納左右雙欄：左側列表、右側詳情)
    const panelW = Math.min(760, w - 40)
    const panelH = Math.min(560, h - 40)
    const panelX = (w - panelW) / 2
    const panelY = (h - panelH) / 2

    // 背景
    const grad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH)
    grad.addColorStop(0, '#1a1a2e')
    grad.addColorStop(1, '#0f0f1a')
    ctx.fillStyle = grad
    ctx.fillRect(panelX, panelY, panelW, panelH)

    // 邊框
    ctx.strokeStyle = '#4ecdc4'
    ctx.lineWidth = 2
    ctx.strokeRect(panelX, panelY, panelW, panelH)

    // 標題與頂部狀態列
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#4ecdc4'
    ctx.font = 'bold 24px "Microsoft JhengHei", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('🔨 製作系統', panelX + 20, panelY + 36)

    // 過濾狀態 (置於標題列中間)
    const filterX = panelX + 200
    const filterY = panelY + 14
    ctx.fillStyle = this.showOnlyCraftable ? 'rgba(78, 205, 196, 0.2)' : 'rgba(255,255,255,0.05)'
    ctx.fillRect(filterX, filterY, 150, 28)
    ctx.strokeStyle = this.showOnlyCraftable ? '#4ecdc4' : '#444'
    ctx.lineWidth = 1
    ctx.strokeRect(filterX, filterY, 150, 28)
    ctx.fillStyle = this.showOnlyCraftable ? '#4ecdc4' : '#aaa'
    ctx.font = '13px "Microsoft JhengHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(this.showOnlyCraftable ? '✓ 只顯示可製作 (F)' : '☐ 只顯示可製作 (F)', filterX + 75, filterY + 19)

    // 體力顯示 (右上角)
    const player = this.game['playerSystem'].player
    ctx.fillStyle = '#ffe66d'
    ctx.font = 'bold 14px "Microsoft JhengHei", sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`💪 體力: ${Math.floor(player.stamina)}/${player.maxStamina}`, panelX + panelW - 20, panelY + 34)

    // 分類標籤 (獨立一整列，不再與過濾按鈕重疊)
    this.renderCategoryTabs(ctx, panelX, panelY + 54, panelW)

    // 左右雙欄配置：左側配方列表 (55%)、右側配方詳情 (45%)
    const contentY = panelY + 96
    const contentH = panelH - 130
    const listW = Math.floor((panelW - 36) * 0.54)
    const detailW = (panelW - 36) - listW - 12

    this.renderRecipeList(ctx, panelX + 18, contentY, listW, contentH)
    this.renderRecipeDetail(ctx, panelX + 18 + listW + 12, contentY, detailW, contentH)

    // 底部操作提示
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#888'
    ctx.font = '12px "Microsoft JhengHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('↑↓/WS 選擇配方  |  Enter/Space 製作  |  Tab 切換分類  |  F 切換可製作過濾  |  C/ESC 關閉', w / 2, panelY + panelH - 12)

    ctx.restore()
  }

  /** 渲染分類標籤 */
  private renderCategoryTabs(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
    const categories: { type: ItemType | 'ALL'; label: string; icon: string }[] = [
      { type: 'ALL', label: '全部', icon: '📦' },
      { type: ItemType.TOOL, label: '工具', icon: '🔧' },
      { type: ItemType.WEAPON, label: '武器', icon: '⚔' },
      { type: ItemType.ARMOR, label: '防具', icon: '🛡' },
      { type: ItemType.MEDICINE, label: '藥物', icon: '💊' },
      { type: ItemType.FOOD, label: '食物', icon: '🍖' },
      { type: ItemType.WATER, label: '水源', icon: '💧' },
      { type: ItemType.SPECIAL, label: '特殊', icon: '✨' }
    ]

    const tabW = (w - 36) / categories.length
    ctx.textBaseline = 'alphabetic'
    categories.forEach((cat, i) => {
      const tabX = x + 18 + i * tabW
      const isActive = this.categoryFilter === cat.type

      ctx.fillStyle = isActive ? 'rgba(78, 205, 196, 0.22)' : 'rgba(255, 255, 255, 0.03)'
      ctx.fillRect(tabX, y, tabW - 4, 30)
      ctx.strokeStyle = isActive ? '#4ecdc4' : 'rgba(255, 255, 255, 0.08)'
      ctx.lineWidth = 1
      ctx.strokeRect(tabX, y, tabW - 4, 30)

      ctx.fillStyle = isActive ? '#4ecdc4' : '#aaa'
      ctx.font = isActive ? 'bold 13px "Microsoft JhengHei", sans-serif' : '13px "Microsoft JhengHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${cat.icon} ${cat.label}`, tabX + (tabW - 4) / 2, y + 20)
    })
  }

  /** 渲染配方列表 (左欄) */
  private renderRecipeList(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    const recipes = this.getVisibleRecipes()
    const itemH = 50
    const maxVisible = Math.max(1, Math.floor((h - 10) / itemH))
    const visibleCount = Math.min(maxVisible, Math.max(0, recipes.length - this.scrollOffset))

    // 列表背景框
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, w, h)

    if (recipes.length === 0) {
      ctx.fillStyle = '#666'
      ctx.font = '15px "Microsoft JhengHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('無符合條件的配方', x + w / 2, y + h / 2)
      ctx.textBaseline = 'alphabetic'
      return
    }

    for (let i = 0; i < visibleCount; i++) {
      const recipe = recipes[this.scrollOffset + i]
      const itemY = y + 6 + i * itemH
      const isSelected = this.selectedRecipeId === recipe.id
      const canCraft = this.canCraft(recipe)

      // 選中/可製作高亮
      if (isSelected) {
        ctx.fillStyle = 'rgba(78, 205, 196, 0.25)'
        ctx.fillRect(x + 6, itemY, w - 18, itemH - 4)
        ctx.strokeStyle = '#4ecdc4'
        ctx.lineWidth = 1.5
        ctx.strokeRect(x + 6, itemY, w - 18, itemH - 4)
      } else if (canCraft) {
        ctx.fillStyle = 'rgba(107, 203, 119, 0.08)'
        ctx.fillRect(x + 6, itemY, w - 18, itemH - 4)
      }

      const resultItem = ITEM_DEFS[recipe.resultItemId]
      if (!resultItem) continue

      // 圖示區域 (內部會 save/restore 畫布狀態，避免汙染 textAlign / textBaseline)
      this.drawItemIcon(ctx, resultItem.id, x + 12, itemY + 8, 34)

      // 名稱
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = canCraft ? '#fff' : '#888'
      ctx.font = 'bold 15px "Microsoft JhengHei", sans-serif'
      ctx.fillText(resultItem.name, x + 54, itemY + 20)

      // 材料預覽
      ctx.font = '12px "Microsoft JhengHei", sans-serif'
      let matX = x + 48
      const maxMats = 3
      recipe.ingredients.slice(0, maxMats).forEach((ing) => {
        const ingDef = ITEM_DEFS[ing.itemId]
        const hasEnough = this.game['playerSystem'].hasItem(ing.itemId, ing.quantity)
        ctx.fillStyle = hasEnough ? '#aaa' : '#ff6b6b'
        const text = `${ingDef?.name || ing.itemId}x${ing.quantity}`
        ctx.fillText(text, matX, itemY + 39)
        matX += ctx.measureText(text).width + 10
      })

      if (recipe.ingredients.length > maxMats) {
        ctx.fillStyle = '#888'
        ctx.fillText(`+${recipe.ingredients.length - maxMats}...`, matX, itemY + 39)
      }

      // 體力消耗
      ctx.fillStyle = canCraft ? '#ffe66d' : '#ff6b6b'
      ctx.font = '12px "Microsoft JhengHei", sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(`💪${recipe.staminaCost}`, x + w - 18, itemY + 20)
    }

    // 捲動指示器
    if (recipes.length > visibleCount) {
      const trackH = h - 12
      ctx.fillStyle = '#222'
      ctx.fillRect(x + w - 8, y + 6, 5, trackH)
      const thumbH = Math.max(24, (visibleCount / recipes.length) * trackH)
      const thumbY = y + 6 + (this.scrollOffset / recipes.length) * trackH
      ctx.fillStyle = '#4ecdc4'
      ctx.fillRect(x + w - 8, thumbY, 5, thumbH)
    }
  }

  /** 渲染配方詳細資訊 (右欄) */
  private renderRecipeDetail(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    // 詳情背景框
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, w, h)

    const recipe = this.getSelectedRecipe()
    if (!recipe) {
      ctx.fillStyle = '#666'
      ctx.font = '14px "Microsoft JhengHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('請從左側選擇一項配方', x + w / 2, y + h / 2)
      ctx.textBaseline = 'alphabetic'
      return
    }

    const resultItem = ITEM_DEFS[recipe.resultItemId]
    if (!resultItem) return

    // 物品圖示與名稱
    this.drawItemIcon(ctx, resultItem.id, x + 16, y + 16, 48)

    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 19px "Microsoft JhengHei", sans-serif'
    ctx.fillText(`${resultItem.name} x${recipe.resultQuantity}`, x + 72, y + 44)

    // 說明
    ctx.fillStyle = '#ccc'
    ctx.font = '13px "Microsoft JhengHei", sans-serif'
    this.wrapText(ctx, resultItem.description, x + 16, y + 68, w - 32, 20)

    // 分隔線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.beginPath()
    ctx.moveTo(x + 16, y + 106)
    ctx.lineTo(x + w - 16, y + 106)
    ctx.stroke()

    // 所需材料
    let matY = y + 130
    ctx.fillStyle = '#4ecdc4'
    ctx.font = 'bold 14px "Microsoft JhengHei", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('所需材料:', x + 16, matY)

    recipe.ingredients.forEach((ing) => {
      matY += 26
      const ingDef = ITEM_DEFS[ing.itemId]
      const have = this.game['playerSystem'].getItemCount(ing.itemId)
      const hasEnough = have >= ing.quantity

      this.drawItemIcon(ctx, ing.itemId, x + 20, matY - 18, 26)

      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = '#eee'
      ctx.font = '14px "Microsoft JhengHei", sans-serif'
      ctx.fillText(`${ingDef?.name || ing.itemId}`, x + 46, matY)

      ctx.textAlign = 'right'
      ctx.fillStyle = hasEnough ? '#6bcb77' : '#ff6b6b'
      ctx.fillText(`${have} / ${ing.quantity}`, x + w - 20, matY)
    })

    // 所需工具
    if (recipe.requiredTools && recipe.requiredTools.length > 0) {
      matY += 30
      ctx.textAlign = 'left'
      ctx.fillStyle = '#4ecdc4'
      ctx.font = 'bold 14px "Microsoft JhengHei", sans-serif'
      ctx.fillText('所需工具:', x + 16, matY)

      recipe.requiredTools.forEach(toolId => {
        matY += 26
        const toolDef = ITEM_DEFS[toolId]
        const hasTool = this.game['playerSystem'].hasItem(toolId)

        this.drawItemIcon(ctx, toolId, x + 20, matY - 18, 26)

        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
        ctx.fillStyle = '#eee'
        ctx.font = '14px "Microsoft JhengHei", sans-serif'
        ctx.fillText(`${toolDef?.name || toolId}`, x + 46, matY)

        ctx.textAlign = 'right'
        ctx.fillStyle = hasTool ? '#6bcb77' : '#ff6b6b'
        ctx.fillText(hasTool ? '已持有 ✓' : '缺少 ✗', x + w - 20, matY)
      })
    }

    // 體力消耗
    matY += 32
    const player = this.game['playerSystem'].player
    const hasStamina = player.stamina >= recipe.staminaCost
    ctx.textAlign = 'left'
    ctx.fillStyle = hasStamina ? '#ffe66d' : '#ff6b6b'
    ctx.font = 'bold 14px "Microsoft JhengHei", sans-serif'
    ctx.fillText(`體力消耗: ${recipe.staminaCost} (目前: ${Math.floor(player.stamina)})`, x + 16, matY)

    // 底部製作按鈕提示
    const canCraft = this.canCraft(recipe)
    const btnY = y + h - 50
    ctx.fillStyle = canCraft ? 'rgba(78, 205, 196, 0.22)' : 'rgba(255, 107, 107, 0.12)'
    ctx.fillRect(x + 16, btnY, w - 32, 36)
    ctx.strokeStyle = canCraft ? '#4ecdc4' : '#ff6b6b'
    ctx.lineWidth = 1.5
    ctx.strokeRect(x + 16, btnY, w - 32, 36)

    ctx.fillStyle = canCraft ? '#4ecdc4' : '#ff6b6b'
    ctx.font = 'bold 15px "Microsoft JhengHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(canCraft ? '🔨 按 Enter 開始製作' : '材料、工具或體力不足', x + w / 2, btnY + 18)
    ctx.textBaseline = 'alphabetic'
  }

  /** 物品圖示對照表 */
  private itemIconsMap: any = null

  /** 初始化 - 載入圖示對照表 */
  async init(): Promise<void> {
    try {
      this.itemIconsMap = await assetManager.loadJSON('item_icons_map', 'data/item_icons_map.json')
    } catch (e) {
      console.warn('無法載入物品圖示對照表')
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

    // 回退：使用 emoji (獨立 save/restore 避免改變外部 textBaseline / textAlign)
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

  /** 重置 */
  reset(): void {
    this.selectedRecipeId = null
    this.categoryFilter = 'ALL'
    this.showOnlyCraftable = false
    this.scrollOffset = 0
  }

  /** 處理鍵盤輸入 */
  handleKeyInput(key: string): boolean {
    if (key === 'Escape' || key === 'KeyC') {
      this.game.closeCrafting()
      return true
    }

    if (key === 'Tab') {
      const categories = ['ALL', ItemType.TOOL, ItemType.WEAPON, ItemType.ARMOR, ItemType.MEDICINE, ItemType.FOOD, ItemType.WATER, ItemType.SPECIAL] as (ItemType | 'ALL')[]
      const currentIdx = categories.indexOf(this.categoryFilter)
      this.setCategoryFilter(categories[(currentIdx + 1) % categories.length])
      this.game['audioSystem'].playSFX('menu_select')
      return true
    }

    if (key === 'KeyF') {
      this.toggleShowOnlyCraftable()
      this.game['audioSystem'].playSFX('menu_select')
      return true
    }

    const recipes = this.getVisibleRecipes()
    if (recipes.length === 0) return false

    switch (key) {
      case 'ArrowUp':
      case 'KeyW':
        if (this.selectedRecipeId) {
          const idx = recipes.findIndex(r => r.id === this.selectedRecipeId)
          if (idx > 0) {
            this.selectRecipe(recipes[idx - 1].id)
            if (idx - 1 < this.scrollOffset) this.scrollOffset = idx - 1
          }
        } else {
          this.selectRecipe(recipes[0].id)
        }
        this.game['audioSystem'].playSFX('menu_select')
        return true

      case 'ArrowDown':
      case 'KeyS':
        if (this.selectedRecipeId) {
          const idx = recipes.findIndex(r => r.id === this.selectedRecipeId)
          if (idx < recipes.length - 1) {
            this.selectRecipe(recipes[idx + 1].id)
            if (idx + 1 >= this.scrollOffset + 8) this.scrollOffset = idx - 7
          }
        } else {
          this.selectRecipe(recipes[0].id)
        }
        this.game['audioSystem'].playSFX('menu_select')
        return true

      case 'Enter':
      case 'Space':
        if (this.selectedRecipeId) {
          this.craft(this.selectedRecipeId)
        } else if (recipes.length > 0) {
          this.selectRecipe(recipes[0].id)
        }
        return true

      case 'PageUp':
        this.scroll(-8)
        return true

      case 'PageDown':
        this.scroll(8)
        return true
    }

    return false
  }
}