/**
 * 統一アプリケーション設定管理
 * 津波警報システム v3.0
 */

class AppConfig {
    constructor() {
        this.defaultConfig = this.getDefaultConfig();
        this.currentConfig = {};
        this.configListeners = new Map();
        this.configVersion = '3.0.0';
        this.lastModified = Date.now();
        
        // 設定の初期化
        this.initialize();
        
        console.log('✅ AppConfig初期化完了 - 統一設定管理有効');
    }
    
    /**
     * デフォルト設定の定義
     */
    getDefaultConfig() {
        return {
            // システム基本設定
            system: {
                version: '3.0.0',
                environment: 'production',
                debug: false,
                logLevel: 'info',
                port: 8080,
                enablePeriodicUpdate: true,
                updateInterval: 30000, // 30秒
                maxRetries: 3,
                timeout: 30000
            },
            
            // セキュリティ設定
            security: {
                enableCSP: true,
                enableCORS: true,
                allowedOrigins: [
                    'http://localhost:8080',
                    'http://127.0.0.1:8080'
                ],
                allowedDomains: [
                    'www.jma.go.jp',
                    'api.p2pquake.net',
                    'earthquake.usgs.gov'
                ],
                maxRequestRate: 100, // per 15 minutes
                enableXSSProtection: true,
                enableSQLInjectionProtection: true
            },
            
            // データ管理設定
            data: {
                maxStorageSize: 5 * 1024 * 1024, // 5MB
                maxHistoryEntries: 1000,
                compressionEnabled: true,
                autoCleanup: true,
                backupInterval: 3600000, // 1時間
                validationEnabled: true,
                anomalyDetectionEnabled: true
            },
            
            // API設定
            api: {
                endpoints: {
                    usgs: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_hour.geojson',
                    jma: 'https://www.jma.go.jp/bosai/forecast/data/forecast/130000.json',
                    p2pquake: 'https://api.p2pquake.net/v2/history',
                    tsunami: 'https://api.p2pquake.net/v2/jma/tsunami'
                },
                retryPolicy: {
                    maxRetries: 3,
                    backoffMultiplier: 2,
                    initialDelay: 1000
                },
                timeout: 30000,
                enableProxy: true
            },
            
            // UI設定
            ui: {
                theme: 'dark',
                language: 'ja',
                enableAnimations: true,
                enableSound: true,
                notificationDuration: 5000,
                maxNotifications: 5,
                enableAutoRefresh: true,
                refreshInterval: 60000 // 1分
            },
            
            // 津波警報設定
            tsunami: {
                enableAlerts: true,
                soundEnabled: true,
                alertLevels: {
                    注意報: { color: '#ffd700', sound: 'warning' },
                    警報: { color: '#ff6b6b', sound: 'alert' },
                    大津波警報: { color: '#dc3545', sound: 'emergency' }
                },
                simulationMode: false,
                testInterval: 86400000 // 24時間
            },
            
            // 地震監視設定
            earthquake: {
                enableMonitoring: true,
                minMagnitude: 3.0,
                maxHistoryDays: 30,
                enableIntensityDisplay: true,
                enableDepthDisplay: true,
                autoZoom: true
            },
            
            // パフォーマンス設定
            performance: {
                enableMemoryMonitoring: true,
                memoryThreshold: 100 * 1024 * 1024, // 100MB
                enableTimerManagement: true,
                maxConcurrentRequests: 10,
                enableCaching: true,
                cacheExpiry: 300000 // 5分
            },
            
            // ログ設定
            logging: {
                enabled: true,
                level: 'info', // debug, info, warn, error, fatal
                maxLogEntries: 1000,
                enableConsoleOutput: true,
                enableLocalStorage: true,
                enableRemoteLogging: false
            }
        };
    }
    
    /**
     * 設定の初期化
     */
    async initialize() {
        try {
            // LocalStorageから設定を読み込み
            await this.loadFromStorage();
            
            // 環境変数からの設定読み込み（可能な場合）
            this.loadFromEnvironment();
            
            // 設定の妥当性チェック
            this.validateConfig();
            
            // 設定変更の監視開始
            this.startConfigWatcher();
            
            console.log('📋 設定初期化完了:', this.currentConfig.system);
            
        } catch (error) {
            console.error('❌ 設定初期化エラー:', error);
            this.currentConfig = { ...this.defaultConfig };
        }
    }
    
