# 🌏 地震監視システム v2.0 - Professional Technical Specification

## 1. システム概要

### 1.1 プロフェッショナルアーキテクチャ図
```
┌─────────────────────────────────────────────────────────────┐
│                    Professional Browser Application          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐ │
│  │  Professional   │  │   Component     │  │   Advanced    │ │
│  │   Dashboard     │  │  Architecture   │  │     UI        │ │
│  │   (Grid Layout) │  │  (EventBus +    │  │ (Dark Theme   │ │
│  │                 │  │   BaseComponent)│  │   + Animations│ │
│  └─────────────────┘  └─────────────────┘  └───────────────┘ │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐ │
│  │ Real-time Map   │  │ P2P Panel       │  │ Activity Feed │ │
│  │ (Leaflet.js +   │  │ (Dashboard +    │  │ (System Log + │ │
│  │  Earthquake     │  │  Statistics +   │  │  Performance  │ │
│  │  Markers)       │  │  EEW Status)    │  │  Monitoring)  │ │
│  └─────────────────┘  └─────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Sources & APIs                      │
│                                                             │
│  ┌─────────────────┐           ┌─────────────────────────┐  │
│  │ P2P地震情報      │           │    Historical Data       │  │
│  │ WebSocket API   │◄─────────►│    (P2P History API)     │  │
│  │ (Real-time)     │           │    (60秒間隔取得)        │  │
│  └─────────────────┘           └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Professional Technology Stack v2.0
- **Architecture**: Component-based Design (KyoshinEewViewerIngen準拠)
- **Core Framework**: Vanilla JavaScript ES6+ Modules
- **Event System**: Custom EventBus Pattern
- **UI Framework**: Professional Component Library
- **Real-time Communication**: WebSocket API + Auto-reconnection
- **Map Visualization**: Leaflet.js + Custom Earthquake Markers
- **Notification System**: Notification API + Custom Audio System
- **Data Management**: Advanced LocalStorage + Data Persistence
- **Performance**: Memory Monitoring + Auto-optimization
- **Deployment**: Static Hosting (GitHub Pages/Netlify/Vercel)

## 2. システム構成

### 2.1 フロントエンド構成

#### 2.1.1 Professional File Structure v2.0
```
# Professional Architecture Files
index.html              # Professional Dashboard (Main App)
index-new.html          # Modular Architecture Version
styles.css              # Legacy styles (for compatibility)

# Core Architecture (v2.0)
src/
├── core/
│   ├── EventBus.js         # Central Event Management System
│   ├── BaseComponent.js    # Base class for all UI components
│   └── App.js             # Main Application Controller
├── components/
│   └── panels/
│       └── P2PPanel.js     # P2P Earthquake Information Panel
├── models/
│   └── Earthquake.js       # Earthquake Data Model & Validation
└── styles/
    └── components.css      # Professional Component Styles

# Legacy Files (v1.0 compatibility)
test.html               # Test & Debug Interface
script.js               # Legacy main script
earthquake-api.js       # Legacy API communication
notification.js         # Legacy notification system
map.js                  # Legacy map functionality
config.js               # Configuration management

