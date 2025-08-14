/**
 * 統一エラーハンドラークラス
 * 津波警報システム v3.0
 */

class ErrorHandler {
    constructor() {
        this.errorLevels = {
            INFO: { level: 0, color: '#00d4aa', icon: 'ℹ️' },
            WARN: { level: 1, color: '#ffd700', icon: '⚠️' },
            ERROR: { level: 2, color: '#ff6b6b', icon: '❌' },
            FATAL: { level: 3, color: '#dc3545', icon: '🚨' }
        };
        
        this.errorLog = [];
        this.maxLogEntries = 1000;
        this.notificationQueue = [];
        this.isProcessingQueue = false;
        
        // グローバルエラーハンドラーを設定
        this.setupGlobalHandlers();
        
        console.log('✅ ErrorHandler初期化完了 - 統一エラー処理有効');
    }
    
    /**
     * グローバルエラーハンドラーの設定
     */
    setupGlobalHandlers() {
        if (typeof window !== 'undefined') {
            // JavaScript実行時エラー
            window.addEventListener('error', (event) => {
                this.handleError('FATAL', 'JavaScript実行エラー', {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    error: event.error
                });
            });
            
            // Promise拒否エラー
            window.addEventListener('unhandledrejection', (event) => {
                this.handleError('ERROR', 'Promise拒否エラー', {
                    reason: event.reason,
                    promise: event.promise
                });
            });
        }
    }
    
    /**
     * エラーハンドリングのメインメソッド
     */
    handleError(level, message, details = {}, context = {}) {
        const timestamp = new Date();
        const errorEntry = {
            id: Date.now() + Math.random(),
            level,
            message,
            details,
            context,
            timestamp,
            stack: details.error?.stack || new Error().stack
        };
        
        // ログに記録
        this.addToLog(errorEntry);
        
        // コンソール出力
        this.logToConsole(errorEntry);
        
        // ユーザー通知（必要な場合）
        if (this.shouldNotifyUser(level)) {
            this.queueUserNotification(errorEntry);
        }
        
        // 統計情報更新
        this.updateErrorStatistics(errorEntry);
        
        return errorEntry;
    }
    
    /**
     * ログへの追加
     */
    addToLog(errorEntry) {
        this.errorLog.unshift(errorEntry);
        
        // ログサイズ制限
        if (this.errorLog.length > this.maxLogEntries) {
            this.errorLog = this.errorLog.slice(0, this.maxLogEntries);
        }
        
        // 重要なエラーはlocalStorageにも保存
        if (errorEntry.level === 'FATAL' || errorEntry.level === 'ERROR') {
            this.saveToLocalStorage(errorEntry);
        }
    }
    
    /**
     * コンソール出力
     */
    logToConsole(errorEntry) {
        const { level, message, details, timestamp } = errorEntry;
        const levelInfo = this.errorLevels[level];
        const timeStr = timestamp.toISOString().substr(11, 12);
        
        const logMessage = `${levelInfo.icon} [${level}] ${timeStr} ${message}`;
        
        switch (level) {
            case 'INFO':
                console.info(logMessage, details);
                break;
            case 'WARN':
                console.warn(logMessage, details);
                break;
            case 'ERROR':
                console.error(logMessage, details);
                break;
            case 'FATAL':
                console.error(`🚨 FATAL: ${logMessage}`, details);
                break;
        }
    }
    
    /**
     * ユーザー通知が必要かチェック
     */
    shouldNotifyUser(level) {
        return ['ERROR', 'FATAL'].includes(level);
    }
    
    /**
     * ユーザー通知をキューに追加
     */
    queueUserNotification(errorEntry) {
        this.notificationQueue.push(errorEntry);
        
        if (!this.isProcessingQueue) {
            this.processNotificationQueue();
        }
    }
    
    /**
     * 通知キューの処理
     */
    async processNotificationQueue() {
        this.isProcessingQueue = true;
        
        while (this.notificationQueue.length > 0) {
            const errorEntry = this.notificationQueue.shift();
            await this.showUserNotification(errorEntry);
            
            // 連続通知を避けるため少し待機
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        this.isProcessingQueue = false;
    }
    
    /**
     * ユーザー通知の表示
     */
    async showUserNotification(errorEntry) {
        const { level, message, timestamp } = errorEntry;
        const levelInfo = this.errorLevels[level];
        
        // システム通知（可能な場合）
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification(`${levelInfo.icon} システムエラー`, {
                    body: message,
                    icon: '/favicon.ico',
                    tag: 'system-error'
                });
            }
        }
        
