#!/usr/bin/env node
/**
 * 解壓縮並整理下載的素材包 - 修正版
 */

const fs = require('fs')
const path = require('path')
const AdmZip = require('adm-zip')

const DOWNLOAD_DIR = path.join(__dirname, '..', 'downloads')
const ASSETS_DIR = path.join(__dirname, '..', 'public', 'assets')

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

async function extractKenneyPiratePack() {
  const zipPath = path.join(DOWNLOAD_DIR, 'kenney_pirate-pack.zip')
  if (!fs.existsSync(zipPath)) return

  console.log(`\n📦 處理: Kenney Pirate Pack`)
  const zip = new AdmZip(zipPath)
  const tempDir = path.join(DOWNLOAD_DIR, 'temp_kenney_pirate_' + Date.now())
  fs.mkdirSync(tempDir, { recursive: true })
  zip.extractAllTo(tempDir, true)

  // 1. 複製 Tilesheet (spritesheet) - 主要地塊
  const tilesheetSrc = path.join(tempDir, 'Tilesheet', 'tiles_sheet.png')
  if (fs.existsSync(tilesheetSrc)) {
    ensureDir(path.join(ASSETS_DIR, 'tiles'))
    fs.copyFileSync(tilesheetSrc, path.join(ASSETS_DIR, 'tiles', 'terrain.png'))
    console.log(`   ✅ Tilesheet/tiles_sheet.png -> tiles/terrain.png (spritesheet)`)
  }
  
  const tilesheet2xSrc = path.join(tempDir, 'Tilesheet', 'tiles_sheet@2.png')
  if (fs.existsSync(tilesheet2xSrc)) {
    fs.copyFileSync(tilesheet2xSrc, path.join(ASSETS_DIR, 'tiles', 'terrain@2x.png'))
    console.log(`   ✅ Tilesheet/tiles_sheet@2.png -> tiles/terrain@2x.png (Retina)`)
  }

  // 2. 複製單獨的 Tile 圖片 (PNG/Default size/Tiles/)
  const tilesDir = path.join(tempDir, 'PNG', 'Default size', 'Tiles')
  if (fs.existsSync(tilesDir)) {
    ensureDir(path.join(ASSETS_DIR, 'tiles', 'single'))
    const files = fs.readdirSync(tilesDir).filter(f => f.endsWith('.png'))
    for (const file of files) {
      fs.copyFileSync(
        path.join(tilesDir, file),
        path.join(ASSETS_DIR, 'tiles', 'single', file)
      )
    }
    console.log(`   ✅ PNG/Default size/Tiles/ (${files.length} 個) -> tiles/single/`)
  }

  // 3. 複製 Ship parts 作為物件
  const shipPartsDir = path.join(tempDir, 'PNG', 'Default size', 'Ship parts')
  if (fs.existsSync(shipPartsDir)) {
    ensureDir(path.join(ASSETS_DIR, 'objects', 'ship-parts'))
    const files = fs.readdirSync(shipPartsDir).filter(f => f.endsWith('.png'))
    for (const file of files) {
      fs.copyFileSync(
        path.join(shipPartsDir, file),
        path.join(ASSETS_DIR, 'objects', 'ship-parts', file)
      )
    }
    console.log(`   ✅ Ship parts (${files.length} 個) -> objects/ship-parts/`)
  }

  // 4. 複製 Ships
  const shipsDir = path.join(tempDir, 'PNG', 'Default size', 'Ships')
  if (fs.existsSync(shipsDir)) {
    ensureDir(path.join(ASSETS_DIR, 'objects', 'ships'))
    const files = fs.readdirSync(shipsDir).filter(f => f.endsWith('.png'))
    for (const file of files) {
      fs.copyFileSync(
        path.join(shipsDir, file),
        path.join(ASSETS_DIR, 'objects', 'ships', file)
      )
    }
    console.log(`   ✅ Ships (${files.length} 個) -> objects/ships/`)
  }

  // 5. 複製 Effects
  const effectsDir = path.join(tempDir, 'PNG', 'Default size', 'Effects')
  if (fs.existsSync(effectsDir)) {
    ensureDir(path.join(ASSETS_DIR, 'particles'))
    const files = fs.readdirSync(effectsDir).filter(f => f.endsWith('.png'))
    for (const file of files) {
      fs.copyFileSync(
        path.join(effectsDir, file),
        path.join(ASSETS_DIR, 'particles', file)
      )
    }
    console.log(`   ✅ Effects (${files.length} 個) -> particles/`)
  }

  // 6. 複製 Spritesheet (ships)
  const spritesheetDir = path.join(tempDir, 'Spritesheet')
  if (fs.existsSync(spritesheetDir)) {
    const files = fs.readdirSync(spritesheetDir).filter(f => f.endsWith('.png'))
    for (const file of files) {
      fs.copyFileSync(
        path.join(spritesheetDir, file),
        path.join(ASSETS_DIR, 'objects', file)
      )
    }
    console.log(`   ✅ Spritesheet (${files.length} 個) -> objects/`)
  }

  fs.rmSync(tempDir, { recursive: true, force: true })
}