# Documentation
README.md               # Professional System Documentation
requirements.md         # System Requirements Specification
technical_specification.md # Professional Technical Specification
ARCHITECTURE_REDESIGN.md   # Architecture Design Document
```

#### 2.1.2 プロフェッショナルダッシュボード レイアウト v2.0

**Grid-based プロフェッショナルインターフェース**
```css
.earthquake-dashboard {
    display: grid;
    grid-template-columns: 350px 1fr 400px;
    grid-template-rows: 70px 1fr;
    grid-template-areas: 
        "header header header"
        "sidebar main rightpanel";
}
```

##### 主要コンポーネント:
- **メインヘッダー (高さ70px)**:
  - 🌏 アプリロゴ + タイトル "地震監視システム"
  - 🔌 P2P/API接続ステータスインジケーター（緑/赤）
  - 🕐 リアルタイム時計表示
  - ⚙️ 設定ボタン

- **左サイドバー (幅350px)**:
  - **⚡ 緊急地震速報セクション**: EEWステータス表示
  - **📊 監視統計セクション**: 今日/今週の地震数、最大震度、応答時間
  - **🔴 最新地震情報セクション**: スクロール可能な地震履歴リスト

- **メインコンテンツエリア (中央)**:
  - **🗺️ インタラクティブ地図**: Leaflet.js + ダークテーマ
  - **📍 震源位置情報オーバーレイ**: 北緯・東経・深さ・マグニチュード表示

- **右パネル (幅400px)**:
  - **📡 リアルタイム監視ヘッダー**: "LIVE" インジケーター
  - **⏰ システム時刻セクション**: JST時計 + 日付表示
  - **📈 パフォーマンスメトリクス**: 稼働時間・受信データ・メモリ使用量・活発地域
  - **📋 アクティビティフィード**: システムイベント・地震発生ログ

### 2.2 データ管理

#### 2.2.1 ローカルストレージ
| キー | 説明 | 例 |
|------|------|-----|
| `earthquake_settings` | ユーザー設定 | `{震度閾値, 音量, etc}` |
| `earthquake_history` | 地震履歴 | `[{地震データ配列}]` |
| `connection_status` | 接続状態 | `{p2p: true, jma: false}` |

#### 2.2.2 メモリ管理
- **最大履歴件数**: 50件（メモリ）、10件（表示）
- **自動削除**: 1週間以上経過したデータ
- **キャッシュ**: APIレスポンスの一時保存
- **統計データ**: 日次・週次地震活動統計をリアルタイム更新

## 3. API仕様

### 3.1 P2P地震情報 WebSocket API

#### 3.1.1 エンドポイント
```
wss://api.p2pquake.net/v2/ws
```

#### 3.1.2 接続方式
- **プロトコル**: WebSocket
- **認証**: 不要
- **再接続**: 自動（最大5回）

#### 3.1.3 レスポンス例
```json
{
  "code": 551,
  "time": "2024-01-15T12:34:56+09:00",
  "earthquake": {
    "time": "2024-01-15T12:30:00+09:00",
    "hypocenter": {
      "name": "東京都23区",
      "latitude": 35.7,
      "longitude": 139.7,
      "depth": 30,
      "magnitude": 4.5
    },
    "maxScale": 30,
    "domesticTsunami": "None"
  },
  "points": [
    {
      "pref": "東京都",
      "addr": "新宿区",
      "scale": 30
    }
  ]
}
```

### 3.2 P2P地震情報 履歴API

#### 3.2.1 エンドポイント
```
https://api.p2pquake.net/v2/history?codes=551&limit=10
```

#### 3.2.2 取得方式
- **プロトコル**: HTTPS (Fetch API)
- **更新間隔**: 60秒
- **フォーマット**: JSON配列
- **認証**: 不要

#### 3.2.3 レスポンス例
```json
[{
  "code": 551,
  "earthquake": {
    "domesticTsunami": "None",
    "hypocenter": {
      "depth": 20,
      "latitude": 29.4,
      "longitude": 129.5,
      "magnitude": 3,
      "name": "トカラ列島近海"
    },
    "maxScale": 20,
    "time": "2025/07/21 17:13:00"
  },
  "points": [{
    "addr": "鹿児島十島村悪石島",
    "pref": "鹿児島県",
    "scale": 20
  }],
  "time": "2025/07/21 17:16:28.21"
}]
```

## 4. データフロー

### 4.1 アプリケーション起動フロー
1. **初期化**: HTML読み込み、CSS適用
2. **設定読み込み**: LocalStorageから設定取得
3. **通知許可**: Notification API の許可要求
4. **API接続**: P2P WebSocket接続開始
5. **定期取得**: 気象庁API定期ポーリング開始
6. **UI更新**: 初期画面表示

### 4.2 リアルタイム更新フロー
```javascript
// P2P地震情報（リアルタイム）
websocket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.code === 551) { // 地震情報
    updateP2PPanel(data);
    updateMap(data);
    checkNotificationConditions(data);
    saveToHistory(data);
    // 緊急地震速報チェック
    checkEEWStatus(data);
    // 活動統計更新
    updateDashboardStats();
    // 活動フィード追加
    addActivityFeedItem(`🔴 地震発生: ${data.location}`, 'earthquake');
  }
  if (data.code === 556 || data.code === 557) { // 緊急地震速報
    updateEEWStatus(data);
    addActivityFeedItem('🚨 緊急地震速報が発信されました', 'warning');
  }
};

