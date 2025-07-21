# 地震速報アプリ 運用手順書

## 1. 文書概要

### 1.1 目的
この文書は地震速報アプリケーションの日常運用、監視、トラブルシューティングの手順を定義します。

### 1.2 対象者
- システム運用担当者
- アプリケーション利用者
- サポート担当者

### 1.3 前提条件
- PC環境での運用を前提とする
- インターネット接続が常時利用可能
- ブラウザ（Chrome, Firefox, Safari, Edge）の最新版が利用可能

## 2. システム起動・停止手順

### 2.1 システム起動

#### 2.1.1 ローカル環境での起動（開発・テスト用）

**前提条件:**
- Python 3.6以上がインストール済み
- アプリケーションファイルがローカルに存在

**起動手順:**
1. **ターミナル/コマンドプロンプトを開く**

2. **アプリケーションディレクトリに移動**
   ```bash
   cd "/path/to/earthquake-app"
   ```

3. **HTTPサーバーを起動**
   ```bash
   python3 -m http.server 8080
   ```

4. **ブラウザでアクセス**
   - メインアプリ: `http://localhost:8080/index.html`
   - テストモード: `http://localhost:8080/test.html`

5. **正常起動の確認**
   - ヘッダーの接続状態インジケーターが緑色になることを確認
   - P2Pパネルに「監視中」と表示されることを確認
   - 地図が正常に表示されることを確認

#### 2.1.2 本番環境での起動（静的ホスティング）

**GitHub Pages の場合:**
1. **リポジトリの確認**
   - GitHub リポジトリにアプリファイルがプッシュ済みであることを確認

2. **Pages設定の確認**
   - Settings > Pages > Source: "Deploy from a branch"
   - Branch: main / root

3. **アクセスURLで確認**
   - `https://[username].github.io/[repository-name]/`

**Netlify/Vercel の場合:**
1. **デプロイ状況の確認**
   - 管理画面でデプロイが成功していることを確認

2. **独自URLでアクセス**
   - 提供されたURLでアプリケーションにアクセス

### 2.2 システム停止

#### 2.2.1 ローカル環境での停止

**方法1: キーボード操作**
```bash
# ターミナルでCtrl+C（Windows/Linux）またはCmd+C（macOS）
```

**方法2: プロセス終了**
```bash
# プロセス確認
ps aux | grep "python3 -m http.server 8080"

# プロセス終了（PIDを指定）
kill [PID番号]
```

**方法3: ポート強制終了**
```bash
# macOS/Linux
lsof -ti:8080 | xargs kill -9

# Windows
netstat -ano | findstr :8080
taskkill /F /PID [PID番号]
```

#### 2.2.2 ブラウザでの停止
- ブラウザタブを閉じる
- WebSocket接続が自動的に切断される

## 3. 日常運用手順

### 3.1 監視項目

#### 3.1.1 必須監視項目

| 監視項目 | 確認方法 | 正常値 | 異常時対応 |
|----------|----------|--------|------------|
| P2P接続状態 | ヘッダーの接続インジケーター | 緑色（接続中） | 3.2 接続障害対応 参照 |
| JMA API状態 | ヘッダーの接続インジケーター | 緑色（接続中） | 3.2 接続障害対応 参照 |
| 通知機能 | 通知テストボタン | 通知・音声が正常動作 | 3.3 通知障害対応 参照 |
| 地図表示 | 地図パネル | Leaflet地図が表示 | 3.4 表示障害対応 参照 |

#### 3.1.2 定期監視項目（週1回）

| 監視項目 | 確認方法 | 確認周期 |
|----------|----------|----------|
| ブラウザコンソールエラー | DevTools Console確認 | 週1回 |
| LocalStorage容量 | DevTools Application確認 | 週1回 |
| 履歴データ整合性 | JMAパネルの履歴件数確認 | 週1回 |

### 3.2 接続障害対応

#### 3.2.1 P2P接続エラー

**症状:**
- P2P接続インジケーターが赤色
- P2Pパネルに接続エラーメッセージ表示

**対応手順:**
1. **基本確認**
   ```bash
   # ネットワーク接続確認
   ping google.com
   ```

2. **ブラウザ確認**
   - ブラウザを最新版に更新
   - キャッシュクリア（Ctrl+Shift+R）
   - 他のブラウザで動作確認

3. **ファイアウォール確認**
   - WebSocket接続（wss://）が許可されているか確認
   - 企業ネットワークの場合、IT部門に確認