async function extractKenneyUIPack() {
  const zipPath = path.join(DOWNLOAD_DIR, 'kenney_ui-pack.zip')
  if (!fs.existsSync(zipPath)) return

  console.log(`\n📦 處理: Kenney UI Pack`)
  const zip = new AdmZip(zipPath)
  const tempDir = path.join(DOWNLOAD_DIR, 'temp_kenney_ui_' + Date.now())
  fs.mkdirSync(tempDir, { recursive: true })
  zip.extractAllTo(tempDir, true)

  // 使用 Grey/Default 作為基礎 UI (中性色)
  const baseDir = path.join(tempDir, 'PNG', 'Grey', 'Default')
  if (fs.existsSync(baseDir)) {
    ensureDir(path.join(ASSETS_DIR, 'ui'))
    
    // 分類複製
    const files = fs.readdirSync(baseDir).filter(f => f.endsWith('.png'))
    let panels = 0, buttons = 0, icons = 0, cursors = 0, other = 0
    
    for (const file of files) {
      let destSub = ''
      if (file.includes('panel')) destSub = 'panels'
      else if (file.includes('button')) destSub = 'buttons'
      else if (file.includes('icon') || file.includes('check') || file.includes('star') || file.includes('cross') || file.includes('circle') || file.includes('square')) destSub = 'icons'
      else if (file.includes('arrow') || file.includes('slide') || file.includes('cursor')) destSub = 'cursors'
      else destSub = 'misc'
      
      ensureDir(path.join(ASSETS_DIR, 'ui', destSub))
      fs.copyFileSync(
        path.join(baseDir, file),
        path.join(ASSETS_DIR, 'ui', destSub, file)
      )
      
      if (destSub === 'panels') panels++
      else if (destSub === 'buttons') buttons++
      else if (destSub === 'icons') icons++
      else if (destSub === 'cursors') cursors++
      else other++
    }
    console.log(`   ✅ Panels: ${panels}, Buttons: ${buttons}, Icons: ${icons}, Cursors: ${cursors}, Misc: ${other}`)
  }

  // 複製音效
  const soundsDir = path.join(tempDir, 'Sounds')
  if (fs.existsSync(soundsDir)) {
    ensureDir(path.join(ASSETS_DIR, 'audio'))
    const files = fs.readdirSync(soundsDir).filter(f => f.endsWith('.ogg'))
    for (const file of files) {
      fs.copyFileSync(
        path.join(soundsDir, file),
        path.join(ASSETS_DIR, 'audio', file)
      )
    }
    console.log(`   ✅ Sounds (${files.length} 個 .ogg) -> audio/`)
  }

  fs.rmSync(tempDir, { recursive: true, force: true })
}

