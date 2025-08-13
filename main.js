/**
 * 地震監視システム メインスクリプト
 * CSPセキュリティ対応版
 */

// グローバル関数（後方互換性のため）
function openSettings() {
    if (window.monitor) {
        window.monitor.showSettingsPanel();
    }
}

// DOMContentLoaded時の初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌏 地震監視システム v3.0 - 安全モードで起動中...');
    
    // クラスの存在確認
    if (typeof ProfessionalEarthquakeMonitor === 'undefined') {
        console.error('❌ ProfessionalEarthquakeMonitorクラスが未定義です');
        console.log('利用可能なオブジェクト:', Object.keys(window));
        return;
    }
    
    // メインモニター初期化
    try {
        window.monitor = new ProfessionalEarthquakeMonitor();
        console.log('✅ 地震監視システム初期化完了');
    } catch (error) {
        console.error('❌ 地震監視システム初期化エラー:', error);
        return;
    }
    
    // イベントハンドラーを設定（CSP安全対応）
    setupSecureEventHandlers();
});

/**
 * CSP安全対応のイベントハンドラー設定
 */
function setupSecureEventHandlers() {
    // 設定ボタン
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', openSettings);
        console.log('✅ 設定ボタンのイベントハンドラー設定完了');
    }
    
    // 再接続ボタン
    const reconnectBtn = document.getElementById('reconnect-btn');
    if (reconnectBtn) {
        reconnectBtn.addEventListener('click', () => {
            if (window.monitor) {
                window.monitor.reconnectWebSocket();
            }
        });
        console.log('✅ 再接続ボタンのイベントハンドラー設定完了');
    }
    
    // 夜間モードボタンのイベントハンドラは、app.js内でボタンが動的に生成される際に設定されます。
}

// メモリリーク対策: ページ離脱時のクリーンアップ
window.addEventListener('beforeunload', () => {
    if (window.monitor) {
        window.monitor.cleanup();
    }
});

// エラーハンドリング
window.addEventListener('error', (event) => {
    console.error('🚨 グローバルエラー:', event.error);
    if (window.monitor && window.monitor.addActivityFeedItem) {
        window.monitor.addActivityFeedItem('❌', `エラー: ${event.error.message}`, new Date());
    }
});

console.log('📄 main.js読み込み完了 - セキュアモード有効');
