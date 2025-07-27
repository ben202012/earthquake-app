/**
 * 高度な通知サービス - ブラウザ通知・音声・視覚効果を統合管理
 */
import BaseComponent from '../core/BaseComponent.js';

class NotificationService extends BaseComponent {
    constructor(container, options = {}) {
        super(container, options);
        
        this.notificationQueue = [];
        this.soundPool = new Map();
        this.isPlaying = false;
        this.audioContext = null;
        this.lastNotificationTime = 0;
        
        // 通知設定
        this.settings = {
            enabled: true,
            sound: true,
            volume: 0.5,
            duration: 5000,
            maxQueue: 10,
            cooldown: 2000, // 2秒間の連続通知防止
            priority: {
                earthquake: 1,
                eew: 0, // 最高優先度
                system: 2,
                warning: 1
            }
        };
    }
    
    get defaultOptions() {
        return {
            ...super.defaultOptions,
            enableBrowserNotification: true,
            enableToastNotification: true,
            enableSoundNotification: true,
            enableVibration: true
        };
    }
    
    async init() {
        await super.init();
        await this.initializeAudioSystem();
        await this.requestPermissions();
        this.loadSounds();
    }
    
    async initializeAudioSystem() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // ユーザーインタラクション後にAudioContextを開始
            if (this.audioContext.state === 'suspended') {
                document.addEventListener('click', () => {
                    this.audioContext.resume();
                }, { once: true });
            }
            
