#!/usr/bin/env node
/**
 * 免費像素素材包下載腳本
 * 
 * 使用方式：
 * 1. node scripts/download-assets.js --list    列出所有推薦素材包
 * 2. node scripts/download-assets.js --download <pack-id>  下載特定素材包
 * 3. node scripts/download-assets.js --all     下載所有主要素材包
 * 
 * 注意：部分素材包需要手動從網站下載 (Kenney.nl 需接受條款)
 */

const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// 素材包定義
const ASSET_PACKS = [
  {
    id: 'kenney-pirate-pack',
    name: 'Kenney Pirate Pack',
    author: 'Kenney.nl',
    description: '熱帶島嶼/海盜主題地塊 (沙灘、海水、棕櫚樹、堡壘牆壁)',
    url: 'https://kenney.nl/assets/pirate-pack',
    directUrl: 'https://kenney.nl/assets/pirate-pack/download',
    license: 'CC0',
    tileSize: '16x16 (需 2x 放大至 32x32)',
    category: 'tiles',
    priority: 'primary',
    files: [
      'tiles/terrain.png',
      'tiles/transitions.png',
      'tiles/objects.png'
    ],
    note: '需從 Kenney.nl 手動下載 (接受條款後)。包含完整的熱帶島嶼地形。'
  },
  {
    id: 'kenney-ui-pack',
    name: 'Kenney UI Pack',
    author: 'Kenney.nl',
    description: '400+ UI 元素 (面板、按鈕、圖示、游標、製作介面)',
    url: 'https://kenney.nl/assets/ui-pack',
    directUrl: 'https://kenney.nl/assets/ui-pack/download',
    license: 'CC0',
    tileSize: '各種尺寸',
    category: 'ui',
    priority: 'primary',
    files: [
      'ui/panels.png',
      'ui/buttons.png',
      'ui/icons.png',
      'ui/cursors.png'
    ],
    note: '需從 Kenney.nl 手動下載。最完整的免費 UI 套件。'
  },
  {
    id: 'kenney-tiny-dungeon',
    name: 'Kenney Tiny Dungeon',
    author: 'Kenney.nl',
    description: '地城/洞穴/廢墟地塊與道具 (磚牆、地板、箱子、陷阱)',
    url: 'https://kenney.nl/assets/tiny-dungeon',
    directUrl: 'https://kenney.nl/assets/tiny-dungeon/download',
    license: 'CC0',
    tileSize: '16x16 (需 2x 放大)',
    category: 'tiles',
    priority: 'secondary',
    files: [
      'tiles/dungeon.png',
      'objects/dungeon_props.png'
    ],
    note: '需從 Kenney.nl 手動下載。適合洞穴、廢墟區域。'
  },
  {
    id: 'kenney-foliage',
    name: 'Kenney Foliage Sprites',
    author: 'Kenney.nl',
    description: '樹木、灌木、植被 (松樹、橡樹、灌木、花、草叢)',
    url: 'https://kenney.nl/assets/foliage-sprites',
    directUrl: 'https://kenney.nl/assets/foliage-sprites/download',
    license: 'CC0',
    tileSize: '16x16 (需 2x 放大)',
    category: 'objects',
    priority: 'secondary',
    files: [
      'objects/trees.png',
      'objects/bushes.png',
      'objects/plants.png'
    ],
    note: '需從 Kenney.nl 手動下載。補充熱帶植被。'
  },
  {
    id: 'kenney-particles',
    name: 'Kenney Particle Pack',
    author: 'Kenney.nl',
    description: '粒子效果 (火、煙、火花、血、魔法、塵埃)',
    url: 'https://kenney.nl/assets/particle-pack',
    directUrl: 'https://kenney.nl/assets/particle-pack/download',
    license: 'CC0',
    tileSize: '16x16 和 32x32',
    category: 'particles',
    priority: 'secondary',
    files: [
      'particles/effects.png'
    ],
    note: '需從 Kenney.nl 手動下載。優質粒子素材。'
  },
  {
    id: 'cainos-basic',
    name: 'Cainos "Pixel Art Top Down Basic"',
    author: 'Cainos (itch.io)',
    description: '原生 32x32 地塊、角色(4向)、樹、石、水、懸崖',
    url: 'https://cainos.itch.io/pixel-art-top-down-basic',
    directUrl: 'https://cainos.itch.io/pixel-art-top-down-basic',
    license: 'Name-your-price ($0 可免費下載)',
    tileSize: '32x32 (原生尺寸，完美匹配)',
    category: 'tiles+characters',
    priority: 'primary',
    files: [
      'tiles/terrain.png',
      'characters/survivor.png',
      'objects/trees.png',
      'objects/rocks.png',
      'objects/water.png'
    ],
    note: 'itch.io 可付費 $0 下載。原生 32x32 尺寸最適合本專案。角色含 4 向走路/閒置動畫。'
  },
  {
    id: 'cainos-tropical',
    name: 'Cainos "Pixel Art Tropical Island"',
    author: 'Cainos (itch.io)',
    description: '熱帶島嶼專用: 沙灘、海水轉換、棕櫚樹、珊瑚、貝殼',
    url: 'https://cainos.itch.io/pixel-art-tropical-island',
    directUrl: 'https://cainos.itch.io/pixel-art-tropical-island',
    license: 'Name-your-price ($0)',
    tileSize: '32x32 (原生)',
    category: 'tiles',
    priority: 'secondary',
    files: [
      'tiles/tropical_terrain.png',
      'tiles/tropical_transitions.png',
      'objects/tropical_plants.png'
    ],
    note: 'itch.io 可付費 $0 下載。專為熱帶島嶼設計。'
  },
  {
    id: 'anokolisa-free',
    name: 'Anokolisa Free Pixel Art Pack',
    author: 'Anokolisa (itch.io)',
    description: '角色、怪物、地塊、UI、圖示的綜合包',
    url: 'https://anokolisa.itch.io/free-pixel-art-pack',
    directUrl: 'https://anokolisa.itch.io/free-pixel-art-pack',
    license: 'Free (商業用途需確認)',
    tileSize: '16x16',
    category: 'mixed',
    priority: 'secondary',
    files: [],
    note: 'itch.io 免費下載。素材豐富但需確認授權細節。'
  },
  {
    id: 'untied-effects',
    name: 'Super Pixel Effects Gigapack',
    author: 'untiedgames (itch.io)',
    description: '2000+ 粒子特效 (爆炸、衝擊、魔法、UI 回饋)',
    url: 'https://untiedgames.itch.io/super-pixel-effects-gigapack',
    directUrl: 'https://untiedgames.itch.io/super-pixel-effects-gigapack',
    license: 'Name-your-price ($0)',
    tileSize: '各種',
    category: 'particles',
    priority: 'effects',
    files: [
      'particles/effects_giga.png'
    ],
    note: 'itch.io 可付費 $0 下載。極大量粒子素材。'
  },
  {
    id: 'opengameart-rpg',
    name: 'OpenGameArt "RPG Tileset" (多作者)',
    author: 'Various (OpenGameArt.org)',
    description: '多組 32x32/16x16 RPG 地塊集',
    url: 'https://opengameart.org/content/search?keys=tileset&field_tags_tid=All&field_license=All',
    directUrl: null,
    license: 'CC0, CC-BY, OGA-BY 等',
    tileSize: '32x32 / 16x16',
    category: 'tiles',
    priority: 'tertiary',
    files: [],
    note: '需自行搜尋並確認授權。推薦搜尋 "32x32 top-down tileset CC0"。'
  }
]