    /**
     * LocalStorageから設定を読み込み
     */
    async loadFromStorage() {
        try {
            const storedConfig = localStorage.getItem('app_config');
            if (storedConfig) {
                const parsedConfig = JSON.parse(storedConfig);
                
                // バージョンチェック
                if (parsedConfig.version === this.configVersion) {
                    this.currentConfig = this.mergeConfig(this.defaultConfig, parsedConfig.config);
                    this.lastModified = parsedConfig.lastModified || Date.now();
                } else {
                    console.warn('⚠️ 設定バージョンが異なります。デフォルト設定を使用します。');
                    this.currentConfig = { ...this.defaultConfig };
                }
            } else {
                this.currentConfig = { ...this.defaultConfig };
            }
        } catch (error) {
            console.error('❌ 設定読み込みエラー:', error);
            this.currentConfig = { ...this.defaultConfig };
        }
    }
    
    /**
     * 環境変数からの設定読み込み
     */
    loadFromEnvironment() {
        if (typeof process !== 'undefined' && process.env) {
            // Node.js環境での環境変数読み込み
            if (process.env.TSUNAMI_DEBUG === 'true') {
                this.currentConfig.system.debug = true;
            }
            if (process.env.TSUNAMI_PORT) {
                this.currentConfig.system.port = parseInt(process.env.TSUNAMI_PORT);
            }
        }
        
        // URLパラメータからの設定読み込み（ブラウザ環境）
        if (typeof window !== 'undefined' && window.location) {
            const params = new URLSearchParams(window.location.search);
            if (params.get('debug') === 'true') {
                this.currentConfig.system.debug = true;
            }
            if (params.get('test') === 'true') {
                this.currentConfig.tsunami.simulationMode = true;
            }
        }
    }
    
    /**
     * 設定の妥当性チェック
     */
    validateConfig() {
        // 数値範囲チェック
        if (this.currentConfig.system.updateInterval < 5000) {
            console.warn('⚠️ 更新間隔が短すぎます。最小値5秒に調整します。');
            this.currentConfig.system.updateInterval = 5000;
        }
        
        if (this.currentConfig.data.maxStorageSize > 50 * 1024 * 1024) {
            console.warn('⚠️ ストレージ容量が大きすぎます。50MBに制限します。');
            this.currentConfig.data.maxStorageSize = 50 * 1024 * 1024;
        }
        
        // 必須設定の確認
        if (!this.currentConfig.api.endpoints.jma) {
            console.error('❌ JMA APIエンドポイントが設定されていません');
        }
    }
    
    /**
     * 設定の深いマージ
     */
    mergeConfig(defaultConfig, userConfig) {
        const merged = {};
        
        for (const key in defaultConfig) {
            if (typeof defaultConfig[key] === 'object' && !Array.isArray(defaultConfig[key])) {
                merged[key] = this.mergeConfig(
                    defaultConfig[key], 
                    userConfig[key] || {}
                );
            } else {
                merged[key] = userConfig.hasOwnProperty(key) ? userConfig[key] : defaultConfig[key];
            }
        }
        
        return merged;
    }
    
