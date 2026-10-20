// 事件系統
import { Game } from '../core/Game.js'
import { GameEvent, EventChoice, EventCondition, EventEffect, EventType, EndingType, ItemType } from '../core/Types.js'
import { SeededRandom } from '../utils/SeededRandom.js'

export class EventSystem {
  private game: Game
  private events: Map<string, GameEvent> = new Map()
  private currentEvent: GameEvent | null = null
  private currentChoiceIndex: number = 0
  private random: SeededRandom
  private eventHistory: string[] = []

  constructor(game: Game) {
    this.game = game
    this.random = new SeededRandom('events')
  }

  /** 載入事件資料 */
  async loadEvents(): Promise<void> {
    // 定義所有事件
    this.registerEvents()
    console.log(`載入事件完成: ${this.events.size} 個`)
  }

  /** 註冊所有事件 */
  private registerEvents(): void {
    // === 開場事件 ===
    this.addEvent(this.createEvent(
      'intro_wakeup',
      EventType.STORY,
      '陌生的海灘',
      '你在陌生的海灘上醒來，海浪拍打著海岸。記憶模糊，只記得船遭遇了風暴。四周一片寂靜，只有海鳥的叫聲。你必須想辦法生存下去。',
      [
        { id: 'explore', text: '探索周圍環境', effects: [{ type: 'flag', key: 'tutorial_explore', value: true }] },
        { id: 'check_self', text: '檢查自身狀況', effects: [{ type: 'stamina', value: 10, message: '深呼吸，稍微恢復了些體力' }] }
      ],
      false, 100, ['start', 'tutorial']
    ))

    // === 基礎探索事件 ===
    this.addEvent(this.createEvent(
      'beach_debris',
      EventType.RESOURCE,
      '沖上岸的殘骸',
      '沙灘上散落著一些船隻的殘骸和漂流物，或許能找到有用的東西。',
      [
        { id: 'search', text: '仔細搜尋', effects: [
          { type: 'item', key: 'wood', value: 2 },
          { type: 'item', key: 'fiber', value: 1 },
          { type: 'item', key: 'metal_scrap', value: 1, message: '找到一些金屬碎片！' }
        ]},
        { id: 'ignore', text: '不予理會', effects: [] }
      ],
      true, 30, ['beach', 'resource']
    ))

    this.addEvent(this.createEvent(
      'coconut_tree',
      EventType.RESOURCE,
      '椰子樹叢',
      '發現幾顆成熟的椰子掉在沙灘上，還有一些掛在樹上。',
      [
        { id: 'pickup', text: '撿起地上的椰子', effects: [
          { type: 'item', key: 'coconut', value: 2 },
          { type: 'stamina', value: -2, message: '彎腰撿拾稍微消耗體力' }
        ]},
        { id: 'climb', text: '爬樹摘取 (需較多體力)', effects: [
          { type: 'stamina', value: -10 },
          { type: 'item', key: 'coconut', value: 4 },
          { type: 'item', key: 'fiber', value: 1, message: '順便扯下些纖維' }
        ], conditions: [{ type: 'stamina', operator: 'gte', key: 'stamina', value: 15 }]},
        { id: 'leave', text: '暫時離開', effects: [] }
      ],
      true, 25, ['beach', 'resource', 'food']
    ))

    // === 森林事件 ===
    this.addEvent(this.createEvent(
      'berry_bush',
      EventType.RESOURCE,
      '漿果叢',
      '發現一叢成熟的野生漿果，紅紅的看起來很誘人。',
      [
        { id: 'eat', text: '直接食用', effects: [
          { type: 'item', key: 'berries', value: 5 },
          { type: 'stamina', value: 5, message: '現吃幾顆，恢復些體力' }
        ]},
        { id: 'collect', text: '小心採集帶走', effects: [
          { type: 'item', key: 'berries', value: 8 },
          { type: 'stamina', value: -3 }
        ]},
        { id: 'leave', text: '不確定是否有毒，離開', effects: [] }
      ],
      true, 20, ['forest', 'resource', 'food']
    ))

    this.addEvent(this.createEvent(
      'wild_boar',
      EventType.DANGER,
      '野豬遭遇',
      '灌木叢中竄出一頭野豬，牠盯著你，似乎在保護領地。',
      [
        { id: 'fight', text: '持矛迎戰', effects: [
          { type: 'flag', key: 'combat_wild_boar', value: true }
        ], conditions: [{ type: 'item', operator: 'has', key: 'itemId', value: 'wooden_spear' }]},
        { id: 'fight_bare', text: '正面對抗', effects: [
          { type: 'flag', key: 'combat_wild_boar_bare', value: true }
        ]},
        { id: 'flee', text: '慢慢後退撤離', effects: [
          { type: 'stamina', value: -5, message: '狼狽逃離，消耗體力' }
        ]}
      ],
      true, 15, ['forest', 'danger', 'combat']
    ))

    // === 洞穴事件 ===
    this.addEvent(this.createEvent(
      'cave_entrance',
      EventType.MYSTERY,
      '幽暗洞口',
      '洞穴深處傳來陣陣回響，寒氣從洞口滲出。手邊沒有光源，貿然進入極度危險。',
      [
        { id: 'enter_dark', text: '硬著頭皮進入', effects: [
          { type: 'health', value: -15, message: '黑暗中跌跌撞撞，受了傷' },
          { type: 'item', key: 'stone', value: 3 },
          { type: 'flag', key: 'cave_explored_dark', value: true }
        ]},
        { id: 'enter_torch', text: '點亮火把再進入', effects: [
          { type: 'item', key: 'torch', value: -1 },
          { type: 'item', key: 'stone', value: 5 },
          { type: 'item', key: 'crystal', value: 1, message: '在深處發現發光的水晶！' },
          { type: 'flag', key: 'cave_explored_torch', value: true }
        ], conditions: [{ type: 'item', operator: 'has', key: 'itemId', value: 'torch' }]},
        { id: 'mark_return', text: '標記位置，改天再來', effects: [
          { type: 'flag', key: 'cave_marked', value: true },
          { type: 'discover', key: 'cave_location', value: true }
        ]}
      ],
      false, 20, ['cave', 'mystery', 'exploration']
    ))

    // === 廢墟事件 ===
    this.addEvent(this.createEvent(
      'ruins_research',
      EventType.DISCOVERY,
      '古老廢墟',
      '石造建築的殘骸被藤蔓纏繞，牆壁上殘留著模糊的符號。這不是自然形成的。',
      [
        { id: 'investigate', text: '仔細調查符號', effects: [
          { type: 'flag', key: 'ruins_symbols_studied', value: true },
          { type: 'item', key: 'map_fragment', value: 1, message: '在石縫中發現一張舊地圖碎片！' }
        ]},
        { id: 'search_loot', text: '尋找遺留物品', effects: [
          { type: 'item', key: 'metal_scrap', value: 2 },
          { type: 'item', key: 'herbs', value: 1 },
          { type: 'item', key: 'radio_parts', value: 1, message: '奇蹟般地找到收音機零件！' },
          { type: 'item', key: 'raft_blueprint', value: 1, message: '在殘骸底部發現了【筏子設計圖】！' }
        ]},
        { id: 'rest', text: '在廢墟蔭涼處休息', effects: [
          { type: 'stamina', value: 15 },
          { type: 'health', value: 5 }
        ]}
      ],
      false, 15, ['ruins', 'discovery', 'story']
    ))

    // === 叢林事件 ===
    this.addEvent(this.createEvent(
      'jungle_river',
      EventType.RESOURCE,
      '叢林溪流',
      '清澈的溪流穿過叢林，水質看起來不錯，岸邊有不少魚影。',
      [
        { id: 'drink', text: '直接飲水', effects: [
          { type: 'stamina', value: 20 },
          { type: 'health', value: -5, message: '未煮沸的水讓胃部不適' }
        ]},
        { id: 'fish_rod', text: '使用釣魚竿', effects: [
          { type: 'item', key: 'fishing_rod', value: -1 },
          { type: 'item', key: 'fish', value: 3 },
          { type: 'stamina', value: -5 }
        ], conditions: [{ type: 'item', operator: 'has', key: 'itemId', value: 'fishing_rod' }]},
        { id: 'fish_spear', text: '用長矛捕魚', effects: [
          { type: 'item', key: 'fish', value: 2 },
          { type: 'stamina', value: -10 }
        ], conditions: [{ type: 'item', operator: 'has', key: 'itemId', value: 'wooden_spear' }]},
        { id: 'fill_bottle', text: '裝滿水瓶', effects: [
          { type: 'item', key: 'water_bottle', value: 2 },
          { type: 'stamina', value: -2 }
        ], conditions: [{ type: 'item', operator: 'has', key: 'itemId', value: 'water_bottle' }]}
      ],
      true, 18, ['jungle', 'resource', 'water']
    ))

    // === 高山事件 ===
    this.addEvent(this.createEvent(
      'mountain_peak',
      EventType.DISCOVERY,
      '山頂視野',
      '艱難攀爬至山頂，視野極佳。遠處海面上似乎有船隻航行，也許能發送求救信號。',
      [
        { id: 'signal_fire', text: '生火發送煙火信號 (需 10 木材)', effects: [
          { type: 'item', key: 'wood', value: -10 },
          { type: 'flag', key: 'signal_fire_sent', value: true },
          { type: 'ending', key: 'ESCAPE_SIGNAL', value: true, message: '濃煙升起，遠處船隻似乎改變了航向...' }
        ], conditions: [
          { type: 'item', operator: 'gte', key: 'wood', value: 10 }
        ]},
        { id: 'use_flare', text: '發射信號彈', effects: [
          { type: 'item', key: 'signal_flare', value: -1 },
          { type: 'ending', key: 'ESCAPE_SIGNAL', value: true, message: '紅色煙霧劃破天際，直衝雲霄！' }
        ], conditions: [{ type: 'item', operator: 'has', key: 'itemId', value: 'signal_flare' }]},
        { id: 'use_radio', text: '嘗試用收音機聯繫', effects: [
          { type: 'flag', key: 'radio_contact_attempted', value: true },
          { type: 'ending', key: 'ESCAPE_RESCUE', value: true, message: '「這裡是救援直升機，收到請回報座標！」' }
        ], conditions: [
          { type: 'item', operator: 'has', key: 'itemId', value: 'radio_parts' },
          { type: 'flag', operator: 'eq', key: 'radio_repaired', value: true }
        ]},
        { id: 'observe', text: '只是觀望遠方', effects: [
          { type: 'flag', key: 'mountain_peak_visited', value: true },
          { type: 'stamina', value: 10, message: '壯闊景色讓心情舒暢' }
        ]}
      ],
      false, 10, ['mountain', 'story', 'ending']
    ))

    // === 基地事件 ===
    this.addEvent(this.createEvent(
      'base_campfire',
      EventType.STORY,
      '營火旁的夜晚',
      '夜晚降臨，營火噼啪作響。你回顧這幾天的經歷，思考著明天的計畫。',
      [
        { id: 'sleep', text: '好好睡一覺', effects: [
          { type: 'stamina', value: 30 },
          { type: 'health', value: 10 }
        ]},
        { id: 'craft', text: '趁著火光製作工具', effects: [
          { type: 'flag', key: 'open_crafting', value: true }
        ]},
        { id: 'plan', text: '規劃明天路線', effects: [
          { type: 'flag', key: 'route_planned', value: true },
          { type: 'stat', key: 'tilesExplored', value: 0, message: '腦中地圖更清晰了' }
        ]},
        { id: 'reflect', text: '回憶過去，尋找線索', effects: [
          { type: 'flag', key: 'memory_fragment', value: true },
          { type: 'ending', key: 'MYSTERY', value: false, message: '腦海中閃過幾個片段...船名、同伴、那場風暴' }
        ]}
      ],
      true, 50, ['base', 'story', 'rest']
    ))

    // === 天氣事件 ===
    this.addEvent(this.createEvent(
      'storm_approaching',
      EventType.WEATHER,
      '暴風雨來襲',
      '天空迅速陰暗，風浪驟大。暴風雨即將登陸，你必須找個安全地方躲避。',
      [
        { id: 'shelter_base', text: '趕回基地躲避', effects: [
          { type: 'position', key: 'base', value: true },
          { type: 'stamina', value: -15, message: '狂風中艱難趕路' }
        ]},
        { id: 'shelter_cave', text: '就近躲進洞穴', effects: [
          { type: 'health', value: -5, message: '洞穴潮濕寒冷' },
          { type: 'flag', key: 'storm_in_cave', value: true }
        ], conditions: [{ type: 'flag', operator: 'eq', key: 'cave_marked', value: true }]},
        { id: 'shelter_ruins', text: '躲在廢墟下', effects: [
          { type: 'health', value: -10, message: '石塊鬆動砸到你' },
          { type: 'stamina', value: -10 }
        ], conditions: [{ type: 'flag', operator: 'eq', key: 'ruins_symbols_studied', value: true }]},
        { id: 'endure', text: '硬扛在外面', effects: [
          { type: 'health', value: -25, message: '暴雨淋身，狂風吹體' },
          { type: 'stamina', value: -20 }
        ]}
      ],
      true, 10, ['weather', 'danger']
    ))

    // === 結局相關事件 ===
    this.addEvent(this.createEvent(
      'raft_building',
      EventType.STORY,
      '建造筏子',
      '根據設計圖，你開始建造能夠遠航的筏子。這需要大量資源和時間。',
      [
        { id: 'build', text: '開始建造 (需設計圖、木材x30、纖維x20、獸皮x5)', effects: [
          { type: 'item', key: 'raft_blueprint', value: -1 },
          { type: 'item', key: 'wood', value: -30 },
          { type: 'item', key: 'fiber', value: -20 },
          { type: 'item', key: 'hide', value: -5 },
          { type: 'stamina', value: -30 },
          { type: 'ending', key: 'ESCAPE_RAFT', value: true, message: '筏子完成了！你推著它滑入海中，划向地平線...' }
        ], conditions: [
          { type: 'item', operator: 'has', key: 'itemId', value: 'raft_blueprint' },
          { type: 'item', operator: 'gte', key: 'wood', value: 30 },
          { type: 'item', operator: 'gte', key: 'fiber', value: 20 },
          { type: 'item', operator: 'gte', key: 'hide', value: 5 }
        ]},
        { id: 'not_ready', text: '資源不夠，繼續收集', effects: [] }
      ],
      false, 5, ['ending', 'craft', 'escape']
    ))

    this.addEvent(this.createEvent(
      'radio_repair',
      EventType.STORY,
      '修復收音機',
      '你嘗試組裝收音機零件，希望能聯繫外界。',
      [
        { id: 'repair', text: '嘗試修復', effects: [
          { type: 'item', key: 'radio_parts', value: -3 },
          { type: 'item', key: 'metal_scrap', value: -5 },
          { type: 'stamina', value: -20 },
          { type: 'flag', key: 'radio_repaired', value: true },
          { type: 'stat', key: 'itemsCrafted', value: 1, message: '收音機修好了！現在需要找高處發射訊號。' }
        ], conditions: [
          { type: 'item', operator: 'gte', key: 'radio_parts', value: 3 },
          { type: 'item', operator: 'gte', key: 'metal_scrap', value: 5 }
        ]},
        { id: 'wait', text: '再找找零件', effects: [] }
      ],
      false, 8, ['craft', 'story', 'escape']
    ))

    // === 隨機小事件 ===
    this.addRandomEvents()
  }

