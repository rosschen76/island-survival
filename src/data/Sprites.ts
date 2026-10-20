// 精靈/圖示資料 (目前使用程式化繪製，未來可替換為圖片)

/** 精靈大小 */
export const SPRITE_SIZE = 32

/** 地圖格子精靈定義 (對應 Constants.ts 中的 TILE_SPRITES) */
export const TILE_SPRITES: Record<number, TileSpriteDef> = {
  0: { id: 'empty', name: '未知', color: '#0d0d1a', borderColor: '#1a1a2e', walkable: false },
  1: { id: 'sand', name: '沙灘', color: '#e8c56d', borderColor: '#d4b05a', walkable: true, pattern: 'dots' },
  2: { id: 'grass', name: '草地', color: '#4a7c2e', borderColor: '#3a6624', walkable: true, pattern: 'lines' },
  3: { id: 'forest', name: '森林', color: '#2d5a1a', borderColor: '#1f4212', walkable: true, pattern: 'cross' },
  4: { id: 'rock', name: '岩石', color: '#6b6b6b', borderColor: '#555', walkable: true },
  5: { id: 'water', name: '水域', color: '#1e5f8a', borderColor: '#154566', walkable: false, pattern: 'lines' },
  6: { id: 'cave', name: '洞穴', color: '#2a1a1a', borderColor: '#1a0f0f', walkable: true },
  7: { id: 'ruins', name: '廢墟', color: '#5a4a3a', borderColor: '#44382a', walkable: true, pattern: 'cross' },
  8: { id: 'beach', name: '海灘', color: '#f0d8a0', borderColor: '#dbc088', walkable: true, pattern: 'dots' },
  9: { id: 'jungle', name: '叢林', color: '#1a4a1a', borderColor: '#0f330f', walkable: true, pattern: 'cross' },
  10: { id: 'mountain', name: '高山', color: '#4a4a4a', borderColor: '#333', walkable: true },
  99: { id: 'base', name: '基地', color: '#8b6b2a', borderColor: '#6b4f1f', walkable: true }
}

export interface TileSpriteDef {
  id: string
  name: string
  color: string
  borderColor: string
  walkable: boolean
  pattern?: 'dots' | 'lines' | 'cross'
}

/** 物品圖示定義 (用於程式化繪製) */
export interface ItemIconDef {
  id: string
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void
}

export const ITEM_ICONS: Record<string, ItemIconDef> = {
  // 食物
  coconut: { id: 'coconut', draw: drawCoconut },
  berries: { id: 'berries', draw: drawBerries },
  fish: { id: 'fish', draw: drawFish },
  cooked_fish: { id: 'cooked_fish', draw: drawCookedFish },
  mushroom: { id: 'mushroom', draw: drawMushroom },

  // 水
  water_bottle: { id: 'water_bottle', draw: drawWaterBottle },
  coconut_water: { id: 'coconut_water', draw: drawCoconutWater },

  // 材料
  wood: { id: 'wood', draw: drawWood },
  stone: { id: 'stone', draw: drawStone },
  fiber: { id: 'fiber', draw: drawFiber },
  hide: { id: 'hide', draw: drawHide },
  bone: { id: 'bone', draw: drawBone },
  metal_scrap: { id: 'metal_scrap', draw: drawMetalScrap },
  crystal: { id: 'crystal', draw: drawCrystal },

  // 工具
  stone_axe: { id: 'stone_axe', draw: drawStoneAxe },
  stone_pickaxe: { id: 'stone_pickaxe', draw: drawStonePickaxe },
  stone_knife: { id: 'stone_knife', draw: drawStoneKnife },
  wooden_spear: { id: 'wooden_spear', draw: drawWoodenSpear },
  fishing_rod: { id: 'fishing_rod', draw: drawFishingRod },
  torch: { id: 'torch', draw: drawTorch },

  // 武器
  spear: { id: 'spear', draw: drawSpear },
  bow: { id: 'bow', draw: drawBow },

  // 防具
  leather_armor: { id: 'leather_armor', draw: drawLeatherArmor },
  wooden_shield: { id: 'wooden_shield', draw: drawWoodenShield },

  // 藥物
  herbal_medicine: { id: 'herbal_medicine', draw: drawHerbalMedicine },
  bandage: { id: 'bandage', draw: drawBandage },

  // 特殊
  map_fragment: { id: 'map_fragment', draw: drawMapFragment },
  radio_parts: { id: 'radio_parts', draw: drawRadioParts },
  signal_flare: { id: 'signal_flare', draw: drawSignalFlare },
  raft_blueprint: { id: 'raft_blueprint', draw: drawRaftBlueprint }
}

