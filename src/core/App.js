/**
 * メインアプリケーションクラス
 * KyoshinEewViewerIngenのアーキテクチャパターンを採用
 */
import { eventBus } from './EventBus.js';
import P2PPanel from '../components/panels/P2PPanel.js';
import Earthquake from '../models/Earthquake.js';
import NotificationService from '../services/NotificationService.js';
import SettingsService from '../services/SettingsService.js';

class EarthquakeApp {
    constructor() {
        // アプリケーション状態
        this.isInitialized = false;
        this.isDestroyed = false;
        this.version = '2.0.0';
        
        // イベントバス
        this.eventBus = eventBus;
        
        // コンポーネント管理
        this.components = new Map();
        this.componentInstances = [];
        
        // アプリケーションデータ
        this.earthquakeHistory = [];
        this.connectionStatus = {
            p2p: false,
            api: false
        };
        
        // サービス
        this.settingsService = null;
        this.notificationService = null;
        
        // パフォーマンス監視
        this.startTime = Date.now();
        this.performanceMetrics = {
            initTime: 0,
            componentCount: 0,
            memoryUsage: 0
        };
        
        console.log(`🌏 Earthquake App v${this.version} - Professional Architecture`);
        console.log('📋 Based on KyoshinEewViewerIngen design patterns');
    }

    /**
     * アプリケーション初期化
     */
    async init() {
        if (this.isInitialized) {
            console.warn('App is already initialized');
            return;
        }

        try {
            console.log('🚀 Initializing Earthquake App with professional architecture...');
            
            // パフォーマンス計測開始
            performance.mark('app-init-start');
            
            // 順次初期化
            await this.initializeServices();
            await this.initializeEventSystem();
            await this.initializeComponents();
            await this.loadHistoricalData();
            await this.startServices();
            
            // 初期化完了
            this.isInitialized = true;
            performance.mark('app-init-end');
            performance.measure('app-init', 'app-init-start', 'app-init-end');
            
            const initTime = performance.getEntriesByName('app-init')[0].duration;
            this.performanceMetrics.initTime = Math.round(initTime);
            
            console.log(`✅ App initialized successfully in ${this.performanceMetrics.initTime}ms`);
            console.log(`📊 Components loaded: ${this.componentInstances.length}`);
            
            // 初期化完了イベント
            this.eventBus.publish('app.initialized', {
                version: this.version,
                initTime: this.performanceMetrics.initTime,
                componentCount: this.componentInstances.length
            });
            
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.eventBus.publish('app.error', { error, phase: 'initialization' });
            throw error;
        }
    }

    /**
     * サービスの初期化
     */
    async initializeServices() {
        console.log('🔧 Initializing services...');
        
        // 設定サービス
        this.settingsService = new SettingsService(document.body, {
            autoLoad: true,
            autoSave: true,
            validateSettings: true
        });
        
        // 通知サービス
        this.notificationService = new NotificationService(document.body, {
            enableBrowserNotification: true,
            enableToastNotification: true,
            enableSoundNotification: true
        });
        
        console.log('✅ Services initialized');
    }

