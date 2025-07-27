/**
 * 設定管理サービス - アプリケーション全体の設定を一元管理
 */
import BaseComponent from '../core/BaseComponent.js';

class SettingsService extends BaseComponent {
    constructor(container, options = {}) {
        super(container, options);
        
        this.storageKey = 'earthquake_app_settings_v2';
        this.defaultSettings = {
            version: '2.0.0',
            
            // 通知設定
            notifications: {
                enabled: true,
                browser: true,
                sound: true,
                vibration: true,
                magnitude: 4.0,
                intensity: '3',
                volume: 50,
                cooldown: 2000
            },
            
            // 表示設定
            display: {
                theme: 'dark',
                language: 'ja',
                animations: true,
                autoZoom: true,
                showGrid: false,
                showCoordinates: true,
                refreshRate: 5000
            },
            
            // 地図設定
            map: {
                defaultCenter: [36.0, 138.0],
                defaultZoom: 6,
                maxZoom: 18,
                minZoom: 4,
                tileLayer: 'dark',
                showIntensityPoints: true,
                markerSize: 'medium',
                animateMarkers: true
            },
            
            // データ設定
            data: {
                maxHistoryItems: 100,
                autoSave: true,
                saveInterval: 60000,
                cacheExpiry: 3600000, // 1時間
                enableP2P: true,
                enableJMA: true,
                apiTimeout: 10000
            },
            
            // パフォーマンス設定
            performance: {
                enableMonitoring: true,
                memoryWarningThreshold: 100, // MB
                maxActivityFeedItems: 50,
                enableDebugMode: false,
                logLevel: 'info'
            },
            
            // 実験的機能
            experimental: {
                enablePWA: false,
                enableOfflineMode: false,
                enableAdvancedAnalytics: false
            }
        };
        
        this.settings = {};
        this.settingsHistory = [];
        this.maxHistorySize = 10;
        this.isLoading = false;
        this.isSaving = false;
    }
    
    get defaultOptions() {
        return {
            ...super.defaultOptions,
            autoLoad: true,
            autoSave: true,
            validateSettings: true,
            enableHistory: true
        };
    }
    
    async init() {
        await super.init();
        
        if (this.options.autoLoad) {
            await this.loadSettings();
        } else {
            this.resetToDefaults();
        }
        
        this.setupAutoSave();
    }
    