// === 程式化圖示繪製函數 ===

function drawCoconut(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.fillStyle = '#8b6b2a'
  ctx.beginPath()
  ctx.ellipse(x + 16 * s, y + 18 * s, 8 * s, 10 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#6b4f1f'
  ctx.beginPath()
  ctx.ellipse(x + 14 * s, y + 16 * s, 3 * s, 4 * s, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawBerries(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.fillStyle = '#ff6b6b'
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2
    const px = x + 16 * s + Math.cos(angle) * 6 * s
    const py = y + 18 * s + Math.sin(angle) * 6 * s
    ctx.beginPath()
    ctx.arc(px, py, 3 * s, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#2d5a1a'
  ctx.fillRect(x + 15 * s, y + 10 * s, 2 * s, 6 * s)
}

function drawFish(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.fillStyle = '#a8c8e8'
  ctx.beginPath()
  ctx.moveTo(x + 8 * s, y + 16 * s)
  ctx.quadraticCurveTo(x + 16 * s, y + 10 * s, x + 24 * s, y + 16 * s)
  ctx.quadraticCurveTo(x + 16 * s, y + 22 * s, x + 8 * s, y + 16 * s)
  ctx.fill()
  // 尾鰭
  ctx.beginPath()
  ctx.moveTo(x + 8 * s, y + 16 * s)
  ctx.lineTo(x + 4 * s, y + 12 * s)
  ctx.lineTo(x + 4 * s, y + 20 * s)
  ctx.closePath()
  ctx.fill()
}

function drawCookedFish(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.fillStyle = '#e8a878'
  ctx.beginPath()
  ctx.moveTo(x + 8 * s, y + 16 * s)
  ctx.quadraticCurveTo(x + 16 * s, y + 10 * s, x + 24 * s, y + 16 * s)
  ctx.quadraticCurveTo(x + 16 * s, y + 22 * s, x + 8 * s, y + 16 * s)
  ctx.fill()
  // 烤痕
  ctx.strokeStyle = '#c88858'
  ctx.lineWidth = 1 * s
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(x + 10 * s + i * 4 * s, y + 12 * s)
    ctx.lineTo(x + 10 * s + i * 4 * s, y + 20 * s)
    ctx.stroke()
  }
}

function drawMushroom(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  // 柄
  ctx.fillStyle = '#e8d8c8'
  ctx.fillRect(x + 14 * s, y + 16 * s, 4 * s, 10 * s)
  // 傘
  ctx.fillStyle = '#e86868'
  ctx.beginPath()
  ctx.ellipse(x + 16 * s, y + 16 * s, 8 * s, 5 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  // 白點
  ctx.fillStyle = '#fff'
  for (const [dx, dy] of [[-4, -2], [4, -1], [0, 1], [-2, 2], [3, 2]]) {
    ctx.beginPath()
    ctx.arc(x + (16 + dx) * s, y + (16 + dy) * s, 1.5 * s, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawWaterBottle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.fillStyle = '#48a8e8'
  ctx.fillRect(x + 12 * s, y + 10 * s, 8 * s, 14 * s)
  ctx.fillStyle = '#2888c8'
  ctx.fillRect(x + 12 * s, y + 10 * s, 8 * s, 7 * s)
  // 蓋子
  ctx.fillStyle = '#686868'
  ctx.fillRect(x + 11 * s, y + 8 * s, 10 * s, 3 * s)
}

function drawCoconutWater(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  drawCoconut(ctx, x, y, size)
  ctx.fillStyle = '#ffffff88'
  ctx.beginPath()
  ctx.ellipse(x + 16 * (size/32), y + 16 * (size/32), 6 * (size/32), 4 * (size/32), 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawWood(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.fillStyle = '#8b6b2a'
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x + 8 * s + i * 6 * s, y + 12 * s, 5 * s, 12 * s)
    ctx.fillStyle = '#6b4f1f'
    ctx.fillRect(x + 9 * s + i * 6 * s, y + 13 * s, 3 * s, 10 * s)
    ctx.fillStyle = '#8b6b2a'
  }
}

function drawStone(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.fillStyle = '#7b7b7b'
  ctx.beginPath()
  ctx.moveTo(x + 16 * s, y + 10 * s)
  ctx.lineTo(x + 24 * s, y + 16 * s)
  ctx.lineTo(x + 20 * s, y + 26 * s)
  ctx.lineTo(x + 10 * s, y + 28 * s)
  ctx.lineTo(x + 6 * s, y + 18 * s)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#5b5b5b'
  ctx.lineWidth = 1 * s
  ctx.stroke()
}

function drawFiber(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.strokeStyle = '#a8d868'
  ctx.lineWidth = 2 * s
  ctx.lineCap = 'round'
  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(x + 10 * s + i * 4 * s, y + 24 * s)
    ctx.quadraticCurveTo(x + 12 * s + i * 4 * s, y + 10 * s, x + 14 * s + i * 4 * s, y + 14 * s)
    ctx.stroke()
  }
}

function drawHide(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.fillStyle = '#a88868'
  ctx.beginPath()
  ctx.moveTo(x + 10 * s, y + 12 * s)
  ctx.lineTo(x + 22 * s, y + 10 * s)
  ctx.lineTo(x + 24 * s, y + 22 * s)
  ctx.lineTo(x + 18 * s, y + 28 * s)
  ctx.lineTo(x + 8 * s, y + 26 * s)
  ctx.closePath()
  ctx.fill()
}

function drawBone(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.fillStyle = '#f0e8d8'
  ctx.fillRect(x + 13 * s, y + 10 * s, 6 * s, 16 * s)
  ctx.beginPath()
  ctx.ellipse(x + 16 * s, y + 10 * s, 8 * s, 4 * s, 0, 0, Math.PI * 2)
  ctx.ellipse(x + 16 * s, y + 26 * s, 8 * s, 4 * s, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawMetalScrap(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.fillStyle = '#a8a8b8'
  ctx.fillRect(x + 10 * s, y + 14 * s, 12 * s, 10 * s)
  ctx.fillStyle = '#888898'
  ctx.fillRect(x + 11 * s, y + 15 * s, 10 * s, 8 * s)
  // 鉚釘
  ctx.fillStyle = '#686878'
  for (const [dx, dy] of [[2, 2], [8, 2], [2, 6], [8, 6]]) {
    ctx.beginPath()
    ctx.arc(x + (11 + dx) * s, y + (15 + dy) * s, 1 * s, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawCrystal(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.fillStyle = '#a8e8f8'
  ctx.globalAlpha = 0.8
  ctx.beginPath()
  ctx.moveTo(x + 16 * s, y + 8 * s)
  ctx.lineTo(x + 24 * s, y + 16 * s)
  ctx.lineTo(x + 16 * s, y + 24 * s)
  ctx.lineTo(x + 8 * s, y + 16 * s)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.strokeStyle = '#88c8e8'
  ctx.lineWidth = 1 * s
  ctx.stroke()
}

function drawStoneAxe(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  // 柄
  ctx.fillStyle = '#6b4f1f'
  ctx.fillRect(x + 14 * s, y + 10 * s, 4 * s, 18 * s)
  // 斧頭
  ctx.fillStyle = '#7b7b7b'
  ctx.beginPath()
  ctx.moveTo(x + 6 * s, y + 10 * s)
  ctx.lineTo(x + 16 * s, y + 6 * s)
  ctx.lineTo(x + 22 * s, y + 14 * s)
  ctx.lineTo(x + 12 * s, y + 18 * s)
  ctx.closePath()
  ctx.fill()
}

function drawStonePickaxe(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.fillStyle = '#6b4f1f'
  ctx.fillRect(x + 14 * s, y + 10 * s, 4 * s, 18 * s)
  ctx.fillStyle = '#7b7b7b'
  ctx.beginPath()
  ctx.moveTo(x + 6 * s, y + 10 * s)
  ctx.lineTo(x + 16 * s, y + 4 * s)
  ctx.lineTo(x + 26 * s, y + 10 * s)
  ctx.lineTo(x + 16 * s, y + 16 * s)
  ctx.closePath()
  ctx.fill()
}

function drawStoneKnife(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.fillStyle = '#6b4f1f'
  ctx.fillRect(x + 14 * s, y + 18 * s, 4 * s, 10 * s)
  ctx.fillStyle = '#7b7b7b'
  ctx.beginPath()
  ctx.moveTo(x + 16 * s, y + 10 * s)
  ctx.lineTo(x + 10 * s, y + 18 * s)
  ctx.lineTo(x + 22 * s, y + 18 * s)
  ctx.closePath()
  ctx.fill()
}

function drawWoodenSpear(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.fillStyle = '#6b4f1f'
  ctx.fillRect(x + 15 * s, y + 8 * s, 2 * s, 20 * s)
  ctx.fillStyle = '#7b7b7b'
  ctx.beginPath()
  ctx.moveTo(x + 16 * s, y + 6 * s)
  ctx.lineTo(x + 12 * s, y + 10 * s)
  ctx.lineTo(x + 20 * s, y + 10 * s)
  ctx.closePath()
  ctx.fill()
}

function drawFishingRod(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.strokeStyle = '#6b4f1f'
  ctx.lineWidth = 3 * s
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x + 16 * s, y + 26 * s)
  ctx.quadraticCurveTo(x + 28 * s, y + 10 * s, x + 30 * s, y + 4 * s)
  ctx.stroke()
  // 線
  ctx.strokeStyle = '#888'
  ctx.lineWidth = 1 * s
  ctx.setLineDash([4 * s, 4 * s])
  ctx.beginPath()
  ctx.moveTo(x + 30 * s, y + 4 * s)
  ctx.lineTo(x + 30 * s, y + 20 * s)
  ctx.stroke()
  ctx.setLineDash([])
  // 魚鉤
  ctx.fillStyle = '#aaa'
  ctx.beginPath()
  ctx.arc(x + 30 * s, y + 20 * s, 2 * s, 0, Math.PI * 2)
  ctx.fill()
}

function drawTorch(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.fillStyle = '#6b4f1f'
  ctx.fillRect(x + 14 * s, y + 14 * s, 4 * s, 14 * s)
  // 火
  const time = Date.now() / 100
  ctx.fillStyle = '#ff8800'
  ctx.beginPath()
  ctx.moveTo(x + 16 * s, y + 12 * s)
  ctx.quadraticCurveTo(x + 12 * s + Math.sin(time) * 2 * s, y + 10 * s, x + 16 * s, y + 4 * s)
  ctx.quadraticCurveTo(x + 20 * s + Math.cos(time) * 2 * s, y + 10 * s, x + 16 * s, y + 12 * s)
  ctx.fill()
  ctx.fillStyle = '#ffff00'
  ctx.beginPath()
  ctx.arc(x + 16 * s, y + 10 * s, 3 * s, 0, Math.PI * 2)
  ctx.fill()
}

function drawSpear(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.fillStyle = '#4b3f1f'
  ctx.fillRect(x + 15 * s, y + 6 * s, 2 * s, 22 * s)
  ctx.fillStyle = '#8b7b6b'
  ctx.beginPath()
  ctx.moveTo(x + 16 * s, y + 4 * s)
  ctx.lineTo(x + 10 * s, y + 8 * s)
  ctx.lineTo(x + 22 * s, y + 8 * s)
  ctx.closePath()
  ctx.fill()
}

function drawBow(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.strokeStyle = '#6b4f1f'
  ctx.lineWidth = 3 * s
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x + 10 * s, y + 24 * s)
  ctx.quadraticCurveTo(x + 6 * s, y + 16 * s, x + 10 * s, y + 8 * s)
  ctx.moveTo(x + 22 * s, y + 24 * s)
  ctx.quadraticCurveTo(x + 26 * s, y + 16 * s, x + 22 * s, y + 8 * s)
  ctx.stroke()
  // 弓弦
  ctx.strokeStyle = '#e8d8a8'
  ctx.lineWidth = 1 * s
  ctx.beginPath()
  ctx.moveTo(x + 10 * s, y + 8 * s)
  ctx.lineTo(x + 22 * s, y + 8 * s)
  ctx.moveTo(x + 10 * s, y + 24 * s)
  ctx.lineTo(x + 22 * s, y + 24 * s)
  ctx.stroke()
}

function drawLeatherArmor(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.fillStyle = '#8b6b2a'
  ctx.beginPath()
  ctx.moveTo(x + 8 * s, y + 12 * s)
  ctx.lineTo(x + 24 * s, y + 10 * s)
  ctx.lineTo(x + 22 * s, y + 26 * s)
  ctx.lineTo(x + 10 * s, y + 28 * s)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#a88868'
  ctx.fillRect(x + 12 * s, y + 14 * s, 8 * s, 10 * s)
}

function drawWoodenShield(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.fillStyle = '#6b4f1f'
  ctx.beginPath()
  ctx.arc(x + 16 * s, y + 18 * s, 10 * s, Math.PI, 0)
  ctx.lineTo(x + 16 * s, y + 28 * s)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#4b3f1f'
  ctx.lineWidth = 2 * s
  ctx.stroke()
  // 中心鐵飾
  ctx.fillStyle = '#8b7b6b'
  ctx.beginPath()
  ctx.arc(x + 16 * s, y + 18 * s, 3 * s, 0, Math.PI * 2)
  ctx.fill()
}

function drawHerbalMedicine(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  // 瓶身
  ctx.fillStyle = '#48c868'
  ctx.globalAlpha = 0.7
  ctx.fillRect(x + 13 * s, y + 12 * s, 6 * s, 14 * s)
  ctx.globalAlpha = 1
  // 塞子
  ctx.fillStyle = '#6b4f1f'
  ctx.fillRect(x + 12 * s, y + 10 * s, 8 * s, 3 * s)
  // 標籤
  ctx.fillStyle = '#fff'
  ctx.fillRect(x + 13 * s, y + 14 * s, 6 * s, 8 * s)
  ctx.fillStyle = '#48c868'
  ctx.font = '6px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('+', x + 16 * s, y + 20 * s)
}

function drawBandage(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.fillStyle = '#f8f8f8'
  ctx.fillRect(x + 10 * s, y + 14 * s, 12 * s, 8 * s)
  ctx.strokeStyle = '#ff6b6b'
  ctx.lineWidth = 1 * s
  ctx.strokeRect(x + 10 * s, y + 14 * s, 12 * s, 8 * s)
  // 紅十字
  ctx.fillStyle = '#ff6b6b'
  ctx.fillRect(x + 15 * s, y + 15 * s, 2 * s, 6 * s)
  ctx.fillRect(x + 13 * s, y + 17 * s, 6 * s, 2 * s)
}

function drawMapFragment(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.fillStyle = '#e8d8a8'
  ctx.fillRect(x + 8 * s, y + 10 * s, 16 * s, 18 * s)
  ctx.strokeStyle = '#a89878'
  ctx.lineWidth = 1 * s
  ctx.strokeRect(x + 8 * s, y + 10 * s, 16 * s, 18 * s)
  // 地圖線條
  ctx.strokeStyle = '#8b6b2a'
  ctx.lineWidth = 1 * s
  ctx.beginPath()
  ctx.moveTo(x + 10 * s, y + 14 * s)
  ctx.lineTo(x + 22 * s, y + 14 * s)
  ctx.moveTo(x + 10 * s, y + 18 * s)
  ctx.lineTo(x + 20 * s, y + 22 * s)
  ctx.moveTo(x + 14 * s, y + 12 * s)
  ctx.lineTo(x + 14 * s, y + 26 * s)
  ctx.stroke()
}

function drawRadioParts(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.fillStyle = '#686878'
  ctx.fillRect(x + 8 * s, y + 14 * s, 16 * s, 10 * s)
  ctx.fillStyle = '#484858'
  ctx.fillRect(x + 9 * s, y + 15 * s, 14 * s, 8 * s)
  // 旋鈕
  ctx.fillStyle = '#e8e8e8'
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.arc(x + (12 + i * 5) * s, y + 18 * s, 2 * s, 0, Math.PI * 2)
    ctx.fill()
  }
  // 天線
  ctx.strokeStyle = '#a8a8b8'
  ctx.lineWidth = 1 * s
  ctx.beginPath()
  ctx.moveTo(x + 22 * s, y + 14 * s)
  ctx.lineTo(x + 24 * s, y + 6 * s)
  ctx.stroke()
}

function drawSignalFlare(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.fillStyle = '#e84828'
  ctx.fillRect(x + 13 * s, y + 10 * s, 6 * s, 18 * s)
  ctx.fillStyle = '#ff8800'
  ctx.fillRect(x + 13 * s, y + 10 * s, 6 * s, 6 * s)
  // 火花
  const time = Date.now() / 50
  ctx.fillStyle = '#ffff00'
  for (let i = 0; i < 4; i++) {
    const angle = time + i * Math.PI / 2
    const px = x + 16 * s + Math.cos(angle) * 8 * s
    const py = y + 8 * s + Math.sin(angle) * 8 * s
    ctx.beginPath()
    ctx.arc(px, py, 1.5 * s, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawRaftBlueprint(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 32
  ctx.fillStyle = '#e8d8a8'
  ctx.fillRect(x + 6 * s, y + 12 * s, 20 * s, 14 * s)
  ctx.strokeStyle = '#8b6b2a'
  ctx.lineWidth = 1 * s
  ctx.strokeRect(x + 6 * s, y + 12 * s, 20 * s, 14 * s)
  // 簡單筏子圖
  ctx.fillStyle = '#6b4f1f'
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(x + 8 * s + i * 4 * s, y + 14 * s, 3 * s, 10 * s)
  }
  // 桅杆
  ctx.strokeStyle = '#4b3f1f'
  ctx.lineWidth = 2 * s
  ctx.beginPath()
  ctx.moveTo(x + 16 * s, y + 12 * s)
  ctx.lineTo(x + 16 * s, y + 4 * s)
  ctx.stroke()
  // 帆
  ctx.fillStyle = '#f8f8e8'
  ctx.beginPath()
  ctx.moveTo(x + 16 * s, y + 4 * s)
  ctx.lineTo(x + 22 * s, y + 8 * s)
  ctx.lineTo(x + 16 * s, y + 12 * s)
  ctx.closePath()
  ctx.fill()
}