// P2P履歴情報（定期取得・10件）
setInterval(async () => {
  const data = await fetchP2PHistoryData(); // limit=10
  updateJMAPanel(data); // 10件のクリック可能カード表示
  if (data.length > 0) {
    updateMap(data[0]); // 最新データで地図更新
  }
}, 60000);
```

### 4.3 エラーハンドリング
```javascript
function handleWebSocketError(error) {
  console.error('WebSocket Error:', error);
  showConnectionError('P2P接続エラー');
  attemptReconnect();
}

function handleFetchError(error) {
  console.error('Fetch Error:', error);
  showConnectionError('P2P履歴API取得エラー');
  // フォールバック: リアルタイム情報のみで継続
}
```

## 5. セキュリティ仕様

### 5.1 クライアントサイド
- **HTTPS通信**: 全ての外部API呼び出し
- **CSP**: Content Security Policyの設定
- **XSS対策**: ユーザー入力のサニタイズ
- **認証**: APIキー不要（公開API使用）

### 5.2 データ保護
- **LocalStorage**: 機密情報は保存しない
- **個人情報**: 収集・保存しない
- **ログ**: ブラウザコンソールのみ

## 6. 監視・ログ

### 6.1 ブラウザログ
- **ログレベル**: console.log, console.warn, console.error
- **出力内容**: 接続状態、エラー詳細、パフォーマンス
- **保存期間**: ブラウザセッション中のみ

### 6.2 監視項目
| 項目 | 確認方法 | 正常値 |
|------|----------|--------|
| P2P接続状態 | WebSocket.readyState | 1 (OPEN) |
| 気象庁API応答 | fetch response.ok | true |
| 通知許可状態 | Notification.permission | granted |

### 6.3 ステータス表示
- **接続インジケーター**: 緑/赤の状態表示
- **最終更新時刻**: タイムスタンプ表示
- **エラーメッセージ**: ユーザーフレンドリーな表示

## 7. デプロイメント

### 7.1 静的ホスティング
```bash
# GitHub Pages デプロイ
git add .
git commit -m "Initial earthquake app"
git push origin main
# GitHub Settings > Pages > Source: Deploy from branch
```

### 7.2 環境管理
- **開発環境**: ローカルサーバー（Live Server等）
- **本番環境**: GitHub Pages / Netlify / Vercel

## 8. パフォーマンス

### 8.1 想定負荷
- **WebSocket接続**: 常時1接続
- **API呼び出し**: 60秒間隔
- **データ転送量**: 1-5KB/回

### 8.2 最適化
- **バンドルサイズ**: 外部ライブラリの最小化
- **メモリ効率**: 履歴データの定期削除
- **描画最適化**: Virtual DOM不使用時の効率的なDOM更新

## 9. 運用手順

### 9.1 PC起動方法

#### 9.1.1 ローカル起動（開発・テスト用）
```bash
# 1. アプリケーションディレクトリに移動
cd "/path/to/earthquake-app"

# 2. Python HTTPサーバーを起動
python3 -m http.server 8080

# 3. ブラウザでアクセス
# - メイン: http://localhost:8080/
# - テスト: http://localhost:8080/test.html
```

#### 9.1.2 静的ホスティング起動（本番用）
```bash
# GitHub Pagesの場合
git add .
git commit -m "Deploy earthquake app"
git push origin main
# Settings > Pages > Source: Deploy from branch

# Netlify/Vercelの場合
# ファイルをドラッグ&ドロップまたはGit連携
```

### 9.2 PC終了方法

#### 9.2.1 ローカルサーバー終了
```bash
# 方法1: Ctrl+C でサーバー停止

# 方法2: プロセス確認と強制終了
ps aux | grep "python3 -m http.server 8080"
kill [PID番号]

