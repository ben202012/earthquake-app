/**
 * 中央イベントバス - アプリケーション全体のイベント管理
 * KyoshinEewViewerIngenのイベント駆動アーキテクチャを参考
 */
class EventBus {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Map();
    }

    static getInstance() {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    /**
     * イベントを購読
     * @param {string} event - イベント名
     * @param {Function} callback - コールバック関数
     * @param {Object} context - thisコンテキスト
     * @returns {Function} unsubscribe function
     */
    subscribe(event, callback, context = null) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        
        const subscription = { callback, context, id: Date.now() + Math.random() };
        this.events.get(event).push(subscription);
        
        // unsubscribe関数を返す
        return () => {
            const eventListeners = this.events.get(event);
            if (eventListeners) {
                const index = eventListeners.findIndex(sub => sub.id === subscription.id);
                if (index !== -1) {
                    eventListeners.splice(index, 1);
                }
            }
        };
    }

    /**
     * 一度だけ実行されるイベント購読
     * @param {string} event - イベント名
     * @param {Function} callback - コールバック関数
     * @param {Object} context - thisコンテキスト
     */
    once(event, callback, context = null) {
        const unsubscribe = this.subscribe(event, (...args) => {
            callback.call(context, ...args);
            unsubscribe();
        }, context);
        return unsubscribe;
    }

    /**
     * イベントを発行
     * @param {string} event - イベント名
     * @param {*} data - 送信データ
     */
    publish(event, data) {
        if (this.events.has(event)) {
            // 購読者のコピーを作成（実行中の変更を避けるため）
            const listeners = [...this.events.get(event)];
            
            listeners.forEach(({ callback, context }) => {
                try {
                    callback.call(context, data);
                } catch (error) {
                    console.error(`Error in event listener for "${event}":`, error);
                }
            });
        }
    }

    /**
     * すべてのイベントリスナーをクリア
     * @param {string} event - 特定のイベント（オプション）
     */
    clear(event = null) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }

    /**
     * デバッグ用：登録されているイベントの一覧
     */
    getEventList() {
        const eventList = {};
        this.events.forEach((listeners, event) => {
            eventList[event] = listeners.length;
        });
        return eventList;
    }
}

// シングルトンインスタンス
const eventBus = EventBus.getInstance();

export default EventBus;
export { eventBus };