  /** 添加隨機小事件 */
  private addRandomEvents(): void {
    // 發現物品
    this.addEvent(this.createEvent(
      'random_find_wood',
      EventType.RESOURCE,
      '發現乾枯樹枝',
      '地上散落著幾根乾枯的樹枝，當柴火或材料不錯。',
      [
        { id: 'take', text: '撿起來', effects: [{ type: 'item', key: 'wood', value: 2 }] },
        { id: 'leave', text: '不需要', effects: [] }
      ],
      true, 40, ['random', 'resource']
    ))

    this.addEvent(this.createEvent(
      'random_find_stone',
      EventType.RESOURCE,
      '尖銳石塊',
      '一塊邊緣鋒利的石頭，可當簡易切割工具。',
      [
        { id: 'take', text: '收集', effects: [{ type: 'item', key: 'stone', value: 2 }] },
        { id: 'leave', text: '略過', effects: [] }
      ],
      true, 35, ['random', 'resource']
    ))

    // 受傷事件
    this.addEvent(this.createEvent(
      'random_trip',
      EventType.DANGER,
      '腳下一滑',
      '地形崎嶇，你不小心絆了一跤。',
      [
        { id: 'hurt', text: '忍痛繼續', effects: [{ type: 'health', value: -8, message: '膝蓋擦傷了' }] }
      ],
      true, 15, ['random', 'danger']
    ))

    // 好運事件
    this.addEvent(this.createEvent(
      'random_lucky',
      EventType.DISCOVERY,
      '幸運發現',
      '草叢中閃爍著什麼東西，撿起來看看。',
      [
        { id: 'check', text: '查看', effects: [
          { type: 'item', key: this.random.choice(['shell', 'bone', 'herbs', 'metal_scrap']), value: 1 },
          { type: 'stat', key: 'eventsCompleted', value: 1 }
        ]}
      ],
      true, 10, ['random', 'lucky']
    ))
  }

