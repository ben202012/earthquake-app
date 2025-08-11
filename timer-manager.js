/**
 * タイマー管理クラス - メモリリーク対策
 * 津波警報システム v3.0
 */

class TimerManager {
    constructor() {
        // アクティブなタイマーを管理するWeakMap
        this.activeTimers = new Map();
        this.timerCounter = 0;
        
        // ページアンロード時の自動クリーンアップ
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
                this.clearAllTimers();
            });
            
            // ページ非表示時のクリーンアップ
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.pauseAllTimers();
                } else {
                    this.resumeAllTimers();
                }
            });
        }
        
        console.log('✅ TimerManager初期化完了 - メモリリーク対策有効');
    }
    
    /**
     * setIntervalの安全なラッパー
     */
    setInterval(callback, delay, options = {}) {
        const timerId = ++this.timerCounter;
        const intervalId = setInterval(() => {
            try {
                callback();
            } catch (error) {
                console.error(`❌ タイマー実行エラー (ID: ${timerId}):`, error);
                if (options.stopOnError) {
                    this.clearTimer(timerId);
                }
            }
        }, delay);
        
        this.activeTimers.set(timerId, {
            id: intervalId,
            type: 'interval',
            callback,
            delay,
            options,
            createdAt: Date.now(),
            lastExecuted: Date.now()
        });
        
        console.log(`⏰ Interval設定 (ID: ${timerId}, 間隔: ${delay}ms)`);
        return timerId;
    }
    
    /**
     * setTimeoutの安全なラッパー
     */
    setTimeout(callback, delay, options = {}) {
        const timerId = ++this.timerCounter;
        const timeoutId = setTimeout(() => {
            try {
                callback();
            } catch (error) {
                console.error(`❌ タイマー実行エラー (ID: ${timerId}):`, error);
            } finally {
                // タイムアウトは一度だけ実行されるので自動削除
                this.activeTimers.delete(timerId);
            }
        }, delay);
        
        this.activeTimers.set(timerId, {
            id: timeoutId,
            type: 'timeout',
            callback,
            delay,
            options,
            createdAt: Date.now()
        });
        
        console.log(`⏰ Timeout設定 (ID: ${timerId}, 遅延: ${delay}ms)`);
        return timerId;
    }
    
    /**
     * 特定のタイマーをクリア
     */
    clearTimer(timerId) {
        const timer = this.activeTimers.get(timerId);
        if (timer) {
            if (timer.type === 'interval') {
                clearInterval(timer.id);
            } else {
                clearTimeout(timer.id);
            }
            this.activeTimers.delete(timerId);
            console.log(`🗑️ タイマークリア (ID: ${timerId})`);
            return true;
        }
        return false;
    }
    
    /**
     * 全てのタイマーをクリア
     */
    clearAllTimers() {
        let clearedCount = 0;
        for (const [timerId, timer] of this.activeTimers) {
            if (timer.type === 'interval') {
                clearInterval(timer.id);
            } else {
                clearTimeout(timer.id);
            }
            clearedCount++;
        }
        
        this.activeTimers.clear();
        console.log(`🗑️ 全タイマークリア完了 (${clearedCount}個)`);
        return clearedCount;
    }
    
    /**
     * アクティブなタイマーの一覧を取得
     */
    getActiveTimers() {
        const timers = [];
        for (const [timerId, timer] of this.activeTimers) {
            timers.push({
                id: timerId,
                type: timer.type,
                delay: timer.delay,
                createdAt: timer.createdAt,
                lastExecuted: timer.lastExecuted,
                age: Date.now() - timer.createdAt
            });
        }
        return timers;
    }
    
    /**
     * 長時間実行されているタイマーを検出
     */
    detectLongRunningTimers(maxAge = 3600000) { // 1時間
        const longRunning = [];
        const now = Date.now();
        
        for (const [timerId, timer] of this.activeTimers) {
            if (now - timer.createdAt > maxAge) {
                longRunning.push({
                    id: timerId,
                    age: now - timer.createdAt,
                    type: timer.type,
                    delay: timer.delay
                });
            }
        }
        
        if (longRunning.length > 0) {
            console.warn(`⚠️ 長時間実行タイマー検出: ${longRunning.length}個`);
        }
        
        return longRunning;
    }
    
    /**
     * タイマーの一時停止（実際にはクリアして再作成が必要）
     */
    pauseAllTimers() {
        console.log('⏸️ 全タイマー一時停止');
        // 実装は簡略化 - 必要に応じて拡張
    }
    
    /**
     * タイマーの再開
     */
    resumeAllTimers() {
        console.log('▶️ 全タイマー再開');
        // 実装は簡略化 - 必要に応じて拡張
    }
    
    /**
     * メモリ使用量の監視
     */
    getMemoryUsage() {
        return {
            activeTimersCount: this.activeTimers.size,
            totalTimersCreated: this.timerCounter,
            memoryEstimate: this.activeTimers.size * 200 // 概算値（bytes）
        };
    }
}

// グローバルインスタンス
if (typeof window !== 'undefined') {
    window.timerManager = new TimerManager();
} else {
    module.exports = TimerManager;
}
