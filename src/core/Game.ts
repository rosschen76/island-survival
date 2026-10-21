// 遊戲主類別
import { GameState, GameConfig, SaveData } from './Types.js'
import { EventSystem } from '../systems/EventSystem.js'
import { MapSystem } from '../systems/MapSystem.js'
import { PlayerSystem } from '../systems/PlayerSystem.js'
import { CombatSystem } from '../systems/CombatSystem.js'
import { CraftSystem } from '../systems/CraftSystem.js'
import { UISystem } from '../ui/UISystem.js'
import { SaveSystem } from '../systems/SaveSystem.js'
import { AudioSystem } from '../systems/AudioSystem.js'
import { InputManager } from './InputManager.js'
import { Renderer } from './Renderer.js'
import { AssetManager, assetManager } from './AssetManager.js'
import { DEFAULT_CONFIG, GAME_VERSION } from '../data/Constants.js'
import { AchievementSystem } from '../systems/AchievementSystem.js'
import { TargetSystem } from '../systems/TargetSystem.js'

export class Game {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private state: GameState = GameState.MAIN_MENU
  private previousState: GameState = GameState.MAIN_MENU
  private running: boolean = false
  private lastTime: number = 0
  private accumulator: number = 0
  private readonly fixedTimestep: number = 1000 / 60 // 60 FPS 固定時間步長

  // 核心系統
  public readonly config: GameConfig
  public readonly eventSystem: EventSystem
  public readonly mapSystem: MapSystem
  public readonly playerSystem: PlayerSystem
  public readonly combatSystem: CombatSystem
  public readonly craftSystem: CraftSystem
  public readonly uiSystem: UISystem
  public readonly saveSystem: SaveSystem
  public readonly audioSystem: AudioSystem
  public readonly input: InputManager
  public readonly renderer: Renderer
  public readonly assets: AssetManager = assetManager
  public readonly achievementSystem: AchievementSystem
  public readonly targetSystem: TargetSystem

  // 遊戲資料
  private seed: string = ''
  private currentEventId: string | undefined = undefined

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('無法取得 Canvas 2D Context')
    this.ctx = ctx

    // 初始化設定
    this.config = { ...DEFAULT_CONFIG }

    // 初始化系統
    this.eventSystem = new EventSystem(this)
    this.mapSystem = new MapSystem(this)
    this.playerSystem = new PlayerSystem(this)
    this.combatSystem = new CombatSystem(this)
    this.craftSystem = new CraftSystem(this)
    this.uiSystem = new UISystem(this)
    this.saveSystem = new SaveSystem(this)
    this.audioSystem = new AudioSystem(this)
    this.input = new InputManager(this)
    this.renderer = new Renderer(this)
    this.achievementSystem = new AchievementSystem(this)
    this.targetSystem = new TargetSystem(this)

