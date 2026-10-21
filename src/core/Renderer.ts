// 渲染器
import { Game } from './Game.js'
import { MapSystem } from '../systems/MapSystem.js'
import { PlayerSystem } from '../systems/PlayerSystem.js'
import { Vec2, TileType, Direction } from './Types.js'
import { TILE_SPRITES, SPRITE_SIZE } from '../data/Sprites.js'
import { assetManager, AssetManager } from './AssetManager.js'

export class Renderer {
  private game: Game
  private mapSystem: MapSystem
  private playerSystem: PlayerSystem
  private ctx: CanvasRenderingContext2D
  private assets: AssetManager = assetManager

  // 視窗大小 (CSS 像素)
  private viewWidth: number = 800
  private viewHeight: number = 600

  // 攝影機
  private cameraX: number = 0
  private cameraY: number = 0
  private cameraTargetX: number = 0
  private cameraTargetY: number = 0
  private cameraLerp: number = 0.15

  // 格子大小 (螢幕像素)
  private tileSize: number = 48
  private baseTileSize: number = 48
  private minTileSize: number = 28
  private maxTileSize: number = 96

  // 動畫
  private time: number = 0
  private playerBobOffset: number = 0
  private playerBobSpeed: number = 0
  private playerAnimTime: number = 0
  private playerCurrentAnim: string = 'idle_down'

  // 快取的離屏畫布
  private mapCache: OffscreenCanvas | null = null
  private mapCacheCtx: OffscreenCanvasRenderingContext2D | null = null
  private mapCacheDirty: boolean = true
  private lastPlayerTileX: number = -1
  private lastPlayerTileY: number = -1

  // 載入的資料
  private tileConfig: any = null
  private itemIconsMap: any = null

  constructor(game: Game) {
    this.game = game
    this.mapSystem = game['mapSystem']
    this.playerSystem = game['playerSystem']
    this.ctx = game.getContext()
    this.loadAssetData()
  }

  /** 載入資產資料設定 */
  private async loadAssetData(): Promise<void> {
    try {
      const [tileConfig, itemIcons] = await Promise.all([
        fetch('assets/data/tile_config.json').then(r => r.json()).catch(() => null),
        fetch('assets/data/item_icons_map.json').then(r => r.json()).catch(() => null)
      ])
      this.tileConfig = tileConfig
      this.itemIconsMap = itemIcons
    } catch (e) {
      console.warn('無法載入資產資料設定，使用預設值')
    }
  }

  onResize(width: number, height: number): void {
    this.viewWidth = width
    this.viewHeight = height
    this.updateTileSize()
    this.mapCacheDirty = true
  }

  private updateTileSize(): void {
    // 放大 1.5 倍：依視窗智慧縮放
    const mapWidth = this.game.config.mapWidth
    const mapHeight = this.game.config.mapHeight

    const maxTileW = this.viewWidth / mapWidth
    const maxTileH = this.viewHeight / mapHeight
    const idealSize = Math.max(36, Math.floor(Math.min(maxTileW, maxTileH) * 1.5))

    this.tileSize = Math.max(this.minTileSize, Math.min(this.maxTileSize, idealSize))
    this.baseTileSize = this.tileSize
  }

  /** 更新攝影機位置 */
  updateCamera(dt: number): void {
    const player = this.playerSystem.player
    const targetX = player.position.x * this.tileSize - this.viewWidth / 2 + this.tileSize / 2
    const targetY = player.position.y * this.tileSize - this.viewHeight / 2 + this.tileSize / 2

    // 限制攝影機範圍
    const mapWidth = this.game.config.mapWidth * this.tileSize
    const mapHeight = this.game.config.mapHeight * this.tileSize

    this.cameraTargetX = Math.max(0, Math.min(mapWidth - this.viewWidth, targetX))
    this.cameraTargetY = Math.max(0, Math.min(mapHeight - this.viewHeight, targetY))

    // 平滑插值
    this.cameraX += (this.cameraTargetX - this.cameraX) * this.cameraLerp
    this.cameraY += (this.cameraTargetY - this.cameraY) * this.cameraLerp

    // 更新玩家移動動畫
    this.updatePlayerAnimation(dt)
  }

