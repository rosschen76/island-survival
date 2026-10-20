#!/usr/bin/env node
/**
 * 自動化開啟素材包下載頁面 (Playwright)
 * 
 * 使用方式：
 *   node scripts/download-assets-auto.cjs           # 開啟核心素材包頁面
 *   node scripts/download-assets-auto.cjs --all     # 開啟所有素材包頁面
 *   node scripts/download-assets-auto.cjs --headed  # 有頭模式 (預設)
 *   node scripts/download-assets-auto.cjs --headless # 無頭模式 (僅測試連結)
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// 素材包定義
const PACKS = [
  {
    id: 'kenney-pirate-pack',
    name: 'Kenney Pirate Pack',
    url: 'https://kenney.nl/assets/pirate-pack',
    category: 'tiles',
    priority: 'primary',
    handler: 'kenney'
  },
  {
    id: 'kenney-ui-pack',
    name: 'Kenney UI Pack',
    url: 'https://kenney.nl/assets/ui-pack',
    category: 'ui',
    priority: 'primary',
    handler: 'kenney'
  },
  {
    id: 'cainos-basic',
    name: 'Cainos "Pixel Art Top Down Basic"',
    url: 'https://cainos.itch.io/pixel-art-top-down-basic',
    category: 'tiles+characters',
    priority: 'primary',
    handler: 'itch'
  },
  {
    id: 'kenney-tiny-dungeon',
    name: 'Kenney Tiny Dungeon',
    url: 'https://kenney.nl/assets/tiny-dungeon',
    category: 'tiles',
    priority: 'secondary',
    handler: 'kenney'
  },
  {
    id: 'kenney-foliage',
    name: 'Kenney Foliage Sprites',
    url: 'https://kenney.nl/assets/foliage-sprites',
    category: 'objects',
    priority: 'secondary',
    handler: 'kenney'
  },
  {
    id: 'kenney-particles',
    name: 'Kenney Particle Pack',
    url: 'https://kenney.nl/assets/particle-pack',
    category: 'particles',
    priority: 'secondary',
    handler: 'kenney'
  },
  {
    id: 'cainos-tropical',
    name: 'Cainos "Pixel Art Tropical Island"',
    url: 'https://cainos.itch.io/pixel-art-tropical-island',
    category: 'tiles',
    priority: 'secondary',
    handler: 'itch'
  },
  {
    id: 'untied-effects',
    name: 'untiedgames "Super Pixel Effects Gigapack"',
    url: 'https://untiedgames.itch.io/super-pixel-effects-gigapack',
    category: 'particles',
    priority: 'effects',
    handler: 'itch'
  },
  {
    id: 'anokolisa-pack',
    name: 'Anokolisa Free Pixel Art Pack',
    url: 'https://anokolisa.itch.io/free-pixel-art-pack',
    category: 'tiles+characters',
    priority: 'secondary',
    handler: 'itch'
  },
  {
    id: 'opengameart-rpg',
    name: 'OpenGameArt "RPG Tileset"',
    url: 'https://opengameart.org/content/rpg-tileset',
    category: 'tiles',
    priority: 'secondary',
    handler: 'generic'
  }
]

// 目標目錄對應
const TARGET_DIRS = {
  tiles: 'public/assets/tiles',
  characters: 'public/assets/characters',
  objects: 'public/assets/objects',
  ui: 'public/assets/ui',
  particles: 'public/assets/particles',
  audio: 'public/assets/audio'
}

async function main() {
  const args = process.argv.slice(2)
  const allPacks = args.includes('--all')
  const headless = args.includes('--headless')
  const headed = !headless || args.includes('--headed')

  // 篩選要處理的包
  const packsToOpen = allPacks 
    ? PACKS 
    : PACKS.filter(p => p.priority === 'primary')

  console.log(`\n🚀 準備開啟 ${packsToOpen.length} 個素材包下載頁面`)
  console.log(`模式: ${headed ? '有頭 (可見瀏覽器)' : '無頭'}`)
  console.log('='.repeat(60))

  // 檢查 Playwright 是否安裝
  let hasPlaywright = false
  try {
    require.resolve('playwright')
    hasPlaywright = true
  } catch {
    hasPlaywright = false
  }

  if (!hasPlaywright) {
    console.log('\n📦 安裝 Playwright...')
    try {
      execSync('npm install playwright --save-dev', { 
        cwd: __dirname.replace('scripts', ''),
        stdio: 'inherit'
      })
      execSync('npx playwright install chromium', { 
        cwd: __dirname.replace('scripts', ''),
        stdio: 'inherit'
      })
      console.log('✅ Playwright 安裝完成')
    } catch (e) {
      console.error('❌ Playwright 安裝失敗:', e.message)
      console.log('\n請手動執行:')
      console.log('  npm install playwright --save-dev')
      console.log('  npx playwright install chromium')
      process.exit(1)
    }
  }

  const { chromium } = require('playwright')
  
  // 啟動瀏覽器
  const browser = await chromium.launch({ 
    headless: !headed,
    args: ['--start-maximized']
  })

  const context = await browser.newContext({
    viewport: null,
    acceptDownloads: true
  })

  // 設定下載路徑
  const downloadDir = path.join(__dirname, '..', 'downloads')
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true })
  }

  // 建立目標目錄
  for (const dir of Object.values(TARGET_DIRS)) {
    const fullPath = path.join(__dirname, '..', dir)
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true })
    }
  }

  console.log(`\n📁 下載資料夾: ${downloadDir}`)
  console.log(`📁 目標資料夾: ${Object.values(TARGET_DIRS).join(', ')}\n`)

  for (let i = 0; i < packsToOpen.length; i++) {
    const pack = packsToOpen[i]
    console.log(`\n[${i + 1}/${packsToOpen.length}] ${pack.name}`)
    console.log(`  來源: ${pack.url}`)
    console.log(`  類別: ${pack.category}`)

    const page = await context.newPage()
    
    // 設定下載事件監聽
    page.on('download', async (download) => {
      const suggestedName = download.suggestedFilename()
      const savePath = path.join(downloadDir, suggestedName)
      await download.saveAs(savePath)
      console.log(`  💾 下載完成: ${suggestedName} -> ${savePath}`)
      
      // 解壓縮提示
      if (suggestedName.endsWith('.zip')) {
        console.log(`  📦 偵測到 ZIP，建議解壓縮後將檔案移至對應目標資料夾`)
      }
    })

    try {
      if (pack.handler === 'kenney') {
        await handleKenneyPage(page, pack)
      } else if (pack.handler === 'itch') {
        await handleItchPage(page, pack)
      } else if (pack.handler === 'generic') {
        await handleGenericPage(page, pack)
      } else {
        await page.goto(pack.url, { waitUntil: 'networkidle', timeout: 30000 })
      }
      
      console.log(`  ✅ 頁面已開啟，請在瀏覽器中完成下載`)
      
      // 給用戶時間操作
      if (headed && i < packsToOpen.length - 1) {
        console.log(`  ⏳ 等待 3 秒後開啟下一個...`)
        await new Promise(r => setTimeout(r, 3000))
      }
    } catch (e) {
      console.error(`  ❌ 錯誤: ${e.message}`)
    }
  }

  if (headed) {
    console.log('\n' + '='.repeat(60))
    console.log('🎉 所有頁面已開啟完成！')
    console.log('請在瀏覽器中：')
    console.log('  1. Kenney: 勾選 "I agree" → 點擊 Download')
    console.log('  2. itch.io: 點擊 "No thanks, just take me to downloads" → 下載')
    console.log('  3. 解壓縮後，將檔案對應移至 public/assets/ 子目錄')
    console.log('\n對應關係:')
    console.log('  terrain/transitions/objects.png -> public/assets/tiles/')
    console.log('  survivor/character.png -> public/assets/characters/')
    console.log('  trees/rocks/water.png -> public/assets/objects/')
    console.log('  panels/buttons/icons.png -> public/assets/ui/')
    console.log('  effects.png -> public/assets/particles/')
    console.log('  *.ogg -> public/assets/audio/')
    console.log('\n按 Enter 關閉瀏覽器...')
    
    // 等待用戶確認
    await new Promise(resolve => {
      process.stdin.once('data', resolve)
    })
  }

  await browser.close()
  console.log('\n✅ 完成！')
}

// Kenney.nl 頁面處理
async function handleKenneyPage(page, pack) {
  await page.goto(pack.url, { waitUntil: 'networkidle', timeout: 30000 })
  
  // 嘗試找到並點擊同意條款
  try {
    // Kenney 通常有 checkbox 或按鈕
    const agreeSelectors = [
      'input[type="checkbox"][name*="agree" i]',
      'input[type="checkbox"]#agree',
      'button:has-text("I agree")',
      'button:has-text("Agree")',
      'a:has-text("Download")',
      '.download-button',
      '#download-btn'
    ]
    
    for (const selector of agreeSelectors) {
      const element = await page.$(selector)
      if (element) {
        if (selector.includes('checkbox')) {
          await element.check()
          console.log(`  ☑️ 已勾選同意條款`)
        } else {
          await element.click()
          console.log(`  🖱️ 已點擊: ${selector}`)
        }
        await page.waitForTimeout(1000)
        break
      }
    }
  } catch (e) {
    // 忽略錯誤，讓用戶手動處理
  }
  
  // 等待下載按鈕出現
  try {
    await page.waitForSelector('a[href*="download"], button:has-text("Download")', { timeout: 5000 })
  } catch {
    // 可能已經可以直接下載
  }
}

// itch.io 頁面處理
async function handleItchPage(page, pack) {
  await page.goto(pack.url, { waitUntil: 'networkidle', timeout: 30000 })
  
  // 處理 itch.io 的 "No thanks" 按鈕
  try {
    const noThanksSelectors = [
      'a:has-text("No thanks")',
      'button:has-text("No thanks")',
      'a[href*="download"]:has-text("No thanks")',
      '.buy_btn:has-text("No thanks")',
      'a.buy_btn:has-text("Download")'
    ]
    
    for (const selector of noThanksSelectors) {
      const element = await page.$(selector)
      if (element) {
        await element.click()
        console.log(`  🖱️ 已點擊: ${selector}`)
        await page.waitForTimeout(2000)
        break
      }
    }
  } catch (e) {
    // 忽略錯誤
  }
  
  // 等待下載連結
  try {
    await page.waitForSelector('a[href*="download"], .download_link, .game_download', { timeout: 5000 })
  } catch {
    // 可能需要手動操作
  }
}

// 通用頁面處理 (OpenGameArt 等)
async function handleGenericPage(page, pack) {
  await page.goto(pack.url, { waitUntil: 'networkidle', timeout: 30000 })
  
  // 嘗試找下載連結
  try {
    const downloadSelectors = [
      'a[href*="download" i]',
      'a[href$=".zip" i]',
      'a[href$=".png" i]',
      'a:has-text("Download" i)',
      '.download-link',
      '#download'
    ]
    
    for (const selector of downloadSelectors) {
      const element = await page.$(selector)
      if (element) {
        await element.click()
        console.log(`  🖱️ 已點擊下載連結: ${selector}`)
        await page.waitForTimeout(2000)
        break
      }
    }
  } catch (e) {
    // 忽略錯誤
  }
}

// 執行主程式
main().catch(console.error)