# 方法3: 特定ポートのプロセスを終了（macOS/Linux）
lsof -ti:8080 | xargs kill -9
```

#### 9.2.2 ブラウザでの終了
- ブラウザタブを閉じる
- WebSocket接続が自動的に切断される

### 9.3 日常運用
- **監視**: ブラウザコンソールでのエラー確認
- **メンテナンス**: 定期的なブラウザリロード
- **更新**: 必要に応じてページ更新
- **設定管理**: 設定パネルで閾値・音量調整

### 9.4 障害対応・トラブルシューティング

#### 9.4.1 接続エラーの場合
1. **P2P接続エラー**:
   - ネットワーク接続確認
   - ファイアウォール設定確認
   - ページリロード

2. **API取得エラー**:
   - インターネット接続確認
   - ブラウザコンソールでエラー詳細確認

#### 9.4.2 通知が出ない場合
1. **ブラウザ通知許可**: ブラウザ設定で通知を許可
2. **音声が出ない**: システム音量・ブラウザ音量確認
3. **Autoplay制限**: 「音声テスト」ボタンでAudioContext動作確認

#### 9.4.3 地図が表示されない場合
1. **Leaflet.js読み込み**: ネットワーク接続確認
2. **JavaScript エラー**: ブラウザDevToolsでエラー確認
3. **座標データ**: P2P APIデータの座標情報確認

## 10. コスト見積

### 10.1 運用コスト
- **GitHub Pages**: 無料
- **Netlify/Vercel**: 無料プラン内
- **P2P地震情報API**: 無料
- **気象庁API**: 無料
- **合計**: $0

### 10.2 開発コスト
- **ドメイン**: 年間$10-15（独自ドメイン使用時）
- **開発ツール**: 無料（VS Code等）

## 11. 新機能技術詳細

### 11.1 モーダル詳細表示機能

#### 11.1.1 技術実装
- **HTML構造**: `modal-overlay` > `earthquake-modal` > `modal-header|body|footer`
- **CSS**: Glassmorphism効果、backdrop-filter、fade/slide アニメーション
- **JavaScript**: `showEarthquakeModal()`, `closeEarthquakeModal()`, `generateModalContent()`
- **イベント処理**: クリック、ESCキー、オーバーレイクリックでの閉じる機能

#### 11.1.2 表示データ
```javascript
// モーダル表示データ例
{
  基本情報: {
    発生時刻: "2024-XX-XX XX:XX:XX (曜日)",
    震源地: "千葉県東方沖",
    マグニチュード: "M4.2",
    深さ: "60km",
    最大震度: "震度3",
    座標: "35.700, 140.800"
  },
  震度分布: [
    { pref: "千葉県", addr: "千葉市", intensity: "3" },
    { pref: "東京都", addr: "千代田区", intensity: "2" }
  ],
  津波情報: "津波に関する情報が発表されています"
}
```

### 11.2 P2P視覚強化機能

#### 11.2.1 緊急地震速報ステータス
```css
.eew-status {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 8px;
}
.eew-icon {
  animation: sparkle 3s infinite;
}
```

#### 11.2.2 活動統計ダッシュボード
```javascript
// 統計データ構造
dashboardStats: {
  todayCount: 0,      // 今日の地震数
  weekCount: 0,       // 今週の地震数  
  maxIntensity: '-',  // 最大震度
  activeRegions: '-', // 活発地域数
  lastActivity: null  // 最終活動時刻
}
```

### 11.3 テスト機能拡張

#### 11.3.1 test.html新機能
- **モーダルテスト**: `testModal()`関数で模擬データによるモーダル表示テスト
- **詳細ログ**: アクション実行結果の時系列表示
- **包括的テスト**: 接続、通知、音声、設定、地震シミュレート、モーダルの全機能テスト

### 11.4 固定強震モニタパネル

#### 11.4.1 パネル構造
```html
<div class="fixed-kmoni-panel" id="fixed-kmoni-panel">
  <div class="kmoni-header"> <!-- ドラッグ可能ヘッダー -->
    <div class="kmoni-title">📊 強震モニタ</div>
    <div class="kmoni-controls">
      <button id="kmoni-refresh">🔄</button>    <!-- 更新 -->
      <button id="kmoni-minimize">➖</button>   <!-- 最小化 -->
      <button id="kmoni-close">✕</button>      <!-- 閉じる -->
    </div>
  </div>
  <div class="kmoni-content">
    <iframe src="http://www.kmoni.bosai.go.jp"></iframe>
  </div>
  <div class="kmoni-status">URL表示</div>
