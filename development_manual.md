# 地震速報アプリ 開発手順書

## 1. 文書概要

### 1.1 目的
この文書は地震速報アプリケーションの開発環境セットアップ、コーディング規約、テスト手順、デプロイメント手順を定義します。

### 1.2 対象者
- 開発者
- メンテナンス担当者
- 新規参画者

### 1.3 開発方針
- **クライアントサイド完結**: サーバーサイド処理なし
- **モダンWeb技術**: HTML5, CSS3, ES6+ JavaScript
- **レスポンシブデザイン**: PC・タブレット対応
- **アクセシビリティ**: WCAG 2.1 準拠

## 2. 開発環境セットアップ

### 2.1 必須ソフトウェア

#### 2.1.1 基本ツール

| ソフトウェア | バージョン | 用途 |
|--------------|------------|------|
| **Git** | 2.30+ | バージョン管理 |
| **Python** | 3.6+ | ローカルサーバー |
| **Node.js** | 16+ | 開発ツール（オプション） |

#### 2.1.2 推奨エディタ・IDE

**Visual Studio Code（推奨）**
```json
{
  "recommendations": [
    "ms-vscode.vscode-json",
    "bradlc.vscode-tailwindcss",
    "ritwickdey.LiveServer",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode"
  ]
}
```

**推奨拡張機能:**
- Live Server: ローカル開発サーバー
- Prettier: コードフォーマッター
- ESLint: JavaScript リンター
- Auto Rename Tag: HTMLタグ自動リネーム

#### 2.1.3 ブラウザ

**開発・テスト用:**
- Chrome 90+ (DevTools)
- Firefox 88+ (Developer Edition)
- Safari 14+ (Web Inspector)
- Edge 90+

### 2.2 プロジェクトセットアップ

#### 2.2.1 リポジトリクローン

```bash
# GitHubからクローン
git clone https://github.com/[username]/earthquake-app.git
cd earthquake-app
```

#### 2.2.2 ローカル開発環境構築

```bash
# ローカルサーバー起動
python3 -m http.server 8080

# または Live Server（VS Code拡張）を使用
# index.html を右クリック > "Open with Live Server"
```

#### 2.2.3 開発用設定ファイル（オプション）

**package.json (Node.js使用時)**
```json
{
  "name": "earthquake-app",
  "version": "1.0.0",
  "description": "Real-time earthquake monitoring app",
  "scripts": {
    "dev": "python3 -m http.server 8080",
    "test": "echo \"No test framework configured\"",
    "build": "echo \"Static files - no build required\"",
    "deploy": "gh-pages -d ."
  },
  "devDependencies": {
    "gh-pages": "^4.0.0"
  }
}
```

**.gitignore**
```
# OS generated files
.DS_Store
Thumbs.db

# Editor files
.vscode/settings.json
.idea/

# Node modules (if using)
node_modules/

# Log files
*.log

# Temporary files
*.tmp
.cache/
```

## 3. プロジェクト構造

### 3.1 ディレクトリ構成

```
earthquake-app/
├── index.html              # メインHTML
├── test.html              # テスト用HTML
├── styles.css             # メインスタイルシート
├── script.js              # メインJavaScript
├── earthquake-api.js      # API通信クラス
├── notification.js        # 通知機能クラス
├── map.js                # 地図表示機能
├── config.js             # 設定管理
├── requirements.md       # 要件定義書
├── technical_specification.md  # 技術仕様書
├── operation_manual.md   # 運用手順書
├── development_manual.md # 開発手順書
├── README.md             # プロジェクト概要
├── .gitignore            # Git除外ファイル
└── assets/               # アセットファイル（将来拡張用）
    ├── sounds/
    ├── images/
    └── icons/
```

### 3.2 ファイル責任分担

| ファイル | 責任範囲 | 主要クラス・機能 |
|----------|----------|------------------|
| `script.js` | アプリケーション全体制御 | `EarthquakeApp` |
| `earthquake-api.js` | API通信 | `EarthquakeAPI` |
| `notification.js` | 通知機能 | `EarthquakeNotification` |
| `map.js` | 地図表示 | `EarthquakeMap` |
| `config.js` | 設定定数 | `CONFIG` |
| `styles.css` | UI・デザイン | CSS クラス群 |

