// 音效系統 (使用 Web Audio API 程式化合成 + 支援外部音效檔案)
import { Game } from '../core/Game.js'
import { SFX_IDS, BGM_IDS } from '../data/Constants.js'
import { assetManager } from '../core/AssetManager.js'

type SFX_ID = typeof SFX_IDS[keyof typeof SFX_IDS]
type BGM_ID = typeof BGM_IDS[keyof typeof BGM_IDS]

interface SoundConfig {
  type: 'oscillator' | 'noise' | 'sequence'
  frequency?: number | number[]
  duration: number
  envelope: { attack: number; decay: number; sustain: number; release: number }
  gain: number
  filter?: { type: BiquadFilterType; frequency: number; Q: number }
  sequence?: Array<{ freq: number; dur: number; delay: number }>
}

export class AudioSystem {
  private game: Game
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private bgmGain: GainNode | null = null
  private currentBGM: BGM_ID | null = null
  private bgmSource: AudioBufferSourceNode | null = null
  private enabled: boolean = true
  private masterVolume: number = 0.5
  private sfxVolume: number = 0.5
  private bgmVolume: number = 0.3

  // 音效定義 (程式化合成參數)
  private sfxDefs: Record<SFX_ID, SoundConfig> = {
    move: {
      type: 'oscillator',
      frequency: 200,
      duration: 0.08,
      envelope: { attack: 0.005, decay: 0.05, sustain: 0, release: 0.02 },
      gain: 0.15,
      filter: { type: 'lowpass', frequency: 800, Q: 1 }
    },
    explore: {
      type: 'sequence',
      duration: 0.4,
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.1, release: 0.2 },
      gain: 0.2,
      sequence: [
        { freq: 400, dur: 0.1, delay: 0 },
        { freq: 500, dur: 0.1, delay: 0.1 },
        { freq: 600, dur: 0.15, delay: 0.2 }
      ]
    },
    pickup: {
      type: 'sequence',
      duration: 0.3,
      envelope: { attack: 0.01, decay: 0.08, sustain: 0.1, release: 0.1 },
      gain: 0.25,
      sequence: [
        { freq: 600, dur: 0.08, delay: 0 },
        { freq: 800, dur: 0.08, delay: 0.08 },
        { freq: 1000, dur: 0.12, delay: 0.16 }
      ]
    },
    craft: {
      type: 'sequence',
      duration: 0.5,
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.1, release: 0.2 },
      gain: 0.2,
      sequence: [
        { freq: 300, dur: 0.1, delay: 0 },
        { freq: 400, dur: 0.1, delay: 0.1 },
        { freq: 350, dur: 0.1, delay: 0.2 },
        { freq: 500, dur: 0.15, delay: 0.3 }
      ]
    },
    eat: {
      type: 'sequence',
      duration: 0.4,
      envelope: { attack: 0.02, decay: 0.15, sustain: 0.1, release: 0.15 },
      gain: 0.2,
      sequence: [
        { freq: 350, dur: 0.1, delay: 0 },
        { freq: 450, dur: 0.1, delay: 0.12 },
        { freq: 400, dur: 0.15, delay: 0.24 }
      ]
    },
    drink: {
      type: 'sequence',
      duration: 0.35,
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.05, release: 0.1 },
      gain: 0.18,
      sequence: [
        { freq: 500, dur: 0.06, delay: 0 },
        { freq: 700, dur: 0.06, delay: 0.07 },
        { freq: 900, dur: 0.06, delay: 0.14 },
        { freq: 1200, dur: 0.1, delay: 0.21 }
      ]
    },
    hurt: {
      type: 'oscillator',
      frequency: 150,
      duration: 0.3,
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.1, release: 0.2 },
      gain: 0.3,
      filter: { type: 'lowpass', frequency: 400, Q: 2 }
    },
    heal: {
      type: 'sequence',
      duration: 0.6,
      envelope: { attack: 0.05, decay: 0.2, sustain: 0.2, release: 0.3 },
      gain: 0.25,
      sequence: [
        { freq: 400, dur: 0.15, delay: 0 },
        { freq: 500, dur: 0.15, delay: 0.15 },
        { freq: 600, dur: 0.15, delay: 0.3 },
        { freq: 800, dur: 0.2, delay: 0.45 }
      ]
    },
    levelup: {
      type: 'sequence',
      duration: 1.0,
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.1, release: 0.3 },
      gain: 0.3,
      sequence: [
        { freq: 523, dur: 0.1, delay: 0 },    // C5
        { freq: 659, dur: 0.1, delay: 0.1 },  // E5
        { freq: 784, dur: 0.1, delay: 0.2 },  // G5
        { freq: 1047, dur: 0.3, delay: 0.3 }, // C6
        { freq: 1319, dur: 0.4, delay: 0.5 }  // E6
      ]
    },
    event: {
      type: 'sequence',
      duration: 0.5,
      envelope: { attack: 0.02, decay: 0.15, sustain: 0.1, release: 0.2 },
      gain: 0.2,
      sequence: [
        { freq: 440, dur: 0.15, delay: 0 },
        { freq: 550, dur: 0.15, delay: 0.15 },
        { freq: 660, dur: 0.2, delay: 0.3 }
      ]
    },
    combat_start: {
      type: 'sequence',
      duration: 0.8,
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.2 },
      gain: 0.3,
      sequence: [
        { freq: 110, dur: 0.2, delay: 0 },
        { freq: 80, dur: 0.2, delay: 0.2 },
        { freq: 150, dur: 0.2, delay: 0.4 }
      ]
    },
    combat_hit: {
      type: 'noise',
      duration: 0.15,
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
      gain: 0.25,
      filter: { type: 'bandpass', frequency: 2000, Q: 5 }
    },
    combat_win: {
      type: 'sequence',
      duration: 1.2,
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.1, release: 0.4 },
      gain: 0.3,
      sequence: [
        { freq: 523, dur: 0.15, delay: 0 },
        { freq: 659, dur: 0.15, delay: 0.15 },
        { freq: 784, dur: 0.15, delay: 0.3 },
        { freq: 1047, dur: 0.2, delay: 0.45 },
        { freq: 1319, dur: 0.2, delay: 0.65 },
        { freq: 1568, dur: 0.4, delay: 0.85 }
      ]
    },
    combat_lose: {
      type: 'sequence',
      duration: 1.5,
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.2, release: 0.5 },
      gain: 0.3,
      sequence: [
        { freq: 220, dur: 0.4, delay: 0 },
        { freq: 196, dur: 0.4, delay: 0.4 },
        { freq: 165, dur: 0.5, delay: 0.8 },
        { freq: 110, dur: 0.6, delay: 1.2 }
      ]
    },
    game_start: {
      type: 'sequence',
      duration: 1.0,
      envelope: { attack: 0.05, decay: 0.2, sustain: 0.2, release: 0.4 },
      gain: 0.25,
      sequence: [
        { freq: 262, dur: 0.2, delay: 0 },
        { freq: 330, dur: 0.2, delay: 0.2 },
        { freq: 392, dur: 0.2, delay: 0.4 },
        { freq: 523, dur: 0.4, delay: 0.6 }
      ]
    },
    game_over: {
      type: 'sequence',
      duration: 2.0,
      envelope: { attack: 0.1, decay: 0.5, sustain: 0.2, release: 0.8 },
      gain: 0.3,
      sequence: [
        { freq: 220, dur: 0.5, delay: 0 },
        { freq: 196, dur: 0.5, delay: 0.5 },
        { freq: 165, dur: 0.6, delay: 1.0 },
        { freq: 110, dur: 0.8, delay: 1.5 }
      ]
    },
    victory: {
      type: 'sequence',
      duration: 2.5,
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.1, release: 0.5 },
      gain: 0.35,
      sequence: [
        { freq: 523, dur: 0.15, delay: 0 },
        { freq: 659, dur: 0.15, delay: 0.15 },
        { freq: 784, dur: 0.15, delay: 0.3 },
        { freq: 1047, dur: 0.15, delay: 0.45 },
        { freq: 1319, dur: 0.15, delay: 0.6 },
        { freq: 1568, dur: 0.15, delay: 0.75 },
        { freq: 2093, dur: 0.5, delay: 0.9 },
        { freq: 2637, dur: 0.8, delay: 1.4 }
      ]
    },
    menu_select: {
      type: 'oscillator',
      frequency: 800,
      duration: 0.06,
      envelope: { attack: 0.005, decay: 0.04, sustain: 0, release: 0.01 },
      gain: 0.1,
      filter: { type: 'highpass', frequency: 2000, Q: 1 }
    },
    menu_confirm: {
      type: 'sequence',
      duration: 0.2,
      envelope: { attack: 0.01, decay: 0.05, sustain: 0, release: 0.1 },
      gain: 0.15,
      sequence: [
        { freq: 600, dur: 0.08, delay: 0 },
        { freq: 800, dur: 0.1, delay: 0.08 }
      ]
    },
    menu_cancel: {
      type: 'oscillator',
      frequency: 300,
      duration: 0.15,
      envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.05 },
      gain: 0.12,
      filter: { type: 'lowpass', frequency: 500, Q: 1 }
    },
    error: {
      type: 'oscillator',
      frequency: 200,
      duration: 0.2,
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.05, release: 0.1 },
      gain: 0.2,
      filter: { type: 'lowpass', frequency: 300, Q: 3 }
    }
  }

  constructor(game: Game) {
    this.game = game
  }

  /** 初始化音效系統 */
  async init(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.masterGain = this.audioContext.createGain()
      this.sfxGain = this.audioContext.createGain()
      this.bgmGain = this.audioContext.createGain()

      this.masterGain.connect(this.audioContext.destination)
      this.sfxGain.connect(this.masterGain)
      this.bgmGain.connect(this.masterGain)

      this.setMasterVolume(this.masterVolume)
      this.setSfxVolume(this.sfxVolume)
      this.setBgmVolume(this.bgmVolume)

      // 解鎖音效 (需要用戶互動)
      const unlock = async () => {
        if (this.audioContext?.state === 'suspended') {
          await this.audioContext.resume()
        }
        document.removeEventListener('click', unlock)
        document.removeEventListener('keydown', unlock)
      }
      document.addEventListener('click', unlock)
      document.addEventListener('keydown', unlock)

      console.log('音效系統初始化完成')
    } catch (e) {
      console.warn('音效系統初始化失敗，將以靜音模式運行:', e)
      this.enabled = false
    }
  }

  /** 播放音效 (優先使用資產音效檔，回退到程式化合成) */
  playSFX(id: SFX_ID): void {
    if (!this.enabled || !this.audioContext || !this.sfxGain) return

    // 嘗試從資產系統播放音效檔
    const audioAsset = assetManager.getAudio(`sfx_${id}`)
    if (audioAsset) {
      this.playAudioAsset(audioAsset)
      return
    }

    // 回退到程式化合成
    const def = this.sfxDefs[id]
    if (!def) {
      console.warn(`音效不存在: ${id}`)
      return
    }

    const now = this.audioContext.currentTime

    if (def.type === 'oscillator') {
      this.playOscillator(def, now)
    } else if (def.type === 'noise') {
      this.playNoise(def, now)
    } else if (def.type === 'sequence' && def.sequence) {
      this.playSequence(def, now)
    }
  }

  /** 播放音效資產檔案 */
  private playAudioAsset(audio: HTMLAudioElement): void {
    if (!this.audioContext || !this.sfxGain) return

    try {
      // 建立音頻緩衝區源
      const source = this.audioContext.createMediaElementSource(audio)
      const gain = this.audioContext.createGain()
      
      gain.connect(this.sfxGain)
      source.connect(gain)
      
      // 設定音量
      gain.gain.value = this.sfxVolume
      
      // 重置並播放
      audio.currentTime = 0
      audio.play().catch(() => { /* 忽略自動播放限制 */ })
    } catch (e) {
      console.warn('播放音效資產失敗，回退到合成:', e)
    }
  }

  /** 播放單一振盪器音效 */
  private playOscillator(def: SoundConfig, when: number): void {
    if (!this.audioContext || !this.sfxGain) return

    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    const filter = this.audioContext.createBiquadFilter()

    osc.type = 'square'
    osc.frequency.value = def.frequency as number

    if (def.filter) {
      filter.type = def.filter.type
      filter.frequency.value = def.filter.frequency
      filter.Q.value = def.filter.Q
      osc.connect(filter)
      filter.connect(gain)
    } else {
      osc.connect(gain)
    }

    gain.connect(this.sfxGain)

    const env = def.envelope
    const dur = def.duration
    gain.gain.setValueAtTime(0, when)
    gain.gain.linearRampToValueAtTime(def.gain, when + env.attack)
    gain.gain.linearRampToValueAtTime(def.gain * env.sustain, when + env.attack + env.decay)
    gain.gain.linearRampToValueAtTime(0, when + dur)

    osc.start(when)
    osc.stop(when + dur + env.release)
  }

  /** 播放白噪音效 */
  private playNoise(def: SoundConfig, when: number): void {
    if (!this.audioContext || !this.sfxGain) return

    const bufferSize = this.audioContext.sampleRate * def.duration
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const source = this.audioContext.createBufferSource()
    const gain = this.audioContext.createGain()
    const filter = this.audioContext.createBiquadFilter()

    source.buffer = buffer

    if (def.filter) {
      filter.type = def.filter.type
      filter.frequency.value = def.filter.frequency
      filter.Q.value = def.filter.Q
      source.connect(filter)
      filter.connect(gain)
    } else {
      source.connect(gain)
    }

    gain.connect(this.sfxGain)

    const env = def.envelope
    const dur = def.duration
    gain.gain.setValueAtTime(0, when)
    gain.gain.linearRampToValueAtTime(def.gain, when + env.attack)
    gain.gain.linearRampToValueAtTime(def.gain * env.sustain, when + env.attack + env.decay)
    gain.gain.linearRampToValueAtTime(0, when + dur)

    source.start(when)
    source.stop(when + dur + env.release)
  }

  /** 播放音序 */
  private playSequence(def: SoundConfig, when: number): void {
    if (!def.sequence) return

    for (const note of def.sequence) {
      const noteTime = when + note.delay
      const noteDef: SoundConfig = {
        ...def,
        type: 'oscillator',
        frequency: note.freq,
        duration: note.dur
      }
      this.playOscillator(noteDef, noteTime)
    }
  }

  /** 播放背景音樂 (優先使用資產音效檔，回退到程式化生成) */
  playBGM(id: BGM_ID): void {
    if (!this.enabled || !this.audioContext || !this.bgmGain) return

    this.stopBGM()

    // 嘗試從資產系統播放 BGM 檔案
    const audioAsset = assetManager.getAudio(`bgm_${id}`)
    if (audioAsset) {
      this.playBGMAsset(audioAsset)
      this.currentBGM = id
      return
    }

    // 回退到程式化生成
    this.currentBGM = id
    const pattern = this.getBGMPattern(id)
    this.playBGMLoop(pattern)
  }

  /** 播放 BGM 資產檔案 */
  private playBGMAsset(audio: HTMLAudioElement): void {
    if (!this.audioContext || !this.bgmGain) return

    try {
      const source = this.audioContext.createMediaElementSource(audio)
      const gain = this.audioContext.createGain()
      
      gain.connect(this.bgmGain)
      source.connect(gain)
      
      gain.gain.value = this.bgmVolume
      audio.loop = true
      audio.currentTime = 0
      audio.play().catch(() => { /* 忽略自動播放限制 */ })
    } catch (e) {
      console.warn('播放 BGM 資產失敗，回退到合成:', e)
    }
  }

  /** 取得 BGM 模式 */
  private getBGMPattern(id: BGM_ID): { notes: number[]; tempo: number; rhythm: number[] } {
    switch (id) {
      case BGM_IDS.mainMenu:
        return {
          notes: [262, 330, 392, 523, 392, 330, 262, 220], // C4 E4 G4 C5 G4 E4 C4 A3
          tempo: 80,
          rhythm: [1, 1, 1, 1, 1, 1, 2, 2]
        }
      case BGM_IDS.exploration:
        return {
          notes: [220, 262, 330, 392, 440, 392, 330, 262], // A3 C4 E4 G4 A4 G4 E4 C4
          tempo: 70,
          rhythm: [1, 0.5, 0.5, 1, 1, 0.5, 0.5, 2]
        }
      case BGM_IDS.tension:
        return {
          notes: [110, 123, 131, 147, 165, 147, 131, 123], // A2 B2 C3 D3 E3 D3 C3 B2
          tempo: 120,
          rhythm: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
        }
      case BGM_IDS.combat:
        return {
          notes: [110, 110, 147, 110, 110, 165, 110, 110], // 重複低音
          tempo: 140,
          rhythm: [0.25, 0.25, 0.5, 0.25, 0.25, 0.5, 0.25, 0.25]
        }
      case BGM_IDS.ending:
        return {
          notes: [262, 330, 392, 523, 659, 784, 1047, 1047],
          tempo: 60,
          rhythm: [1, 1, 1, 1, 1, 1, 2, 2]
        }
      default:
        return { notes: [262], tempo: 120, rhythm: [1] }
    }
  }

  /** 播放 BGM 循環 */
  private playBGMLoop(pattern: { notes: number[]; tempo: number; rhythm: number[] }): void {
    if (!this.audioContext || !this.bgmGain) return

    const beatDuration = 60 / pattern.tempo
    let currentTime = this.audioContext.currentTime + 0.1
    let noteIndex = 0

    const scheduleNext = () => {
      if (!this.currentBGM || this.audioContext?.state !== 'running') return

      const note = pattern.notes[noteIndex % pattern.notes.length]
      const rhythm = pattern.rhythm[noteIndex % pattern.rhythm.length]
      const dur = beatDuration * rhythm * 0.8

      this.playBGMNote(note, currentTime, dur, this.bgmGain)

      currentTime += beatDuration * rhythm
      noteIndex++

      // 排程下一個音符
      const delay = (currentTime - this.audioContext!.currentTime) * 1000
      if (delay < 2000) {
        setTimeout(scheduleNext, Math.max(0, delay - 50))
      } else {
        // 如果落後太多，重新同步
        currentTime = this.audioContext!.currentTime + 0.1
        setTimeout(scheduleNext, 100)
      }
    }

    scheduleNext()
  }

  /** 播放單一 BGM 音符 */
  private playBGMNote(freq: number, when: number, dur: number, gainNode: GainNode | null): void {
    if (!this.audioContext || !gainNode) return

    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    const filter = this.audioContext.createBiquadFilter()

    osc.type = 'sine'
    osc.frequency.value = freq

    filter.type = 'lowpass'
    filter.frequency.value = 1200
    filter.Q.value = 1

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(gainNode)

    gain.gain.setValueAtTime(0, when)
    gain.gain.linearRampToValueAtTime(0.08, when + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, when + dur)

    osc.start(when)
    osc.stop(when + dur + 0.1)
  }

  /** 停止 BGM */
  stopBGM(): void {
    // 停止資產 BGM
    if (this.currentBGM) {
      const audioAsset = assetManager.getAudio(`bgm_${this.currentBGM}`)
      if (audioAsset) {
        audioAsset.pause()
        audioAsset.currentTime = 0
      }
    }
    
    this.currentBGM = null
    // 簡單做法：音量淡出
    if (this.bgmGain && this.audioContext) {
      const now = this.audioContext.currentTime
      this.bgmGain.gain.linearRampToValueAtTime(0, now + 0.5)
      setTimeout(() => {
        if (this.bgmGain) this.bgmGain.gain.value = this.bgmVolume
      }, 500)
    }
  }

  /** 設定總音量 */
  setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol))
    if (this.masterGain) this.masterGain.gain.value = this.masterVolume
  }

  /** 設定音效音量 */
  setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol))
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume
  }

  /** 設定 BGM 音量 */
  setBgmVolume(vol: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, vol))
    if (this.bgmGain) this.bgmGain.gain.value = this.bgmVolume
  }

  /** 切換靜音 */
  toggleMute(): boolean {
    this.enabled = !this.enabled
    if (this.masterGain) this.masterGain.gain.value = this.enabled ? this.masterVolume : 0
    return this.enabled
  }

  /** 是否啟用 */
  isEnabled(): boolean {
    return this.enabled
  }

  /** 取得音量設定 */
  getVolumes(): { master: number; sfx: number; bgm: number } {
    return { master: this.masterVolume, sfx: this.sfxVolume, bgm: this.bgmVolume }
  }

  /** 釋放資源 */
  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}