    /**
     * 設定値の取得
     */
    get(path, defaultValue = undefined) {
        const keys = path.split('.');
        let current = this.currentConfig;
        
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return defaultValue;
            }
        }
        
        return current;
    }
    
    /**
     * 設定値の設定
     */
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let current = this.currentConfig;
        
        // ネストしたオブジェクトを作成
        for (const key of keys) {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        const oldValue = current[lastKey];
        current[lastKey] = value;
        this.lastModified = Date.now();
        
        // 変更通知
        this.notifyConfigChange(path, value, oldValue);
        
        // 自動保存
        this.saveToStorage();
        
        return true;
    }
    
    /**
     * 設定の保存
     */
    async saveToStorage() {
        try {
            const configData = {
                version: this.configVersion,
                config: this.currentConfig,
                lastModified: this.lastModified
            };
            
            localStorage.setItem('app_config', JSON.stringify(configData));
            console.log('💾 設定を保存しました');
            
        } catch (error) {
            console.error('❌ 設定保存エラー:', error);
            if (window.errorHandler) {
                window.errorHandler.error('設定保存エラー', { error });
            }
        }
    }
    
    /**
     * 設定変更の監視
     */
    addConfigListener(path, callback) {
        if (!this.configListeners.has(path)) {
            this.configListeners.set(path, []);
        }
        this.configListeners.get(path).push(callback);
        
        return () => {
            const listeners = this.configListeners.get(path);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        };
    }
    
    /**
     * 設定変更の通知
     */
    notifyConfigChange(path, newValue, oldValue) {
        // 完全一致のリスナー
        if (this.configListeners.has(path)) {
            for (const callback of this.configListeners.get(path)) {
                try {
                    callback(newValue, oldValue, path);
                } catch (error) {
                    console.error('❌ 設定変更リスナーエラー:', error);
                }
            }
        }
        
        // ワイルドカードリスナー（例: "system.*"）
        for (const [listenerPath, callbacks] of this.configListeners) {
            if (listenerPath.endsWith('*') && path.startsWith(listenerPath.slice(0, -1))) {
                for (const callback of callbacks) {
                    try {
                        callback(newValue, oldValue, path);
                    } catch (error) {
                        console.error('❌ 設定変更リスナーエラー:', error);
                    }
                }
            }
        }
    }
    
    /**
     * 設定変更の監視開始
     */
    startConfigWatcher() {
        // LocalStorageの変更を監視
        if (typeof window !== 'undefined') {
            window.addEventListener('storage', (event) => {
                if (event.key === 'app_config' && event.newValue !== event.oldValue) {
                    console.log('🔄 外部からの設定変更を検出');
                    this.loadFromStorage();
                }
            });
        }
    }
    
    /**
     * 設定のリセット
     */
    reset(section = null) {
        if (section) {
            this.currentConfig[section] = { ...this.defaultConfig[section] };
            console.log(`🔄 設定セクション「${section}」をリセットしました`);
        } else {
            this.currentConfig = { ...this.defaultConfig };
            console.log('🔄 全設定をリセットしました');
        }
        
        this.lastModified = Date.now();
        this.saveToStorage();
    }
    
    /**
     * 設定のエクスポート
     */
    export(format = 'json') {
        const exportData = {
            version: this.configVersion,
            exported: new Date().toISOString(),
            config: this.currentConfig
        };
        
        switch (format) {
            case 'json':
                return JSON.stringify(exportData, null, 2);
            case 'yaml':
                // YAML形式での出力（簡易版）
                return this.toYaml(exportData);
            default:
                return exportData;
        }
    }
    
    /**
     * 設定のインポート
     */
    import(data, format = 'json') {
        try {
            let importData;
            
            switch (format) {
                case 'json':
                    importData = typeof data === 'string' ? JSON.parse(data) : data;
                    break;
                default:
                    throw new Error(`未対応の形式: ${format}`);
            }
            
            if (importData.config) {
                this.currentConfig = this.mergeConfig(this.defaultConfig, importData.config);
                this.lastModified = Date.now();
                this.saveToStorage();
                console.log('📥 設定をインポートしました');
                return true;
            } else {
                throw new Error('無効な設定データです');
            }
            
        } catch (error) {
            console.error('❌ 設定インポートエラー:', error);
            if (window.errorHandler) {
                window.errorHandler.error('設定インポートエラー', { error });
            }
            return false;
        }
    }
    
    /**
     * 簡易YAML出力
     */
    toYaml(obj, indent = 0) {
        const spaces = '  '.repeat(indent);
        let yaml = '';
        
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                yaml += `${spaces}${key}:\n${this.toYaml(value, indent + 1)}`;
            } else if (Array.isArray(value)) {
                yaml += `${spaces}${key}:\n`;
                for (const item of value) {
                    yaml += `${spaces}  - ${item}\n`;
                }
            } else {
                yaml += `${spaces}${key}: ${value}\n`;
            }
        }
        
        return yaml;
    }
    
    /**
     * 現在の設定情報を取得
     */
    getInfo() {
        return {
            version: this.configVersion,
            lastModified: new Date(this.lastModified).toISOString(),
            configSize: JSON.stringify(this.currentConfig).length,
            listenerCount: Array.from(this.configListeners.values()).reduce((sum, arr) => sum + arr.length, 0)
        };
    }
}

const appConfig = new AppConfig();
export { appConfig };
