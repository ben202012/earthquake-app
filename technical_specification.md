# 地震速報アプリ 技術仕様書

## 1. システム概要

### 1.1 アーキテクチャ図
```
┌─────────────────────┐    ┌─────────────────────┐
│                     │    │                     │
│ ブラウザ            │    │ P2P地震情報          │
│ (HTML/CSS/JS)       ├────┤ WebSocket API       │
│                     │    │                     │
└─────────┬───────────┘    └─────────────────────┘
          │
          │
          │                ┌─────────────────────┐
          │                │                     │
          └────────────────┤ 気象庁API            │
                           │ (RSS/JSON)          │
                           │                     │
                           └─────────────────────┘
```

### 1.2 技術スタック
- **フロントエンド**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **リアルタイム通信**: WebSocket API
- **地図表示**: Leaflet.js
- **通知**: Notification API
- **データ取得**: Fetch API
- **デプロイ**: 静的ホスティング（GitHub Pages等）

## 2. システム構成

### 2.1 フロントエンド構成

#### 2.1.1 ファイル構成
```
index.html          # メインHTML
test.html           # テスト用HTML（デバッグ機能付き）
styles.css          # スタイルシート
script.js           # メインJavaScript
earthquake-api.js   # API通信クラス
notification.js     # 通知機能クラス
map.js              # 地図表示機能
config.js           # 設定管理
requirements.md     # 要件定義書
technical_specification.md # 技術仕様書
```

#### 2.1.2 画面レイアウト
- **ヘッダー**: アプリタイトル、接続状態表示、設定ボタン
- **左側パネル（60%）**:
  - **上部 P2Pパネル**: 
    - 緊急地震速報ステータス表示（`eew-status`）
    - 日本列島地震活動状況ダッシュボード（`japan-status-dashboard`）
    - リアルタイム活動フィード（`activity-feed`）
    - レーダーパルス監視アニメーション
  - **下部 JMAパネル**: 直近10件の地震履歴情報表示（クリック可能カード）
- **右側パネル（40%）**: インタラクティブ地図（Leaflet.js）
- **サイドバー**: 設定パネル（スライド式表示/非表示）
- **モーダルウィンドウ**: 地震詳細情報表示（JMAカードクリック時）
- **固定強震モニタパネル**: 右上固定配置のリアルタイム震度表示iframe

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