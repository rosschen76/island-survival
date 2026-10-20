// 資產管理器 - 載入與管理所有遊戲資產 (圖片、音效、資料)

export interface AssetDefinition {
  id: string
  src: string
  type: 'image' | 'audio' | 'json'
}

export interface SpriteFrame {
  x: number
  y: number
  width: number
  height: number
}

export interface SpriteSheet {
  image: HTMLImageElement
  frames: Map<string, SpriteFrame>
  frameWidth: number
  frameHeight: number
  columns: number
  rows: number
}

export interface AnimationDef {
  frameIds: string[]
  frameDuration: number // ms per frame
  loop: boolean
}

export class AssetManager {
  private assets: Map<string, HTMLImageElement | HTMLAudioElement | any> = new Map()
  private spriteSheets: Map<string, SpriteSheet> = new Map()
  private animations: Map<string, AnimationDef> = new Map()
  private loadPromises: Map<string, Promise<void>> = new Map()
  private basePath: string = 'assets/'

  /** 設定資產基礎路徑 */
  setBasePath(path: string): void {
    this.basePath = path.endsWith('/') ? path : path + '/'
  }

  /** 取得完整路徑 */
  private getPath(relativePath: string): string {
    return this.basePath + relativePath
  }

  /** 載入單一圖片 */
  async loadImage(id: string, relativePath: string): Promise<HTMLImageElement> {
    const fullPath = this.getPath(relativePath)
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        this.assets.set(id, img)
        resolve(img)
      }
      img.onerror = () => reject(new Error(`Failed to load image: ${fullPath}`))
      img.src = fullPath
    })
  }

  /** 載入單一音效 */
  async loadAudio(id: string, relativePath: string): Promise<HTMLAudioElement> {
    const fullPath = this.getPath(relativePath)
    return new Promise((resolve, reject) => {
      const audio = new Audio(fullPath)
      audio.oncanplaythrough = () => {
        this.assets.set(id, audio)
        resolve(audio)
      }
      audio.onerror = () => reject(new Error(`Failed to load audio: ${fullPath}`))
      audio.load()
    })
  }

  /** 載入 JSON 資料 */
  async loadJSON<T>(id: string, relativePath: string): Promise<T> {
    const fullPath = this.getPath(relativePath)
    const response = await fetch(fullPath)
    if (!response.ok) throw new Error(`Failed to load JSON: ${fullPath}`)
    const data = await response.json()
    this.assets.set(id, data)
    return data
  }

  /** 批次載入資產清單 */
  async loadManifest(manifest: AssetDefinition[]): Promise<void> {
    const promises = manifest.map(asset => {
      switch (asset.type) {
        case 'image':
          return this.loadImage(asset.id, asset.src)
        case 'audio':
          return this.loadAudio(asset.id, asset.src)
        case 'json':
          return this.loadJSON(asset.id, asset.src)
      }
    })
    await Promise.all(promises)
  }

  /** 載入精靈表 (均勻網格) */
  async loadSpriteSheet(
    id: string,
    relativePath: string,
    frameWidth: number,
    frameHeight: number,
    frameIds?: string[]
  ): Promise<SpriteSheet> {
    const image = await this.loadImage(id, relativePath)
    const columns = Math.floor(image.width / frameWidth)
    const rows = Math.floor(image.height / frameHeight)

    const frames = new Map<string, SpriteFrame>()
    let index = 0

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const frameId = frameIds?.[index] || `${id}_${index}`
        frames.set(frameId, {
          x: col * frameWidth,
          y: row * frameHeight,
          width: frameWidth,
          height: frameHeight
        })
        index++
      }
    }

    const sheet: SpriteSheet = {
      image,
      frames,
      frameWidth,
      frameHeight,
      columns,
      rows
    }

    this.spriteSheets.set(id, sheet)
    return sheet
  }

  /** 載入精靈表 (JSON 定義格式 - 如 Aseprite 匯出) */
  async loadSpriteSheetJSON(
    imageId: string,
    imagePath: string,
    jsonPath: string
  ): Promise<SpriteSheet> {
    const image = await this.loadImage(imageId, imagePath)
    const data = await this.loadJSON<any>(`${imageId}_json`, jsonPath)

    // 支援 Aseprite / TexturePacker 格式
    const frames = new Map<string, SpriteFrame>()

    if (data.frames) {
      // TexturePacker / Aseprite 陣列格式
      if (Array.isArray(data.frames)) {
        for (const frame of data.frames) {
          frames.set(frame.filename, {
            x: frame.frame.x,
            y: frame.frame.y,
            width: frame.frame.w,
            height: frame.frame.h
          })
        }
      } else {
        // Aseprite 物件格式
        for (const [key, frame] of Object.entries(data.frames)) {
          const f = frame as any
          frames.set(key, {
            x: f.frame.x,
            y: f.frame.y,
            width: f.frame.w,
            height: f.frame.h
          })
        }
      }
    }

    const sheet: SpriteSheet = {
      image,
      frames,
      frameWidth: 0, // 非均勻
      frameHeight: 0,
      columns: 0,
      rows: 0
    }

    this.spriteSheets.set(imageId, sheet)
    return sheet
  }

  /** 定義動畫 */
  defineAnimation(id: string, frameIds: string[], frameDuration: number, loop: boolean = true): void {
    this.animations.set(id, { frameIds, frameDuration, loop })
  }

  /** 取得動畫定義 */
  getAnimation(id: string): AnimationDef | undefined {
    return this.animations.get(id)
  }

  /** 取得圖片 */
  getImage(id: string): HTMLImageElement | undefined {
    return this.assets.get(id) as HTMLImageElement | undefined
  }

  /** 取得音效 */
  getAudio(id: string): HTMLAudioElement | undefined {
    return this.assets.get(id) as HTMLAudioElement | undefined
  }

  /** 取得 JSON 資料 */
  getJSON<T>(id: string): T | undefined {
    return this.assets.get(id) as T | undefined
  }

  /** 取得精靈表 */
  getSpriteSheet(id: string): SpriteSheet | undefined {
    return this.spriteSheets.get(id)
  }

  /** 繪製精靈幀 */
  drawFrame(
    ctx: CanvasRenderingContext2D,
    sheetId: string,
    frameId: string,
    x: number,
    y: number,
    scale: number = 1
  ): boolean {
    const sheet = this.spriteSheets.get(sheetId)
    if (!sheet) return false

    const frame = sheet.frames.get(frameId)
    if (!frame) return false

    ctx.drawImage(
      sheet.image,
      frame.x, frame.y, frame.width, frame.height,
      x, y, frame.width * scale, frame.height * scale
    )
    return true
  }

  /** 繪製圖片 (支援縮放) */
  drawImage(
    ctx: CanvasRenderingContext2D,
    imageId: string,
    x: number,
    y: number,
    width?: number,
    height?: number
  ): boolean {
    const img = this.getImage(imageId)
    if (!img) return false

    if (width && height) {
      ctx.drawImage(img, x, y, width, height)
    } else {
      ctx.drawImage(img, x, y)
    }
    return true
  }

  /** 繪製圖片區域 */
  drawImageRegion(
    ctx: CanvasRenderingContext2D,
    imageId: string,
    sx: number, sy: number, sw: number, sh: number,
    dx: number, dy: number, dw: number, dh: number
  ): boolean {
    const img = this.getImage(imageId)
    if (!img) return false

    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
    return true
  }

  /** 播放音效 (建立新實例避免重疊問題) */
  playSFX(id: string, volume: number = 1.0): HTMLAudioElement | null {
    const audio = this.getAudio(id)
    if (!audio) return null

    const instance = audio.cloneNode() as HTMLAudioElement
    instance.volume = Math.max(0, Math.min(1, volume))
    instance.play().catch(() => { /* 忽略自動播放限制 */ })
    return instance
  }

  /** 檢查資產是否載入 */
  hasAsset(id: string): boolean {
    return this.assets.has(id)
  }

  /** 取得載入進度 (0-1) */
  getLoadProgress(manifest: AssetDefinition[]): number {
    if (manifest.length === 0) return 1
    let loaded = 0
    for (const asset of manifest) {
      if (this.assets.has(asset.id)) loaded++
    }
    return loaded / manifest.length
  }

  /** 清除所有資產 */
  clear(): void {
    this.assets.clear()
    this.spriteSheets.clear()
    this.animations.clear()
    this.loadPromises.clear()
  }
}

// 全域單例
export const assetManager = new AssetManager()