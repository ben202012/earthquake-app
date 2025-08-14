import { audioAlertSystem } from './audio-alert-system.js';

/**
 * 津波自動警報・通知システム
 * 実用機能50%達成のための重要実装
 */

export class TsunamiAlertSystem {
    constructor() {
        this.config = {
            // 警報レベル設定
            alertLevels: {
                'major_warning': {
                    priority: 4,
                    color: '#8B0000',
                    sound: 'major_warning', // Web Audio API使用
                    title: '🚨 大津波警報',
                    message: '直ちに高台へ避難してください！',
                    autoRepeat: true,
                    repeatInterval: 30000 // 30秒毎
                },
                'warning': {
                    priority: 3,
                    color: '#FF0000', 
                    sound: 'warning', // Web Audio API使用
                    title: '⚠️ 津波警報',
                    message: '津波の危険があります。避難準備をしてください。',
                    autoRepeat: true,
                    repeatInterval: 60000 // 1分毎
                },
                'advisory': {
                    priority: 2,
                    color: '#FFD700',
                    sound: 'advisory', // Web Audio API使用
                    title: '📢 津波注意報',
                    message: '海岸付近では注意してください。',
                    autoRepeat: false,
                    repeatInterval: 0
                }
            },
            
            // 通知設定
            notifications: {
                browser: true,
                sound: true,
                vibration: true,
                desktop: true,
                fullscreen: false // 緊急時フルスクリーン表示
            },
            
            // 音声設定
            audio: {
                enabled: true,
                volume: 0.8,
                fadeIn: true,
                emergency_priority: true
            }
        };
        
        this.state = {
            currentAlerts: new Map(),
            activeNotifications: [],
            soundEnabled: true,
            lastAlertTime: null,
            emergencyMode: false,
            silentUntil: null
        };
        
        this.audioElements = new Map();
        this.timers = new Map();
        this.callbacks = {
            onAlert: [],
            onClear: [],
            onEmergency: []
        };
        
        // Web Audio API統合
        this.audioSystem = audioAlertSystem || null;
        
        this.initializeSystem();
    }
    
    /**
     * システム初期化
     */
    async initializeSystem() {
        console.log('🚨 津波警報システム初期化');
        
        try {
            // ブラウザ通知許可要求
            await this.requestNotificationPermission();
            
            // 音声システム初期化
            await this.initializeAudioSystem();
            
            // Web Notification API対応チェック
            this.checkBrowserSupport();
            
            // バイブレーション対応チェック
            this.checkVibrationSupport();
            
            console.log('✅ 津波警報システム初期化完了');
            
        } catch (error) {
            console.error('❌ 津波警報システム初期化失敗:', error);
        }
    }
    