// 目標目錄結構
const TARGET_DIRS = [
  'public/assets/tiles',
  'public/assets/characters',
  'public/assets/objects',
  'public/assets/ui',
  'public/assets/particles',
  'public/assets/audio',
  'public/assets/data'
]

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
}

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`)
}

function printPackList() {
  log('\n=== 推薦免費像素素材包 ===\n', 'bright')
  
  const byPriority = {
    primary: ASSET_PACKS.filter(p => p.priority === 'primary'),
    secondary: ASSET_PACKS.filter(p => p.priority === 'secondary'),
    effects: ASSET_PACKS.filter(p => p.priority === 'effects'),
    tertiary: ASSET_PACKS.filter(p => p.priority === 'tertiary')
  }

  for (const [priority, packs] of Object.entries(byPriority)) {
    if (packs.length === 0) continue
    
    const priorityLabels = {
      primary: '🥇 必下載 (核心素材)',
      secondary: '🥈 推薦下載 (補充素材)',
      effects: '🎨 特效素材',
      tertiary: '🥉 選擇性下載'
    }
    
    log(`\n${priorityLabels[priority]}`, priority === 'primary' ? 'green' : priority === 'secondary' ? 'yellow' : 'cyan')
    
    for (const pack of packs) {
      log(`  ${pack.id}`, 'bright')
      log(`    名稱: ${pack.name}`, 'cyan')
      log(`    作者: ${pack.author}`, 'gray')
      log(`    授權: ${pack.license}`, 'green')
      log(`    尺寸: ${pack.tileSize}`, 'gray')
      log(`    網址: ${pack.url}`, 'blue')
      log(`    說明: ${pack.description}`, 'gray')
      log(`    備註: ${pack.note}`, 'yellow')
      log(`    目標檔案: ${pack.files.join(', ') || '需自行整理'}`, 'gray')
      log('')
    }
  }
}

function createDirectories() {
  log('\n建立目錄結構...', 'cyan')
  for (const dir of TARGET_DIRS) {
    const fullPath = path.join(__dirname, '..', dir)
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true })
      log(`  建立: ${dir}`, 'green')
    } else {
      log(`  已存在: ${dir}`, 'gray')
    }
  }
}

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(dest)
    
    client.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // 處理重定向
        downloadFile(response.headers.location, dest).then(resolve).catch(reject)
        return
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`))
        return
      }
      
      response.pipe(file)
      file.on('finish', () => file.close(() => resolve()))
    }).on('error', (err) => {
      fs.unlink(dest, () => {})
      reject(err)
    })
  })
}

