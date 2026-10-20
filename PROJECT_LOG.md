# 專案開發記錄

## 日期
2026-10-20

## 目的
解決遊戲無法啟動以及主選單無法使用上下鍵選擇選項的問題。

## 問題描述
- 遊戲啟動後，主選單畫面顯示正常，但按下方向鍵（Up/Down）或 W/S 鍵無法切換選項。
- 主選單的輸入處理未被連結到遊戲迴圈。
- 預載腳本 (preload.ts) 使用 ES module 語法，在 Electron 中造成「Unexpected token 'export'」警告，雖未阻止遊戲運行，但需正確設定以避免潛在問題。
- UI 系統與製作系統載入圖示對照表時路徑重複加上 `assets/` 前綴，導致載入失敗（雖有備用機制，但應正確）。

## 解決步驟

### 1. 調整預載腳本為 CommonJS
- 修改 `electron/preload.ts`：
  - 改用 `const { contextBridge, ipcRenderer } = require('electron');`
  - 保留型別宣告，透過 `import type` 或間接方式取得型別（此專案中已有適當的型別定義）。
- 更新 `tsconfig.preload.json`（若無則新增）以產出 CommonJS 模組。
- 修改 `package.json` 的 `build:electron` 脚本：
  ```json
  "build:electron": "tsc -p tsconfig.preload.json && tsc -p tsconfig.electron.json"
  ```
- 此修改確保預載腳本以 CommonJS 格式編譯， Electron 能正常載入。

### 2. 修正資產載入路徑
- 在 `src/ui/UISystem.ts` 中的 `init()` 方法：
  - 將 `await assetManager.loadJSON('item_icons_map', 'assets/data/item_icons_map.json')` 改為
    `await assetManager.loadJSON('item_icons_map', 'data/item_icons_map.json')`
- 在 `src/systems/CraftSystem.ts` 中的同樣位置：
  - 同上修改。
- 因為 `AssetManager` 內部會自動加上 base 路徑 `'assets/'`，避免重複。

### 3. 為主選單添加輸入處理
- 在 `src/core/Game.ts` 的 `update(dt)` 方法中，原本的 switch 語句僅處理 `PLAYING`, `EVENT`, `COMBAT`, `CRAFTING` 四種狀態。
- 新增 `case GameState.MAIN_MENU:` 分支：
  ```typescript
  case GameState.MAIN_MENU:
      // 主選單輸入處理
      const keys = ['ArrowUp', 'KeyW', 'ArrowDown', 'KeyS', 'Enter', 'Space', 'Escape']
      for (const key of keys) {
          if (this.input.isKeyPressed(key)) {
              this.uiSystem.handleMainMenuInput(key)
          }
      }
      break
  ```
- 這樣在主選單狀態下，遊戲會偵測到相應按鍵的按下事件，並委派給 UI 系統處理選項切換與執行。

### 4. 重建專案
- 執行 `npm run build:vite` 產出網頁版靜態檔案。
- 執行 `npm run build:electron` 編譯 Electron 主進程與預載腳本。
- 整個 `npm run build` 完成，`dist/` 與 `dist-electron/` 皆正常產出。

## 目前結果
- 專案可透過 `npm run dev` 正常啟動開發模式。
- 主選單現在可以使用：
  - **Up / W** ：向上移動選項
  - **Down / S** ：向下移動選項
  - **Enter / Space** ：確認選擇
  - **Esc** ：在選項為「離開」時直接離開遊戲
- 遊戲其餘系統（地圖移動、事件、戰鬥、製作、存檔、音效等）未受影響，仍能正常運作。
- 網頁版（`dist/` 目錄）亦可直接開啟 `index.html` 進行遊玩，功能與桌面版一致。

## 變更的檔案清單
```
electron/preload.ts
src/ui/UISystem.ts
src/systems/CraftSystem.ts
src/core/Game.ts
package.json
tsconfig.electron.json (加入 exclude: ["preload.ts"])
tsconfig.preload.json (若未存在則新增，或確保其設定為 CommonJS)
```

## 後續建議
- 可進一步優化主選單的 UI 表現（如加入滑動動畫、滑鼠支援）。
- 檢視所有 `assetManager.loadJSON` 呼叫，確認路徑均正確。
- 持續監控主選單與其他系統的輸入衝突（目前僅在 MAIN_MENU 狀態處理鍵盤輸入，其他狀態不受影響）。

---
記錄者：OpenCode AI 助理