  private updatePlayerAnimation(dt: number): void {
    const player = this.playerSystem.player
    const isMoving = player.position.x !== this.lastPlayerTileX || player.position.y !== this.lastPlayerTileY

    if (isMoving) {
      this.playerBobSpeed = Math.min(this.playerBobSpeed + dt * 0.02, 1)
    } else {
      this.playerBobSpeed = Math.max(this.playerBobSpeed - dt * 0.01, 0)
    }

    this.playerBobOffset = Math.sin(this.time * 8) * 2 * this.playerBobSpeed
    this.time += dt / 1000

    this.lastPlayerTileX = player.position.x
    this.lastPlayerTileY = player.position.y
  }

  /** 渲染遊戲主畫面 */
  renderGame(alpha: number): void {
    this.updateCamera(16) // 固定 16ms 更新攝影機

    // 渲染地圖
    const map = this.mapSystem.getMap()
    if (!map || map.length === 0) return

    this.renderMap()

    // 渲染玩家
    this.renderPlayer(alpha)

    // 渲染迷霧
    this.renderFog()

    // 渲染晝夜光影
    this.renderDayNightOverlay()
  }

  /** 渲染地圖 */
  private renderMap(): void {
    const ctx = this.ctx
    const tileSize = this.tileSize
    const map = this.mapSystem.getMap()
    const mapWidth = this.game.config.mapWidth
    const mapHeight = this.game.config.mapHeight

    // 計算可見範圍
    const startX = Math.max(0, Math.floor(this.cameraX / tileSize))
    const endX = Math.min(mapWidth, Math.ceil((this.cameraX + this.viewWidth) / tileSize))
    const startY = Math.max(0, Math.floor(this.cameraY / tileSize))
    const endY = Math.min(mapHeight, Math.ceil((this.cameraY + this.viewHeight) / tileSize))

    // 使用離屏畫布快取
    if (this.mapCacheDirty || !this.mapCache) {
      this.rebuildMapCache()
    }

    // 繪製快取的地圖
    if (this.mapCache) {
      ctx.drawImage(
        this.mapCache,
        this.cameraX, this.cameraY,
        this.viewWidth, this.viewHeight,
        0, 0,
        this.viewWidth, this.viewHeight
      )
    } else {
      // 降級：直接繪製
      this.renderMapDirect(ctx, startX, endX, startY, endY)
    }
  }