</div>
```

#### 11.4.2 パネル機能
```javascript
class FixedKmoniPanel {
  constructor() {
    this.isVisible = true;
    this.isMinimized = false;
    this.isDragging = false;
  }
  
  // 主要メソッド
  loadKmoni()      // 強震モニタiframe読み込み
  refreshKmoni()   // パネル更新（回転アニメーション付き）
  toggleMinimize() // 最小化/復元切り替え
  startDrag(e)     // ドラッグ開始
  drag(e)          // ドラッグ中（境界制御付き）
  endDrag()        // ドラッグ終了
}
```

#### 11.4.3 CSS仕様
```css
.fixed-kmoni-panel {
  position: fixed;
  top: 90px; right: 20px;
  width: 400px; height: 300px;
  z-index: 9999;
  resize: both; /* リサイズ可能 */
  min-width: 300px; max-width: 600px;
  min-height: 200px; max-height: 500px;
  backdrop-filter: blur(15px);
  border-radius: 12px;
}
```

## 12. 今後の技術的拡張

### 12.1 実装済み機能
- ✅ **緊急地震速報対応**: EEWステータス表示・監視
- ✅ **モーダル詳細表示**: クリック時の詳細情報表示
- ✅ **固定強震モニタパネル**: 右上固定・ドラッグ移動・リサイズ可能
- ✅ **活動統計ダッシュボード**: リアルタイム統計表示
- ✅ **10件履歴表示**: 表示件数の拡張
- ✅ **視覚的UI強化**: Glassmorphism、アニメーション効果

### 12.2 今後の機能拡張
- **PWA化**: Service Worker、オフライン対応
- **地域フィルタリング**: ユーザー位置情報ベース
- **カスタム通知音**: 音声ファイルアップロード機能

### 12.3 技術改善
- **TypeScript化**: 型安全性の向上
- **モジュール分割**: ES6 Modules使用
- **テスト導入**: Jest等でのユニットテスト

## 13. プロフェッショナルアーキテクチャ詳細 v2.0

### 13.1 Component-based アーキテクチャ

#### 13.1.1 EventBus システム
```javascript
// 中央イベント管理システム
class EventBus {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Map();
    }
    
    subscribe(event, callback, context = null)  // イベント購読
    publish(event, data)                        // イベント発行
    once(event, callback, context = null)       // 一回限りの購読
    clear(event = null)                         // イベントクリア
}
```

#### 13.1.2 BaseComponent クラス
```javascript
// 全コンポーネントの基底クラス
class BaseComponent {
    constructor(container, options = {}) {
        this.container = container;
        this.options = { ...this.defaultOptions, ...options };
        this.eventBus = eventBus;
        this.element = null;
        this.isInitialized = false;
        this.isDestroyed = false;
    }
    
    // ライフサイクルメソッド
    async init()              // 初期化処理
    async render()            // DOM要素レンダリング
    async setupEventListeners() // イベントリスナー設定
    async update(data)        // コンポーネント更新
    destroy()                 // コンポーネント破棄
    
    // ユーティリティメソッド
    subscribeToEvent(event, callback)
    addEventListener(element, event, callback)
    createElement(tag, classes, attributes)
    createFromTemplate(template, data)
}
```

#### 13.1.3 P2PPanel コンポーネント
```javascript
// P2P地震情報表示パネル
class P2PPanel extends BaseComponent {
    constructor(container, options = {}) {
        super(container, options);
        this.connectionStatus = 'disconnected';
        this.dashboardStats = {
            todayCount: 0,
            weekCount: 0,
            maxIntensity: '-',
            activeRegions: '-',
            responseTime: 0,
            dataPackets: 0
        };
        this.activityFeed = [];
        this.eewStatus = { isActive: false, message: '発信なし' };
    }
    