// 由於大多數素材包需要手動下載 (Kenney 需接受條款、itch.io 需點擊)、
// 這裡提供輔助功能：開啟瀏覽器下載頁面
async function openDownloadPages(packIds = []) {
  const packs = packIds.length > 0 
    ? ASSET_PACKS.filter(p => packIds.includes(p.id))
    : ASSET_PACKS.filter(p => p.priority === 'primary' || p.priority === 'secondary')
  
  log('\n開啟下載頁面...', 'cyan')
  
  for (const pack of packs) {
    if (pack.directUrl) {
      log(`  開啟: ${pack.name} - ${pack.directUrl}`, 'blue')
      try {
        // Windows 使用 start，Mac 使用 open，Linux 使用 xdg-open
        const cmd = process.platform === 'win32' ? 'start' : 
                    process.platform === 'darwin' ? 'open' : 'xdg-open'
        execSync(`${cmd} "${pack.directUrl}"`, { stdio: 'ignore' })
        // 避免一次開太多頁面
        await new Promise(r => setTimeout(r, 500))
      } catch (e) {
        log(`    無法自動開啟，請手動訪問: ${pack.directUrl}`, 'yellow')
      }
    } else {
      log(`  ${pack.name}: 請手動訪問 ${pack.url}`, 'yellow')
    }
  }
  
  log('\n下載完成後，請將解壓縮的檔案依照以下對應放入 public/assets/ 目錄：', 'green')
  for (const pack of packs) {
    if (pack.files.length > 0) {
      log(`  ${pack.name}:`, 'bright')
      for (const f of pack.files) {
        log(`    -> public/assets/${f}`, 'gray')
      }
    }
  }
}

function generatePlaceholders() {
  log('\n生成佔位素材 (用於測試)...', 'cyan')
  
  // 這裡可以使用 node-canvas 生成簡單的佔位圖片
  // 為了不引入額外依賴，這裡只建立說明檔案
  
  const placeholderDirs = [
    'public/assets/tiles',
    'public/assets/characters',
    'public/assets/objects',
    'public/assets/ui',
    'public/assets/particles',
    'public/assets/audio'
  ]
  
  for (const dir of placeholderDirs) {
    const readmePath = path.join(__dirname, '..', dir, 'README.md')
    if (!fs.existsSync(readmePath)) {
      const category = path.basename(dir)
      const content = `# ${category} 素材目錄

請將對應的素材檔案放在此目錄。

## 來源建議
參考 \`scripts/download-assets.js\` 中的素材包列表。

## 檔案命名慣例
- 地塊: terrain.png, transitions.png, objects.png (spritesheet, 32x32 幀)
- 角色: survivor.png (spritesheet, 32x32 幀, 4 向動畫)
- 物件: resources.png (16x16), crafting_stations.png (32x32), decorations.png
- UI: panels.png, buttons.png, icons.png (16x16), cursors.png
- 粒子: effects.png (16x16)
- 音效: .ogg 格式 (sfx_*.ogg, bgm_*.ogg)

## 尺寸規格
- 基礎格子: 32x32 像素
- 角色精靈: 32x32 (或 48x48 含陰影)
- UI 圖示: 16x16 (UI 顯示時 2x 放大)
- 粒子: 16x16
`
      fs.writeFileSync(readmePath, content)
      log(`  建立: ${dir}/README.md`, 'green')
    }
  }
  
  log('佔位說明檔案已生成。', 'green')
}

