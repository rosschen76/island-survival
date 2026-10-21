// 遊戲常數定義
import { GameConfig, TileType } from '../core/Types.js'

/** 遊戲版本 */
export const GAME_VERSION = 1

/** 預設遊戲設定 */
export const DEFAULT_CONFIG: GameConfig = {
  mapWidth: 50,
  mapHeight: 38,
  tileSize: 48,
  maxStamina: 100,
  maxHealth: 100,
  staminaCostMove: 1,
  staminaCostExplore: 5,
  healthRegenPerRest: 10,
  staminaRegenPerRest: 30
}

/** 格子類型顏色與屬性 */
export interface TileSprite {
  color: string
  borderColor: string
  pattern?: 'dots' | 'lines' | 'cross' | 'noise'
  walkable: boolean
  baseStaminaCost: number
  description: string
}

export const TILE_SPRITES: Record<TileType, TileSprite> = {
  [TileType.EMPTY]: {
    color: '#0d0d1a',
    borderColor: '#1a1a2e',
    walkable: false,
    baseStaminaCost: 0,
    description: '未知區域'
  },
  [TileType.SAND]: {
    color: '#e8c56d',
    borderColor: '#d4b05a',
    pattern: 'dots',
    walkable: true,
    baseStaminaCost: 1,
    description: '沙灘 - 容易行走，可能發現貝殼'
  },
  [TileType.GRASS]: {
    color: '#4a7c2e',
    borderColor: '#3a6624',
    pattern: 'lines',
    walkable: true,
    baseStaminaCost: 1,
    description: '草地 - 平坦好走，適合建立營地'
  },
  [TileType.FOREST]: {
    color: '#2d5a1a',
    borderColor: '#1f4212',
    pattern: 'cross',
    walkable: true,
    baseStaminaCost: 2,
    description: '森林 - 樹木茂密，有木材和漿果，但較耗體力'
  },
  [TileType.ROCK]: {
    color: '#6b6b6b',
    borderColor: '#555',
    walkable: true,
    baseStaminaCost: 3,
    description: '岩石地 - 崎嶇難行，可採集石頭和礦石'
  },
  [TileType.WATER]: {
    color: '#1e5f8a',
    borderColor: '#154566',
    pattern: 'lines',
    walkable: false,
    baseStaminaCost: 0,
    description: '海洋/湖泊 - 無法通行，需製作筏子或繞道'
  },
  [TileType.CAVE]: {
    color: '#2a1a1a',
    borderColor: '#1a0f0f',
    walkable: true,
    baseStaminaCost: 3,
    description: '洞穴 - 黑暗危險，可能有寶藏或怪物'
  },
  [TileType.RUINS]: {
    color: '#5a4a3a',
    borderColor: '#44382a',
    pattern: 'cross',
    walkable: true,
    baseStaminaCost: 2,
    description: '廢墟 - 古老建築遺跡，可能有線索或陷阱'
  },
  [TileType.BEACH]: {
    color: '#f0d8a0',
    borderColor: '#dbc088',
    pattern: 'dots',
    walkable: true,
    baseStaminaCost: 1,
    description: '沙灘 - 開闊視野，適合發射求救信號'
  },
  [TileType.JUNGLE]: {
    color: '#1a4a1a',
    borderColor: '#0f330f',
    pattern: 'cross',
    walkable: true,
    baseStaminaCost: 3,
    description: '叢林 - 植被極密，資源豐富但危險重重'
  },
  [TileType.MOUNTAIN]: {
    color: '#4a4a4a',
    borderColor: '#333',
    walkable: true,
    baseStaminaCost: 4,
    description: '高山 - 極度耗費體力，視野最佳，可能有信號'
  },
  [TileType.BASE]: {
    color: '#8b6b2a',
    borderColor: '#6b4f1f',
    walkable: true,
    baseStaminaCost: 0,
    description: '基地 - 你的安全據點，可恢復狀態、製作物品'
  }
}

/** 方向向量 */
export const DIRECTION_VECTORS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 }
} as const

/** 物品稀有度顏色 */
export const RARITY_COLORS = {
  common: '#ffffff',
  uncommon: '#4ecdc4',
  rare: '#6c5ce7',
  epic: '#a29bfe',
  legendary: '#fdcb6e',
  mythic: '#fd79a8'
} as const

/** UI 顏色主題 */
export const UI_COLORS = {
  bg: '#0f0f1a',
  panel: '#1a1a2e',
  panelBorder: '#2a2a4a',
  text: '#eeeeee',
  textDim: '#888888',
  primary: '#4ecdc4',
  primaryHover: '#6fece5',
  danger: '#ff6b6b',
  warning: '#ffe66d',
  success: '#6bcb77',
  health: '#ff6b6b',
  stamina: '#4ecdc4',
  exp: '#a29bfe'
} as const

/** 按鍵綁定 */
export const KEY_BINDINGS = {
  moveUp: ['ArrowUp', 'KeyW'],
  moveDown: ['ArrowDown', 'KeyS'],
  moveLeft: ['ArrowLeft', 'KeyA'],
  moveRight: ['ArrowRight', 'KeyD'],
  interact: ['Space', 'Enter'],
  inventory: ['KeyI'],
  craft: ['KeyC'],
  map: ['KeyM'],
  pause: ['Escape', 'KeyP'],
  rest: ['KeyR'],
  wait: ['KeyZ'],
  debug: ['F1'],
  screenshot: ['F2'],
  quickSave: ['F5'],
  quickLoad: ['F9']
} as const

/** 音效 ID */
export const SFX_IDS = {
  move: 'move',
  explore: 'explore',
  pickup: 'pickup',
  craft: 'craft',
  eat: 'eat',
  drink: 'drink',
  hurt: 'hurt',
  heal: 'heal',
  levelup: 'levelup',
  event: 'event',
  combatStart: 'combat_start',
  combatHit: 'combat_hit',
  combatWin: 'combat_win',
  combatLose: 'combat_lose',
  gameStart: 'game_start',
  gameOver: 'game_over',
  victory: 'victory',
  menuSelect: 'menu_select',
  menuConfirm: 'menu_confirm',
  menuCancel: 'menu_cancel',
  error: 'error'
} as const

/** BGM ID */
export const BGM_IDS = {
  mainMenu: 'main_menu',
  exploration: 'exploration',
  tension: 'tension',
  combat: 'combat',
  ending: 'ending'
} as const