    // 主要メソッド
    handleEarthquakeDetected(earthquake)  // 地震検出処理
    handleEEW(eewData)                   // 緊急地震速報処理
    updateStatistics(earthquake)         // 統計情報更新
    addActivityFeedItem(item)           // 活動フィード追加
    updateDashboard()                   // ダッシュボード更新
}
```

#### 13.1.4 Earthquake データモデル
```javascript
// 厳密な地震データモデル
class Earthquake {
    constructor(rawData, source = 'unknown') {
        this.id = this.generateId(rawData, source);
        this.source = source;
        this.timestamp = this.parseTimestamp(rawData.time);
        this.magnitude = parseFloat(rawData.magnitude) || null;
        this.depth = parseInt(rawData.depth) || null;
        this.location = rawData.location || '';
        this.coordinates = this.parseCoordinates(rawData);
        this.maxIntensity = this.parseMaxIntensity(rawData);
        this.intensityPoints = this.parseIntensityPoints(rawData);
        this.tsunami = this.parseTsunamiInfo(rawData);
        this.validate(); // データ検証
    }
    
    // 検証・フォーマット・変換メソッド
    validate()                    // データ妥当性検証
    formatTime(format = 'full')   // 時刻フォーマット
    formatMagnitude()             // マグニチュード表示
    toGeoJSON()                   // GeoJSON変換
    toJSON()                      // JSON変換
    static fromJSON(json)         // JSON復元
}
```

### 13.2 プロフェッショナル機能実装

#### 13.2.1 パフォーマンス監視
```javascript
// リアルタイムパフォーマンス監視
startPerformanceMonitoring() {
    setInterval(() => {
        // メモリ使用量監視
        if (performance.memory) {
            this.performanceMetrics.memoryUsage = Math.round(
                performance.memory.usedJSHeapSize / 1024 / 1024
            );
            
            // 閾値超過時の警告
            if (this.performanceMetrics.memoryUsage > 100) {
                console.warn(`⚠️ High memory usage: ${this.performanceMetrics.memoryUsage}MB`);
                this.eventBus.publish('app.performance.warning', {
                    type: 'memory',
                    value: this.performanceMetrics.memoryUsage
                });
            }
        }
        
        // コンポーネント健全性チェック
        this.componentInstances.forEach(component => {
            if (component.isDestroyed) {
                console.warn('⚠️ Destroyed component found:', component.id);
            }
        });
    }, 30000); // 30秒ごと
}
```

#### 13.2.2 エラーハンドリング
```javascript
// 包括的エラー処理システム
handleComponentError(errorData) {
    console.error(`❌ Component error in ${errorData.id}:`, errorData.error);
    
    // エラー統計更新
    this.performanceMetrics.errorCount = (this.performanceMetrics.errorCount || 0) + 1;
    
    // エラー復旧処理
    if (errorData.type === 'connection') {
        this.attemptReconnection();
    }
}

handleWebSocketError(error) {
    console.error('❌ WebSocket Error:', error);
    this.eventBus.publish('api.error', { type: 'websocket', error });
    
    // 自動再接続（最大3回）
    if (this.reconnectAttempts < 3) {
        setTimeout(() => {
            this.reconnectAttempts++;
            this.connectWebSocket();
        }, 5000 * this.reconnectAttempts);
    }
}
```

#### 13.2.3 データ永続化
```javascript
// LocalStorage活用の高度なデータ管理
saveData() {
    try {
        // 設定の保存
        localStorage.setItem('earthquake_app_settings', JSON.stringify(this.settings));
        
        // 履歴の保存（最新100件のみ）
        const historyToSave = this.earthquakeHistory
            .slice(0, this.settings.performance.maxHistoryItems)
            .map(earthquake => earthquake.toJSON());
        
        localStorage.setItem('earthquake_history', JSON.stringify(historyToSave));
        
        // 保存完了イベント
        this.eventBus.publish('app.data.saved', {
            settingsSize: JSON.stringify(this.settings).length,
            historySize: historyToSave.length
        });
        
    } catch (error) {
        console.error('❌ Failed to save data:', error);
        this.eventBus.publish('app.error', { error, phase: 'save' });
    }
}
```

---

**最終更新**: 2025年7月26日  
**バージョン**: 2.0.0 Professional  
**アーキテクチャ**: KyoshinEewViewerIngen準拠 Component-based Design  
**技術仕様**: プロフェッショナルレベル実装完了