async function extractCainosBasic() {
  const zipPath = path.join(DOWNLOAD_DIR, 'Pixel Art Top Down - Basic v1.2.3.zip')
  if (!fs.existsSync(zipPath)) return

  console.log(`\n📦 處理: Cainos Pixel Art Top Down Basic`)
  const zip = new AdmZip(zipPath)
  const tempDir = path.join(DOWNLOAD_DIR, 'temp_cainos_' + Date.now())
  fs.mkdirSync(tempDir, { recursive: true })
  zip.extractAllTo(tempDir, true)

  const textureDir = path.join(tempDir, 'Texture')
  if (!fs.existsSync(textureDir)) return

  // 1. TX Player -> characters/survivor.png (角色精靈表)
  const playerSrc = path.join(textureDir, 'TX Player.png')
  if (fs.existsSync(playerSrc)) {
    ensureDir(path.join(ASSETS_DIR, 'characters'))
    fs.copyFileSync(playerSrc, path.join(ASSETS_DIR, 'characters', 'survivor.png'))
    console.log(`   ✅ TX Player.png -> characters/survivor.png (角色 4 向動畫)`)
  }

  // 2. TX Tileset Grass -> tiles/grass.png
  const grassSrc = path.join(textureDir, 'TX Tileset Grass.png')
  if (fs.existsSync(grassSrc)) {
    ensureDir(path.join(ASSETS_DIR, 'tiles'))
    fs.copyFileSync(grassSrc, path.join(ASSETS_DIR, 'tiles', 'grass.png'))
    console.log(`   ✅ TX Tileset Grass.png -> tiles/grass.png`)
  }

  // 3. TX Tileset Stone Ground -> tiles/stone.png
  const stoneSrc = path.join(textureDir, 'TX Tileset Stone Ground.png')
  if (fs.existsSync(stoneSrc)) {
    fs.copyFileSync(stoneSrc, path.join(ASSETS_DIR, 'tiles', 'stone.png'))
    console.log(`   ✅ TX Tileset Stone Ground.png -> tiles/stone.png`)
  }

  // 4. TX Tileset Wall -> tiles/wall.png
  const wallSrc = path.join(textureDir, 'TX Tileset Wall.png')
  if (fs.existsSync(wallSrc)) {
    fs.copyFileSync(wallSrc, path.join(ASSETS_DIR, 'tiles', 'wall.png'))
    console.log(`   ✅ TX Tileset Wall.png -> tiles/wall.png`)
  }

  // 5. TX Plant -> objects/trees.png
  const plantSrc = path.join(textureDir, 'TX Plant.png')
  if (fs.existsSync(plantSrc)) {
    ensureDir(path.join(ASSETS_DIR, 'objects'))
    fs.copyFileSync(plantSrc, path.join(ASSETS_DIR, 'objects', 'trees.png'))
    console.log(`   ✅ TX Plant.png -> objects/trees.png`)
  }

  // 6. TX Props -> objects/props.png
  const propsSrc = path.join(textureDir, 'TX Props.png')
  if (fs.existsSync(propsSrc)) {
    fs.copyFileSync(propsSrc, path.join(ASSETS_DIR, 'objects', 'props.png'))
    console.log(`   ✅ TX Props.png -> objects/props.png`)
  }

  // 7. TX Struct -> objects/structures.png
  const structSrc = path.join(textureDir, 'TX Struct.png')
  if (fs.existsSync(structSrc)) {
    fs.copyFileSync(structSrc, path.join(ASSETS_DIR, 'objects', 'structures.png'))
    console.log(`   ✅ TX Struct.png -> objects/structures.png`)
  }

  // 8. Extra 版本 (帶陰影)
  const extraDir = path.join(textureDir, 'Extra')
  if (fs.existsSync(extraDir)) {
    const files = fs.readdirSync(extraDir).filter(f => f.endsWith('.png'))
    for (const file of files) {
      const dest = file.replace('TX ', '').replace(' with Shadow', '_shadow').replace('.png', '').toLowerCase()
      fs.copyFileSync(
        path.join(extraDir, file),
        path.join(ASSETS_DIR, 'objects', dest + '.png')
      )
      console.log(`   ✅ Extra/${file} -> objects/${dest}.png`)
    }
  }

  fs.rmSync(tempDir, { recursive: true, force: true })
}

async function main() {
  console.log('🔧 開始解壓縮並整理素材包...')
  console.log(`📁 下載目錄: ${DOWNLOAD_DIR}`)
  console.log(`📁 目標目錄: ${ASSETS_DIR}`)

  await extractKenneyPiratePack()
  await extractKenneyUIPack()
  await extractCainosBasic()

  // 列出最終結果
  console.log('\n' + '='.repeat(60))
  console.log('📋 最終結果:')
  function listDir(dir, prefix = '') {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir).sort()) {
      const fullPath = path.join(dir, entry)
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory()) {
        console.log(`${prefix}📁 ${entry}/`)
        listDir(fullPath, prefix + '  ')
      } else {
        const size = (stat.size / 1024).toFixed(1)
        console.log(`${prefix}📄 ${entry} (${size} KB)`)
      }
    }
  }
  listDir(ASSETS_DIR)

  console.log('\n✅ 完成！')
  console.log('\n下一步：')
  console.log('  1. 更新 manifest.json 對應新的檔案路徑')
  console.log('  2. 更新 tile_config.json 對應 Kenney tiles_sheet.png 的幀位置')
  console.log('  3. 更新 item_icons_map.json 對應 Kenney UI icons')
  console.log('  4. 執行 npm run dev 測試遊戲')
}

main().catch(console.error)