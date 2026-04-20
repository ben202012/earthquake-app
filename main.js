/**
 * 地震情報システム メインスクリプト
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
    console.log('🌏 地震情報システム v3.0 - 安全モードで起動中...');
    
    // クラスの存在確認
    if (typeof ProfessionalEarthquakeMonitor === 'undefined') {
        console.error('❌ ProfessionalEarthquakeMonitorクラスが未定義です');
        console.log('利用可能なオブジェクト:', Object.keys(window));
        return;
    }
    
    // メインモニター初期化
    try {
        window.monitor = new ProfessionalEarthquakeMonitor();
        console.log('✅ 地震情報システム初期化完了');
    } catch (error) {
        console.error('❌ 地震情報システム初期化エラー:', error);
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
    
    // 夜間モードボタン（動的に追加される）
    setTimeout(() => {
        const nightModeBtn = document.getElementById('night-mode-toggle');
        if (nightModeBtn) {
            nightModeBtn.addEventListener('click', () => {
                if (window.monitor) {
                    window.monitor.toggleNightMode();
                }
            });
            console.log('✅ 夜間モードボタンのイベントハンドラー設定完了');
        }
    }, 1000);
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

/**
 * 津波警報シミュレーション用コンソールヘルパー
 *
 * 使い方(DevTools コンソールで実行):
 *   simulateTsunamiAlerts({
 *     major_warning: ['191', '192'],   // 大津波警報(紫・点滅)
 *     warning:       ['201', '211'],    // 津波警報(赤・点滅)
 *     advisory:      ['221', '231']     // 津波注意報(黄)
 *   });
 *
 *   clearTsunamiAlerts();  // 全ての警報を解除(平常時に戻す)
 *
 * AREA_CODE は気象庁公式コード(3桁数値文字列)。
 * 例: 191=北海道太平洋沿岸東部、201=青森県太平洋沿岸、600=愛媛県宇和海沿岸 など。
 * 全コード一覧は以下で取得: window.monitor.tsunamiLoader.cache.features.map(f => ({code: f.properties.AREA_CODE, name: f.properties.AREA_NAME}))
 */
window.simulateTsunamiAlerts = async function (spec = {}) {
    const monitor = window.monitor;
    if (!monitor || !monitor.tsunamiLoader || !monitor.tsunamiLoader.cache) {
        console.error('❌ 津波ローダーが未初期化です。ページ読込完了後に再実行してください。');
        return;
    }
    // 警報レベル別のデフォルト値(気象庁の発表区分に準拠)
    const DEFAULTS = {
        major_warning: { waveHeight: '10m超', arrivalTime: '直ちに避難' },
        warning:       { waveHeight: '3m',    arrivalTime: '間もなく到達' },
        advisory:      { waveHeight: '1m',    arrivalTime: '既に到達と推定' },
        forecast:      { waveHeight: '0.2m',  arrivalTime: '予報' }
    };
    const features = monitor.tsunamiLoader.cache.features;
    // 全件一旦 'none' にリセット
    for (const f of features) {
        f.properties.STATUS = 'none';
        f.properties.WAVE_HEIGHT = '';
        f.properties.ARRIVAL_TIME = '';
    }
    let changed = 0;
    const issuedAt = new Date().toISOString();
    for (const [level, codes] of Object.entries(spec)) {
        if (!Array.isArray(codes)) continue;
        const d = DEFAULTS[level] || { waveHeight: '', arrivalTime: '' };
        for (const code of codes) {
            const target = features.find(f => f.properties.AREA_CODE === String(code));
            if (target) {
                target.properties.STATUS = level;
                target.properties.WAVE_HEIGHT = d.waveHeight;
                target.properties.ARRIVAL_TIME = d.arrivalTime;
                target.properties.ISSUED_AT = issuedAt;
                changed++;
            } else {
                console.warn(`⚠️ 未知の AREA_CODE: ${code}`);
            }
        }
    }
    console.log(`🎬 津波シミュレーション: ${changed}地域に警報レベル適用`);
    await monitor.addTsunamiCoastlines();

    // 音声警報を最高レベルで鳴らす(major_warning/warning はリピート、advisory は1回)
    if (window.audioAlertSystem) {
        const priority = { major_warning: 3, warning: 2, advisory: 1 };
        let topLevel = null;
        for (const [level, codes] of Object.entries(spec)) {
            if (!Array.isArray(codes) || codes.length === 0) continue;
            if (!topLevel || (priority[level] || 0) > (priority[topLevel] || 0)) topLevel = level;
        }
        if (topLevel) {
            try {
                window.audioAlertSystem.stopAllAlerts();
                await window.audioAlertSystem.playAlert(topLevel);
                console.log(`🔊 警報音再生: ${topLevel}`);
            } catch (e) {
                console.warn('⚠️ 警報音再生失敗(ブラウザの自動再生制限の可能性):', e.message);
            }
        }
    }
};

window.clearTsunamiAlerts = async function () {
    const monitor = window.monitor;
    if (!monitor || !monitor.tsunamiLoader || !monitor.tsunamiLoader.cache) {
        console.error('❌ 津波ローダーが未初期化です。');
        return;
    }
    for (const f of monitor.tsunamiLoader.cache.features) {
        f.properties.STATUS = 'none';
        f.properties.WAVE_HEIGHT = '';
        f.properties.ARRIVAL_TIME = '';
    }
    if (window.audioAlertSystem) window.audioAlertSystem.stopAllAlerts();
    console.log('🛑 全津波警報解除(音声も停止)');
    await monitor.addTsunamiCoastlines();
};

/**
 * 音声単体テスト: testTsunamiAudio('major_warning' | 'warning' | 'advisory' | 'test')
 * 地図表示を触らず、音声だけを鳴らして動作確認できる。
 */
window.testTsunamiAudio = async function (level = 'test') {
    if (!window.audioAlertSystem) {
        console.error('❌ audioAlertSystem が未初期化です。');
        return;
    }
    window.audioAlertSystem.stopAllAlerts();
    await window.audioAlertSystem.playAlert(level);
    console.log(`🔊 単体テスト再生: ${level}(10秒後に自動停止)`);
    setTimeout(() => window.audioAlertSystem.stopAllAlerts(), 10000);
};

console.log('📄 main.js読み込み完了 - セキュアモード有効');
console.log('💡 津波シミュレーション: simulateTsunamiAlerts({major_warning:["191"],warning:["201"],advisory:["221"]}) / clearTsunamiAlerts()');