  /** 建立事件物件 */
  private createEvent(
    id: string,
    type: EventType,
    title: string,
    description: string,
    choices: EventChoice[],
    repeatable: boolean,
    weight: number,
    tags: string[]
  ): GameEvent {
    return { id, type, title, description, choices, repeatable, weight, tags }
  }

  /** 註冊事件 */
  private addEvent(event: GameEvent): void {
    this.events.set(event.id, event)
  }

  /** 開始事件 */
  startEvent(eventId: string): void {
    const event = this.events.get(eventId)
    if (!event) {
      console.warn(`事件不存在: ${eventId}`)
      this.game.endEvent()
      return
    }

    // 檢查條件
    if (!this.checkEventConditions(event)) {
      console.log(`事件條件不符合: ${eventId}`)
      this.game.endEvent()
      return
    }

    this.currentEvent = event
    this.currentChoiceIndex = 0
    this.eventHistory.push(eventId)

    // 記錄統計
    this.game['playerSystem'].player.stats.eventsCompleted++
  }

  /** 檢查事件條件 */
  private checkEventConditions(event: GameEvent): boolean {
    if (!event.conditions) return true

    const player = this.game['playerSystem'].player

    for (const cond of event.conditions) {
      if (!this.checkCondition(cond, player)) return false
    }
    return true
  }