4. **手動再接続**
   - ページリロード（F5）
   - 設定パネルから手動再接続

#### 3.2.2 JMA API接続エラー

**症状:**
- JMA接続インジケーターが赤色
- JMAパネルにデータが表示されない

**対応手順:**
1. **API確認**
   ```bash
   # API疎通確認
   curl "https://api.p2pquake.net/v2/history?codes=551&limit=1"
   ```

2. **ブラウザDevTools確認**
   - Network タブでAPI呼び出し状況確認
   - Console タブでエラーメッセージ確認

3. **代替運用**
   - P2P リアルタイム情報のみで継続運用
   - API復旧まで履歴情報は利用不可

### 3.3 通知障害対応

#### 3.3.1 ブラウザ通知が表示されない

**対応手順:**
1. **通知許可確認**
   - ブラウザアドレスバーの通知アイコン確認
   - ブラウザ設定で通知が許可されているか確認

2. **システム設定確認**
   - OS の通知設定でブラウザ通知が許可されているか確認
   - Do Not Disturb モードの解除

3. **テスト実行**
   - 設定パネルの「通知テスト」ボタンで動作確認

#### 3.3.2 音声通知が再生されない

**対応手順:**
1. **音量確認**
   - システム音量・ブラウザ音量の確認
   - ミュートになっていないか確認

2. **Autoplay制限対応**
   - 「音声テスト」ボタンクリックでAudioContext有効化
   - ブラウザのAutoplay設定確認

3. **音声ファイル確認**
   - DevTools Network タブで音声ファイル読み込み確認

### 3.4 表示障害対応

#### 3.4.1 地図が表示されない

**対応手順:**
1. **Leaflet.js読み込み確認**
   - DevTools Network タブでLeaflet.js読み込み確認
   - CDN障害の可能性を確認

2. **JavaScript エラー確認**
   - DevTools Console でエラーメッセージ確認
   - 地図初期化エラーの特定

3. **データ確認**
   - 地震データに有効な座標情報が含まれているか確認

#### 3.4.2 モーダルが表示されない

**対応手順:**
1. **クリックイベント確認**
   - JMAパネルのカードが実際にクリック可能か確認
   - DevTools Console でイベントエラー確認

2. **モーダル要素確認**
   - DevTools Elements でモーダルHTML要素の存在確認
   - CSS表示プロパティの確認

## 4. 設定管理

### 4.1 ユーザー設定

#### 4.1.1 推奨設定値

| 設定項目 | 推奨値 | 説明 |
|----------|--------|------|
| マグニチュード閾値 | 4.0 | 通知対象の最小マグニチュード |
| 震度閾値 | 震度3 | 通知対象の最小震度 |
| 通知音 | ON | 音声アラートを有効 |
| 音量 | 50% | 適度な音量レベル |
| 自動ズーム | ON | 地震発生時の地図自動ズーム |

#### 4.1.2 設定変更手順

1. **設定パネルを開く**
   - ヘッダー右側の「設定」ボタンをクリック

2. **各項目を調整**
   - スライダーやプルダウンで値を変更
   - リアルタイムで設定が保存される

3. **テスト実行**
   - 「通知テスト」ボタンで動作確認
   - 必要に応じて「設定をリセット」で初期化

### 4.2 システム設定

#### 4.2.1 LocalStorage管理

**データ確認:**
```javascript
// ブラウザDevTools Console で実行
console.log('設定:', localStorage.getItem('earthquake_settings'));
console.log('履歴:', localStorage.getItem('earthquake_history'));
```

**データクリア:**
```javascript
// 設定のみクリア
localStorage.removeItem('earthquake_settings');

// 履歴のみクリア
localStorage.removeItem('earthquake_history');

// 全データクリア
localStorage.clear();
```

## 5. ログ管理

### 5.1 ログ確認方法

#### 5.1.1 ブラウザコンソールログ

**確認手順:**
1. ブラウザでF12キーを押してDevToolsを開く
2. Console タブを選択
3. ログレベルでフィルタリング（Info, Warning, Error）

**主要ログメッセージ:**
- `EarthquakeApp initialized successfully` - アプリ初期化成功
- `P2P WebSocket connected` - WebSocket接続成功
- `JMA earthquake data received` - API データ取得成功
- エラーメッセージの詳細分析

#### 5.1.2 test.html でのデバッグログ

**使用方法:**
1. `test.html` にアクセス
2. 「ログ表示/非表示」ボタンでログパネル表示
3. 各テストボタンで機能別ログ確認