## 4. コーディング規約

### 4.1 HTML規約

#### 4.1.1 基本ルール
- **DOCTYPE**: HTML5 を使用
- **lang属性**: `<html lang="ja">` を設定
- **文字エンコーディング**: UTF-8
- **セマンティック要素**: `<section>`, `<header>`, `<main>`, `<aside>` を適切に使用

#### 4.1.2 命名規約
```html
<!-- クラス名: kebab-case -->
<div class="earthquake-card">
  <div class="earthquake-header">
    <span class="magnitude">M4.2</span>
  </div>
</div>

<!-- ID名: kebab-case -->
<div id="earthquake-modal-overlay">
  <div id="modal-body"></div>
</div>
```

#### 4.1.3 アクセシビリティ
```html
<!-- ARIA属性の使用 -->
<button aria-label="設定を開く" id="settings-toggle">設定</button>

<!-- ロール属性 -->
<div role="alert" id="error-message"></div>

<!-- フォーカス管理 -->
<div tabindex="0" class="earthquake-card clickable"></div>
```

### 4.2 CSS規約

#### 4.2.1 構造化
```css
/* 1. リセット・基本設定 */
* { margin: 0; padding: 0; box-sizing: border-box; }

/* 2. レイアウト */
.app-header { /* ヘッダーレイアウト */ }
.app-main { /* メインレイアウト */ }

/* 3. コンポーネント */
.earthquake-card { /* カードコンポーネント */ }

/* 4. ユーティリティ */
.loading { /* ローディングアニメーション */ }

/* 5. レスポンシブ */
@media (max-width: 768px) { /* タブレット対応 */ }
@media (max-width: 480px) { /* モバイル対応 */ }
```

#### 4.2.2 命名規約（BEM準拠）
```css
/* Block__Element--Modifier */
.earthquake-card { }
.earthquake-card__header { }
.earthquake-card__header--urgent { }

/* 状態クラス */
.is-loading { }
.is-connected { }
.is-visible { }
```

#### 4.2.3 単位・値の規約
```css
/* 単位統一 */
font-size: 1rem;      /* フォントサイズ */
margin: 0.5rem 1rem;  /* 余白 */
border-radius: 8px;   /* 角丸 */

/* カラー変数化（CSS Custom Properties推奨） */
:root {
  --primary-color: #667eea;
  --success-color: #2ed573;
  --error-color: #ff4757;
}
```

### 4.3 JavaScript規約

#### 4.3.1 ES6+ 機能の活用

**クラス定義:**
```javascript
class EarthquakeApp {
  constructor() {
    this.api = null;
    this.settings = {};
    this.init();
  }

  async init() {
    // 非同期初期化
  }
}
```

**アロー関数:**
```javascript
// イベントリスナー
this.elements.settingsToggle?.addEventListener('click', () => {
  this.toggleSettings();
});

// 配列操作
const processedData = data.map(item => ({
  ...item,
  formattedTime: this.formatTime(item.time)
}));
```

**分割代入:**
```javascript
// オブジェクト分割代入
const { magnitude, location, depth } = earthquakeData;

// 配列分割代入
const [latest, ...others] = earthquakeHistory;
```

**テンプレートリテラル:**
```javascript
const html = `
  <div class="earthquake-card">
    <h3>${location}</h3>
    <span>M${magnitude.toFixed(1)}</span>
  </div>
`;
```

#### 4.3.2 非同期処理

**async/await パターン:**
```javascript
async fetchEarthquakeData() {
  try {
    const response = await fetch(API_ENDPOINT);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API fetch error:', error);
    this.handleError(error);
  }
}
```

**Promise チェーン（必要時のみ）:**
```javascript
this.connectWebSocket()
  .then(() => this.startPolling())
  .then(() => this.updateUI())
  .catch(error => this.handleError(error));
```

#### 4.3.3 エラーハンドリング

**統一的エラー処理:**
```javascript
class EarthquakeApp {
  handleError(error, source = 'unknown') {
    console.error(`Error in ${source}:`, error);
    this.showErrorMessage(error.message || 'Unknown error');
    
    // エラー種別による処理分岐
    if (error.name === 'NetworkError') {
      this.handleNetworkError();
    }
  }
}
```

#### 4.3.4 命名規約

