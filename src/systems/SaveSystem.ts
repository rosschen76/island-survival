// 存檔系統 (純網頁版 localStorage + JSON 匯出入)
import { Game } from '../core/Game.js'
import { SaveData } from '../core/Types.js'
import { GAME_VERSION } from '../data/Constants.js'

const SAVE_SLOTS = 10
const SAVE_PREFIX = 'island_survival_save_'

export class SaveSystem {
  private game: Game

  constructor(game: Game) {
    this.game = game
  }

  /** 儲存遊戲 */
  async save(slot: number, data: SaveData): Promise<boolean> {
    if (slot < 0 || slot >= SAVE_SLOTS) return false

    try {
      data.version = GAME_VERSION

      // 將 Set 轉換為 Array 以支援 JSON 序列化
      const serializableData = {
        ...data,
        player: {
          ...data.player,
          discoveredTiles: Array.from(data.player.discoveredTiles || []),
          visitedLocations: Array.from(data.player.visitedLocations || [])
        }
      }

      const json = JSON.stringify(serializableData, null, 2)
      localStorage.setItem(`${SAVE_PREFIX}${slot}`, json)
      this.updateSaveIndex(slot, true)
      return true
    } catch (e) {
      console.error('存檔失敗:', e)
      return false
    }
  }

  /** 讀取遊戲 */
  async load(slot: number): Promise<SaveData | null> {
    if (slot < 0 || slot >= SAVE_SLOTS) return null

    try {
      const json = localStorage.getItem(`${SAVE_PREFIX}${slot}`)
      if (!json) return null

      const parsed = JSON.parse(json)
      const data: SaveData = {
        ...parsed,
        player: {
          ...parsed.player,
          discoveredTiles: new Set(Array.isArray(parsed.player?.discoveredTiles) ? parsed.player.discoveredTiles : []),
          visitedLocations: new Set(Array.isArray(parsed.player?.visitedLocations) ? parsed.player.visitedLocations : [])
        }
      }

      if (data.version !== GAME_VERSION) {
        console.warn(`存檔版本不符: ${data.version} != ${GAME_VERSION}，嘗試相容載入`)
      }

      return data
    } catch (e) {
      console.error('讀檔失敗:', e)
      return null
    }
  }

  /** 列出所有存檔槽位 */
  async listSaves(): Promise<number[]> {
    const slots: number[] = []
    for (let i = 0; i < SAVE_SLOTS; i++) {
      if (localStorage.getItem(`${SAVE_PREFIX}${i}`)) {
        slots.push(i)
      }
    }
    return slots
  }

  /** 刪除存檔 */
  async deleteSave(slot: number): Promise<boolean> {
    if (slot < 0 || slot >= SAVE_SLOTS) return false

    try {
      localStorage.removeItem(`${SAVE_PREFIX}${slot}`)
      this.updateSaveIndex(slot, false)
      return true
    } catch (e) {
      console.error('刪除存檔失敗:', e)
      return false
    }
  }

  /** 更新存檔索引 (localStorage 專用) */
  private updateSaveIndex(slot: number, exists: boolean): void {
    try {
      const indexKey = `${SAVE_PREFIX}index`
      let index: number[] = []
      const stored = localStorage.getItem(indexKey)
      if (stored) index = JSON.parse(stored)

      if (exists && !index.includes(slot)) {
        index.push(slot)
        index.sort((a, b) => a - b)
      } else if (!exists) {
        index = index.filter(s => s !== slot)
      }

      localStorage.setItem(indexKey, JSON.stringify(index))
    } catch (e) {
      console.warn('更新存檔索引失敗:', e)
    }
  }

  /** 同步取得存檔中繼資料 (供 Canvas UI 即時渲染) */
  getSaveMetaSync(slot: number): SaveMeta | null {
    if (slot < 0 || slot >= SAVE_SLOTS) return null
    try {
      const json = localStorage.getItem(`${SAVE_PREFIX}${slot}`)
      if (!json) return null
      const data = JSON.parse(json)
      return {
        slot,
        timestamp: data.timestamp || Date.now(),
        version: data.version || 1,
        seed: data.seed || '---',
        daysSurvived: data.player?.stats?.daysSurvived ?? 0,
        position: data.player?.position || { x: 0, y: 0 },
        health: data.player?.health ?? 100,
        maxHealth: data.player?.maxHealth ?? 100,
        stamina: data.player?.stamina ?? 100,
        maxStamina: data.player?.maxStamina ?? 100,
        endingsUnlocked: data.player?.stats?.endingsUnlocked?.length ?? 0,
        gameState: data.gameState || 'PLAYING'
      }
    } catch {
      return null
    }
  }

  /** 取得存檔中繼資料 (不載入完整資料) */
  async getSaveMeta(slot: number): Promise<SaveMeta | null> {
    return this.getSaveMetaSync(slot)
  }

  /** 匯出存檔到檔案 */
  async exportSave(slot: number): Promise<boolean> {
    const data = await this.load(slot)
    if (!data) return false

    try {
      const serializableData = {
        ...data,
        player: {
          ...data.player,
          discoveredTiles: Array.from(data.player.discoveredTiles || []),
          visitedLocations: Array.from(data.player.visitedLocations || [])
        }
      }
      const json = JSON.stringify(serializableData, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `island-survival-save-${slot}-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      return true
    } catch (e) {
      console.error('匯出存檔失敗:', e)
      return false
    }
  }

  /** 從檔案匯入存檔 */
  async importSave(): Promise<SaveData | null> {
    try {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.click()

      return new Promise((resolve) => {
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0]
          if (!file) {
            resolve(null)
            return
          }

          const reader = new FileReader()
          reader.onload = () => {
            try {
              const parsed = JSON.parse(reader.result as string)
              const data: SaveData = {
                ...parsed,
                player: {
                  ...parsed.player,
                  discoveredTiles: new Set(Array.isArray(parsed.player?.discoveredTiles) ? parsed.player.discoveredTiles : []),
                  visitedLocations: new Set(Array.isArray(parsed.player?.visitedLocations) ? parsed.player.visitedLocations : [])
                }
              }
              resolve(data)
            } catch {
              resolve(null)
            }
          }
          reader.readAsText(file)
        }
      })
    } catch (e) {
      console.error('匯入存檔失敗:', e)
      return null
    }
  }

  /** 自動存檔 (關鍵節點) */
  async autoSave(): Promise<void> {
    // 使用槽位 0 作為自動存檔
    const data = this.createSaveData()
    await this.save(0, data)
  }

  /** 建立存檔資料物件 */
  private createSaveData(): SaveData {
    return {
      version: GAME_VERSION,
      timestamp: Date.now(),
      player: this.game['playerSystem'].getState(),
      map: this.game['mapSystem'].serialize(),
      currentEventId: this.game.getCurrentEventId(),
      gameState: this.game.getState(),
      config: this.game.config,
      seed: this.game.getSeed()
    }
  }

  /** 取得存檔槽位總數 */
  getMaxSlots(): number {
    return SAVE_SLOTS
  }
}

/** 存檔中繼資料 */
export interface SaveMeta {
  slot: number
  timestamp: number
  version: number
  seed: string
  daysSurvived: number
  position: { x: number; y: number }
  health: number
  maxHealth: number
  stamina: number
  maxStamina: number
  endingsUnlocked: number
  gameState: string
}