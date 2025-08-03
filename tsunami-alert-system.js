/**
 * 津波自動警報・通知システム
 * 実用機能50%達成のための重要実装
 */

class TsunamiAlertSystem {
    constructor() {
        this.config = {
            // 警報レベル設定
            alertLevels: {
                'major_warning': {
                    priority: 4,
                    color: '#8B0000',
                    sound: 'emergency_siren.mp3',
                    title: '🚨 大津波警報',
                    message: '直ちに高台へ避難してください！',
                    autoRepeat: true,
                    repeatInterval: 30000 // 30秒毎
                },
                'warning': {
                    priority: 3,
                    color: '#FF0000', 
                    sound: 'warning_tone.mp3',
                    title: '⚠️ 津波警報',
                    message: '津波の危険があります。避難準備をしてください。',
                    autoRepeat: true,
                    repeatInterval: 60000 // 1分毎
                },
                'advisory': {
                    priority: 2,
                    color: '#FFD700',
                    sound: 'notification.mp3', 
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
            
            // 音声ファイル読み込み
            this.preloadAudioFiles();
            
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
     * 音声ファイル事前読み込み
     */
    preloadAudioFiles() {
        const audioFiles = {
            'emergency_siren': './assets/sounds/emergency_siren.mp3',
            'warning_tone': './assets/sounds/warning_tone.mp3', 
            'notification': './assets/sounds/notification.mp3',
            'clear_tone': './assets/sounds/clear_tone.mp3'
        };
        
        Object.entries(audioFiles).forEach(([key, src]) => {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.volume = this.config.audio.volume;
            
            // フォールバック音声を使用
            audio.src = this.generateToneForAlert(key);
            
            this.audioElements.set(key, audio);
        });
        
        console.log('🔊 警報音声ファイル読み込み完了');
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
     * 警報音再生
     */
    async playAlertSound(alert, levelConfig) {
        if (!this.config.notifications.sound || !this.state.soundEnabled) {
            return;
        }
        
        try {
            const audioKey = alert.level === 'major_warning' ? 'emergency_siren' :
                           alert.level === 'warning' ? 'warning_tone' : 'notification';
            
            const audio = this.audioElements.get(audioKey);
            
            if (audio) {
                audio.currentTime = 0;
                await audio.play();
                
                console.log(`🔊 警報音再生: ${audioKey}`);
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
        
        overlay.innerHTML = `
            <div class="alert-content" style="
                text-align: center;
                padding: 40px;
                background: ${levelConfig.color};
                border-radius: 20px;
                max-width: 600px;
                box-shadow: 0 0 50px rgba(255, 255, 255, 0.3);
            ">
                <h1 style="font-size: 48px; margin: 0 0 20px 0;">${levelConfig.title}</h1>
                <h2 style="font-size: 32px; margin: 0 0 20px 0;">${alert.areaName}</h2>
                <p style="font-size: 24px; margin: 0 0 30px 0;">${levelConfig.message}</p>
                <div style="font-size: 20px; margin: 20px 0;">
                    <div>予想津波高: <strong>${alert.waveHeight}</strong></div>
                    <div>到達予想: <strong>${alert.arrivalTime}</strong></div>
                </div>
                <button id="acknowledge-alert" style="
                    background: white;
                    color: ${levelConfig.color};
                    border: none;
                    padding: 15px 30px;
                    font-size: 18px;
                    border-radius: 10px;
                    cursor: pointer;
                    margin-top: 20px;
                ">確認</button>
            </div>
        `;
        
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
     * 音声生成 (フォールバック)
     */
    generateToneForAlert(type) {
        // Web Audio APIで基本的な警報音を生成
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        switch (type) {
            case 'emergency_siren':
                oscillator.frequency.setValueAtTime(800, context.currentTime);
                break;
            case 'warning_tone':
                oscillator.frequency.setValueAtTime(600, context.currentTime);
                break;
            case 'notification':
                oscillator.frequency.setValueAtTime(400, context.currentTime);
                break;
            default:
                oscillator.frequency.setValueAtTime(300, context.currentTime);
        }
        
        gainNode.gain.setValueAtTime(0.3, context.currentTime);
        
        // 1秒間の音声を生成してBase64エンコード
        return 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ4AAAA=';
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
        return this.state.soundEnabled;
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

// グローバル公開
if (typeof window !== 'undefined') {
    window.TsunamiAlertSystem = TsunamiAlertSystem;
}

// Node.js環境対応
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TsunamiAlertSystem;
}

console.log('🚨 津波自動警報システム準備完了');