    // 綁定視窗調整
    window.addEventListener('resize', () => this.resize())
    this.resize()
  }

  /** 初始化遊戲 */
  async init(): Promise<void> {
    // 載入資產清單
    await this.loadAssets()

    // 初始化音效
    await this.audioSystem.init()

    // 初始化 UI 系統 (現在是 async，載入圖示對照表)
    await this.uiSystem.init()

    // 初始化製作系統 (載入圖示對照表)
    await this.craftSystem.init()

    // 初始化輸入
    this.input.init()

    // 載入資料
    await this.loadGameData()

    console.log('遊戲初始化完成')
  }

  /** 載入遊戲資產 */
  private async loadAssets(): Promise<void> {
    try {
      // 載入資產清單
      const manifestResponse = await fetch('assets/manifest.json')
      if (!manifestResponse.ok) {
        console.warn('無法載入資產清單，使用程式化繪製')
        return
      }
      const manifest = await manifestResponse.json()

      // 載入圖片資產
      if (manifest.images) {
        for (const img of manifest.images) {
          if (img.type === 'spritesheet') {
            await this.assets.loadSpriteSheet(img.id, img.src, img.frameWidth, img.frameHeight)
          } else {
            await this.assets.loadImage(img.id, img.src)
          }
        }
      }

      // 載入音效資產
      if (manifest.audio) {
        for (const audio of manifest.audio) {
          await this.assets.loadAudio(audio.id, audio.src)
        }
      }

      // 載入資料檔
      if (manifest.data) {
        for (const data of manifest.data) {
          await this.assets.loadJSON(data.id, data.src)
        }
      }

      // 載入動畫定義
      const animData = this.assets.getJSON('animation_defs')
      if (animData) {
        this.loadAnimationDefinitions(animData)
      }

      console.log('資產載入完成')
    } catch (error) {
      console.warn('資產載入失敗，使用程式化繪製:', error)
    }
  }

  /** 載入動畫定義 */
  private loadAnimationDefinitions(data: any): void {
    // 角色動畫
    if (data.character) {
      for (const [charName, charData] of Object.entries(data.character)) {
        const char = charData as any
        if (char.animations) {
          for (const [animName, animData] of Object.entries(char.animations)) {
            const anim = animData as any
            this.assets.defineAnimation(`${charName}_${animName}`, anim.frames, anim.duration, anim.loop)
          }
        }
      }
    }

    // 地塊動畫
    if (data.tiles) {
      for (const [tileName, animData] of Object.entries(data.tiles)) {
        const anim = animData as any
        this.assets.defineAnimation(`tile_${tileName}`, anim.frames, anim.duration, anim.loop)
      }
    }

    // 粒子動畫
    if (data.particles) {
      for (const [particleName, animData] of Object.entries(data.particles)) {
        const anim = animData as any
        this.assets.defineAnimation(`particle_${particleName}`, anim.frames, anim.duration, anim.loop)
      }
    }

    // UI 動畫
    if (data.ui) {
      for (const [uiName, animData] of Object.entries(data.ui)) {
        const anim = animData as any
        this.assets.defineAnimation(`ui_${uiName}`, anim.frames, anim.duration, anim.loop)
      }
    }

    // 戰鬥動畫
    if (data.combat) {
      for (const [combatName, animData] of Object.entries(data.combat)) {
        const anim = animData as any
        this.assets.defineAnimation(`combat_${combatName}`, anim.frames, anim.duration, anim.loop)
      }
    }
  }

  /** 載入遊戲資料 */
  private async loadGameData(): Promise<void> {
    // 這裡會載入事件、物品、配方等資料
    await this.eventSystem.loadEvents()
    await this.craftSystem.loadRecipes()
  }

  /** 開始遊戲循環 */
  start(): void {
    this.running = true
    this.lastTime = performance.now()
    this.gameLoop(this.lastTime)
  }

  /** 停止遊戲循環 */
  stop(): void {
    this.running = false
  }

  /** 主遊戲循環 */
  private gameLoop = (currentTime: number): void => {
    if (!this.running) return

    const deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime

    // 累積時間
    this.accumulator += deltaTime

    // 固定時間步長更新
    while (this.accumulator >= this.fixedTimestep) {
      this.update(this.fixedTimestep)
      this.accumulator -= this.fixedTimestep
    }

    // 插值渲染
    const alpha = this.accumulator / this.fixedTimestep
    this.render(alpha)

    requestAnimationFrame(this.gameLoop)
  }

  /** 更新遊戲邏輯 */
  private update(dt: number): void {
    const pressedKeys = this.input.getNewlyPressedKeys()
    this.achievementSystem.update(dt)
    this.targetSystem.update(dt)

    // 根據狀態更新
    switch (this.state) {
      case GameState.PLAYING:
        this.handlePlayingInput(pressedKeys)
        this.playerSystem.update(dt)
        this.mapSystem.update(dt)
        break
      case GameState.ACHIEVEMENTS:
        for (const key of pressedKeys) {
          this.uiSystem.handleAchievementsInput(key)
        }
        break
      case GameState.TARGET_SELECT:
        for (const key of pressedKeys) {
          this.uiSystem.handleTargetSelectInput(key)
        }
        break
      case GameState.PAUSED:
        for (const key of pressedKeys) {
          if (key === 'Escape' || key === 'KeyP') {
            this.setState(GameState.PLAYING)
          } else if (key === 'KeyQ') {
            this.returnToMainMenu()
          }
        }
        break
      case GameState.EVENT:
        for (const key of pressedKeys) {
          this.eventSystem.handleKeyInput(key)
        }
        this.eventSystem.update(dt)
        break
      case GameState.COMBAT:
        for (const key of pressedKeys) {
          this.combatSystem.handleKeyInput(key)
        }
        this.combatSystem.update(dt)
        break
      case GameState.CRAFTING:
        for (const key of pressedKeys) {
          this.craftSystem.handleKeyInput(key)
        }
        this.craftSystem.update(dt)
        break
      case GameState.INVENTORY:
        for (const key of pressedKeys) {
          this.uiSystem.handleInventoryInput(key)
        }
        break
      case GameState.SAVE_LOAD:
        for (const key of pressedKeys) {
          this.uiSystem.handleSaveLoadInput(key)
        }
        break
      case GameState.GAME_OVER:
      case GameState.VICTORY:
        for (const key of pressedKeys) {
          if (key === 'KeyR') {
            this.newGame()
          } else if (key === 'Escape') {
            this.returnToMainMenu()
          }
        }
        break
      case GameState.MAIN_MENU:
        for (const key of pressedKeys) {
          this.uiSystem.handleMainMenuInput(key)
        }
        break
    }

    // UI 永遠更新
    this.uiSystem.update(dt)

    // 清除本幀按鍵觸發狀態 (必須在讀取完輸入後呼叫)
    this.input.update()
  }

  /** 處理遊玩狀態下的鍵盤操作 */
  private handlePlayingInput(pressedKeys: string[]): void {
    for (const key of pressedKeys) {
      if (this.targetSystem.isActive() && ['ArrowUp', 'KeyW', 'ArrowDown', 'KeyS', 'ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD', 'KeyE', 'Space', 'Enter'].includes(key)) {
        this.targetSystem.stopGoal('手動控制已接管，中斷目標模式。')
      }
      switch (key) {
        case 'ArrowUp':
        case 'KeyW':
          this.mapSystem.tryMovePlayer(0, -1)
          return
        case 'ArrowDown':
        case 'KeyS':
          this.mapSystem.tryMovePlayer(0, 1)
          return
        case 'ArrowLeft':
        case 'KeyA':
          this.mapSystem.tryMovePlayer(-1, 0)
          return
        case 'ArrowRight':
        case 'KeyD':
          this.mapSystem.tryMovePlayer(1, 0)
          return
        case 'KeyE':
        case 'Space':
        case 'Enter':
          this.mapSystem.exploreCurrentTile()
          return
        case 'KeyR':
          this.mapSystem.restAtBase()
          return
        case 'KeyB':
          this.mapSystem.buildCamp()
          return
        case 'KeyI':
          this.openInventory()
          return
        case 'KeyC':
          this.openCrafting()
          return
        case 'KeyT':
          this.openTargetSelect()
          return
        case 'KeyJ':
        case 'Tab':
          this.openAchievements()
          return
        case 'KeyM':
          this.openSaveLoad()
          return
        case 'Escape':
        case 'KeyP':
          this.setState(GameState.PAUSED)
          return
      }
    }
  }

  /** 渲染遊戲畫面 */
  private render(alpha: number): void {
    // 清除畫布
    this.ctx.fillStyle = '#0f0f1a'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // 根據狀態渲染
    switch (this.state) {
      case GameState.MAIN_MENU:
        this.renderer.renderMainMenu()
        this.uiSystem.renderMessagesOnly(this.ctx)
        break
      case GameState.PLAYING:
      case GameState.PAUSED:
        this.renderer.renderGame(alpha)
        this.uiSystem.render(this.ctx)
        if (this.state === GameState.PAUSED) {
          this.renderer.renderPauseOverlay()
        } else if (this.targetSystem.isActive()) {
          this.uiSystem.renderTargetHud(this.ctx)
        }
        break
      case GameState.ACHIEVEMENTS:
        this.renderer.renderGame(alpha)
        this.uiSystem.render(this.ctx)
        this.uiSystem.renderAchievements(this.ctx)
        break
      case GameState.TARGET_SELECT:
        this.renderer.renderGame(alpha)
        this.uiSystem.render(this.ctx)
        this.uiSystem.renderTargetSelect(this.ctx)
        break
      case GameState.EVENT:
        this.renderer.renderGame(alpha)
        this.uiSystem.render(this.ctx)
        this.eventSystem.render(this.ctx)
        break
      case GameState.COMBAT:
        this.renderer.renderGame(alpha)
        this.uiSystem.render(this.ctx)
        this.combatSystem.render(this.ctx)
        break
      case GameState.CRAFTING:
        this.renderer.renderGame(alpha)
        this.uiSystem.render(this.ctx)
        this.craftSystem.render(this.ctx)
        break
      case GameState.INVENTORY:
        this.renderer.renderGame(alpha)
        this.uiSystem.render(this.ctx)
        this.uiSystem.renderInventory(this.ctx)
        break
      case GameState.SAVE_LOAD:
        this.renderer.renderGame(alpha)
        this.uiSystem.render(this.ctx)
        this.uiSystem.renderSaveLoad(this.ctx)
        this.uiSystem.renderMessagesOnly(this.ctx)
        break
      case GameState.GAME_OVER:
        this.renderer.renderGame(alpha)
        this.uiSystem.renderGameOver(this.ctx)
        break
      case GameState.VICTORY:
        this.renderer.renderGame(alpha)
        this.uiSystem.renderVictory(this.ctx)
        break
    }

    // 成就解鎖橫幅 (置頂繪製)
    this.uiSystem.renderAchievementToast(this.ctx)

    // 偵錯資訊
    if (this.input.isDebugMode()) {
      this.renderDebugInfo()
    }
  }

  /** 渲染偵錯資訊 */
  private renderDebugInfo(): void {
    this.ctx.save()
    this.ctx.font = '12px monospace'
    this.ctx.fillStyle = '#4ecdc4'
    this.ctx.fillText(`FPS: ${Math.round(1000 / this.fixedTimestep)}`, 10, 20)
    this.ctx.fillText(`State: ${this.state}`, 10, 35)
    this.ctx.fillText(`Pos: (${this.playerSystem.player.position.x}, ${this.playerSystem.player.position.y})`, 10, 50)
    this.ctx.fillText(`Stamina: ${this.playerSystem.player.stamina}/${this.playerSystem.player.maxStamina}`, 10, 65)
    this.ctx.fillText(`Health: ${this.playerSystem.player.health}/${this.playerSystem.player.maxHealth}`, 10, 80)
    this.ctx.fillText(`Seed: ${this.seed}`, 10, 95)
    this.ctx.restore()
  }

  /** 視窗大小調整 */
  resize(): void {
    const dpr = window.devicePixelRatio || 1
    const rect = this.canvas.parentElement?.getBoundingClientRect() || { width: window.innerWidth, height: window.innerHeight }

    this.canvas.width = Math.floor(rect.width * dpr)
    this.canvas.height = Math.floor(rect.height * dpr)
    this.canvas.style.width = `${rect.width}px`
    this.canvas.style.height = `${rect.height}px`

    this.ctx.scale(dpr, dpr)
    this.renderer.onResize(rect.width, rect.height)
    this.uiSystem.onResize(rect.width, rect.height)
  }

  /** 設定遊戲狀態 */
  setState(newState: GameState): void {
    this.previousState = this.state
    this.state = newState
    console.log(`狀態變更: ${this.previousState} -> ${this.state}`)
  }

  /** 取得前一個狀態 */
  getPreviousState(): GameState {
    return this.previousState
  }

  /** 取得當前狀態 */
  getState(): GameState {
    return this.state
  }

  /** 開始新遊戲 */
  async newGame(): Promise<void> {
    // 產生隨機種子
    this.seed = this.generateSeed()

    // 重置所有系統
    this.playerSystem.reset()
    this.mapSystem.generateMap(this.seed)
    this.eventSystem.reset()
    this.combatSystem.reset()
    this.craftSystem.reset()
    this.uiSystem.reset()
    this.targetSystem.stopGoal()

    // 設定初始狀態並觸發開場事件
    this.setState(GameState.PLAYING)
    this.currentEventId = undefined
    this.triggerEvent('intro_wakeup')

    // 播放開始音效
    this.audioSystem.playSFX('game_start')
  }

  /** 產生隨機種子 */
  private generateSeed(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let seed = ''
    for (let i = 0; i < 8; i++) {
      seed += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return seed
  }

  /** 存檔 */
  async saveGame(slot: number): Promise<boolean> {
    // 確保還沒開始新遊戲時不會存出空地圖
    const mapData = this.mapSystem.serialize()
    if (!mapData || mapData.length === 0) {
      return false
    }

    // 存檔時若處於選單狀態 (SAVE_LOAD / PAUSED / INVENTORY / CRAFTING)，紀錄為 PLAYING 以便讀檔後直接回到遊戲
    const activeState = [GameState.SAVE_LOAD, GameState.PAUSED, GameState.INVENTORY, GameState.CRAFTING].includes(this.state)
      ? GameState.PLAYING
      : this.state

    const saveData: SaveData = {
      version: GAME_VERSION,
      timestamp: Date.now(),
      player: this.playerSystem.getState(),
      map: mapData,
      currentEventId: this.currentEventId,
      gameState: activeState,
      config: this.config,
      seed: this.seed
    }
    return this.saveSystem.save(slot, saveData)
  }

  /** 讀檔 */
  async loadGame(slot: number): Promise<boolean> {
    const saveData = await this.saveSystem.load(slot)
    if (!saveData || !saveData.map || saveData.map.length === 0) return false

    // 檢查版本相容性
    if (saveData.version !== GAME_VERSION) {
      console.warn(`存檔版本不符: ${saveData.version} != ${GAME_VERSION}`)
    }

    // 還原遊戲資料
    this.seed = saveData.seed
    this.currentEventId = saveData.currentEventId
    this.config.maxStamina = saveData.config.maxStamina
    this.config.maxHealth = saveData.config.maxHealth

    this.mapSystem.deserialize(saveData.map)
    this.playerSystem.setState(saveData.player)
    this.eventSystem.setCurrentEvent(saveData.currentEventId)

    // 若舊存檔意外存為 SAVE_LOAD 或 MAIN_MENU，強制恢復為 PLAYING
    const targetState = (saveData.gameState === GameState.SAVE_LOAD || saveData.gameState === GameState.MAIN_MENU)
      ? (saveData.currentEventId ? GameState.EVENT : GameState.PLAYING)
      : saveData.gameState
    this.setState(targetState)
    return true
  }

  /** 觸發事件 */
  triggerEvent(eventId: string): void {
    this.currentEventId = eventId
    this.setState(GameState.EVENT)
    this.eventSystem.startEvent(eventId)
  }

  /** 結束事件 */
  endEvent(): void {
    this.currentEventId = undefined
    this.setState(GameState.PLAYING)
  }

  /** 開始戰鬥 */
  startCombat(enemyId: string): void {
    this.combatSystem.startCombat(enemyId)
    this.setState(GameState.COMBAT)
  }

  /** 結束戰鬥 */
  endCombat(victory: boolean): void {
    this.combatSystem.endCombat(victory)
    this.advanceTime(30)
    this.setState(GameState.PLAYING)
  }

  /** 推進時間 (分鐘) */
  advanceTime(minutes: number): void {
    const player = this.playerSystem.player
    if (player.stats.currentHour === undefined) player.stats.currentHour = 8
    if (player.stats.currentMinute === undefined) player.stats.currentMinute = 0
    if (!player.stats.daysSurvived) player.stats.daysSurvived = 1

    const oldHour = player.stats.currentHour
    const totalMinutes = player.stats.currentMinute + minutes
    const hoursToAdd = Math.floor(totalMinutes / 60)
    player.stats.currentMinute = totalMinutes % 60

    if (hoursToAdd > 0) {
      const newHourRaw = player.stats.currentHour + hoursToAdd
      player.stats.currentHour = newHourRaw % 24
      const daysToAdd = Math.floor(newHourRaw / 24)
      if (daysToAdd > 0) {
        player.stats.daysSurvived += daysToAdd
        this.uiSystem.addMessage(`🌅 新的一天開始了 (第 ${player.stats.daysSurvived} 天)！`, 'info')
      }
    }

    this.achievementSystem?.checkAchievements()
    const newHour = player.stats.currentHour
    // 06:00 日出廣播
    if ((oldHour < 6 || oldHour >= 18) && (newHour >= 6 && newHour < 18)) {
      this.uiSystem.addMessage('🌅 06:00 日出：晨曦破曉，日照海島，野獸退回了巢穴。', 'info')
      this.audioSystem.playSFX('explore')
    }
    // 18:00 日落廣播
    if ((oldHour >= 6 && oldHour < 18) && (newHour >= 18 || newHour < 6)) {
      this.uiSystem.addMessage('🌙 18:00 日落：夜幕低垂，夜間猛獸變得格外兇猛危險！', 'warning')
      this.audioSystem.playSFX('hurt')
    }
  }

  /** 是否為夜間 (18:00 ~ 06:00) */
  isNight(): boolean {
    const hour = this.playerSystem?.player?.stats?.currentHour ?? 8
    return hour >= 18 || hour < 6
  }

  /** 開啟成就圖鑑 */
  openAchievements(): void {
    this.setState(GameState.ACHIEVEMENTS)
  }

  /** 關閉成就圖鑑 */
  closeAchievements(): void {
    const target = this.previousState === GameState.ACHIEVEMENTS ? GameState.PLAYING : this.previousState
    this.setState(target)
  }

  /** 開啟目標模式選單 */
  openTargetSelect(): void {
    this.setState(GameState.TARGET_SELECT)
  }

  /** 關閉目標模式選單 */
  closeTargetSelect(): void {
    this.setState(GameState.PLAYING)
  }

  /** 開啟製作介面 */
  openCrafting(): void {
    this.setState(GameState.CRAFTING)
  }

  /** 關閉製作介面 */
  closeCrafting(): void {
    this.setState(GameState.PLAYING)
  }

  /** 開啟背包 */
  openInventory(): void {
    this.setState(GameState.INVENTORY)
  }

  /** 關閉背包 */
  closeInventory(): void {
    this.setState(this.previousState === GameState.INVENTORY ? GameState.PLAYING : this.previousState)
  }

  /** 開啟存檔/讀檔選單 */
  openSaveLoad(mode?: 'save' | 'load'): void {
    // 預設：若在遊戲中開啟則預設為存檔，若從主選單開啟則預設為讀檔
    const defaultMode = mode || (this.state === GameState.MAIN_MENU ? 'load' : 'save')
    this.uiSystem.setSaveLoadMode(defaultMode)
    this.setState(GameState.SAVE_LOAD)
  }

  /** 關閉存檔/讀檔選單 */
  closeSaveLoad(): void {
    const target = this.previousState === GameState.SAVE_LOAD ? GameState.MAIN_MENU : this.previousState
    this.setState(target)
  }

  /** 遊戲結束 */
  gameOver(): void {
    this.setState(GameState.GAME_OVER)
    this.audioSystem.playSFX('game_over')
  }

  /** 勝利 */
  victory(endingType: string): void {
    this.setState(GameState.VICTORY)
    this.playerSystem.unlockEnding(endingType)
    this.audioSystem.playSFX('victory')
  }

  /** 返回主選單 */
  returnToMainMenu(): void {
    this.setState(GameState.MAIN_MENU)
    this.uiSystem.showMainMenu()
  }

  /** 取得種子 */
  getSeed(): string {
    return this.seed
  }

  /** 取得當前事件 ID */
  getCurrentEventId(): string | undefined {
    return this.currentEventId
  }

  /** 設定當前事件 ID */
  setCurrentEventId(id: string | undefined): void {
    this.currentEventId = id
  }

  /** 取得 Canvas */
  getCanvas(): HTMLCanvasElement {
    return this.canvas
  }

  /** 取得 Context */
  getContext(): CanvasRenderingContext2D {
    return this.ctx
  }

  /** 取得畫布寬度 (CSS 像素) */
  getWidth(): number {
    return this.canvas.clientWidth
  }

  /** 取得畫布高度 (CSS 像素) */
  getHeight(): number {
    return this.canvas.clientHeight
  }
}