## 6. バックアップ・復旧

### 6.1 設定のバックアップ

#### 6.1.1 手動バックアップ

```javascript
// DevTools Console で実行
const settings = localStorage.getItem('earthquake_settings');
const history = localStorage.getItem('earthquake_history');

// コピーして保存
console.log('Settings backup:', settings);
console.log('History backup:', history);
```

#### 6.1.2 設定の復元

```javascript
// バックアップデータを復元
localStorage.setItem('earthquake_settings', '[バックアップ設定データ]');
localStorage.setItem('earthquake_history', '[バックアップ履歴データ]');

// ページリロード
location.reload();
```

### 6.2 アプリケーションファイルのバックアップ

#### 6.2.1 ファイル一覧

**必須ファイル:**
- `index.html` - メインHTML
- `test.html` - テスト用HTML
- `styles.css` - スタイルシート
- `script.js` - メインJavaScript
- `earthquake-api.js` - API通信
- `notification.js` - 通知機能
- `map.js` - 地図表示
- `config.js` - 設定管理

**文書ファイル:**
- `requirements.md` - 要件定義書
- `technical_specification.md` - 技術仕様書
- `operation_manual.md` - 運用手順書

## 7. 緊急時対応

### 7.1 緊急地震速報発信時

**対応手順:**
1. **EEWステータス確認**
   - P2Pパネル上部の緊急地震速報ステータス確認
   - 「発信中 - 強い揺れに警戒」メッセージの確認

2. **安全行動**
   - 即座に安全な場所に避難
   - システム監視は安全確保後に実施

3. **システム継続監視**
   - EEW解除後もリアルタイム情報を継続監視
   - 活動フィードで関連情報を確認

### 7.2 大規模地震発生時

**対応手順:**
1. **システム負荷軽減**
   - 不要なブラウザタブを閉じる
   - 重い処理は一時停止

2. **情報収集継続**
   - P2P リアルタイム情報を最優先で監視
   - JMA履歴情報で詳細確認

3. **通知設定調整**
   - 余震による頻繁な通知への対応
   - 閾値の一時的な引き上げを検討

## 8. 定期メンテナンス

### 8.1 週次メンテナンス

#### 8.1.1 チェック項目
- [ ] ブラウザコンソールエラーの確認
- [ ] LocalStorage使用量の確認
- [ ] 設定パネル各機能の動作確認
- [ ] 通知・音声テストの実施

#### 8.1.2 クリーンアップ
```javascript
// 古い履歴データの手動削除（7日以上前）
const history = JSON.parse(localStorage.getItem('earthquake_history') || '[]');
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - 7);

const cleanHistory = history.filter(item => new Date(item.time) > cutoffDate);
localStorage.setItem('earthquake_history', JSON.stringify(cleanHistory));
```

### 8.2 月次メンテナンス

#### 8.2.1 パフォーマンス確認
- ブラウザキャッシュのクリア
- LocalStorageの完全クリーンアップ
- 新機能・バグ修正の確認

#### 8.2.2 セキュリティ確認
- ブラウザの最新版への更新
- 使用ライブラリの脆弱性確認

## 9. サポート・問い合わせ

### 9.1 よくある問題と解決方法

**Q: 地震が発生したのに通知されない**
A: 設定されている閾値を確認してください。マグニチュードや震度の設定値以下の地震は通知されません。

**Q: 音が出ない**
A: ブラウザのAutoplay制限により初回は音声テストボタンのクリックが必要です。

**Q: 地図に地震の位置が表示されない**
A: P2P APIから座標データが提供されていない場合があります。しばらく待ってから再確認してください。

### 9.2 技術サポート

**GitHubリポジトリ:**
- Issues での問題報告
- Pull Request での改善提案

**ログ情報の提供:**
- ブラウザコンソールのエラーログ
- 問題発生時の操作手順
- 使用環境（OS、ブラウザ、バージョン）

## 10. 運用履歴・改善記録

### 10.1 運用履歴記録フォーマット

```
日時: YYYY-MM-DD HH:MM:SS
作業者: [作業者名]
作業内容: [実施した作業の詳細]
結果: [成功/失敗/部分的成功]
備考: [特記事項、今後の対応等]
```

### 10.2 定期報告事項

**週次報告:**
- システム稼働率
- エラー発生回数・内容
- 設定変更履歴

**月次報告:**
- パフォーマンス分析
- 機能改善提案
- セキュリティ状況