**変数・関数名: camelCase**
```javascript
// 良い例
const earthquakeData = {};
const maxMagnitude = 7.0;
function updateEarthquakeDisplay() {}

// 避ける例
const earthquake_data = {};
const MAX_MAGNITUDE = 7.0;
function update_earthquake_display() {}
```

**定数: UPPER_SNAKE_CASE**
```javascript
const MAX_RETRY_COUNT = 5;
const API_TIMEOUT = 30000;
const EARTHQUAKE_CODE = 551;
```

**プライベートメソッド: アンダースコア接頭辞**
```javascript
class EarthquakeAPI {
  // パブリックメソッド
  async fetchData() {}
  
  // プライベートメソッド
  _parseResponse(response) {}
  _handleError(error) {}
}
```

#### 4.3.5 コメント規約

**JSDoc形式:**
```javascript
/**
 * 地震データを処理して表示用に変換
 * @param {Object} rawData - P2P APIからの生データ
 * @param {string} source - データソース ('p2p' | 'jma')
 * @returns {Object} 表示用地震データ
 */
processEarthquakeData(rawData, source) {
  // 実装
}
```

**インライン コメント:**
```javascript
// 緊急地震速報の判定 (code 556: 予報, 557: 警報)
if (data.code === 556 || data.code === 557) {
  this.updateEEWStatus(data);
}

// TODO: 将来的に地域フィルタリング機能を追加
// FIXME: WebSocket再接続時のメモリリーク対応
```

## 5. テスト手順

### 5.1 手動テスト

#### 5.1.1 基本機能テスト

**test.html を使用したテスト:**

1. **接続テスト**
   ```
   ✓ P2P接続テスト → 接続状態確認
   ✓ JMA接続テスト → 10件データ取得確認
   ```

2. **通知テスト**
   ```
   ✓ 通知テスト → ブラウザ通知表示確認
   ✓ 音声テスト → アラート音再生確認
   ```

3. **UI機能テスト**
   ```
   ✓ 設定テスト → 設定値保存・読み込み確認
   ✓ モーダルテスト → 詳細表示確認
   ✓ 地震シミュレート → 模擬データ処理確認
   ```

#### 5.1.2 ブラウザ互換性テスト

**テスト対象ブラウザ:**

| ブラウザ | バージョン | テスト項目 |
|----------|------------|------------|
| Chrome | 90+ | 全機能 |
| Firefox | 88+ | 全機能 |
| Safari | 14+ | WebSocket, 通知 |
| Edge | 90+ | 全機能 |

**チェックリスト:**
```
□ WebSocket接続確立
□ Fetch API動作
□ Notification API許可・表示
□ LocalStorage読み書き
□ Leaflet地図表示
□ CSS Animation・Transition
□ レスポンシブレイアウト
```

#### 5.1.3 レスポンシブテスト

**テスト解像度:**
- **デスクトップ**: 1920x1080, 1366x768
- **タブレット**: 768x1024, 1024x768
- **スマートフォン**: 375x667, 414x896

**DevTools テスト:**
```javascript
// ビューポート変更テスト
// Chrome DevTools > Device Toolbar > Responsive
```

### 5.2 自動テスト（将来導入予定）

#### 5.2.1 単体テスト例（Jest）

```javascript
// tests/earthquake-api.test.js
import { EarthquakeAPI } from '../earthquake-api.js';

describe('EarthquakeAPI', () => {
  let api;
  
  beforeEach(() => {
    api = new EarthquakeAPI();
  });

  test('should parse P2P data correctly', () => {
    const mockData = {
      code: 551,
      earthquake: {
        time: '2024-01-01T12:00:00+09:00',
        hypocenter: {
          name: '東京都23区',
          magnitude: 4.5
        }
      }
    };
    
    const parsed = api.parseP2PData(mockData);
    expect(parsed.location).toBe('東京都23区');
    expect(parsed.magnitude).toBe(4.5);
  });
});
```

#### 5.2.2 E2Eテスト例（Playwright）

```javascript
// tests/e2e/app.test.js
import { test, expect } from '@playwright/test';

test('earthquake app loads and connects', async ({ page }) => {
  await page.goto('http://localhost:8080');
  
  // アプリタイトル確認
  await expect(page.locator('h1')).toContainText('地震速報アプリ');
  
  // 接続状態確認（最大30秒待機）
  await expect(page.locator('#p2p-status .status-dot'))
    .toHaveClass(/connected/, { timeout: 30000 });
});
```