    /**
     * 通知許可要求
     */
    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                console.log('✅ ブラウザ通知許可取得');
            } else {
                console.warn('⚠️ ブラウザ通知が拒否されました');
            }
            
            return permission;
        } else {
            console.warn('⚠️ このブラウザは通知をサポートしていません');
            return 'denied';
        }
    }
    
    /**
     * 音声システム初期化 (Web Audio API統合)
     */
    async initializeAudioSystem() {
        console.log('🔊 音声システム初期化開始');
        
        try {
            // グローバル音声システムとの統合
            if (audioAlertSystem) {
                this.audioSystem = audioAlertSystem;
                
                // 音声システム初期化
                const initialized = await this.audioSystem.initialize();
                
                if (initialized) {
                    console.log('✅ 音声システム統合完了');
                    
                    // 設定から音量を適用
                    if (this.config.audio.volume !== undefined) {
                        this.audioSystem.setMasterVolume(this.config.audio.volume);
                    }
                } else {
                    console.warn('⚠️ 音声システム初期化失敗');
                }
            } else {
                console.warn('⚠️ グローバル音声システムが見つかりません');
            }
            
        } catch (error) {
            console.error('❌ 音声システム統合エラー:', error);
        }
    }
    
    /**
     * 津波警報処理
     */
    async processTsunamiAlert(tsunamiData) {
        console.log('🔔 津波警報処理開始');
        
        try {
            const alerts = this.analyzeTsunamiData(tsunamiData);
            
            for (const alert of alerts) {
                await this.triggerAlert(alert);
            }
            
            // 緊急レベル判定
            const hasEmergency = alerts.some(alert => 
                ['major_warning', 'warning'].includes(alert.level)
            );
            
            if (hasEmergency && !this.state.emergencyMode) {
                this.activateEmergencyMode();
            } else if (!hasEmergency && this.state.emergencyMode) {
                this.deactivateEmergencyMode();
            }
            
        } catch (error) {
            console.error('❌ 津波警報処理エラー:', error);
        }
    }
    
    /**
     * 津波データ解析
     */
    analyzeTsunamiData(tsunamiData) {
        const alerts = [];
        
        if (!tsunamiData.features || tsunamiData.features.length === 0) {
            // 津波情報なし - 解除通知
            this.clearAllAlerts();
            return alerts;
        }
        
        tsunamiData.features.forEach(feature => {
            const props = feature.properties;
            const level = props.STATUS;
            
            if (level && level !== 'cleared' && this.config.alertLevels[level]) {
                alerts.push({
                    id: `tsunami_${props.AREA_CODE}`,
                    level,
                    areaCode: props.AREA_CODE,
                    areaName: props.AREA_NAME,
                    waveHeight: props.WAVE_HEIGHT,
                    arrivalTime: props.ARRIVAL_TIME,
                    timestamp: new Date().toISOString(),
                    source: props.SOURCE || 'unknown'
                });
            }
        });
        
        return alerts;
    }
    
    /**
     * 警報トリガー
     */
    async triggerAlert(alert) {
        const levelConfig = this.config.alertLevels[alert.level];
        
        if (!levelConfig) return;
        
        // 既存の警報をチェック
        const existingAlert = this.state.currentAlerts.get(alert.id);
        
        if (existingAlert && existingAlert.level === alert.level) {
            console.log(`⏸️ 同レベル警報のため通知スキップ: ${alert.areaName}`);
            return;
        }
        
        // サイレント期間チェック
        if (this.state.silentUntil && new Date() < new Date(this.state.silentUntil)) {
            console.log('🔇 サイレント期間中のため通知スキップ');
            return;
        }
        
        console.log(`🚨 津波警報発動: ${levelConfig.title} - ${alert.areaName}`);
        
        // 警報を記録
        this.state.currentAlerts.set(alert.id, alert);
        this.state.lastAlertTime = new Date();
        
        // 各種通知実行
        await Promise.all([
            this.showBrowserNotification(alert, levelConfig),
            this.playAlertSound(alert, levelConfig),
            this.triggerVibration(alert, levelConfig),
            this.showVisualAlert(alert, levelConfig)
        ]);
        
        // 自動リピート設定
        if (levelConfig.autoRepeat && levelConfig.repeatInterval > 0) {
            this.scheduleRepeatAlert(alert, levelConfig);
        }
        
        // コールバック通知
        this.notifyCallbacks('onAlert', alert);
    }
    
    /**
     * ブラウザ通知表示
     */
    async showBrowserNotification(alert, levelConfig) {
        if (!this.config.notifications.browser || Notification.permission !== 'granted') {
            return;
        }
        
        try {
            const notification = new Notification(levelConfig.title, {
                body: `${alert.areaName}: ${levelConfig.message}\n予想津波高: ${alert.waveHeight}`,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: alert.id,
                requireInteraction: alert.level === 'major_warning',
                actions: [
                    { action: 'acknowledge', title: '確認' },
                    { action: 'snooze', title: '10分後に再通知' }
                ]
            });
            
            notification.onclick = () => {
                window.focus();
                this.acknowledgeAlert(alert.id);
                notification.close();
            };
            
            // 緊急時は長時間表示
            if (alert.level === 'major_warning') {
                setTimeout(() => notification.close(), 30000);
            } else {
                setTimeout(() => notification.close(), 10000);
            }
            
            this.state.activeNotifications.push(notification);
            
        } catch (error) {
            console.error('❌ ブラウザ通知エラー:', error);
        }
    }
    
    /**
     * 警報音再生 (Web Audio API使用)
     */
    async playAlertSound(alert, levelConfig) {
        if (!this.config.notifications.sound || !this.state.soundEnabled) {
            return;
        }
        
        // Web Audio APIシステムが利用可能かチェック
        if (!this.audioSystem) {
            console.warn('⚠️ 音声システムが利用できません');
            return;
        }
        
        try {
            // 警報レベルに応じた音声再生
            const success = await this.audioSystem.playAlert(alert.level);
            
            if (success) {
                console.log(`🔊 警報音再生: ${alert.level} - ${alert.areaName}`);
            } else {
                console.warn(`⚠️ 警報音再生失敗: ${alert.level}`);
            }
            
        } catch (error) {
            console.error('❌ 警報音再生エラー:', error);
        }
    }
    
    /**
     * バイブレーション実行
     */
    triggerVibration(alert, levelConfig) {
        if (!this.config.notifications.vibration || !navigator.vibrate) {
            return;
        }
        
        try {
            let pattern;
            
            switch (alert.level) {
                case 'major_warning':
                    pattern = [200, 100, 200, 100, 200, 100, 200];
                    break;
                case 'warning':
                    pattern = [300, 100, 300];
                    break;
                case 'advisory':
                    pattern = [200];
                    break;
                default:
                    pattern = [100];
            }
            
            navigator.vibrate(pattern);
            
        } catch (error) {
            console.error('❌ バイブレーション エラー:', error);
        }
    }
    
    /**
     * 視覚的警報表示
     */
    showVisualAlert(alert, levelConfig) {
        // 既存の警報表示を更新
        const alertElement = document.getElementById('emergency-alert-overlay');
        
        if (alertElement) {
            this.updateVisualAlert(alertElement, alert, levelConfig);
        } else {
            this.createVisualAlert(alert, levelConfig);
        }
    }
    
    /**
     * 視覚的警報作成
     */
    createVisualAlert(alert, levelConfig) {
        const overlay = document.createElement('div');
        overlay.id = 'emergency-alert-overlay';
        overlay.className = 'emergency-alert-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-family: Arial, sans-serif;
            animation: alertPulse 1s ease-in-out infinite;
        `;
        
        // XSS対策: innerHTML使用を廃止し、DOM要素を安全に構築
        const alertContent = this.createSecureAlertContent(levelConfig, alert);
        overlay.appendChild(alertContent);
        
        // CSS アニメーション追加
        const style = document.createElement('style');
        style.textContent = `
            @keyframes alertPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.8; }
            }
        `;
        document.head.appendChild(style);
        
        // イベントリスナー
        overlay.querySelector('#acknowledge-alert').addEventListener('click', () => {
            this.acknowledgeAlert(alert.id);
            document.body.removeChild(overlay);
        });
        
        // 緊急時以外は自動で閉じる
        if (alert.level !== 'major_warning') {
            setTimeout(() => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
            }, 15000);
        }
        
        document.body.appendChild(overlay);
    }
    
    /**
     * セキュアな警報表示コンテンツの作成
     * XSS対策: innerHTML を使用せず、DOM要素を安全に構築
     */
    createSecureAlertContent(levelConfig, alert) {
        // メインコンテナ
        const alertContent = document.createElement('div');
        alertContent.className = 'alert-content';
        
        // スタイル設定（XSS対策済み）
        const secureColor = this.sanitizeColor(levelConfig.color);
        alertContent.style.cssText = `
            text-align: center;
            padding: 40px;
            background: ${secureColor};
            border-radius: 20px;
            max-width: 600px;
            box-shadow: 0 0 50px rgba(255, 255, 255, 0.3);
        `;
        
        // タイトル（h1）
        const title = document.createElement('h1');
        title.textContent = this.sanitizeText(levelConfig.title);
        title.style.cssText = 'font-size: 48px; margin: 0 0 20px 0;';
        alertContent.appendChild(title);
        
        // 地域名（h2）
        const areaName = document.createElement('h2');
        areaName.textContent = this.sanitizeText(alert.areaName);
        areaName.style.cssText = 'font-size: 32px; margin: 0 0 20px 0;';
        alertContent.appendChild(areaName);
        
        // メッセージ（p）
        const message = document.createElement('p');
        message.textContent = this.sanitizeText(levelConfig.message);
        message.style.cssText = 'font-size: 24px; margin: 0 0 30px 0;';
        alertContent.appendChild(message);
        
        // 詳細情報コンテナ
        const detailsContainer = document.createElement('div');
        detailsContainer.style.cssText = 'font-size: 20px; margin: 20px 0;';
        
        // 津波高情報
        const waveHeightDiv = document.createElement('div');
        const waveHeightText = document.createTextNode('予想津波高: ');
        const waveHeightStrong = document.createElement('strong');
        waveHeightStrong.textContent = this.sanitizeText(alert.waveHeight);
        waveHeightDiv.appendChild(waveHeightText);
        waveHeightDiv.appendChild(waveHeightStrong);
        detailsContainer.appendChild(waveHeightDiv);
        
        // 到達時間情報
        const arrivalTimeDiv = document.createElement('div');
        const arrivalTimeText = document.createTextNode('到達予想: ');
        const arrivalTimeStrong = document.createElement('strong');
        arrivalTimeStrong.textContent = this.sanitizeText(alert.arrivalTime);
        arrivalTimeDiv.appendChild(arrivalTimeText);
        arrivalTimeDiv.appendChild(arrivalTimeStrong);
        detailsContainer.appendChild(arrivalTimeDiv);
        
        alertContent.appendChild(detailsContainer);
        
        // 確認ボタン
        const acknowledgeButton = document.createElement('button');
        acknowledgeButton.id = 'acknowledge-alert';
        acknowledgeButton.textContent = '確認';
        acknowledgeButton.style.cssText = `
            background: white;
            color: ${secureColor};
            border: none;
            padding: 15px 30px;
            font-size: 18px;
            border-radius: 10px;
            cursor: pointer;
            margin-top: 20px;
        `;
        alertContent.appendChild(acknowledgeButton);
        
        return alertContent;
    }
    
    /**
     * テキストのサニタイゼーション
     * XSS攻撃を防ぐため、危険な文字をエスケープ
     */
    sanitizeText(input) {
        if (typeof input !== 'string') {
            return String(input);
        }
        
        // HTMLエンティティエスケープ
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
    
    /**
     * CSS色値のサニタイゼーション
     * 不正なCSS値によるインジェクションを防ぐ
     */
    sanitizeColor(color) {
        if (typeof color !== 'string') {
            return '#808080'; // デフォルトのグレー
        }
        
        // 許可される色形式のパターン
        const validColorPatterns = [
            /^#[0-9A-Fa-f]{3}$/,           // #RGB
            /^#[0-9A-Fa-f]{6}$/,           // #RRGGBB
            /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/,  // rgb(r,g,b)
            /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[0-9.]+\s*\)$/,  // rgba(r,g,b,a)
        ];
        
        // 定義済み色名（安全な基本色のみ）
        const validColorNames = [
            'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink',
            'black', 'white', 'gray', 'brown', 'cyan', 'magenta'
        ];
        
        // パターンマッチング
        if (validColorPatterns.some(pattern => pattern.test(color.trim()))) {
            return color.trim();
        }
        
        // 色名チェック
        if (validColorNames.includes(color.toLowerCase().trim())) {
            return color.toLowerCase().trim();
        }
        
        // 不正な色値の場合はデフォルト色を返す
        console.warn(`⚠️ 不正な色値が検出されました: ${color}`);
        return '#808080';
    }

    /**
     * 警報確認
     */
    acknowledgeAlert(alertId) {
        const alert = this.state.currentAlerts.get(alertId);
        
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedAt = new Date().toISOString();
            
            // リピートタイマーを停止
            const timer = this.timers.get(alertId);
            if (timer) {
                clearInterval(timer);
                this.timers.delete(alertId);
            }
            
            console.log(`✅ 警報確認: ${alert.areaName}`);
        }
    }
    
    /**
     * 全警報クリア
     */
    clearAllAlerts() {
        console.log('🔕 全津波警報解除');
        
        // 全タイマー停止
        this.timers.forEach(timer => clearInterval(timer));
        this.timers.clear();
        
        // 通知クリア
        this.state.activeNotifications.forEach(notification => notification.close());
        this.state.activeNotifications = [];
        
        // 視覚的警報削除
        const alertOverlay = document.getElementById('emergency-alert-overlay');
        if (alertOverlay) {
            document.body.removeChild(alertOverlay);
        }
        
        // 解除音再生
        this.playalertClearSound();
        
        // 状態リセット
        this.state.currentAlerts.clear();
        this.deactivateEmergencyMode();
        
        // コールバック通知
        this.notifyCallbacks('onClear');
    }
    
    /**
     * 解除音再生
     */
    async playalertClearSound() {
        if (!this.state.soundEnabled) return;
        
        try {
            const audio = this.audioElements.get('clear_tone');
            if (audio) {
                audio.currentTime = 0;
                await audio.play();
            }
        } catch (error) {
            console.error('❌ 解除音再生エラー:', error);
        }
    }
    
    /**
     * 緊急モード有効化
     */
    activateEmergencyMode() {
        this.state.emergencyMode = true;
        document.body.classList.add('emergency-mode');
        
        // 画面を赤く点滅
        const style = document.createElement('style');
        style.id = 'emergency-style';
        style.textContent = `
            .emergency-mode {
                animation: emergencyFlash 2s ease-in-out infinite !important;
            }
            @keyframes emergencyFlash {
                0%, 100% { background-color: inherit; }
                50% { background-color: rgba(255, 0, 0, 0.1); }
            }
        `;
        document.head.appendChild(style);
        
        this.notifyCallbacks('onEmergency', { active: true });
        
        console.log('🚨 緊急モード有効化');
    }
    
    /**
     * 緊急モード無効化
     */
    deactivateEmergencyMode() {
        this.state.emergencyMode = false;
        document.body.classList.remove('emergency-mode');
        
        const emergencyStyle = document.getElementById('emergency-style');
        if (emergencyStyle) {
            document.head.removeChild(emergencyStyle);
        }
        
        this.notifyCallbacks('onEmergency', { active: false });
        
        console.log('✅ 緊急モード解除');
    }
    
    /**
     * 音声システムテスト
     */
    async testAudioSystem() {
        console.log('🧪 津波警報音声システムテスト');
        
        if (!this.audioSystem) {
            console.warn('⚠️ 音声システムが利用できません');
            return false;
        }
        
        try {
            // テスト音再生
            const success = await this.audioSystem.playTestSound();
            
            if (success) {
                console.log('✅ 音声システムテスト成功');
            } else {
                console.warn('⚠️ 音声システムテスト失敗');
            }
            
            return success;
            
        } catch (error) {
            console.error('❌ 音声システムテストエラー:', error);
            return false;
        }
    }
    
    /**
     * ブラウザサポートチェック
     */
    checkBrowserSupport() {
        const support = {
            notification: 'Notification' in window,
            audio: 'Audio' in window,
            vibration: 'vibrate' in navigator,
            webAudio: 'AudioContext' in window || 'webkitAudioContext' in window
        };
        
        console.log('🔍 ブラウザサポート状況:', support);
        return support;
    }
    
    /**
     * バイブレーションサポートチェック
     */
    checkVibrationSupport() {
        if ('vibrate' in navigator) {
            console.log('✅ バイブレーション対応');
            return true;
        } else {
            console.log('❌ バイブレーション非対応');
            return false;
        }
    }
    
    /**
     * 音声ON/OFF切り替え
     */
    toggleSound() {
        this.state.soundEnabled = !this.state.soundEnabled;
        console.log(`🔊 音声: ${this.state.soundEnabled ? 'ON' : 'OFF'}`);
        
        // 音声システムが利用可能で、OFFに設定された場合は全警報音を停止
        if (!this.state.soundEnabled && this.audioSystem) {
            this.audioSystem.stopAllAlerts();
        }
        
        return this.state.soundEnabled;
    }
    
    /**
     * 音量設定
     */
    setVolume(volume) {
        if (this.audioSystem) {
            this.audioSystem.setMasterVolume(volume);
            this.config.audio.volume = volume;
            console.log(`🔊 音量設定: ${Math.round(volume * 100)}%`);
        }
    }
    
    /**
     * サイレント設定
     */
    setSilentMode(minutes) {
        if (minutes > 0) {
            const silentUntil = new Date();
            silentUntil.setMinutes(silentUntil.getMinutes() + minutes);
            this.state.silentUntil = silentUntil.toISOString();
            
            console.log(`🔇 ${minutes}分間サイレントモード設定`);
        } else {
            this.state.silentUntil = null;
            console.log('🔊 サイレントモード解除');
        }
    }
    
    /**
     * イベントリスナー登録
     */
    on(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(callback);
        }
    }
    
    /**
     * コールバック通知
     */
    notifyCallbacks(event, data = null) {
        this.callbacks[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`❌ コールバックエラー (${event}):`, error);
            }
        });
    }
    
    /**
     * リピート警報スケジュール
     */
    scheduleRepeatAlert(alert, levelConfig) {
        const timer = setInterval(() => {
            if (this.state.currentAlerts.has(alert.id) && !this.state.currentAlerts.get(alert.id).acknowledged) {
                this.playAlertSound(alert, levelConfig);
                this.triggerVibration(alert, levelConfig);
            } else {
                clearInterval(timer);
                this.timers.delete(alert.id);
            }
        }, levelConfig.repeatInterval);
        
        this.timers.set(alert.id, timer);
    }
    
    /**
     * 現在の警報状態取得
     */
    getCurrentAlerts() {
        return Array.from(this.state.currentAlerts.values());
    }
    
    /**
     * システム状態取得
     */
    getSystemStatus() {
        return {
            ...this.state,
            activeAlertsCount: this.state.currentAlerts.size,
            emergencyMode: this.state.emergencyMode,
            soundEnabled: this.state.soundEnabled,
            silentMode: this.state.silentUntil ? new Date() < new Date(this.state.silentUntil) : false
        };
    }
}

console.log('🚨 津波自動警報システム準備完了');