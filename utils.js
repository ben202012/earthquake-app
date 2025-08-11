/**
 * 共通ユーティリティクラス - 重複コード排除
 * 津波警報システム v3.0
 */

class Utils {
    constructor() {
        this.cache = new Map();
        this.formatters = this.initializeFormatters();
        
        console.log('✅ Utils初期化完了 - 共通ユーティリティ有効');
    }
    
    /**
     * フォーマッター初期化
     */
    initializeFormatters() {
        return {
            dateTime: new Intl.DateTimeFormat('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }),
            time: new Intl.DateTimeFormat('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }),
            number: new Intl.NumberFormat('ja-JP', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1
            })
        };
    }
    
    /**
     * 日時フォーマット（共通処理）
     */
    formatDateTime(date, format = 'full') {
        if (!date) return '--:--:--';
        
        const dateObj = date instanceof Date ? date : new Date(date);
        if (isNaN(dateObj.getTime())) return '--:--:--';
        
        switch (format) {
            case 'time':
                return this.formatters.time.format(dateObj);
            case 'full':
            default:
                return this.formatters.dateTime.format(dateObj);
        }
    }
    
    /**
     * 数値フォーマット（共通処理）
     */
    formatNumber(value, options = {}) {
        if (value === null || value === undefined || isNaN(value)) {
            return options.fallback || '--';
        }
        
        const formatter = new Intl.NumberFormat('ja-JP', {
            minimumFractionDigits: options.decimals || 1,
            maximumFractionDigits: options.decimals || 1,
            style: options.style || 'decimal',
            unit: options.unit,
            unitDisplay: options.unitDisplay || 'short'
        });
        
        return formatter.format(value);
    }
    
    /**
     * 震度表示フォーマット（共通処理）
     */
    formatIntensity(intensity) {
        if (intensity === null || intensity === undefined) return '--';
        
        const intensityMap = {
            1: '震度1',
            2: '震度2', 
            3: '震度3',
            4: '震度4',
            5: '震度5弱',
            5.5: '震度5強',
            6: '震度6弱',
            6.5: '震度6強',
            7: '震度7'
        };
        
        return intensityMap[intensity] || `震度${intensity}`;
    }
    
    /**
     * マグニチュード表示フォーマット（共通処理）
     */
    formatMagnitude(magnitude) {
        if (magnitude === null || magnitude === undefined || isNaN(magnitude)) {
            return 'M--';
        }
        return `M${this.formatNumber(magnitude, { decimals: 1 })}`;
    }
    
    /**
     * 深度表示フォーマット（共通処理）
     */
    formatDepth(depth) {
        if (depth === null || depth === undefined || isNaN(depth)) {
            return '--km';
        }
        return `${Math.round(depth)}km`;
    }
    
    /**
     * 津波レベル色取得（共通処理）
     */
    getTsunamiLevelColor(level) {
        const colors = {
            '注意報': '#ffd700',
            '警報': '#ff6b6b', 
            '大津波警報': '#dc3545',
            'default': '#a0aec0'
        };
        
        return colors[level] || colors.default;
    }
    
    /**
     * 震度レベル色取得（共通処理）
     */
    getIntensityColor(intensity) {
        if (intensity >= 7) return '#800080'; // 紫
        if (intensity >= 6) return '#dc3545'; // 赤
        if (intensity >= 5) return '#ff6b6b'; // オレンジ赤
        if (intensity >= 4) return '#ffd700'; // 黄
        if (intensity >= 3) return '#00d4aa'; // 緑
        return '#a0aec0'; // グレー
    }
    
    /**
     * DOM要素の安全な作成（XSS対策）
     */
    createElement(tag, options = {}) {
        const element = document.createElement(tag);
        
        if (options.className) {
            element.className = options.className;
        }
        
        if (options.textContent) {
            element.textContent = options.textContent;
        }
        
        if (options.innerHTML && options.trusted) {
            // trustedフラグが立っている場合のみinnerHTMLを許可
            element.innerHTML = options.innerHTML;
        }
        
        if (options.attributes) {
            for (const [key, value] of Object.entries(options.attributes)) {
                element.setAttribute(key, value);
            }
        }
        
        if (options.style) {
            Object.assign(element.style, options.style);
        }
        
        if (options.events) {
            for (const [event, handler] of Object.entries(options.events)) {
                element.addEventListener(event, handler);
            }
        }
        
        return element;
    }
    
    /**
     * 地震情報カード作成（共通処理）
     */
    createEarthquakeCard(earthquake) {
        const card = this.createElement('div', {
            className: 'earthquake-item fade-in'
        });
        
        // 時刻表示
        const timeElement = this.createElement('div', {
            className: 'earthquake-time',
            textContent: this.formatDateTime(earthquake.time)
        });
        
        // マグニチュード表示
        const magnitudeElement = this.createElement('div', {
            className: 'earthquake-magnitude',
            textContent: this.formatMagnitude(earthquake.magnitude),
            style: {
                color: this.getMagnitudeColor(earthquake.magnitude)
            }
        });
        
        // 震源地表示
        const locationElement = this.createElement('div', {
            className: 'earthquake-location',
            textContent: earthquake.location || '震源地不明'
        });
        
        // 深度表示
        const depthElement = this.createElement('div', {
            className: 'earthquake-depth',
            textContent: this.formatDepth(earthquake.depth)
        });
        
        // 震度表示（ある場合）
        if (earthquake.intensity) {
            const intensityElement = this.createElement('div', {
                className: 'earthquake-intensity',
                textContent: this.formatIntensity(earthquake.intensity),
                style: {
                    color: this.getIntensityColor(earthquake.intensity)
                }
            });
            card.appendChild(intensityElement);
        }
        
        card.appendChild(timeElement);
        card.appendChild(magnitudeElement);
        card.appendChild(locationElement);
        card.appendChild(depthElement);
        
        return card;
    }
    
    /**
     * マグニチュード色取得
     */
    getMagnitudeColor(magnitude) {
        if (magnitude >= 7) return '#800080'; // 紫
        if (magnitude >= 6) return '#dc3545'; // 赤
        if (magnitude >= 5) return '#ff6b6b'; // オレンジ赤
        if (magnitude >= 4) return '#ffd700'; // 黄
        if (magnitude >= 3) return '#00d4aa'; // 緑
        return '#a0aec0'; // グレー
    }
    
    /**
     * 通知表示（共通処理）
     */
    showNotification(message, type = 'info', duration = 5000) {
        const notification = this.createElement('div', {
            className: `notification notification-${type}`,
            style: {
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: '10000',
                padding: '12px 16px',
                borderRadius: '4px',
                color: 'white',
                fontSize: '14px',
                maxWidth: '400px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                animation: 'slideIn 0.3s ease-out',
                background: this.getNotificationColor(type)
            }
        });
        
        // アイコン付きメッセージ
        const icon = this.getNotificationIcon(type);
        notification.textContent = `${icon} ${message}`;
        
        // クリックで閉じる
        notification.addEventListener('click', () => {
            notification.remove();
        });
        
        document.body.appendChild(notification);
        
        // 自動削除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
        
        return notification;
    }
    
    /**
     * 通知色取得
     */
    getNotificationColor(type) {
        const colors = {
            info: '#00d4aa',
            success: '#28a745',
            warning: '#ffd700',
            error: '#dc3545'
        };
        return colors[type] || colors.info;
    }
    
    /**
     * 通知アイコン取得
     */
    getNotificationIcon(type) {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        return icons[type] || icons.info;
    }
    
    /**
     * 深いコピー（共通処理）
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }
        
        if (typeof obj === 'object') {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this.deepClone(obj[key]);
                }
            }
            return cloned;
        }
        
        return obj;
    }
    
    /**
     * オブジェクトのマージ（共通処理）
     */
    deepMerge(target, source) {
        const result = this.deepClone(target);
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(result[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }
    
    /**
     * デバウンス（共通処理）
     */
    debounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
    
    /**
     * スロットル（共通処理）
     */
    throttle(func, delay) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, delay);
            }
        };
    }
    
    /**
     * 非同期遅延（共通処理）
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * リトライ付き非同期実行（共通処理）
     */
    async retryAsync(operation, maxRetries = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                
                console.warn(`⚠️ 実行失敗 (試行${attempt}/${maxRetries}):`, error.message);
                await this.sleep(delay * attempt); // 指数バックオフ
            }
        }
    }
    
    /**
     * ローディング表示（共通処理）
     */
    showLoading(container, message = '読み込み中...') {
        const loading = this.createElement('div', {
            className: 'loading-overlay',
            style: {
                position: 'absolute',
                top: '0',
                left: '0',
                right: '0',
                bottom: '0',
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: '1000'
            }
        });
        
        const spinner = this.createElement('div', {
            className: 'loading-spinner',
            innerHTML: `
                <div style="
                    border: 3px solid #f3f3f3;
                    border-top: 3px solid #00d4aa;
                    border-radius: 50%;
                    width: 30px;
                    height: 30px;
                    animation: spin 1s linear infinite;
                    margin-right: 10px;
                "></div>
                <span style="color: white;">${message}</span>
            `,
            trusted: true,
            style: {
                display: 'flex',
                alignItems: 'center'
            }
        });
        
        loading.appendChild(spinner);
        container.appendChild(loading);
        
        return loading;
    }
    
    /**
     * ローディング非表示
     */
    hideLoading(loading) {
        if (loading && loading.parentNode) {
            loading.parentNode.removeChild(loading);
        }
    }
    
    /**
     * キャッシュ付きフェッチ（共通処理）
     */
    async cachedFetch(url, options = {}, cacheTime = 300000) { // 5分キャッシュ
        const cacheKey = `${url}_${JSON.stringify(options)}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < cacheTime) {
            return cached.data;
        }
        
        try {
            const response = await fetch(url, options);
            const data = await response.json();
            
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
            
            return data;
        } catch (error) {
            // キャッシュがある場合は古いデータを返す
            if (cached) {
                console.warn('⚠️ 新しいデータの取得に失敗。キャッシュデータを使用します。');
                return cached.data;
            }
            throw error;
        }
    }
    
    /**
     * キャッシュクリア
     */
    clearCache(pattern = null) {
        if (pattern) {
            const regex = new RegExp(pattern);
            for (const key of this.cache.keys()) {
                if (regex.test(key)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    }
    
    /**
     * メモリ使用量取得（概算）
     */
    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
        }
        return null;
    }
}

// グローバルインスタンス
if (typeof window !== 'undefined') {
    window.utils = new Utils();
} else {
    module.exports = Utils;
}
