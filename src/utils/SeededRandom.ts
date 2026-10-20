// 種子隨機數生成器 (Mulberry32 演算法)

export class SeededRandom {
  private seed: number

  constructor(seed: string | number) {
    if (typeof seed === 'string') {
      this.seed = this.hashString(seed)
    } else {
      this.seed = seed
    }
  }

  /** 字串雜湊轉種子 */
  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash |= 0 // 轉為 32 位整數
    }
    return hash >>> 0 // 無號整數
  }

  /** 設定新種子 */
  setSeed(seed: string | number): void {
    if (typeof seed === 'string') {
      this.seed = this.hashString(seed)
    } else {
      this.seed = seed
    }
  }

  /** 取得下一個隨機數 [0, 1) */
  next(): number {
    this.seed = (this.seed + 0x6D2B79F5) >>> 0
    let t = Math.imul(this.seed ^ (this.seed >>> 15), 1 | this.seed)
    t = Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** 取得範圍內隨機整數 [min, max) */
  nextInt(min: number, max?: number): number {
    if (max === undefined) {
      max = min
      min = 0
    }
    return min + Math.floor(this.next() * (max - min))
  }

  /** 取得範圍內隨機浮點數 [min, max) */
  nextFloat(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  /** 從陣列隨機選取一個元素 */
  choice<T>(arr: T[]): T {
    return arr[this.nextInt(arr.length)]
  }

  /** 洗牌演算法 (Fisher-Yates) */
  shuffle<T>(arr: T[]): T[] {
    const result = [...arr]
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1)
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  /** 布林機率 */
  chance(probability: number): boolean {
    return this.next() < probability
  }

  /** 取得當前種子 */
  getSeed(): number {
    return this.seed
  }

  /** 複製生成器狀態 */
  clone(): SeededRandom {
    const cloned = new SeededRandom(0)
    cloned.seed = this.seed
    return cloned
  }
}

/** 全域預設隨機生成器 (非確定性) */
export const globalRandom = {
  next: () => Math.random(),
  nextInt: (min: number, max?: number) => {
    if (max === undefined) { max = min; min = 0 }
    return min + Math.floor(Math.random() * (max - min))
  },
  nextFloat: (min: number, max: number) => min + Math.random() * (max - min),
  choice: <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)],
  shuffle: <T>(arr: T[]) => {
    const result = [...arr]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  },
  chance: (prob: number) => Math.random() < prob
}