        // UI通知（エラー表示エリアがある場合）
        this.showInUINotification(errorEntry);
    }
    
    /**
     * UI内通知の表示
     */
    showInUINotification(errorEntry) {
        const { level, message, timestamp } = errorEntry;
        const levelInfo = this.errorLevels[level];
        
        // 通知エリアを探す
        let notificationArea = document.getElementById('error-notification-area');
        
        if (!notificationArea) {
            // 通知エリアが存在しない場合は作成
            notificationArea = document.createElement('div');
            notificationArea.id = 'error-notification-area';
            notificationArea.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
            `;
            document.body.appendChild(notificationArea);
        }
        
        // 通知要素を作成
        const notification = document.createElement('div');
        notification.style.cssText = `
            background: ${levelInfo.color};
            color: white;
            padding: 12px 16px;
            margin-bottom: 8px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            font-size: 14px;
            animation: slideIn 0.3s ease-out;
        `;
        
        notification.innerHTML = `
            <div style="font-weight: bold;">${levelInfo.icon} ${level}</div>
            <div style="margin-top: 4px;">${this.escapeHtml(message)}</div>
            <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">
                ${timestamp.toLocaleTimeString()}
            </div>
        `;
        
        // クリックで閉じる
        notification.addEventListener('click', () => {
            notification.remove();
        });
        
        notificationArea.appendChild(notification);
        
        // 自動削除（重要度に応じて時間調整）
        const autoRemoveDelay = level === 'FATAL' ? 10000 : level === 'ERROR' ? 7000 : 5000;
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, autoRemoveDelay);
    }
    
    /**
     * HTMLエスケープ
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * LocalStorageへの保存
     */
    saveToLocalStorage(errorEntry) {
        try {
            const key = `error_${errorEntry.level}_${errorEntry.id}`;
            const data = {
                ...errorEntry,
                stack: errorEntry.stack ? errorEntry.stack.substring(0, 1000) : null // スタックトレースを短縮
            };
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.warn('⚠️ エラーログのlocalStorage保存に失敗:', error);
        }
    }
    
    /**
     * エラー統計の更新
     */
    updateErrorStatistics(errorEntry) {
        if (!this.statistics) {
            this.statistics = {
                total: 0,
                byLevel: { INFO: 0, WARN: 0, ERROR: 0, FATAL: 0 },
                byHour: {},
                lastReset: Date.now()
            };
        }
        
        this.statistics.total++;
        this.statistics.byLevel[errorEntry.level]++;
        
        const hour = new Date().getHours();
        this.statistics.byHour[hour] = (this.statistics.byHour[hour] || 0) + 1;
    }
    
    /**
     * エラーログの取得
     */
    getErrorLog(filter = {}) {
        let filteredLog = [...this.errorLog];
        
        if (filter.level) {
            filteredLog = filteredLog.filter(entry => entry.level === filter.level);
        }
        
        if (filter.since) {
            filteredLog = filteredLog.filter(entry => entry.timestamp >= filter.since);
        }
        
        if (filter.limit) {
            filteredLog = filteredLog.slice(0, filter.limit);
        }
        
        return filteredLog;
    }
    
    /**
     * エラー統計の取得
     */
    getStatistics() {
        return { ...this.statistics };
    }
    
    /**
     * エラーログのクリア
     */
    clearErrorLog() {
        this.errorLog = [];
        this.statistics = null;
        console.log('🗑️ エラーログをクリアしました');
    }
    
    /**
     * 便利メソッド: try-catchのラッパー
     */
    async safeExecute(operation, context = {}, errorLevel = 'ERROR') {
        try {
            return await operation();
        } catch (error) {
            this.handleError(errorLevel, '操作実行エラー', { error }, context);
            throw error; // 必要に応じて再スロー
        }
    }
    
    /**
     * 便利メソッド: 情報ログ
     */
    info(message, details = {}, context = {}) {
        return this.handleError('INFO', message, details, context);
    }
    
    /**
     * 便利メソッド: 警告ログ
     */
    warn(message, details = {}, context = {}) {
        return this.handleError('WARN', message, details, context);
    }
    
    /**
     * 便利メソッド: エラーログ
     */
    error(message, details = {}, context = {}) {
        return this.handleError('ERROR', message, details, context);
    }
    
    /**
     * 便利メソッド: 致命的エラーログ
     */
    fatal(message, details = {}, context = {}) {
        return this.handleError('FATAL', message, details, context);
    }
}

const errorHandler = new ErrorHandler();
export { errorHandler };
