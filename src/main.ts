// 遊戲主入口
import { Game } from './core/Game.js'

// 等待 DOM 就緒
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
  const loading = document.getElementById('loading') as HTMLElement

  // 隱藏載入畫面
  const hideLoading = () => {
    loading.style.opacity = '0'
    loading.style.transition = 'opacity 0.3s'
    setTimeout(() => loading.remove(), 300)
  }

  // 初始化遊戲
  const game = new Game(canvas)
  game.init().then(() => {
    hideLoading()
    game.start()
  }).catch(err => {
    console.error('遊戲初始化失敗:', err)
    loading.textContent = '初始化失敗，請重新整理'
    loading.style.color = '#ff6b6b'
  })
})

// 全域錯誤處理
window.addEventListener('error', (e) => {
  console.error('未捕獲錯誤:', e.error)
})

window.addEventListener('unhandledrejection', (e) => {
  console.error('未處理的 Promise 拒絕:', e.reason)
})