## 6. デバッグ手順

### 6.1 ブラウザDevTools活用

#### 6.1.1 Console デバッグ

**ログレベル別出力:**
```javascript
// デバッグレベル別ログ出力
class Logger {
  static debug(message, data = null) {
    if (CONFIG.DEBUG) {
      console.log(`[DEBUG] ${message}`, data);
    }
  }
  
  static info(message, data = null) {
    console.info(`[INFO] ${message}`, data);
  }
  
  static error(message, error = null) {
    console.error(`[ERROR] ${message}`, error);
  }
}
```

**実用的デバッグコマンド:**
```javascript
// DevTools Console で実行可能な診断コマンド
window.debugCommands = {
  // 現在の状態確認
  status: () => window.earthquakeApp?.getStatus(),
  
  // 接続状態確認
  connection: () => window.earthquakeApp?.api?.getConnectionStatus(),
  
  // 設定確認
  settings: () => JSON.parse(localStorage.getItem('earthquake_settings')),
  
  // 履歴確認
  history: () => JSON.parse(localStorage.getItem('earthquake_history')),
  
  // 模擬地震データ送信
  simulate: (magnitude = 4.5) => {
    const mockData = {
      source: 'debug',
      time: new Date(),
      location: 'デバッグ震源地',
      magnitude,
      maxIntensity: '3'
    };
    window.earthquakeApp?.handleEarthquakeData(mockData, 'debug');
  }
};
```

#### 6.1.2 Network タブ活用

**API通信監視:**
- WebSocket接続状況の確認
- Fetch API レスポンス内容の確認
- エラーレスポンスの詳細分析
- タイミング・パフォーマンス測定

**フィルタ設定:**
```
Fetch/XHR: API通信のみ表示
WS: WebSocket通信のみ表示
```

#### 6.1.3 Application タブ活用

**LocalStorage 管理:**
```javascript
// Key-Value 確認
localStorage.getItem('earthquake_settings');
localStorage.getItem('earthquake_history');

// 容量確認
const usage = JSON.stringify(localStorage).length;
console.log(`LocalStorage usage: ${usage} bytes`);
```

### 6.2 パフォーマンス診断

#### 6.2.1 メモリ使用量監視

```javascript
// メモリ使用量監視
class PerformanceMonitor {
  static getMemoryUsage() {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize / 1024 / 1024,
        total: performance.memory.totalJSHeapSize / 1024 / 1024,
        limit: performance.memory.jsHeapSizeLimit / 1024 / 1024
      };
    }
    return null;
  }
  
  static startMonitoring() {
    setInterval(() => {
      const memory = this.getMemoryUsage();
      if (memory && memory.used > 50) { // 50MB以上で警告
        console.warn('High memory usage detected:', memory);
      }
    }, 30000);
  }
}
```

#### 6.2.2 DOM操作最適化

```javascript
// 効率的なDOM更新
class DOMUpdater {
  static updateBatch(updates) {
    // DocumentFragment を使用した一括更新
    const fragment = document.createDocumentFragment();
    
    updates.forEach(update => {
      const element = document.createElement(update.tag);
      element.innerHTML = update.content;
      fragment.appendChild(element);
    });
    
    return fragment;
  }
}
```

## 7. デプロイメント手順

### 7.1 ビルド・デプロイ前チェック

#### 7.1.1 チェックリスト

```bash
# 1. コードチェック
□ コンソールエラーがないことを確認
□ 全ての機能が正常動作することを確認
□ test.html でのテストが全て成功することを確認

# 2. ファイルチェック
□ 不要なファイル（.DS_Store等）が含まれていないことを確認
□ コメントアウトされた開発用コードの削除
□ console.log の削除（本番用は残す）

# 3. 設定チェック
□ config.js の本番用API URL確認
□ DEBUG フラグが false に設定されていることを確認
```

#### 7.1.2 本番用設定

**config.js の本番用設定:**
```javascript
const CONFIG = {
  DEBUG: false,  // 本番用はfalse
  API: {
    P2P_WEBSOCKET_URL: 'wss://api.p2pquake.net/v2/ws',
    JMA_BASE_URL: 'https://api.p2pquake.net/v2/history?codes=551&limit=10',
    // 開発用URLではないことを確認
  }
};
```

