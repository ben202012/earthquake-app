/**
 * パフォーマンス監視ユーティリティ
 */
class PerformanceMonitor {
    constructor() {
        this.isMonitoring = false;
        this.metrics = {
            memory: {
                current: 0,
                peak: 0,
                history: []
            },
            timing: {
                loadTime: 0,
                renderTime: 0,
                lastUpdateTime: 0
            },
            resources: {
                domNodes: 0,
                eventListeners: 0,
                components: 0
            },
            network: {
                requestCount: 0,
                totalDataReceived: 0,
                averageResponseTime: 0
            }
        };
        
        this.thresholds = {
            memoryWarning: 100, // MB
            memoryCritical: 200, // MB
            responseTimeWarning: 5000, // ms
            domNodesWarning: 10000
        };
        
        this.callbacks = new Map();
        this.monitoringInterval = null;
        this.intervalMs = 5000; // 5秒間隔
    }
    
    /**
     * 監視開始
     */
    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        
        // 初期計測
        this.collectMetrics();
        
        // 定期監視
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
            this.checkThresholds();
        }, this.intervalMs);
        
        // パフォーマンスオブザーバー設定
        this.setupPerformanceObserver();
        
        console.log('📊 Performance monitoring started');
    }
    
    /**
     * 監視停止
     */
    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        console.log('📊 Performance monitoring stopped');
    }
    
    /**
     * メトリクス収集
     */
    collectMetrics() {
        this.collectMemoryMetrics();
        this.collectTimingMetrics();
        this.collectResourceMetrics();
        this.updateHistory();
    }
    
    /**
     * メモリメトリクス収集
     */
    collectMemoryMetrics() {
        if (performance.memory) {
            const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
            
            this.metrics.memory.current = memoryMB;
            this.metrics.memory.peak = Math.max(this.metrics.memory.peak, memoryMB);
        }
    }
    
    /**
     * タイミングメトリクス収集
     */
    collectTimingMetrics() {
        // ページロード時間
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
            this.metrics.timing.loadTime = Math.round(navigation.loadEventEnd - navigation.fetchStart);
        }
        
        // 最終更新時間
        this.metrics.timing.lastUpdateTime = Date.now();
    }
    
    /**
     * リソースメトリクス収集
     */
    collectResourceMetrics() {
        // DOM ノード数
        this.metrics.resources.domNodes = document.querySelectorAll('*').length;
        
        // イベントリスナー数の推定（近似値）
        this.metrics.resources.eventListeners = this.estimateEventListeners();
    }
    
    /**
     * イベントリスナー数の推定
     */
    estimateEventListeners() {
        let count = 0;
        const elements = document.querySelectorAll('*');
        
        elements.forEach(element => {
            // よく使われるイベントタイプをチェック
            const events = ['click', 'mousedown', 'mouseup', 'mouseover', 'keydown', 'keyup', 'focus', 'blur'];
            events.forEach(eventType => {
                if (element[`on${eventType}`]) {
                    count++;
                }
            });
        });
        
        return count;
    }
    
    /**
     * 履歴更新
     */
    updateHistory() {
        const historyEntry = {
            timestamp: Date.now(),
            memory: this.metrics.memory.current,
            domNodes: this.metrics.resources.domNodes
        };
        
        this.metrics.memory.history.push(historyEntry);
        
        // 履歴サイズ制限（最新100件）
        if (this.metrics.memory.history.length > 100) {
            this.metrics.memory.history.shift();
        }
    }
    
    /**
     * しきい値チェック
     */
    checkThresholds() {
        const warnings = [];
        
        // メモリ使用量チェック
        if (this.metrics.memory.current >= this.thresholds.memoryCritical) {
            warnings.push({
                type: 'memory',
                level: 'critical',
                value: this.metrics.memory.current,
                threshold: this.thresholds.memoryCritical,
                message: `メモリ使用量が危険レベルです: ${this.metrics.memory.current}MB`
            });
        } else if (this.metrics.memory.current >= this.thresholds.memoryWarning) {
            warnings.push({
                type: 'memory',
                level: 'warning',
                value: this.metrics.memory.current,
                threshold: this.thresholds.memoryWarning,
                message: `メモリ使用量が高いです: ${this.metrics.memory.current}MB`
            });
        }
        
        // DOM ノード数チェック
        if (this.metrics.resources.domNodes >= this.thresholds.domNodesWarning) {
            warnings.push({
                type: 'dom',
                level: 'warning',
                value: this.metrics.resources.domNodes,
                threshold: this.thresholds.domNodesWarning,
                message: `DOM ノード数が多すぎます: ${this.metrics.resources.domNodes}`
            });
        }
        
        // 警告をコールバックに通知
        warnings.forEach(warning => {
            this.triggerCallback('warning', warning);
            console.warn('⚠️ Performance warning:', warning);
        });
    }
    
    /**
     * パフォーマンスオブザーバー設定
     */
    setupPerformanceObserver() {
        if ('PerformanceObserver' in window) {
            // Navigation timing
            try {
                const navObserver = new PerformanceObserver((list) => {
                    list.getEntries().forEach(entry => {
                        this.metrics.timing.renderTime = Math.round(entry.domContentLoadedEventEnd - entry.fetchStart);
                    });
                });
                navObserver.observe({ entryTypes: ['navigation'] });
            } catch (error) {
                console.warn('Navigation observer not supported:', error);
            }
            
            // Resource timing
            try {
                const resourceObserver = new PerformanceObserver((list) => {
                    list.getEntries().forEach(entry => {
                        this.metrics.network.requestCount++;
                        this.metrics.network.totalDataReceived += entry.transferSize || 0;
                        
                        const responseTime = entry.responseEnd - entry.requestStart;
                        this.updateAverageResponseTime(responseTime);
                        
                        if (responseTime > this.thresholds.responseTimeWarning) {
                            this.triggerCallback('warning', {
                                type: 'network',
                                level: 'warning',
                                resource: entry.name,
                                responseTime,
                                message: `リソースの読み込みが遅いです: ${entry.name} (${Math.round(responseTime)}ms)`
                            });
                        }
                    });
                });
                resourceObserver.observe({ entryTypes: ['resource'] });
            } catch (error) {
                console.warn('Resource observer not supported:', error);
            }
        }
    }
    
    /**
     * 平均応答時間更新
     */
    updateAverageResponseTime(newResponseTime) {
        const count = this.metrics.network.requestCount;
        const current = this.metrics.network.averageResponseTime;
        this.metrics.network.averageResponseTime = (current * (count - 1) + newResponseTime) / count;
    }
    
    /**
     * メトリクス取得
     */
    getMetrics() {
        return JSON.parse(JSON.stringify(this.metrics));
    }
    
    /**
     * 特定メトリクスの取得
     */
    getMetric(category, key = null) {
        if (key) {
            return this.metrics[category]?.[key];
        }
        return this.metrics[category];
    }
    
    /**
     * しきい値設定
     */
    setThreshold(type, value) {
        if (this.thresholds.hasOwnProperty(type)) {
            this.thresholds[type] = value;
        }
    }
    
    /**
     * しきい値取得
     */
    getThresholds() {
        return { ...this.thresholds };
    }
    
    /**
     * コールバック登録
     */
    onWarning(callback) {
        return this.registerCallback('warning', callback);
    }
    
    onMetricsUpdate(callback) {
        return this.registerCallback('update', callback);
    }
    
    registerCallback(event, callback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        
        const callbacks = this.callbacks.get(event);
        callbacks.push(callback);
        
        // アンサブスクライブ関数を返す
        return () => {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        };
    }
    
    /**
     * コールバック実行
     */
    triggerCallback(event, data) {
        const callbacks = this.callbacks.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Performance monitor callback error:', error);
                }
            });
        }
    }
    
    /**
     * パフォーマンス分析
     */
    analyze() {
        const analysis = {
            overall: 'good',
            issues: [],
            recommendations: []
        };
        
        // メモリ分析
        if (this.metrics.memory.current > this.thresholds.memoryWarning) {
            analysis.overall = 'warning';
            analysis.issues.push('High memory usage');
            analysis.recommendations.push('Consider cleaning up unused objects or reducing cache size');
        }
        
        // DOM 分析
        if (this.metrics.resources.domNodes > this.thresholds.domNodesWarning) {
            analysis.overall = 'warning';
            analysis.issues.push('Too many DOM nodes');
            analysis.recommendations.push('Consider virtual scrolling or DOM optimization');
        }
        
        // ネットワーク分析
        if (this.metrics.network.averageResponseTime > this.thresholds.responseTimeWarning) {
            analysis.overall = 'warning';
            analysis.issues.push('Slow network responses');
            analysis.recommendations.push('Optimize API calls or implement caching');
        }
        
        return analysis;
    }
    
    /**
     * レポート生成
     */
    generateReport() {
        const now = new Date();
        
        return {
            timestamp: now.toISOString(),
            metrics: this.getMetrics(),
            analysis: this.analyze(),
            thresholds: this.getThresholds(),
            monitoring: {
                isActive: this.isMonitoring,
                interval: this.intervalMs,
                duration: this.isMonitoring ? Date.now() - this.startTime : 0
            }
        };
    }
    
    /**
     * メトリクスリセット
     */
    reset() {
        this.metrics = {
            memory: {
                current: 0,
                peak: 0,
                history: []
            },
            timing: {
                loadTime: 0,
                renderTime: 0,
                lastUpdateTime: 0
            },
            resources: {
                domNodes: 0,
                eventListeners: 0,
                components: 0
            },
            network: {
                requestCount: 0,
                totalDataReceived: 0,
                averageResponseTime: 0
            }
        };
        
        console.log('📊 Performance metrics reset');
    }
}

// シングルトンインスタンス
const performanceMonitor = new PerformanceMonitor();

export default PerformanceMonitor;
export { performanceMonitor };