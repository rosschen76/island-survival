// 輸入管理器
import { Game } from './Game.js'
import { Direction } from './Types.js'

export class InputManager {
  private game: Game
  private keys: Set<string> = new Set()
  private keysPressed: Set<string> = new Set()
  private keysReleased: Set<string> = new Set()
  private mousePos: { x: number; y: number } = { x: 0, y: 0 }
  private mouseButtons: Set<number> = new Set()
  private debugMode: boolean = false
  private keyRepeatTimers: Map<string, number> = new Map()
  private readonly KEY_REPEAT_DELAY = 300
  private readonly KEY_REPEAT_INTERVAL = 100

  constructor(game: Game) {
    this.game = game
  }

  init(): void {
    window.addEventListener('keydown', this.onKeyDown.bind(this))
    window.addEventListener('keyup', this.onKeyUp.bind(this))
    this.game.getCanvas().addEventListener('mousemove', this.onMouseMove.bind(this))
    this.game.getCanvas().addEventListener('mousedown', this.onMouseDown.bind(this))
    this.game.getCanvas().addEventListener('mouseup', this.onMouseUp.bind(this))
    this.game.getCanvas().addEventListener('wheel', this.onWheel.bind(this), { passive: false })
    this.game.getCanvas().addEventListener('contextmenu', e => e.preventDefault())
  }

  update(): void {
    // 清除單幀按鍵狀態
    this.keysPressed.clear()
    this.keysReleased.clear()
  }

  private onKeyDown(e: KeyboardEvent): void {
    const key = e.code

    // 防止重複觸發 (按住不放)
    if (!this.keys.has(key)) {
      this.keys.add(key)
      this.keysPressed.add(key)
      this.startKeyRepeat(key)
    }

    // 處理特殊按鍵
    this.handleSpecialKeys(key, true)

    // 防止瀏覽器預設行為
    if (this.shouldPreventDefault(key)) {
      e.preventDefault()
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    const key = e.code
    this.keys.delete(key)
    this.keysReleased.add(key)
    this.stopKeyRepeat(key)

    this.handleSpecialKeys(key, false)
  }

  private startKeyRepeat(key: string): void {
    if (this.keyRepeatTimers.has(key)) return

    const timer = window.setTimeout(() => {
      this.keyRepeatTimers.delete(key)
      if (this.keys.has(key)) {
        this.keysPressed.add(key)
        this.keyRepeatTimers.set(key, window.setInterval(() => {
          if (this.keys.has(key)) {
            this.keysPressed.add(key)
          } else {
            this.stopKeyRepeat(key)
          }
        }, this.KEY_REPEAT_INTERVAL))
      }
    }, this.KEY_REPEAT_DELAY)

    this.keyRepeatTimers.set(key, timer)
  }

  private stopKeyRepeat(key: string): void {
    const timer = this.keyRepeatTimers.get(key)
    if (timer) {
      clearTimeout(timer)
      clearInterval(timer)
      this.keyRepeatTimers.delete(key)
    }
  }

  private handleSpecialKeys(key: string, down: boolean): void {
    if (!down) return

    switch (key) {
      case 'F1':
        this.debugMode = !this.debugMode
        break
      case 'F2':
        // 截圖功能
        this.takeScreenshot()
        break
      case 'F5':
        // 快速存檔
        this.game.saveGame(0).then(ok => {
          if (ok) this.game.uiSystem.addMessage('💾 快速存檔成功 (槽位 0)', 'success')
        })
        break
      case 'F9':
        // 快速讀檔
        this.game.loadGame(0).then(ok => {
          this.game.uiSystem.addMessage(ok ? '📂 快速讀檔成功 (槽位 0)' : '槽位 0 尚無快速存檔', ok ? 'success' : 'warning')
        })
        break
    }
  }

  private shouldPreventDefault(key: string): boolean {
    const gameKeys = [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'KeyW', 'KeyA', 'KeyS', 'KeyD',
      'Space', 'Enter', 'Escape', 'Tab',
      'KeyE', 'KeyI', 'KeyC', 'KeyM',
      'KeyT', 'KeyJ'
    ]
    return gameKeys.includes(key)
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.game.getCanvas().getBoundingClientRect()
    this.mousePos.x = e.clientX - rect.left
    this.mousePos.y = e.clientY - rect.top
    this.game.uiSystem.handleMouseMove(this.mousePos.x, this.mousePos.y)
  }

  private onMouseDown(e: MouseEvent): void {
    this.mouseButtons.add(e.button)
    this.game.getCanvas().focus()
    if (e.button === 0) {
      const rect = this.game.getCanvas().getBoundingClientRect()
      this.game.uiSystem.handleMouseClick(e.clientX - rect.left, e.clientY - rect.top)
    }
  }

  private onMouseUp(e: MouseEvent): void {
    this.mouseButtons.delete(e.button)
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault()
    this.game.uiSystem.handleWheel(e.deltaY)
  }

  // === 公開 API ===

  isKeyDown(key: string): boolean {
    return this.keys.has(key)
  }

  isKeyPressed(key: string): boolean {
    return this.keysPressed.has(key)
  }

  isKeyReleased(key: string): boolean {
    return this.keysReleased.has(key)
  }

  /** 取得本幀所有新按下的按鍵代碼 */
  getNewlyPressedKeys(): string[] {
    return Array.from(this.keysPressed)
  }

  /** 取得移動方向 (支援 WASD 和方向鍵) */
  getMovementDirection(): Direction | null {
    const up = this.isKeyPressed('ArrowUp') || this.isKeyPressed('KeyW')
    const down = this.isKeyPressed('ArrowDown') || this.isKeyPressed('KeyS')
    const left = this.isKeyPressed('ArrowLeft') || this.isKeyPressed('KeyA')
    const right = this.isKeyPressed('ArrowRight') || this.isKeyPressed('KeyD')

    if (up && !down && !left && !right) return Direction.UP
    if (down && !up && !left && !right) return Direction.DOWN
    if (left && !right && !up && !down) return Direction.LEFT
    if (right && !left && !up && !down) return Direction.RIGHT

    return null
  }

  /** 取得滑鼠位置 */
  getMousePos(): { x: number; y: number } {
    return { ...this.mousePos }
  }

  /** 滑鼠按鈕是否按下 */
  isMouseDown(button: number = 0): boolean {
    return this.mouseButtons.has(button)
  }

  /** 是否為除錯模式 */
  isDebugMode(): boolean {
    return this.debugMode
  }

  /** 截圖 */
  takeScreenshot(): void {
    const canvas = this.game.getCanvas()
    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `island-survival-${Date.now()}.png`
    link.href = dataUrl
    link.click()
  }

  /** 取得所有按下的按鍵 (偵錯用) */
  getPressedKeys(): string[] {
    return Array.from(this.keys)
  }
}