            console.log('🔊 Audio system initialized');
        } catch (error) {
            console.warn('Failed to initialize audio system:', error);
        }
    }
    
    async requestPermissions() {
        // ブラウザ通知許可
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                const permission = await Notification.requestPermission();
                console.log('Notification permission:', permission);
            } catch (error) {
                console.warn('Failed to request notification permission:', error);
            }
        }
        
        // プッシュ通知許可（PWA用）
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                console.log('Service Worker ready for push notifications');
            } catch (error) {
                console.warn('Service Worker not available:', error);
            }
        }
    }
    
    loadSounds() {
        const soundDefinitions = {
            earthquake: {
                type: 'synthesized',
                config: { frequency: 800, duration: 0.3, type: 'sine' }
            },
            eew: {
                type: 'synthesized',
                config: { frequency: 1000, duration: 0.5, type: 'square' }
            },
            system: {
                type: 'synthesized',
                config: { frequency: 600, duration: 0.2, type: 'triangle' }
            },
            warning: {
                type: 'synthesized',
                config: { frequency: 900, duration: 0.4, type: 'sawtooth' }
            }
        };
        
        Object.entries(soundDefinitions).forEach(([name, definition]) => {
            this.soundPool.set(name, definition);
        });
        
        console.log('🎵 Sound definitions loaded');
    }
    
    /**
     * 通知を送信
     */
    async notify(type, title, message, data = {}) {
        const notification = {
            id: this.generateNotificationId(),
            type,
            title,
            message,
            data,
            timestamp: Date.now(),
            priority: this.settings.priority[type] || 2
        };
        
        // 重複・頻度制限チェック
        if (!this.shouldProcessNotification(notification)) {
            return false;
        }
        
        // キューに追加（優先度順）
        this.addToQueue(notification);
        
        // 処理実行
        this.processNotificationQueue();
        
        return true;
    }
    
    generateNotificationId() {
        return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    shouldProcessNotification(notification) {
        const now = Date.now();
        
        // クールダウン期間チェック
        if (now - this.lastNotificationTime < this.settings.cooldown) {
            // 緊急地震速報は例外
            if (notification.type !== 'eew') {
                return false;
            }
        }
        
        // 同一タイプの重複チェック
        const duplicateExists = this.notificationQueue.some(
            n => n.type === notification.type && n.title === notification.title
        );
        
        return !duplicateExists;
    }
    
    addToQueue(notification) {
        this.notificationQueue.push(notification);
        
        // 優先度でソート（数値が小さいほど高優先度）
        this.notificationQueue.sort((a, b) => a.priority - b.priority);
        
        // キューサイズ制限
        if (this.notificationQueue.length > this.settings.maxQueue) {
            this.notificationQueue = this.notificationQueue.slice(0, this.settings.maxQueue);
        }
    }
    
    async processNotificationQueue() {
        if (this.isPlaying || this.notificationQueue.length === 0) {
            return;
        }
        
        this.isPlaying = true;
        
        while (this.notificationQueue.length > 0) {
            const notification = this.notificationQueue.shift();
            await this.displayNotification(notification);
            
            // 次の通知まで少し待機
            await this.delay(300);
        }
        
        this.isPlaying = false;
    }
    
    async displayNotification(notification) {
        this.lastNotificationTime = Date.now();
        
        try {
            // ブラウザ通知
            if (this.options.enableBrowserNotification) {
                await this.showBrowserNotification(notification);
            }
            
            // トースト通知
            if (this.options.enableToastNotification) {
                this.showToastNotification(notification);
            }
            
            // 音声通知
            if (this.options.enableSoundNotification && this.settings.sound) {
                await this.playSoundNotification(notification.type);
            }
            
            // バイブレーション
            if (this.options.enableVibration && 'vibrate' in navigator) {
                this.triggerVibration(notification.type);
            }
            
            // イベント発行
            this.eventBus.publish('notification.displayed', notification);
            
        } catch (error) {
            console.error('Failed to display notification:', error);
        }
    }
    
    async showBrowserNotification(notification) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const options = {
                body: notification.message,
                icon: this.getNotificationIcon(notification.type),
                tag: notification.type,
                badge: '🌏',
                timestamp: notification.timestamp,
                requireInteraction: notification.type === 'eew',
                actions: notification.type === 'earthquake' ? [
                    { action: 'view', title: '詳細を見る' },
                    { action: 'dismiss', title: '閉じる' }
                ] : undefined
            };
            
            const browserNotification = new Notification(notification.title, options);
            
            // クリックイベント
            browserNotification.onclick = () => {
                this.handleNotificationClick(notification);
                browserNotification.close();
            };
            
            // 自動閉じる
            setTimeout(() => {
                browserNotification.close();
            }, this.settings.duration);
        }
    }
    
    showToastNotification(notification) {
        const toast = this.createToastElement(notification);
        document.body.appendChild(toast);
        
        // アニメーション
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        // 自動削除
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, this.settings.duration);
        
        // クリックで閉じる
        toast.addEventListener('click', () => {
            this.handleNotificationClick(notification);
            toast.classList.remove('show');
        });
    }
    
    createToastElement(notification) {
        const toast = document.createElement('div');
        toast.className = `notification-toast notification-${notification.type}`;
        
        toast.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${this.getNotificationIcon(notification.type)}</div>
                <div class="notification-text">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                </div>
                <div class="notification-close">×</div>
            </div>
            <div class="notification-progress"></div>
        `;
        
        // プログレスバーアニメーション
        const progress = toast.querySelector('.notification-progress');
        progress.style.animation = `notificationProgress ${this.settings.duration}ms linear`;
        
        return toast;
    }
    
    getNotificationIcon(type) {
        const icons = {
            earthquake: '🌏',
            eew: '🚨',
            system: '🔧',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || '📢';
    }
    
    async playSoundNotification(type) {
        if (!this.audioContext || !this.soundPool.has(type)) {
            return;
        }
        
        try {
            const soundDef = this.soundPool.get(type);
            
            if (soundDef.type === 'synthesized') {
                await this.playSynthesizedSound(soundDef.config);
            }
        } catch (error) {
            console.warn('Failed to play sound notification:', error);
        }
    }
    
    async playSynthesizedSound(config) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(config.frequency, this.audioContext.currentTime);
        oscillator.type = config.type;
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.settings.volume, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + config.duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + config.duration);
        
        return new Promise(resolve => {
            oscillator.onended = resolve;
        });
    }
    
    triggerVibration(type) {
        const patterns = {
            earthquake: [200, 100, 200],
            eew: [500, 200, 500, 200, 500],
            system: [100],
            warning: [300, 100, 300]
        };
        
        const pattern = patterns[type] || [200];
        navigator.vibrate(pattern);
    }
    
    handleNotificationClick(notification) {
        this.eventBus.publish('notification.clicked', notification);
        
        // タイプ別処理
        switch (notification.type) {
            case 'earthquake':
                this.eventBus.publish('map.focus.request', notification.data);
                break;
            case 'eew':
                this.eventBus.publish('eew.details.request', notification.data);
                break;
        }
    }
    
    /**
     * 設定の更新
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.eventBus.publish('notification.settings.updated', this.settings);
    }
    
    /**
     * 音量設定
     */
    setVolume(volume) {
        this.settings.volume = Math.max(0, Math.min(1, volume));
    }
    
    /**
     * 通知の有効/無効切り替え
     */
    setEnabled(enabled) {
        this.settings.enabled = enabled;
    }
    
    /**
     * 音声通知の有効/無効切り替え
     */
    setSoundEnabled(enabled) {
        this.settings.sound = enabled;
    }
    
    /**
     * テスト通知
     */
    async testNotification(type = 'system') {
        return await this.notify(
            type,
            'テスト通知',
            'これはテスト通知です。システムが正常に動作しています。',
            { test: true }
        );
    }
    
    /**
     * キューをクリア
     */
    clearQueue() {
        this.notificationQueue = [];
        this.isPlaying = false;
    }
    
    /**
     * 統計情報取得
     */
    getStats() {
        return {
            queueLength: this.notificationQueue.length,
            isPlaying: this.isPlaying,
            lastNotificationTime: this.lastNotificationTime,
            audioContextState: this.audioContext?.state,
            permissionStatus: 'Notification' in window ? Notification.permission : 'not-supported'
        };
    }
    
    /**
     * ユーティリティ: 遅延
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async render() {
        // 通知サービスは視覚的なコンポーネントではないため、空の実装
        this.element = document.createElement('div');
        this.element.style.display = 'none';
        this.element.id = `notification-service-${this.id}`;
        this.container.appendChild(this.element);
    }
}

export default NotificationService;