### 7.2 GitHub Pages デプロイ

#### 7.2.1 自動デプロイ設定

**GitHub Actions workflow (.github/workflows/deploy.yml):**
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./
        exclude_assets: '.github,README.md,development_manual.md'
```

#### 7.2.2 手動デプロイ

```bash
# 1. 変更をコミット
git add .
git commit -m "feat: add modal functionality for earthquake details"

# 2. メインブランチにプッシュ
git push origin main

# 3. GitHub Pages設定確認
# Settings > Pages > Source: Deploy from branch
# Branch: main / root
```

### 7.3 その他ホスティングサービス

#### 7.3.1 Netlify

**手動デプロイ:**
1. [Netlify](https://netlify.com) にログイン
2. "New site from Git" または ドラッグ&ドロップでデプロイ
3. Build settings: そのまま（静的ファイル）
4. 独自ドメイン設定（オプション）

**netlify.toml 設定:**
```toml
[build]
  publish = "."
  
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; connect-src 'self' wss://api.p2pquake.net https://api.p2pquake.net;"
```

#### 7.3.2 Vercel

```bash
# Vercel CLI使用
npm install -g vercel
vercel --prod
```

**vercel.json 設定:**
```json
{
  "routes": [
    { "src": "/(.*)", "dest": "/$1" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; connect-src 'self' wss://api.p2pquake.net https://api.p2pquake.net;"
        }
      ]
    }
  ]
}
```

## 8. バージョン管理

### 8.1 Git運用フロー

#### 8.1.1 ブランチ戦略（GitHub Flow）

```bash
# 機能開発
git checkout -b feature/modal-enhancement
git commit -m "feat: add earthquake detail modal"
git push origin feature/modal-enhancement

# Pull Request作成・レビュー後
git checkout main
git pull origin main
git branch -d feature/modal-enhancement
```

#### 8.1.2 コミットメッセージ規約

**Conventional Commits準拠:**
```bash
# 機能追加
git commit -m "feat: add modal window for earthquake details"

# バグ修正
git commit -m "fix: resolve WebSocket reconnection issue"

# ドキュメント更新
git commit -m "docs: update development manual"

# スタイル修正
git commit -m "style: improve modal animation"

# リファクタリング
git commit -m "refactor: optimize DOM update performance"

# テスト追加
git commit -m "test: add unit tests for API class"
```

#### 8.1.3 タグ付け（リリース管理）

```bash
# セマンティックバージョニング
git tag v1.0.0  # 初回リリース
git tag v1.1.0  # 機能追加
git tag v1.0.1  # バグ修正

# タグをプッシュ
git push origin --tags
```

### 8.2 変更履歴管理

#### 8.2.1 CHANGELOG.md形式

```markdown
# Changelog

## [1.1.0] - 2024-01-15

### Added
- モーダルウィンドウによる地震詳細表示機能
- 緊急地震速報ステータス表示
- 日本列島地震活動統計ダッシュボード
- test.html でのモーダルテスト機能

### Changed
- JMA情報表示件数を1件から10件に拡張
- P2Pパネルの視覚的デザイン強化

### Fixed
- WebSocket再接続時のメモリリーク問題を修正
- モバイルデバイスでの音声再生問題を解決

## [1.0.0] - 2024-01-01

### Added
- 初回リリース
- P2P地震情報のリアルタイム表示
- 気象庁情報の履歴表示
- 通知機能（ブラウザ通知・音声アラート）
- インタラクティブ地図表示
- 設定管理機能
```

## 9. コードレビューガイドライン

### 9.1 レビュー観点

#### 9.1.1 機能性チェック
- [ ] 要件通りに機能が実装されているか
- [ ] エラーハンドリングが適切に実装されているか
- [ ] 境界値・異常系のテストケースが考慮されているか

#### 9.1.2 保守性チェック
- [ ] コードが読みやすく理解しやすいか
- [ ] 適切なコメントが記載されているか
- [ ] 関数・クラスの責任範囲が明確か
- [ ] 重複コードがないか

#### 9.1.3 パフォーマンスチェック
- [ ] 不要なDOM操作がないか
- [ ] メモリリークの可能性がないか
- [ ] APIコール頻度が適切か

#### 9.1.4 セキュリティチェック
- [ ] XSS脆弱性がないか
- [ ] LocalStorageに機密情報を保存していないか
- [ ] 外部APIとの通信が適切に保護されているか

### 9.2 レビューテンプレート

```markdown
## レビュー対象
- [ ] 機能追加
- [ ] バグ修正  
- [ ] リファクタリング
- [ ] ドキュメント更新