  /** 檢查單一條件 */
  private checkCondition(cond: EventCondition, player: any): boolean {
    let actualValue: any

    switch (cond.type) {
      case 'flag':
        actualValue = player.flags[cond.key] ?? false
        break
      case 'item':
        if (cond.operator === 'has') {
          actualValue = this.game['playerSystem'].hasItem(cond.value as string)
        } else if (cond.operator === 'gte') {
          actualValue = this.game['playerSystem'].getItemCount(cond.key as string)
        }
        break
      case 'stat':
        actualValue = player.stats[cond.key as keyof typeof player.stats] ?? 0
        break
      case 'health':
        actualValue = player.health
        break
      case 'stamina':
        actualValue = player.stamina
        break
    }

    return this.compareValues(actualValue, cond.operator, cond.value)
  }

  /** 比較數值 */
  private compareValues(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'eq': return actual === expected
      case 'neq': return actual !== expected
      case 'gt': return actual > expected
      case 'gte': return actual >= expected
      case 'lt': return actual < expected
      case 'lte': return actual <= expected
      case 'has': return actual === true
      case 'lacks': return actual === false
      default: return false
    }
  }

  /** 取得當前事件 */
  getCurrentEvent(): GameEvent | null {
    return this.currentEvent
  }

  /** 取得可用選項 (過濾條件) */
  getAvailableChoices(): EventChoice[] {
    if (!this.currentEvent) return []

    const player = this.game['playerSystem'].player
    return this.currentEvent.choices.filter(choice => {
      if (!choice.conditions) return true
      return choice.conditions.every(cond => this.checkCondition(cond, player))
    })
  }

  /** 選擇選項 */
  chooseOption(choiceId: string): void {
    if (!this.currentEvent) return

    const choice = this.currentEvent.choices.find(c => c.id === choiceId)
    if (!choice) return

    // 應用效果
    const triggeredTransition = this.applyEffects(choice.effects)
    if (triggeredTransition) return

    // 檢查是否有後續事件
    if (choice.nextEventId) {
      this.startEvent(choice.nextEventId)
    } else if (choice.endingType) {
      this.game.victory(choice.endingType)
    } else {
      this.game.endEvent()
    }
  }

  /** 應用效果 (回傳是否已觸發狀態切換如戰鬥/製作/結局) */
  private applyEffects(effects: EventEffect[]): boolean {
    const player = this.game['playerSystem'].player
    let stateChanged = false

    for (const effect of effects) {
      switch (effect.type) {
        case 'health':
          player.health = Math.min(player.maxHealth, Math.max(0, player.health + (effect.value as number)))
          if (effect.message) this.showMessage(effect.message)
          if (player.health <= 0) {
            this.game.gameOver()
            return true
          }
          break
        case 'stamina':
          player.stamina = Math.min(player.maxStamina, Math.max(0, player.stamina + (effect.value as number)))
          if (effect.message) this.showMessage(effect.message)
          break
        case 'item':
          if (typeof effect.key === 'string' && typeof effect.value === 'number') {
            if (effect.value > 0) {
              this.game['playerSystem'].addItem(effect.key, effect.value)
            } else {
              this.game['playerSystem'].removeItem(effect.key, -effect.value)
            }
          }
          if (effect.message) this.showMessage(effect.message)
          break
        case 'flag':
          if (effect.key) {
            player.flags[effect.key] = effect.value as boolean
            if (effect.key.startsWith('combat_') && effect.value === true) {
              const enemyId = effect.key.replace('combat_', '').replace('_bare', '')
              this.currentEvent = null
              this.game.startCombat(enemyId)
              stateChanged = true
            } else if (effect.key === 'open_crafting' && effect.value === true) {
              player.flags[effect.key] = false
              this.currentEvent = null
              this.game.openCrafting()
              stateChanged = true
            }
          }
          break
        case 'stat':
          if (effect.key && effect.key in player.stats) {
            (player.stats as any)[effect.key] += effect.value as number
          }
          if (effect.message) this.showMessage(effect.message)
          break
        case 'position':
          // 瞬間移動到特定位置 (如基地)
          if (effect.key === 'base') {
            this.moveToBase()
          }
          break
        case 'discover':
          // 標記發現地點
          if (effect.key) player.visitedLocations.add(effect.key)
          break
        case 'ending':
          if (effect.value === true && effect.key) {
            this.currentEvent = null
            this.game.victory(effect.key as EndingType)
            stateChanged = true
          }
          if (effect.message) this.showMessage(effect.message)
          break
        case 'damage':
          if (this.game['playerSystem'].takeDamage(effect.value as number)) {
            return true
          }
          break
        case 'heal':
          this.game['playerSystem'].heal(effect.value as number)
          break
      }
    }
    return stateChanged
  }

  /** 移動到基地 */
  private moveToBase(): void {
    const map = this.game['mapSystem'].getMap()
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        if (map[y][x].type === 99) { // TileType.BASE
          this.game['playerSystem'].setPosition({ x, y })
          this.game['mapSystem'].updateVision()
          return
        }
      }
    }
  }

  /** 顯示訊息 (透過 UI 系統) */
  private showMessage(message: string): void {
    this.game['uiSystem'].addMessage(message)
  }

  /** 更新 */
  update(dt: number): void {
    // 事件系統主要由 UI 驅動
  }

  /** 渲染事件介面 */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this.currentEvent) return

    const { viewWidth, viewHeight } = this.game['renderer'] as any
    const w = viewWidth
    const h = viewHeight

    // 半透明背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
    ctx.fillRect(0, 0, w, h)

    // 事件視窗
    const boxW = Math.min(600, w - 40)
    const boxH = 380
    const boxX = (w - boxW) / 2
    const boxY = (h - boxH) / 2

    // 視窗背景
    const grad = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxH)
    grad.addColorStop(0, '#1a1a2e')
    grad.addColorStop(1, '#0f0f1a')
    ctx.fillStyle = grad
    ctx.fillRect(boxX, boxY, boxW, boxH)

    // 邊框
    ctx.strokeStyle = '#4ecdc4'
    ctx.lineWidth = 2
    ctx.strokeRect(boxX, boxY, boxW, boxH)

    // 標題
    ctx.fillStyle = '#4ecdc4'
    ctx.font = 'bold 24px "Microsoft JhengHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(this.currentEvent.title, w / 2, boxY + 40)

    // 描述
    ctx.fillStyle = '#ddd'
    ctx.font = '16px "Microsoft JhengHei", sans-serif'
    ctx.textAlign = 'left'
    this.wrapText(ctx, this.currentEvent.description, boxX + 30, boxY + 80, boxW - 60, 24)

    // 選項
    const choices = this.getAvailableChoices()
    const startY = boxY + 180
    choices.forEach((choice, i) => {
      const y = startY + i * 50
      const isHovered = i === this.currentChoiceIndex

      if (isHovered) {
        ctx.fillStyle = 'rgba(78, 205, 196, 0.2)'
        ctx.fillRect(boxX + 20, y - 8, boxW - 40, 40)
        ctx.strokeStyle = '#4ecdc4'
        ctx.lineWidth = 1
        ctx.strokeRect(boxX + 20, y - 8, boxW - 40, 40)
      }

      ctx.fillStyle = isHovered ? '#4ecdc4' : '#ddd'
      ctx.font = '18px "Microsoft JhengHei", sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`${i + 1}. ${choice.text}`, boxX + 35, y + 8)
    })

    // 提示
    ctx.fillStyle = '#666'
    ctx.font = '12px "Microsoft JhengHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('按 1-9 選擇，ESC 取消', w / 2, boxY + boxH - 20)
  }

  /** 文字換行繪製 */
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

  /** 處理鍵盤輸入 */
  handleKeyInput(key: string): boolean {
    if (!this.currentEvent) return false

    const choices = this.getAvailableChoices()

    // 數字鍵選擇
    const num = parseInt(key.replace('Digit', ''), 10)
    if (num >= 1 && num <= choices.length) {
      this.chooseOption(choices[num - 1].id)
      return true
    }

    // 方向鍵導航
    if (key === 'ArrowUp' || key === 'KeyW') {
      if (choices.length > 0) {
        this.currentChoiceIndex = (this.currentChoiceIndex - 1 + choices.length) % choices.length
        this.game['audioSystem'].playSFX('menu_select')
      }
      return true
    }
    if (key === 'ArrowDown' || key === 'KeyS') {
      if (choices.length > 0) {
        this.currentChoiceIndex = (this.currentChoiceIndex + 1) % choices.length
        this.game['audioSystem'].playSFX('menu_select')
      }
      return true
    }

    // Enter 確認
    if (key === 'Enter' || key === 'Space') {
      if (choices.length > 0) {
        this.chooseOption(choices[this.currentChoiceIndex].id)
        return true
      }
    }

    // ESC 取消 (若有取消選項)
    if (key === 'Escape') {
      const cancelChoice = choices.find(c => c.id === 'leave' || c.id === 'ignore' || c.id === 'flee' || c.id === 'not_ready' || c.id === 'wait')
      if (cancelChoice) {
        this.chooseOption(cancelChoice.id)
      } else {
        this.game.endEvent()
      }
      return true
    }

    return false
  }

  /** 重置事件系統 */
  reset(): void {
    this.currentEvent = null
    this.currentChoiceIndex = 0
    this.eventHistory = []
  }

  /** 設定當前事件 (讀檔用) */
  setCurrentEvent(eventId: string | undefined): void {
    if (eventId) {
      this.startEvent(eventId)
    }
  }

  /** 取得事件歷史 */
  getHistory(): string[] {
    return [...this.eventHistory]
  }
}