// 核心類型定義

/** 遊戲狀態枚舉 */
export enum GameState {
  MAIN_MENU = 'MAIN_MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  EVENT = 'EVENT',
  COMBAT = 'COMBAT',
  CRAFTING = 'CRAFTING',
  INVENTORY = 'INVENTORY',
  SAVE_LOAD = 'SAVE_LOAD',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

/** 方向枚舉 */
export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

/** 地圖格子類型 */
export enum TileType {
  EMPTY = 0,
  SAND = 1,
  GRASS = 2,
  FOREST = 3,
  ROCK = 4,
  WATER = 5,
  CAVE = 6,
  RUINS = 7,
  BEACH = 8,
  JUNGLE = 9,
  MOUNTAIN = 10,
  BASE = 99
}

/** 事件類型 */
export enum EventType {
  DISCOVERY = 'DISCOVERY',
  RESOURCE = 'RESOURCE',
  DANGER = 'DANGER',
  MYSTERY = 'MYSTERY',
  NPC = 'NPC',
  WEATHER = 'WEATHER',
  STORY = 'STORY'
}

/** 物品類型 */
export enum ItemType {
  FOOD = 'FOOD',
  WATER = 'WATER',
  MATERIAL = 'MATERIAL',
  TOOL = 'TOOL',
  WEAPON = 'WEAPON',
  ARMOR = 'ARMOR',
  MEDICINE = 'MEDICINE',
  SPECIAL = 'SPECIAL'
}

/** 結局類型 */
export enum EndingType {
  ESCAPE_RAFT = 'ESCAPE_RAFT',
  ESCAPE_SIGNAL = 'ESCAPE_SIGNAL',
  ESCAPE_RESCUE = 'ESCAPE_RESCUE',
  THRIVE = 'THRIVE',
  PERISH = 'PERISH',
  MYSTERY = 'MYSTERY'
}

/** 向量2D */
export interface Vec2 {
  x: number
  y: number
}

/** 矩形 */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** 遊戲設定 */
export interface GameConfig {
  mapWidth: number
  mapHeight: number
  tileSize: number
  maxStamina: number
  maxHealth: number
  staminaCostMove: number
  staminaCostExplore: number
  healthRegenPerRest: number
  staminaRegenPerRest: number
}

/** 玩家狀態 */
export interface PlayerState {
  position: Vec2
  stamina: number
  maxStamina: number
  health: number
  maxHealth: number
  inventory: InventoryItem[]
  discoveredTiles: Set<string>
  visitedLocations: Set<string>
  flags: Record<string, boolean>
  stats: PlayerStats
}

/** 玩家統計 */
export interface PlayerStats {
  daysSurvived: number
  currentHour: number
  currentMinute: number
  tilesExplored: number
  eventsCompleted: number
  combatsWon: number
  itemsCrafted: number
  endingsUnlocked: EndingType[]
}

/** 背包物品 */
export interface InventoryItem {
  id: string
  type: ItemType
  quantity: number
  durability?: number
  maxDurability?: number
}

/** 地圖格子 */
export interface MapTile {
  type: TileType
  explored: boolean
  visible: boolean
  eventId?: string
  resources?: ResourceNode[]
}

/** 資源節點 */
export interface ResourceNode {
  id: string
  itemId: string
  quantity: number
  respawnDays: number
  lastHarvested: number
}

/** 事件定義 */
export interface GameEvent {
  id: string
  type: EventType
  title: string
  description: string
  conditions?: EventCondition[]
  choices: EventChoice[]
  repeatable: boolean
  weight: number
  tags: string[]
}

/** 事件條件 */
export interface EventCondition {
  type: 'flag' | 'item' | 'stat' | 'location' | 'time' | 'health' | 'stamina'
  key: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'has' | 'lacks'
  value: string | number | boolean
}

/** 事件選項 */
export interface EventChoice {
  id: string
  text: string
  conditions?: EventCondition[]
  effects: EventEffect[]
  nextEventId?: string
  endingType?: EndingType
}

/** 事件效果 */
export interface EventEffect {
  type: 'health' | 'stamina' | 'item' | 'flag' | 'stat' | 'position' | 'discover' | 'craft' | 'damage' | 'heal' | 'ending'
  key?: string
  value: number | string | boolean
  message?: string
}

/** 物品定義 */
export interface ItemDef {
  id: string
  name: string
  description: string
  type: ItemType
  icon: string
  stackable: boolean
  maxStack: number
  durability?: number
  value: number
  effects?: ItemEffect[]
  craftRecipe?: CraftRecipe
}

/** 物品效果 */
export interface ItemEffect {
  type: 'health' | 'stamina' | 'buff' | 'cure'
  value: number
  duration?: number
}

/** 製作配方 */
export interface CraftRecipe {
  id: string
  resultItemId: string
  resultQuantity: number
  ingredients: CraftIngredient[]
  requiredTools?: string[]
  staminaCost: number
  unlockedBy?: string
}

/** 製作材料 */
export interface CraftIngredient {
  itemId: string
  quantity: number
}

/** 存檔資料 */
export interface SaveData {
  version: number
  timestamp: number
  player: PlayerState
  map: MapTile[][]
  currentEventId?: string
  gameState: GameState
  config: GameConfig
  seed: string
}

/** 遊戲種子資料 */
export interface SeedData {
  map: number[][]
  events: Record<string, boolean>
  resources: Record<string, number>
}