    /**
     * 設定の読み込み
     */
    async loadSettings() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        
        try {
            console.log('📁 Loading settings...');
            
            const savedData = localStorage.getItem(this.storageKey);
            
            if (savedData) {
                const parsed = JSON.parse(savedData);
                
                // バージョン互換性チェック
                if (this.isVersionCompatible(parsed.version)) {
                    this.settings = this.mergeSettings(this.defaultSettings, parsed);
                    
                    if (this.options.validateSettings) {
                        this.validateSettings();
                    }
                    
                    console.log('✅ Settings loaded successfully');
                } else {
                    console.warn('⚠️ Settings version incompatible, using defaults');
                    await this.migrateSettings(parsed);
                }
            } else {
                console.log('📄 No saved settings found, using defaults');
                this.resetToDefaults();
            }
            
            // 設定読み込み完了イベント
            this.eventBus.publish('settings.loaded', this.settings);
            
        } catch (error) {
            console.error('❌ Failed to load settings:', error);
            this.resetToDefaults();
            this.eventBus.publish('settings.error', { error, operation: 'load' });
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * 設定の保存
     */
    async saveSettings() {
        if (this.isSaving) return;
        
        this.isSaving = true;
        
        try {
            const dataToSave = {
                ...this.settings,
                savedAt: new Date().toISOString()
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(dataToSave));
            
            this.eventBus.publish('settings.saved', this.settings);
            
            if (this.options.debug) {
                console.log('💾 Settings saved successfully');
            }
            
        } catch (error) {
            console.error('❌ Failed to save settings:', error);
            this.eventBus.publish('settings.error', { error, operation: 'save' });
        } finally {
            this.isSaving = false;
        }
    }
    
    /**
     * 設定値の取得
     */
    get(path, defaultValue = undefined) {
        return this.getNestedValue(this.settings, path, defaultValue);
    }
    
    /**
     * 設定値の更新
     */
    set(path, value) {
        const oldValue = this.get(path);
        
        if (oldValue === value) return false;
        
        // 履歴に保存
        if (this.options.enableHistory) {
            this.addToHistory(path, oldValue, value);
        }
        
        // 値を設定
        this.setNestedValue(this.settings, path, value);
        
        // バリデーション
        if (this.options.validateSettings) {
            this.validateSetting(path, value);
        }
        
        // イベント発行
        this.eventBus.publish('settings.changed', {
            path,
            oldValue,
            newValue: value,
            settings: this.settings
        });
        
        // 自動保存
        if (this.options.autoSave) {
            this.saveSettings();
        }
        
        return true;
    }
    
    /**
     * 複数の設定を一括更新
     */
    update(updates) {
        const changes = [];
        
        Object.entries(updates).forEach(([path, value]) => {
            const oldValue = this.get(path);
            if (oldValue !== value) {
                changes.push({ path, oldValue, newValue: value });
                this.setNestedValue(this.settings, path, value);
            }
        });
        
        if (changes.length > 0) {
            // 履歴に保存
            if (this.options.enableHistory) {
                changes.forEach(({ path, oldValue, newValue }) => {
                    this.addToHistory(path, oldValue, newValue);
                });
            }
            
            // バリデーション
            if (this.options.validateSettings) {
                this.validateSettings();
            }
            
            // イベント発行
            this.eventBus.publish('settings.bulk_changed', {
                changes,
                settings: this.settings
            });
            
            // 自動保存
            if (this.options.autoSave) {
                this.saveSettings();
            }
        }
        
        return changes.length;
    }
    
    /**
     * 設定のリセット
     */
    reset(path = null) {
        if (path) {
            // 特定のパスのみリセット
            const defaultValue = this.getNestedValue(this.defaultSettings, path);
            this.set(path, defaultValue);
        } else {
            // 全設定をリセット
            this.resetToDefaults();
        }
        
        this.eventBus.publish('settings.reset', { path, settings: this.settings });
    }
    
    resetToDefaults() {
        this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
        this.settingsHistory = [];
    }
    
    /**
     * 設定の検証
     */
    validateSettings() {
        const errors = [];
        
        // 通知設定の検証
        if (this.settings.notifications.magnitude < 0 || this.settings.notifications.magnitude > 10) {
            errors.push('Magnitude threshold must be between 0 and 10');
        }
        
        if (this.settings.notifications.volume < 0 || this.settings.notifications.volume > 100) {
            errors.push('Volume must be between 0 and 100');
        }
        
        // 地図設定の検証
        if (this.settings.map.defaultZoom < this.settings.map.minZoom || 
            this.settings.map.defaultZoom > this.settings.map.maxZoom) {
            errors.push('Default zoom must be within min/max zoom range');
        }
        
        // データ設定の検証
        if (this.settings.data.maxHistoryItems < 1 || this.settings.data.maxHistoryItems > 1000) {
            errors.push('Max history items must be between 1 and 1000');
        }
        
        if (errors.length > 0) {
            console.warn('⚠️ Settings validation errors:', errors);
            this.eventBus.publish('settings.validation_errors', errors);
        }
        
        return errors;
    }
    
    validateSetting(path, value) {
        // 個別設定の検証ロジック
        const validators = {
            'notifications.magnitude': (v) => v >= 0 && v <= 10,
            'notifications.volume': (v) => v >= 0 && v <= 100,
            'map.defaultZoom': (v) => v >= this.get('map.minZoom') && v <= this.get('map.maxZoom'),
            'data.maxHistoryItems': (v) => v >= 1 && v <= 1000
        };
        
        if (validators[path] && !validators[path](value)) {
            console.warn(`⚠️ Invalid value for ${path}:`, value);
            return false;
        }
        
        return true;
    }
    
    /**
     * 設定マイグレーション
     */
    async migrateSettings(oldSettings) {
        console.log('🔄 Migrating settings from older version...');
        
        // v1.0からv2.0への移行例
        if (oldSettings.version === '1.0.0') {
            const migrated = {
                ...this.defaultSettings,
                notifications: {
                    ...this.defaultSettings.notifications,
                    enabled: oldSettings.notificationsEnabled || true,
                    magnitude: oldSettings.magnitudeThreshold || 4.0,
                    intensity: oldSettings.intensityThreshold || '3'
                }
            };
            
            this.settings = migrated;
        } else {
            this.resetToDefaults();
        }
        
        await this.saveSettings();
        console.log('✅ Settings migration completed');
    }
    
    /**
     * バージョン互換性チェック
     */
    isVersionCompatible(version) {
        if (!version) return false;
        
        const [major, minor] = version.split('.').map(Number);
        const [currentMajor, currentMinor] = this.defaultSettings.version.split('.').map(Number);
        
        // メジャーバージョンが同じなら互換性あり
        return major === currentMajor;
    }
    
    /**
     * 設定のマージ
     */
    mergeSettings(defaults, saved) {
        const merged = JSON.parse(JSON.stringify(defaults));
        
        const mergeRecursive = (target, source) => {
            Object.keys(source).forEach(key => {
                if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    if (!target[key]) target[key] = {};
                    mergeRecursive(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            });
        };
        
        mergeRecursive(merged, saved);
        return merged;
    }
    
    /**
     * ネストした値の取得
     */
    getNestedValue(obj, path, defaultValue = undefined) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : defaultValue;
        }, obj);
    }
    
    /**
     * ネストした値の設定
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        
        const target = keys.reduce((current, key) => {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            return current[key];
        }, obj);
        
        target[lastKey] = value;
    }
    
    /**
     * 履歴管理
     */
    addToHistory(path, oldValue, newValue) {
        this.settingsHistory.unshift({
            timestamp: Date.now(),
            path,
            oldValue,
            newValue
        });
        
        // 履歴サイズ制限
        if (this.settingsHistory.length > this.maxHistorySize) {
            this.settingsHistory = this.settingsHistory.slice(0, this.maxHistorySize);
        }
    }
    
    /**
     * 設定の履歴を取得
     */
    getHistory() {
        return [...this.settingsHistory];
    }
    
    /**
     * 設定の取り消し（Undo）
     */
    undo() {
        if (this.settingsHistory.length === 0) return false;
        
        const lastChange = this.settingsHistory.shift();
        this.setNestedValue(this.settings, lastChange.path, lastChange.oldValue);
        
        this.eventBus.publish('settings.undone', lastChange);
        
        if (this.options.autoSave) {
            this.saveSettings();
        }
        
        return true;
    }
    
    /**
     * 自動保存の設定
     */
    setupAutoSave() {
        if (this.options.autoSave) {
            let saveTimeout;
            
            this.eventBus.subscribe('settings.changed', () => {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    this.saveSettings();
                }, 1000); // 1秒後に保存
            });
        }
    }
    
    /**
     * 設定のエクスポート
     */
    export() {
        return {
            ...this.settings,
            exportedAt: new Date().toISOString(),
            exportVersion: this.defaultSettings.version
        };
    }
    
    /**
     * 設定のインポート
     */
    async import(settingsData) {
        try {
            if (this.isVersionCompatible(settingsData.exportVersion)) {
                this.settings = this.mergeSettings(this.defaultSettings, settingsData);
                
                if (this.options.validateSettings) {
                    this.validateSettings();
                }
                
                await this.saveSettings();
                this.eventBus.publish('settings.imported', this.settings);
                
                return true;
            } else {
                throw new Error('Incompatible settings version');
            }
        } catch (error) {
            console.error('Failed to import settings:', error);
            this.eventBus.publish('settings.error', { error, operation: 'import' });
            return false;
        }
    }
    
    /**
     * 設定の比較
     */
    compare(otherSettings) {
        const differences = [];
        
        const compareRecursive = (obj1, obj2, path = '') => {
            Object.keys(obj1).forEach(key => {
                const currentPath = path ? `${path}.${key}` : key;
                
                if (typeof obj1[key] === 'object' && obj1[key] !== null && !Array.isArray(obj1[key])) {
                    if (obj2[key]) {
                        compareRecursive(obj1[key], obj2[key], currentPath);
                    }
                } else if (obj1[key] !== obj2[key]) {
                    differences.push({
                        path: currentPath,
                        current: obj1[key],
                        other: obj2[key]
                    });
                }
            });
        };
        
        compareRecursive(this.settings, otherSettings);
        return differences;
    }
    
    /**
     * 統計情報の取得
     */
    getStats() {
        return {
            totalSettings: this.countSettings(this.settings),
            historySize: this.settingsHistory.length,
            lastSaved: this.settings.savedAt,
            version: this.settings.version,
            storageSize: localStorage.getItem(this.storageKey)?.length || 0
        };
    }
    
    countSettings(obj, count = 0) {
        Object.keys(obj).forEach(key => {
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                count = this.countSettings(obj[key], count);
            } else {
                count++;
            }
        });
        return count;
    }
    
    async render() {
        // 設定サービスは視覚的なコンポーネントではないため、空の実装
        this.element = document.createElement('div');
        this.element.style.display = 'none';
        this.element.id = `settings-service-${this.id}`;
        this.container.appendChild(this.element);
    }
}

export default SettingsService;