function showManualSteps() {
  log('\n=== 手動下載步驟 ===\n', 'bright')
  
  log('1. Kenney.nl 素材包 (CC0，最推薦):', 'green')
  log('   - 訪問 https://kenney.nl/assets', 'cyan')
  log('   - 搜尋並下載: Pirate Pack, UI Pack, Tiny Dungeon, Foliage Sprites, Particle Pack', 'cyan')
  log('   - 解壓縮後，將 PNG 檔案對應放入 public/assets/ 子目錄', 'cyan')
  
  log('\n2. Cainos itch.io 素材包 (Name-your-price, $0 免費):', 'green')
  log('   - 訪問 https://cainos.itch.io/', 'cyan')
  log('   - 下載: "Pixel Art Top Down Basic" (原生 32x32，含角色)', 'cyan')
  log('   - 選擇性: "Pixel Art Tropical Island" (熱帶專用)', 'cyan')
  
  log('\n3. 其他 itch.io 免費素材:', 'green')
  log('   - 搜尋 "pixel art top-down free"', 'cyan')
  log('   - 推薦: untiedgames "Super Pixel Effects Gigapack"', 'cyan')
  
  log('\n4. 音效素材:', 'green')
  log('   - Kenney "Audio Pack" (CC0): https://kenney.nl/assets?q=audio', 'cyan')
  log('   - Freesound.org (需註冊, CC0/CC-BY): https://freesound.org/', 'cyan')
  log('   - 格式建議: .ogg (最佳瀏覽器相容性)', 'cyan')
  
  log('\n5. 放置完成後執行:', 'green')
  log('   npm run dev  # 測試素材載入', 'cyan')
}