  /** 重建地圖快取 */
  private rebuildMapCache(): void {
    const mapWidth = this.game.config.mapWidth
    const mapHeight = this.game.config.mapHeight
    const cacheWidth = mapWidth * this.tileSize
    const cacheHeight = mapHeight * this.tileSize

    // 建立離屏畫布
    if (!this.mapCache || this.mapCache.width !== cacheWidth || this.mapCache.height !== cacheHeight) {
      this.mapCache = new OffscreenCanvas(cacheWidth, cacheHeight)
      this.mapCacheCtx = this.mapCache.getContext('2d')!
    }

    const ctx = this.mapCacheCtx!
    ctx.clearRect(0, 0, cacheWidth, cacheHeight)

    const map = this.mapSystem.getMap()

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tile = map[y][x]
        if (tile.explored || tile.visible) {
          this.drawTile(ctx, x, y, tile)
        }
      }
    }

    this.mapCacheDirty = false
  }

  /** 直接繪製地圖 (降級) */
  private renderMapDirect(ctx: CanvasRenderingContext2D, startX: number, endX: number, startY: number, endY: number): void {
    const map = this.mapSystem.getMap()
    const tileSize = this.tileSize

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = map[y][x]
        if (tile.explored || tile.visible) {
          const screenX = x * tileSize - this.cameraX
          const screenY = y * tileSize - this.cameraY
          this.drawTileAt(ctx, screenX, screenY, tile)
        }
      }
    }
  }

  /** 繪製單一格子 (快取用) */
  private drawTile(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number, tile: any): void {
    const tileSize = this.tileSize
    const px = x * tileSize
    const py = y * tileSize

    // 基礎地形
    this.drawTileBase(ctx, px, py, tile.type, tile.explored)

    // 資源節點
    if (tile.resources && tile.resources.length > 0 && tile.explored) {
      for (const resource of tile.resources) {
        if (resource.quantity > 0) {
          this.drawResource(ctx, px, py, resource)
        }
      }
    }

    // 事件標記
    if (tile.eventId && tile.explored) {
      this.drawEventMarker(ctx, px, py)
    }
  }

  /** 繪製單一格子 (直接繪製用) */
  private drawTileAt(ctx: CanvasRenderingContext2D, x: number, y: number, tile: any): void {
    this.drawTileBase(ctx, x, y, tile.type, tile.explored)

    if (tile.resources && tile.resources.length > 0 && tile.explored) {
      for (const resource of tile.resources) {
        if (resource.quantity > 0) {
          this.drawResource(ctx, x, y, resource)
        }
      }
    }

    if (tile.eventId && tile.explored) {
      this.drawEventMarker(ctx, x, y)
    }
  }

  /** 繪製地形基礎 */
  private drawTileBase(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, x: number, y: number, type: TileType, explored: boolean): void {
    const tileSize = this.tileSize
    const alpha = explored ? 1 : 0.4

    ctx.globalAlpha = alpha

    const sprite = TILE_SPRITES[type]
    if (sprite) {
      ctx.fillStyle = sprite.color
      ctx.fillRect(x, y, tileSize, tileSize)

      // 邊框
      ctx.strokeStyle = sprite.borderColor
      ctx.lineWidth = 1
      ctx.strokeRect(x + 0.5, y + 0.5, tileSize - 1, tileSize - 1)

      // 紋理細節
      if (sprite.pattern) {
        this.drawPattern(ctx, x, y, tileSize, sprite.pattern)
      }

      // 特殊地形標示
      if (type === TileType.BASE || type === TileType.CAVE || type === TileType.RUINS || type === TileType.MOUNTAIN) {
        ctx.font = `${Math.floor(tileSize * 0.55)}px "Microsoft JhengHei", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const icon = type === TileType.BASE ? '⛺' : type === TileType.CAVE ? '🕳️' : type === TileType.RUINS ? '🏛️' : '⛰️'
        ctx.fillText(icon, x + tileSize / 2, y + tileSize / 2)
      }
    } else {
      const colors: Record<TileType, string> = {
        [TileType.EMPTY]: '#1a1a2e',
        [TileType.SAND]: '#e8c56d',
        [TileType.GRASS]: '#4a7c2e',
        [TileType.FOREST]: '#2d5a1a',
        [TileType.ROCK]: '#6b6b6b',
        [TileType.WATER]: '#1e5f8a',
        [TileType.CAVE]: '#2a1a1a',
        [TileType.RUINS]: '#5a4a3a',
        [TileType.BEACH]: '#f0d8a0',
        [TileType.JUNGLE]: '#1a4a1a',
        [TileType.MOUNTAIN]: '#4a4a4a',
        [TileType.BASE]: '#8b6b2a'
      }
      ctx.fillStyle = colors[type] || '#1a1a2e'
      ctx.fillRect(x, y, tileSize, tileSize)
    }

    ctx.globalAlpha = 1
  }

  /** 繪製紋理圖案 */
  private drawPattern(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, x: number, y: number, size: number, pattern: string): void {
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    switch (pattern) {
      case 'dots':
        for (let i = 2; i < size; i += 6) {
          for (let j = 2; j < size; j += 6) {
            ctx.fillRect(x + i, y + j, 1, 1)
          }
        }
        break
      case 'lines':
        for (let i = 0; i < size; i += 4) {
          ctx.fillRect(x + i, y, 1, size)
        }
        break
      case 'cross':
        for (let i = 0; i < size; i += 8) {
          ctx.fillRect(x + i, y + 2, 2, 2)
          ctx.fillRect(x + i + 2, y + size - 4, 2, 2)
        }
        break
    }
  }

  /** 繪製資源 */
  private drawResource(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, x: number, y: number, resource: any): void {
    const tileSize = this.tileSize
    const cx = x + tileSize / 2
    const cy = y + tileSize / 2

    // 嘗試使用資源精靈
    if (this.tileConfig && this.assets.hasAsset('objects_resources')) {
      const resourceDef = this.tileConfig.objects.resources[resource.type]
      if (resourceDef) {
        const sheet = this.assets.getSpriteSheet('objects_resources')
        if (sheet) {
          const frame = sheet.frames.get(resourceDef.frame)
          if (frame) {
            const scale = 24 / sheet.frameWidth // 資源圖標 24x24 (放大 1.5 倍)
            const drawSize = 24
            ctx.drawImage(
              sheet.image,
              frame.x, frame.y, frame.width, frame.height,
              cx - drawSize / 2, cy - drawSize / 2, drawSize, drawSize
            )

            // 數量
            if (resource.quantity > 1) {
              ctx.fillStyle = '#fff'
              ctx.font = '10px monospace'
              ctx.textAlign = 'center'
              ctx.fillText(resource.quantity.toString(), cx, cy + 10)
            }
            return
          }
        }
      }
    }

    // 回退：繪製簡單圖形
    ctx.fillStyle = '#ffd700'
    ctx.beginPath()
    ctx.arc(cx, cy, 6, 0, Math.PI * 2)
    ctx.fill()

    if (resource.quantity > 1) {
      ctx.fillStyle = '#fff'
      ctx.font = '8px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(resource.quantity.toString(), cx, cy + 10)
    }
  }

  /** 繪製事件標記 */
  private drawEventMarker(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, x: number, y: number): void {
    const tileSize = this.tileSize
    const cx = x + tileSize / 2
    const cy = y + tileSize / 2

    ctx.fillStyle = '#ff6b6b'
    ctx.beginPath()
    ctx.moveTo(cx, cy - 9)
    ctx.lineTo(cx + 8, cy + 3)
    ctx.lineTo(cx - 8, cy + 3)
    ctx.closePath()
    ctx.fill()
  }

  /** 渲染玩家 */
  private renderPlayer(alpha: number): void {
    const ctx = this.ctx
    const player = this.playerSystem.player
    const tileSize = this.tileSize

    const screenX = player.position.x * tileSize - this.cameraX + tileSize / 2
    const screenY = player.position.y * tileSize - this.cameraY + tileSize / 2 + this.playerBobOffset

    // 更新玩家動畫狀態
    this.updatePlayerAnimationState()

    // 玩家陰影
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.ellipse(screenX, screenY + tileSize / 2 - 2, tileSize / 3, tileSize / 6, 0, 0, Math.PI * 2)
    ctx.fill()

    // 嘗試使用角色精靈
    const hasCharSprite = this.assets.hasAsset('character_survivor')
    const charSheet = this.assets.getSpriteSheet('character_survivor')

    if (false && hasCharSprite && charSheet) {
      // 使用精靈表動畫
      this.drawCharacterSprite(ctx, screenX, screenY, tileSize)
    } else {
      // 回退到程式化繪製
      this.drawCharacterFallback(ctx, screenX, screenY, tileSize)
    }

    // 體力/健康條 (在玩家頭頂)
    this.renderPlayerBars(screenX, screenY - tileSize / 2 - 8)
  }

  /** 更新玩家動畫狀態 */
  private updatePlayerAnimationState(): void {
    const player = this.playerSystem.player
    const isMoving = player.position.x !== this.lastPlayerTileX || player.position.y !== this.lastPlayerTileY

    // 確定朝向
    let direction = 'down'
    if (player.position.y < this.lastPlayerTileY) direction = 'up'
    else if (player.position.y > this.lastPlayerTileY) direction = 'down'
    else if (player.position.x < this.lastPlayerTileX) direction = 'left'
    else if (player.position.x > this.lastPlayerTileX) direction = 'right'

    // 確定動畫類型
    let animType = 'idle'
    if (isMoving) animType = 'walk'
    // TODO: 可加入 gather, craft, hurt 等狀態

    this.playerCurrentAnim = `${animType}_${direction}`
    this.lastPlayerTileX = player.position.x
    this.lastPlayerTileY = player.position.y
  }

  /** 繪製角色精靈 */
  private drawCharacterSprite(ctx: CanvasRenderingContext2D, x: number, y: number, tileSize: number): void {
    const sheet = this.assets.getSpriteSheet('character_survivor')
    if (!sheet) return

    const anim = this.assets.getAnimation(`survivor_${this.playerCurrentAnim}`)
    if (!anim) return

    // 計算當前幀
    this.playerAnimTime += 16 // 假設 60fps
    const frameIndex = Math.floor(this.playerAnimTime / anim.frameDuration) % anim.frameIds.length
    const frameId = anim.frameIds[frameIndex]

    const frame = sheet.frames.get(frameId)
    if (!frame) return

    // 角色精靈通常比格子大，置中繪製
    const scale = tileSize / 32 // 假設角色是 32x32
    const drawWidth = frame.width * scale
    const drawHeight = frame.height * scale
    const offsetX = x - drawWidth / 2
    const offsetY = y - drawHeight + tileSize / 2 // 腳部對齊格子中心

    ctx.drawImage(
      sheet.image,
      frame.x, frame.y, frame.width, frame.height,
      offsetX, offsetY, drawWidth, drawHeight
    )
  }

  /** 繪製角色備用圖形 */
  private drawCharacterFallback(ctx: CanvasRenderingContext2D, x: number, y: number, tileSize: number): void {
    ctx.save()
    ctx.translate(x, y)

    // 身體
    ctx.fillStyle = '#4ecdc4'
    ctx.beginPath()
    ctx.moveTo(0, -tileSize / 2)
    ctx.lineTo(-tileSize / 3, tileSize / 3)
    ctx.lineTo(tileSize / 3, tileSize / 3)
    ctx.closePath()
    ctx.fill()

    // 眼睛
    ctx.fillStyle = '#fff'
    ctx.fillRect(-4, -tileSize / 3, 3, 3)
    ctx.fillRect(1, -tileSize / 3, 3, 3)

    // 瞳孔
    ctx.fillStyle = '#000'
    ctx.fillRect(-3, -tileSize / 3 + 1, 1, 1)
    ctx.fillRect(2, -tileSize / 3 + 1, 1, 1)

    ctx.restore()
  }

  /** 渲染玩家狀態條 */
  private renderPlayerBars(x: number, y: number): void {
    const ctx = this.ctx
    const player = this.playerSystem.player
    const barWidth = Math.round(this.tileSize * 1.1)
    const barHeight = 5
    const gap = 2

    // 體力條
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight)
    ctx.fillStyle = '#4ecdc4'
    ctx.fillRect(x - barWidth / 2, y, barWidth * (player.stamina / player.maxStamina), barHeight)

    // 健康條
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(x - barWidth / 2, y + barHeight + gap, barWidth, barHeight)
    ctx.fillStyle = '#ff6b6b'
    ctx.fillRect(x - barWidth / 2, y + barHeight + gap, barWidth * (player.health / player.maxHealth), barHeight)
  }

  /** 渲染迷霧 */
  private renderFog(): void {
    const ctx = this.ctx
    const map = this.mapSystem.getMap()
    const mapWidth = this.game.config.mapWidth
    const mapHeight = this.game.config.mapHeight
    const tileSize = this.tileSize

    // 建立迷霧漸層
    const fogGradient = ctx.createRadialGradient(
      this.viewWidth / 2, this.viewHeight / 2, 0,
      this.viewWidth / 2, this.viewHeight / 2, Math.max(this.viewWidth, this.viewHeight)
    )
    fogGradient.addColorStop(0, 'rgba(0,0,0,0)')
    fogGradient.addColorStop(0.7, 'rgba(0,0,0,0.3)')
    fogGradient.addColorStop(1, 'rgba(0,0,0,0.8)')

    ctx.fillStyle = fogGradient
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight)

    // 未探索區域完全黑
    ctx.fillStyle = 'rgba(0,0,0,0.95)'
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tile = map[y][x]
        if (!tile.explored && !tile.visible) {
          const screenX = x * tileSize - this.cameraX
          const screenY = y * tileSize - this.cameraY

          // 只繪製在視野內的
          if (screenX + tileSize > 0 && screenX < this.viewWidth &&
              screenY + tileSize > 0 && screenY < this.viewHeight) {
            ctx.fillRect(screenX, screenY, tileSize, tileSize)
          }
        }
      }
    }
  }

  /** 渲染晝夜光影 (24小時制: 06:00日出, 18:00日落) */
  private renderDayNightOverlay(): void {
    const player = this.playerSystem.player
    const hour = player.stats.currentHour ?? 8
    const minute = player.stats.currentMinute ?? 0
    const timeVal = hour + minute / 60

    let darkness = 0
    // 18:00 - 06:00 為夜間
    if (timeVal >= 18 || timeVal < 6) {
      if (timeVal >= 18 && timeVal < 20) {
        // 18:00 - 20:00 黃昏日落漸變 (0 -> 0.55)
        darkness = 0.55 * ((timeVal - 18) / 2)
      } else if (timeVal >= 4 && timeVal < 6) {
        // 04:00 - 06:00 晨曦破曉漸變 (0.55 -> 0)
        darkness = 0.55 * (1 - (timeVal - 4) / 2)
      } else {
        // 20:00 - 04:00 深夜
        darkness = 0.55
      }
    }

    if (darkness <= 0.02) return

    const ctx = this.ctx
    const tileSize = this.tileSize
    const screenX = player.position.x * tileSize - this.cameraX + tileSize / 2
    const screenY = player.position.y * tileSize - this.cameraY + tileSize / 2

    ctx.save()
    // 夜間氛圍光罩：以玩家為中心保留半徑光圈，周圍籠罩夜色
    const lightRadius = tileSize * 3.8
    const grad = ctx.createRadialGradient(screenX, screenY, tileSize * 0.8, screenX, screenY, lightRadius)
    grad.addColorStop(0, 'rgba(8, 12, 30, 0.02)')
    grad.addColorStop(0.5, `rgba(8, 12, 30, ${darkness * 0.55})`)
    grad.addColorStop(1, `rgba(5, 8, 22, ${darkness})`)

    ctx.fillStyle = grad
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight)
    ctx.restore()
  }

  /** 渲染主選單 */
  renderMainMenu(): void {
    const ctx = this.ctx
    const w = this.viewWidth
    const h = this.viewHeight

    // 背景漸層
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#0f0f1a')
    grad.addColorStop(0.5, '#1a1a3a')
    grad.addColorStop(1, '#0f0f1a')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // 裝飾性粒子
    this.renderMenuParticles(ctx, w, h)

    // 標題
    ctx.fillStyle = '#4ecdc4'
    ctx.font = 'bold 48px "Microsoft JhengHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('無人島生存', w / 2, h / 2 - 80)

    // 副標題
    ctx.fillStyle = '#aaa'
    ctx.font = '16px "Microsoft JhengHei", sans-serif'
    ctx.fillText('格子探索 · 事件劇情 · 多重結局', w / 2, h / 2 - 30)

    // 選單選項
    const options = [
      { text: '開始新遊戲', action: 'new_game' },
      { text: '繼續遊戲', action: 'continue' },
      { text: '存檔管理', action: 'saves' },
      { text: '圖鑑/成就', action: 'gallery' },
      { text: '音效設定', action: 'settings' }
    ]

    const startY = h / 2 + 20
    options.forEach((opt, i) => {
      const y = startY + i * 50
      const isHovered = this.game.uiSystem.isMenuOptionHovered(i)

      // 背景
      if (isHovered) {
        ctx.fillStyle = 'rgba(78, 205, 196, 0.15)'
        ctx.fillRect(w / 2 - 120, y - 18, 240, 36)
        ctx.strokeStyle = '#4ecdc4'
        ctx.lineWidth = 2
        ctx.strokeRect(w / 2 - 120, y - 18, 240, 36)
      }

      ctx.fillStyle = isHovered ? '#4ecdc4' : '#ddd'
      ctx.font = '20px "Microsoft JhengHei", sans-serif'
      ctx.fillText(opt.text, w / 2, y)
    })

    // 版本資訊
    ctx.fillStyle = '#555'
    ctx.font = '12px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`v1.0.0 | Seed: ${this.game.getSeed() || '---'}`, w - 20, h - 15)
  }

  /** 渲染主選單粒子 */
  private renderMenuParticles(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const time = Date.now() / 1000
    for (let i = 0; i < 20; i++) {
      const x = (Math.sin(time * 0.5 + i) * 0.5 + 0.5) * w
      const y = (Math.cos(time * 0.3 + i * 1.7) * 0.5 + 0.5) * h
      const size = 1 + Math.sin(time + i) * 0.5
      ctx.fillStyle = `rgba(78, 205, 196, ${0.1 + Math.sin(time * 2 + i) * 0.05})`
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  /** 渲染暫停覆蓋層 */
  renderPauseOverlay(): void {
    const ctx = this.ctx
    const w = this.viewWidth
    const h = this.viewHeight

    // 半透明背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, 0, w, h)

    // 暫停文字
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 36px "Microsoft JhengHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('遊戲暫停', w / 2, h / 2 - 40)

    ctx.font = '18px "Microsoft JhengHei", sans-serif'
    ctx.fillStyle = '#aaa'
    ctx.fillText('按 ESC 或 P 繼續遊戲  |  按 Q 返回主選單  |  按 F5 快速存檔', w / 2, h / 2 + 20)
  }

  /** 標記地圖快取需要更新 */
  markMapDirty(): void {
    this.mapCacheDirty = true
  }

  /** 取得格子大小 */
  getTileSize(): number {
    return this.tileSize
  }

  /** 取得攝影機位置 */
  getCamera(): { x: number; y: number } {
    return { x: this.cameraX, y: this.cameraY }
  }

  /** 螢幕座標轉世界座標 */
  screenToWorld(screenX: number, screenY: number): Vec2 {
    return {
      x: (screenX + this.cameraX) / this.tileSize,
      y: (screenY + this.cameraY) / this.tileSize
    }
  }

  /** 世界座標轉螢幕座標 */
  worldToScreen(worldX: number, worldY: number): Vec2 {
    return {
      x: worldX * this.tileSize - this.cameraX,
      y: worldY * this.tileSize - this.cameraY
    }
  }
}