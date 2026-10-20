// 物品定義資料
import { ItemDef, ItemType, CraftRecipe, CraftIngredient } from '../core/Types.js'

/** 所有物品定義 */
export const ITEM_DEFS: Record<string, ItemDef> = {
  // === 食物 ===
  coconut: {
    id: 'coconut',
    name: '椰子',
    description: '新鮮的椰子，可補充水分和少量體力',
    type: ItemType.FOOD,
    icon: 'coconut',
    stackable: true,
    maxStack: 10,
    value: 5,
    effects: [
      { type: 'stamina', value: 15 },
      { type: 'health', value: 5 }
    ]
  },
  berries: {
    id: 'berries',
    name: '野生漿果',
    description: '甜酸的漿果，恢復少量體力',
    type: ItemType.FOOD,
    icon: 'berries',
    stackable: true,
    maxStack: 20,
    value: 3,
    effects: [{ type: 'stamina', value: 10 }]
  },
  fish: {
    id: 'fish',
    name: '生魚肉',
    description: '剛釣上來的魚，生吃可能不舒服',
    type: ItemType.FOOD,
    icon: 'fish',
    stackable: true,
    maxStack: 5,
    value: 8,
    effects: [
      { type: 'stamina', value: 20 },
      { type: 'health', value: -5 }
    ]
  },
  cooked_fish: {
    id: 'cooked_fish',
    name: '烤魚',
    description: '香噴噴的烤魚，大幅恢復體力與健康',
    type: ItemType.FOOD,
    icon: 'cooked_fish',
    stackable: true,
    maxStack: 5,
    value: 20,
    effects: [
      { type: 'stamina', value: 30 },
      { type: 'health', value: 15 }
    ],
    craftRecipe: {
      id: 'craft_cooked_fish',
      resultItemId: 'cooked_fish',
      resultQuantity: 1,
      ingredients: [
        { itemId: 'fish', quantity: 1 },
        { itemId: 'wood', quantity: 1 }
      ],
      staminaCost: 3
    }
  },
  mushroom: {
    id: 'mushroom',
    name: '野菇',
    description: '不知名的蘑菇，食用有風險',
    type: ItemType.FOOD,
    icon: 'mushroom',
    stackable: true,
    maxStack: 10,
    value: 10,
    effects: [
      { type: 'stamina', value: 5 },
      { type: 'health', value: 10 }
    ]
  },
  meat: {
    id: 'meat',
    name: '生獸肉',
    description: '狩獵獲得的生肉，最好烤熟再食用',
    type: ItemType.FOOD,
    icon: 'meat',
    stackable: true,
    maxStack: 10,
    value: 12,
    effects: [
      { type: 'stamina', value: 20 },
      { type: 'health', value: -5 }
    ]
  },
  cooked_meat: {
    id: 'cooked_meat',
    name: '烤獸肉',
    description: '香氣四溢的烤肉，大幅恢復體力與健康',
    type: ItemType.FOOD,
    icon: 'cooked_meat',
    stackable: true,
    maxStack: 10,
    value: 30,
    effects: [
      { type: 'stamina', value: 40 },
      { type: 'health', value: 20 }
    ],
    craftRecipe: {
      id: 'craft_cooked_meat',
      resultItemId: 'cooked_meat',
      resultQuantity: 1,
      ingredients: [
        { itemId: 'meat', quantity: 1 },
        { itemId: 'wood', quantity: 1 }
      ],
      staminaCost: 3
    }
  },

  // === 水源 ===
  water_bottle: {
    id: 'water_bottle',
    name: '水瓶',
    description: '裝滿乾淨水的瓶子',
    type: ItemType.WATER,
    icon: 'water_bottle',
    stackable: true,
    maxStack: 5,
    value: 10,
    effects: [{ type: 'stamina', value: 25 }]
  },
  coconut_water: {
    id: 'coconut_water',
    name: '椰子水',
    description: '天然電解質飲料',
    type: ItemType.WATER,
    icon: 'coconut_water',
    stackable: true,
    maxStack: 10,
    value: 8,
    effects: [
      { type: 'stamina', value: 20 },
      { type: 'health', value: 5 }
    ]
  },

  // === 材料 ===
  wood: {
    id: 'wood',
    name: '木材',
    description: '結實的木材，製作工具和建築的基礎材料',
    type: ItemType.MATERIAL,
    icon: 'wood',
    stackable: true,
    maxStack: 50,
    value: 2
  },
  stone: {
    id: 'stone',
    name: '石頭',
    description: '鋒利的石頭，可製作基礎工具',
    type: ItemType.MATERIAL,
    icon: 'stone',
    stackable: true,
    maxStack: 50,
    value: 2
  },
  fiber: {
    id: 'fiber',
    name: '植物纖維',
    description: '韌性強的纖維，可製作繩索和編織品',
    type: ItemType.MATERIAL,
    icon: 'fiber',
    stackable: true,
    maxStack: 30,
    value: 3
  },
  hide: {
    id: 'hide',
    name: '獸皮',
    description: '動物的皮毛，可製作防具和衣物',
    type: ItemType.MATERIAL,
    icon: 'hide',
    stackable: true,
    maxStack: 20,
    value: 15
  },
  bone: {
    id: 'bone',
    name: '骨頭',
    description: '堅硬的骨頭，可製作針、魚鉤等精細工具',
    type: ItemType.MATERIAL,
    icon: 'bone',
    stackable: true,
    maxStack: 20,
    value: 10
  },
  metal_scrap: {
    id: 'metal_scrap',
    name: '金屬碎片',
    description: '鏽蝕的金屬片，高級製作的關鍵材料',
    type: ItemType.MATERIAL,
    icon: 'metal_scrap',
    stackable: true,
    maxStack: 30,
    value: 25
  },
  crystal: {
    id: 'crystal',
    name: '水晶碎片',
    description: '發著微光的水晶，傳說能增強信號',
    type: ItemType.MATERIAL,
    icon: 'crystal',
    stackable: true,
    maxStack: 10,
    value: 100
  },
  shell: {
    id: 'shell',
    name: '貝殼',
    description: '美麗的貝殼，可裝飾或製作工具',
    type: ItemType.MATERIAL,
    icon: 'shell',
    stackable: true,
    maxStack: 30,
    value: 5
  },
  herbs: {
    id: 'herbs',
    name: '藥草',
    description: '具有藥效的植物，製作藥物必備',
    type: ItemType.MATERIAL,
    icon: 'herbs',
    stackable: true,
    maxStack: 20,
    value: 15
  },

  // === 工具 ===
  stone_axe: {
    id: 'stone_axe',
    name: '石斧',
    description: '基礎伐木工具，加快採集木材速度',
    type: ItemType.TOOL,
    icon: 'stone_axe',
    stackable: false,
    maxStack: 1,
    durability: 50,
    value: 30,
    craftRecipe: {
      id: 'craft_stone_axe',
      resultItemId: 'stone_axe',
      resultQuantity: 1,
      ingredients: [
        { itemId: 'wood', quantity: 3 },
        { itemId: 'stone', quantity: 2 },
        { itemId: 'fiber', quantity: 2 }
      ],
      staminaCost: 10
    }
  },
  stone_pickaxe: {
    id: 'stone_pickaxe',
    name: '石鎬',
    description: '基礎採礦工具，加快採集石頭和金屬速度',
    type: ItemType.TOOL,
    icon: 'stone_pickaxe',
    stackable: false,
    maxStack: 1,
    durability: 50,
    value: 30,
    craftRecipe: {
      id: 'craft_stone_pickaxe',
      resultItemId: 'stone_pickaxe',
      resultQuantity: 1,
      ingredients: [
        { itemId: 'wood', quantity: 2 },
        { itemId: 'stone', quantity: 3 },
        { itemId: 'fiber', quantity: 2 }
      ],
      staminaCost: 10
    }
  },
  stone_knife: {
    id: 'stone_knife',
    name: '石刀',
    description: '鋒利的石刀，處理獵物和製作精細物品',
    type: ItemType.TOOL,
    icon: 'stone_knife',
    stackable: false,
    maxStack: 1,
    durability: 40,
    value: 25,
    craftRecipe: {
      id: 'craft_stone_knife',
      resultItemId: 'stone_knife',
      resultQuantity: 1,
      ingredients: [
        { itemId: 'stone', quantity: 2 },
        { itemId: 'fiber', quantity: 1 }
      ],
      staminaCost: 5
    }
  },
  wooden_spear: {
    id: 'wooden_spear',
    name: '木矛',
    description: '簡單的刺擊武器，比徒手強',
    type: ItemType.WEAPON,
    icon: 'wooden_spear',
    stackable: false,
    maxStack: 1,
    durability: 30,
    value: 20,
    craftRecipe: {
      id: 'craft_wooden_spear',
      resultItemId: 'wooden_spear',
      resultQuantity: 1,
      ingredients: [
        { itemId: 'wood', quantity: 4 },
        { itemId: 'stone', quantity: 1 },
        { itemId: 'fiber', quantity: 2 }
      ],
      staminaCost: 8
    }
  },
  fishing_rod: {
    id: 'fishing_rod',
    name: '釣魚竿',
    description: '可在水邊釣魚，穩定獲得食物來源',
    type: ItemType.TOOL,
    icon: 'fishing_rod',
    stackable: false,
    maxStack: 1,
    durability: 40,
    value: 40,
    craftRecipe: {
      id: 'craft_fishing_rod',
      resultItemId: 'fishing_rod',
      resultQuantity: 1,
      ingredients: [
        { itemId: 'wood', quantity: 5 },
        { itemId: 'fiber', quantity: 3 },
        { itemId: 'bone', quantity: 1 }
      ],
      requiredTools: ['stone_knife'],
      staminaCost: 15
    }
  },
  torch: {
    id: 'torch',
    name: '火把',
    description: '照亮黑暗的洞穴，驅趕野獸',
    type: ItemType.TOOL,
    icon: 'torch',
    stackable: true,
    maxStack: 5,
    durability: 20,
    value: 15,
    craftRecipe: {
      id: 'craft_torch',
      resultItemId: 'torch',
      resultQuantity: 2,
      ingredients: [
        { itemId: 'wood', quantity: 2 },
        { itemId: 'fiber', quantity: 1 }
      ],
      staminaCost: 3
    }
  },

  // === 武器 ===
  spear: {
    id: 'spear',
    name: '長矛',
    description: '改良的長矛，攻擊距離較長',
    type: ItemType.WEAPON,
    icon: 'spear',
    stackable: false,
    maxStack: 1,
    durability: 60,
    value: 60,
    craftRecipe: {
      id: 'craft_spear',
      resultItemId: 'spear',
      resultQuantity: 1,
      ingredients: [
        { itemId: 'wood', quantity: 6 },
        { itemId: 'stone', quantity: 2 },
        { itemId: 'fiber', quantity: 3 },
        { itemId: 'hide', quantity: 1 }
      ],
      requiredTools: ['stone_axe', 'stone_knife'],
      staminaCost: 20,
      unlockedBy: 'wooden_spear'
    }
  },
  bow: {
    id: 'bow',
    name: '長弓',
    description: '遠程武器，可安全攻擊敵人',
    type: ItemType.WEAPON,
    icon: 'bow',
    stackable: false,
    maxStack: 1,
    durability: 50,
    value: 80,
    craftRecipe: {
      id: 'craft_bow',
      resultItemId: 'bow',
      resultQuantity: 1,
      ingredients: [
        { itemId: 'wood', quantity: 8 },
        { itemId: 'fiber', quantity: 5 },
        { itemId: 'bone', quantity: 2 }
      ],
      requiredTools: ['stone_knife'],
      staminaCost: 25
    }
  },

  // === 防具 ===
  leather_armor: {
    id: 'leather_armor',
    name: '皮甲',
    description: '用獸皮製成的護甲，提供基本防禦',
    type: ItemType.ARMOR,
    icon: 'leather_armor',
    stackable: false,
    maxStack: 1,
    durability: 80,
    value: 70,
    craftRecipe: {
      id: 'craft_leather_armor',
      resultItemId: 'leather_armor',
      resultQuantity: 1,
      ingredients: [
        { itemId: 'hide', quantity: 5 },
        { itemId: 'fiber', quantity: 3 }
      ],
      requiredTools: ['stone_knife'],
      staminaCost: 20
    }
  },
  wooden_shield: {
    id: 'wooden_shield',
    name: '木盾',
    description: '簡單的木盾，可格擋部分傷害',
    type: ItemType.ARMOR,
    icon: 'wooden_shield',
    stackable: false,
    maxStack: 1,
    durability: 40,
    value: 40,
    craftRecipe: {
      id: 'craft_wooden_shield',
      resultItemId: 'wooden_shield',
      resultQuantity: 1,
      ingredients: [
        { itemId: 'wood', quantity: 6 },
        { itemId: 'fiber', quantity: 2 }
      ],
      requiredTools: ['stone_axe'],
      staminaCost: 15
    }
  },

  // === 藥物 ===
  herbal_medicine: {
    id: 'herbal_medicine',
    name: '草藥',
    description: '用藥草調製的簡單藥劑，恢復健康',
    type: ItemType.MEDICINE,
    icon: 'herbal_medicine',
    stackable: true,
    maxStack: 10,
    value: 30,
    effects: [{ type: 'health', value: 30 }],
    craftRecipe: {
      id: 'craft_herbal_medicine',
      resultItemId: 'herbal_medicine',
      resultQuantity: 1,
      ingredients: [
        { itemId: 'herbs', quantity: 3 },
        { itemId: 'water_bottle', quantity: 1 }
      ],
      staminaCost: 5
    }
  },
  bandage: {
    id: 'bandage',
    name: '繃帶',
    description: '簡單的繃帶，止血並緩慢恢復健康',
    type: ItemType.MEDICINE,
    icon: 'bandage',
    stackable: true,
    maxStack: 10,
    value: 20,
    effects: [{ type: 'health', value: 15 }],
    craftRecipe: {
      id: 'craft_bandage',
      resultItemId: 'bandage',
      resultQuantity: 2,
      ingredients: [
        { itemId: 'fiber', quantity: 3 }
      ],
      staminaCost: 3
    }
  },

  // === 特殊/關鍵道具 ===
  map_fragment: {
    id: 'map_fragment',
    name: '地圖殘頁',
    description: '舊地圖的碎片，標示著某個重要地點',
    type: ItemType.SPECIAL,
    icon: 'map_fragment',
    stackable: false,
    maxStack: 1,
    value: 50
  },
  radio_parts: {
    id: 'radio_parts',
    name: '收音機零件',
    description: '修復收音機所需的關鍵零組件',
    type: ItemType.SPECIAL,
    icon: 'radio_parts',
    stackable: true,
    maxStack: 5,
    value: 100
  },
  signal_flare: {
    id: 'signal_flare',
    name: '信號彈',
    description: '發射後產生強烈光芒，可引來救援',
    type: ItemType.SPECIAL,
    icon: 'signal_flare',
    stackable: true,
    maxStack: 3,
    value: 80,
    craftRecipe: {
      id: 'craft_signal_flare',
      resultItemId: 'signal_flare',
      resultQuantity: 1,
      ingredients: [
        { itemId: 'metal_scrap', quantity: 3 },
        { itemId: 'crystal', quantity: 1 },
        { itemId: 'fiber', quantity: 2 }
      ],
      requiredTools: ['stone_knife'],
      staminaCost: 15
    }
  },
  raft_blueprint: {
    id: 'raft_blueprint',
    name: '筏子設計圖',
    description: '記載著建造大型筏子的詳細圖樣',
    type: ItemType.SPECIAL,
    icon: 'raft_blueprint',
    stackable: false,
    maxStack: 1,
    value: 200
  }
}

/** 取得物品定義 */
export function getItemDef(itemId: string): ItemDef | undefined {
  return ITEM_DEFS[itemId]
}

/** 取得所有可製作物品 */
export function getCraftableItems(): ItemDef[] {
  return Object.values(ITEM_DEFS).filter(item => item.craftRecipe)
}

/** 依類型取得物品 */
export function getItemsByType(type: ItemType): ItemDef[] {
  return Object.values(ITEM_DEFS).filter(item => item.type === type)
}