function printManifestGuide() {
  log('\n=== manifest.json 對應指南 ===\n', 'bright')
  
  const manifest = {
    images: [
      { id: 'tiles_terrain', src: 'tiles/terrain.png', type: 'spritesheet', frameWidth: 32, frameHeight: 32 },
      { id: 'tiles_transitions', src: 'tiles/transitions.png', type: 'spritesheet', frameWidth: 32, frameHeight: 32 },
      { id: 'tiles_objects', src: 'tiles/objects.png', type: 'spritesheet', frameWidth: 32, frameHeight: 32 },
      { id: 'character_survivor', src: 'characters/survivor.png', type: 'spritesheet', frameWidth: 32, frameHeight: 32 },
      { id: 'objects_resources', src: 'objects/resources.png', type: 'spritesheet', frameWidth: 16, frameHeight: 16 },
      { id: 'objects_crafting', src: 'objects/crafting_stations.png', type: 'spritesheet', frameWidth: 32, frameHeight: 32 },
      { id: 'objects_decorations', src: 'objects/decorations.png', type: 'spritesheet', frameWidth: 32, frameHeight: 32 },
      { id: 'ui_panels', src: 'ui/panels.png', type: 'spritesheet', frameWidth: 64, frameHeight: 64 },
      { id: 'ui_buttons', src: 'ui/buttons.png', type: 'spritesheet', frameWidth: 32, frameHeight: 32 },
      { id: 'ui_icons', src: 'ui/icons.png', type: 'spritesheet', frameWidth: 16, frameHeight: 16 },
      { id: 'ui_cursors', src: 'ui/cursors.png', type: 'spritesheet', frameWidth: 16, frameHeight: 16 },
      { id: 'particles_effects', src: 'particles/effects.png', type: 'spritesheet', frameWidth: 16, frameHeight: 16 }
    ],
    audio: [
      { id: 'sfx_move', src: 'audio/sfx_move.ogg', type: 'audio' },
      { id: 'sfx_explore', src: 'audio/sfx_explore.ogg', type: 'audio' },
      { id: 'sfx_pickup', src: 'audio/sfx_pickup.ogg', type: 'audio' },
      { id: 'sfx_craft', src: 'audio/sfx_craft.ogg', type: 'audio' },
      { id: 'sfx_eat', src: 'audio/sfx_eat.ogg', type: 'audio' },
      { id: 'sfx_drink', src: 'audio/sfx_drink.ogg', type: 'audio' },
      { id: 'sfx_hurt', src: 'audio/sfx_hurt.ogg', type: 'audio' },
      { id: 'sfx_heal', src: 'audio/sfx_heal.ogg', type: 'audio' },
      { id: 'sfx_levelup', src: 'audio/sfx_levelup.ogg', type: 'audio' },
      { id: 'sfx_event', src: 'audio/sfx_event.ogg', type: 'audio' },
      { id: 'sfx_combat_start', src: 'audio/sfx_combat_start.ogg', type: 'audio' },
      { id: 'sfx_combat_hit', src: 'audio/sfx_combat_hit.ogg', type: 'audio' },
      { id: 'sfx_combat_win', src: 'audio/sfx_combat_win.ogg', type: 'audio' },
      { id: 'sfx_combat_lose', src: 'audio/sfx_combat_lose.ogg', type: 'audio' },
      { id: 'sfx_game_start', src: 'audio/sfx_game_start.ogg', type: 'audio' },
      { id: 'sfx_game_over', src: 'audio/sfx_game_over.ogg', type: 'audio' },
      { id: 'sfx_victory', src: 'audio/sfx_victory.ogg', type: 'audio' },
      { id: 'sfx_menu_select', src: 'audio/sfx_menu_select.ogg', type: 'audio' },
      { id: 'sfx_menu_confirm', src: 'audio/sfx_menu_confirm.ogg', type: 'audio' },
      { id: 'sfx_menu_cancel', src: 'audio/sfx_menu_cancel.ogg', type: 'audio' },
      { id: 'sfx_error', src: 'audio/sfx_error.ogg', type: 'audio' },
      { id: 'bgm_main_menu', src: 'audio/bgm_main_menu.ogg', type: 'audio' },
      { id: 'bgm_exploration', src: 'audio/bgm_exploration.ogg', type: 'audio' },
      { id: 'bgm_tension', src: 'audio/bgm_tension.ogg', type: 'audio' },
      { id: 'bgm_combat', src: 'audio/bgm_combat.ogg', type: 'audio' },
      { id: 'bgm_ending', src: 'audio/bgm_ending.ogg', type: 'audio' }
    ]
  }
  
  console.log(JSON.stringify(manifest, null, 2))
}

// 主程式
const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  log('\n=== 素材下載工具 ===\n', 'bright')
  log('用法: node scripts/download-assets.js [選項]', 'cyan')
  log('')
  log('選項:')
  log('  --list           列出所有推薦素材包')
  log('  --open           開啟主要素材包的下載頁面')
  log('  --open-all       開啟所有素材包下載頁面')
  log('  --dirs           建立目錄結構')
  log('  --placeholders   生成佔位說明檔案')
  log('  --manifest       顯示 manifest.json 對應指南')
  log('  --steps          顯示手動下載步驟')
  log('  --help, -h       顯示此說明')
  log('')
  log('範例:')
  log('  node scripts/download-assets.js --list')
  log('  node scripts/download-assets.js --open')
  log('  node scripts/download-assets.js --dirs --placeholders')
  process.exit(0)
}

if (args.includes('--list')) {
  printPackList()
}

if (args.includes('--dirs')) {
  createDirectories()
}

if (args.includes('--placeholders')) {
  generatePlaceholders()
}

if (args.includes('--manifest')) {
  printManifestGuide()
}

if (args.includes('--steps')) {
  showManualSteps()
}

if (args.includes('--open')) {
  createDirectories()
  openDownloadPages().then(() => {
    showManualSteps()
  })
}

if (args.includes('--open-all')) {
  createDirectories()
  openDownloadPages(ASSET_PACKS.map(p => p.id)).then(() => {
    showManualSteps()
  })
}

log('\n完成！', 'green')