    /**
     * イベントシステムの初期化
     */
    async initializeEventSystem() {
        console.log('🔄 Initializing event system...');
        
        // グローバルイベントリスナー
        this.eventBus.subscribe('app.theme.change', this.handleThemeChange.bind(this));
        this.eventBus.subscribe('app.settings.update', this.handleSettingsUpdate.bind(this));
        this.eventBus.subscribe('component.error', this.handleComponentError.bind(this));
        this.eventBus.subscribe('earthquake.detected', this.handleEarthquakeDetected.bind(this));
        
        // ウィンドウイベント
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        window.addEventListener('resize', this.handleWindowResize.bind(this));
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));
        
        console.log('✅ Event system initialized');
    }

    /**
     * コンポーネントの初期化
     */
    async initializeComponents() {
        console.log('🧩 Initializing components...');
        
        // P2Pパネルの初期化
        const p2pContainer = document.getElementById('p2p-panel');
        if (p2pContainer) {
            const p2pPanel = new P2PPanel(p2pContainer, {
                theme: this.settings.theme,
                enableAnimations: this.settings.performance.enableAnimations,
                autoUpdate: true
            });
            
            this.componentInstances.push(p2pPanel);
            this.components.set('p2p-panel', p2pPanel);
            
            console.log('✅ P2P Panel component initialized');
        }
        
        // 他のコンポーネントも同様に初期化...
        
        this.performanceMetrics.componentCount = this.componentInstances.length;
        console.log(`✅ ${this.componentInstances.length} components initialized`);
    }

    /**
     * 履歴データの読み込み
     */
    async loadHistoricalData() {
        console.log('📚 Loading historical data...');
        
        try {
            const savedHistory = localStorage.getItem('earthquake_history');
            if (savedHistory) {
                const historyData = JSON.parse(savedHistory);
                this.earthquakeHistory = historyData.map(data => Earthquake.fromJSON(data));
                
                // 古いデータの削除（7日以上前）
                const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                this.earthquakeHistory = this.earthquakeHistory.filter(
                    earthquake => earthquake.timestamp > cutoffDate
                );
                
                console.log(`✅ Loaded ${this.earthquakeHistory.length} historical records`);
            }
        } catch (error) {
            console.warn('⚠️ Failed to load historical data:', error);
            this.earthquakeHistory = [];
        }
    }

    /**
     * サービスの開始
     */
    async startServices() {
        console.log('🔧 Starting services...');
        
        // 統計情報の定期更新
        this.startPerformanceMonitoring();
        
        // データの定期保存
        this.startPeriodicSave();
        
        console.log('✅ Services started');
    }

    /**
     * パフォーマンス監視の開始
     */
    startPerformanceMonitoring() {
        setInterval(() => {
            // メモリ使用量の監視
            if (performance.memory) {
                this.performanceMetrics.memoryUsage = Math.round(
                    performance.memory.usedJSHeapSize / 1024 / 1024
                );
                
                // メモリ使用量が閾値を超えた場合の警告
                if (this.performanceMetrics.memoryUsage > 100) { // 100MB
                    console.warn(`⚠️ High memory usage: ${this.performanceMetrics.memoryUsage}MB`);
                    this.eventBus.publish('app.performance.warning', {
                        type: 'memory',
                        value: this.performanceMetrics.memoryUsage
                    });
                }
            }
            
            // コンポーネントの健全性チェック
            this.componentInstances.forEach(component => {
                if (component.isDestroyed) {
                    console.warn('⚠️ Destroyed component found:', component.id);
                }
            });
            
        }, 30000); // 30秒ごと
    }

    /**
     * 定期保存の開始
     */
    startPeriodicSave() {
        setInterval(() => {
            this.saveData();
        }, 60000); // 1分ごと
    }

    /**
     * データの保存
     */
    saveData() {
        try {
            // 設定の保存
            localStorage.setItem('earthquake_app_settings', JSON.stringify(this.settings));
            
            // 履歴の保存（最新100件のみ）
            const historyToSave = this.earthquakeHistory
                .slice(0, this.settings.performance.maxHistoryItems)
                .map(earthquake => earthquake.toJSON());
            
            localStorage.setItem('earthquake_history', JSON.stringify(historyToSave));
            
            this.eventBus.publish('app.data.saved', {
                settingsSize: JSON.stringify(this.settings).length,
                historySize: historyToSave.length
            });
            
        } catch (error) {
            console.error('❌ Failed to save data:', error);
            this.eventBus.publish('app.error', { error, phase: 'save' });
        }
    }

    /**
     * イベントハンドラー
     */
    handleThemeChange(theme) {
        this.settings.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        
        // 全コンポーネントにテーマ変更を通知
        this.componentInstances.forEach(component => {
            if (component.handleThemeChange) {
                component.handleThemeChange(theme);
            }
        });
    }

    handleSettingsUpdate(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveData();
        
        console.log('⚙️ Settings updated:', newSettings);
    }

    handleComponentError(errorData) {
        console.error(`❌ Component error in ${errorData.id}:`, errorData.error);
        
        // エラー統計の更新
        this.performanceMetrics.errorCount = (this.performanceMetrics.errorCount || 0) + 1;
    }

    handleEarthquakeDetected(earthquake) {
        // 履歴に追加
        this.addToHistory(earthquake);
        
        // 通知判定
        if (this.shouldNotify(earthquake)) {
            this.eventBus.publish('notification.show', earthquake);
        }
        
        console.log(`🌏 Earthquake detected: ${earthquake.location} M${earthquake.magnitude}`);
    }

    handleBeforeUnload(event) {
        // データの保存
        this.saveData();
        
        // クリーンアップ
        this.cleanup();
    }

    handleWindowResize() {
        // コンポーネントのリサイズ処理
        this.componentInstances.forEach(component => {
            if (component.handleResize) {
                component.handleResize();
            }
        });
    }

    handleOnline() {
        console.log('🌐 Connection restored');
        this.eventBus.publish('app.online', true);
    }

    handleOffline() {
        console.log('📵 Connection lost');
        this.eventBus.publish('app.offline', true);
    }

    /**
     * ユーティリティメソッド
     */
    addToHistory(earthquake) {
        this.earthquakeHistory.unshift(earthquake);
        
        // 最大件数制限
        if (this.earthquakeHistory.length > this.settings.performance.maxHistoryItems) {
            this.earthquakeHistory = this.earthquakeHistory.slice(0, this.settings.performance.maxHistoryItems);
        }
    }

    shouldNotify(earthquake) {
        if (!this.settings.notifications.enabled) return false;
        
        // マグニチュード判定
        if (earthquake.magnitude && earthquake.magnitude >= this.settings.notifications.magnitude) {
            return true;
        }
        
        // 震度判定
        if (earthquake.maxIntensity) {
            const numericIntensity = earthquake.getNumericIntensity(earthquake.maxIntensity);
            const thresholdIntensity = earthquake.getNumericIntensity(this.settings.notifications.intensity);
            return numericIntensity >= thresholdIntensity;
        }
        
        return false;
    }

    /**
     * 公開API
     */
    getComponent(id) {
        return this.components.get(id);
    }

    getEarthquakeHistory() {
        return [...this.earthquakeHistory];
    }

    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }

    getSettings() {
        return this.settingsService ? this.settingsService.settings : {};
    }

    updateSettings(newSettings) {
        if (this.settingsService) {
            this.settingsService.update(newSettings);
        }
    }
    
    // 通知送信のヘルパーメソッド
    notify(type, title, message, data = {}) {
        if (this.notificationService) {
            return this.notificationService.notify(type, title, message, data);
        }
        return false;
    }

    /**
     * クリーンアップ
     */
    cleanup() {
        console.log('🧹 Cleaning up app...');
        
        // コンポーネントの破棄
        this.componentInstances.forEach(component => {
            if (!component.isDestroyed) {
                component.destroy();
            }
        });
        
        // イベントリスナーのクリア
        this.eventBus.clear();
        
        this.isDestroyed = true;
        console.log('✅ App cleanup completed');
    }

    /**
     * デバッグ情報
     */
    getDebugInfo() {
        return {
            version: this.version,
            isInitialized: this.isInitialized,
            isDestroyed: this.isDestroyed,
            uptime: Date.now() - this.startTime,
            components: this.componentInstances.map(c => c.getDebugInfo()),
            performanceMetrics: this.performanceMetrics,
            settings: this.settings,
            historyCount: this.earthquakeHistory.length,
            eventBusStats: this.eventBus.getEventList()
        };
    }
}

// グローバルインスタンス
let earthquakeApp = null;

/**
 * アプリケーションの初期化と開始
 */
async function initializeApp() {
    try {
        earthquakeApp = new EarthquakeApp();
        await earthquakeApp.init();
        
        // グローバルアクセス用
        window.earthquakeApp = earthquakeApp;
        
        return earthquakeApp;
    } catch (error) {
        console.error('❌ Failed to initialize earthquake app:', error);
        throw error;
    }
}

export default EarthquakeApp;
export { initializeApp, earthquakeApp };