## チェック項目
### 機能性
- [ ] 要件を満たしている
- [ ] テストが通過する
- [ ] エラーハンドリングが適切

### コード品質
- [ ] 命名規約に準拠
- [ ] 適切なコメント
- [ ] 重複コード回避

### パフォーマンス
- [ ] DOM操作最適化
- [ ] メモリ使用量適切
- [ ] API呼び出し最適化

## フィードバック
（具体的な改善提案を記載）

## 承認
- [ ] LGTM (Looks Good To Me)
```

## 10. トラブルシューティング・FAQ

### 10.1 開発時よくある問題

#### 10.1.1 CORS エラー

**問題:**
```
Access to fetch at 'https://api.p2pquake.net/v2/history' from origin 'file://' has been blocked by CORS policy
```

**解決法:**
```bash
# HTTPサーバー経由でアクセス
python3 -m http.server 8080
# http://localhost:8080/ でアクセス
```

#### 10.1.2 WebSocket接続失敗

**問題:**
```
WebSocket connection to 'wss://api.p2pquake.net/v2/ws' failed
```

**診断方法:**
```javascript
// DevTools Console で実行
const ws = new WebSocket('wss://api.p2pquake.net/v2/ws');
ws.onopen = () => console.log('Connected');
ws.onerror = (error) => console.error('Error:', error);
```

#### 10.1.3 Notification API 許可されない

**問題:**
```
Notification.permission === "denied"
```

**解決法:**
1. ブラウザアドレスバーの通知アイコンをクリック
2. 「許可」を選択
3. またはブラウザ設定から手動で許可

### 10.2 デプロイ時問題

#### 10.2.1 GitHub Pages で404エラー

**原因確認:**
- リポジトリ設定でPages機能が有効化されているか
- 正しいブランチが指定されているか
- `index.html` がルートディレクトリにあるか

#### 10.2.2 Netlify/Vercel でCSPエラー

**解決法:**
設定ファイルでContent Security Policyを適切に設定:

```javascript
// CSP ヘッダー例
"Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; connect-src 'self' wss://api.p2pquake.net https://api.p2pquake.net;"
```

## 11. 継続的改善

### 11.1 パフォーマンス監視

#### 11.1.1 監視指標
- **初期読み込み時間**: 3秒以内目標
- **WebSocket接続時間**: 5秒以内目標  
- **API レスポンス時間**: 30秒以内目標
- **メモリ使用量**: 50MB以内目標

#### 11.1.2 改善提案プロセス
1. **問題の特定**: ユーザーフィードバック・監視データ
2. **解決案の検討**: 技術的実現性・影響範囲評価
3. **実装・テスト**: 開発→テスト→レビュー
4. **デプロイ・効果測定**: 本番展開後の効果確認

### 11.2 技術負債管理

#### 11.2.1 定期レビュー項目
- **依存ライブラリ更新**: セキュリティアップデート
- **ブラウザ互換性**: 新バージョン対応
- **コード品質**: 複雑度・重複度測定
- **ドキュメント更新**: 実装との整合性確認

## 12. 参考資料・学習リソース

### 12.1 技術仕様
- [P2P地震情報 API仕様](https://www.p2pquake.net/json_api_v2/)
- [Leaflet.js ドキュメント](https://leafletjs.com/reference.html)
- [Web Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)

### 12.2 開発ツール
- [Visual Studio Code](https://code.visualstudio.com/)
- [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools)
- [Git チュートリアル](https://git-scm.com/docs/gittutorial)

### 12.3 ベストプラクティス
- [MDN Web Docs](https://developer.mozilla.org/)
- [JavaScript Clean Code](https://github.com/ryanmcdermott/clean-code-javascript)
- [CSS Guidelines](https://cssguidelin.es/)