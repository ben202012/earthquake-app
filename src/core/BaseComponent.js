/**
 * 基底コンポーネントクラス - すべてのUIコンポーネントの基底
 * KyoshinEewViewerIngenのCustomControlsアプローチを参考
 */
import { eventBus } from './EventBus.js';

class BaseComponent {
    constructor(container, options = {}) {
        // 基本プロパティ
        this.container = container;
        this.options = { ...this.defaultOptions, ...options };
        this.eventBus = eventBus;
        this.element = null;
        this.isInitialized = false;
        this.isDestroyed = false;
        
        // イベントリスナーの管理
        this.eventUnsubscribers = [];
        this.domEventListeners = [];
        
        // ユニークID生成
        this.id = this.generateId();
        
        // パフォーマンス監視
        this.performanceMarks = new Map();
        
        this.init();
    }

    /**
     * デフォルトオプション（サブクラスでオーバーライド）
     */
    get defaultOptions() {
        return {
            theme: 'dark',
            animated: true,
            debug: false
        };
    }

    /**
     * ユニークID生成
     */
    generateId() {
        return `${this.constructor.name.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 初期化処理
     */
    async init() {
        if (this.isInitialized) {
            console.warn(`Component ${this.id} is already initialized`);
            return;
        }

        try {
            this.startPerformanceMark('init');
            
            // DOMの準備確認
            if (!this.container) {
                throw new Error('Container element is required');
            }

            // 初期化前のフック
            await this.beforeInit();
            
            // メインの初期化処理
            await this.render();
            await this.setupEventListeners();
            await this.loadData();
            
            // 初期化後のフック
            await this.afterInit();
            
            this.isInitialized = true;
            this.endPerformanceMark('init');
            
            // 初期化完了イベント
            this.eventBus.publish('component.initialized', {
                id: this.id,
                type: this.constructor.name,
                element: this.element
            });
            
            if (this.options.debug) {
                console.log(`Component ${this.id} initialized in ${this.getPerformanceTime('init')}ms`);
            }
        } catch (error) {
            console.error(`Failed to initialize component ${this.id}:`, error);
            this.eventBus.publish('component.error', {
                id: this.id,
                type: this.constructor.name,
                error
            });
        }
    }

    /**
     * 初期化前処理（サブクラスでオーバーライド）
     */
    async beforeInit() {
        // サブクラスで実装
    }

    /**
     * 初期化後処理（サブクラスでオーバーライド）
     */
    async afterInit() {
        // サブクラスで実装
    }

    /**
     * DOM要素をレンダリング（サブクラスで実装必須）
     */
    async render() {
        throw new Error('render() method must be implemented by subclass');
    }

    /**
     * イベントリスナーのセットアップ
     */
    async setupEventListeners() {
        // 基本的なコンポーネントイベント
        this.subscribeToEvent('app.theme.changed', this.handleThemeChange.bind(this));
        this.subscribeToEvent('app.settings.updated', this.handleSettingsUpdate.bind(this));
    }

    /**
     * データの読み込み（サブクラスでオーバーライド）
     */
    async loadData() {
        // サブクラスで実装
    }

    /**
     * イベントバス購読のヘルパー
     */
    subscribeToEvent(event, callback) {
        const unsubscriber = this.eventBus.subscribe(event, callback, this);
        this.eventUnsubscribers.push(unsubscriber);
        return unsubscriber;
    }

    /**
     * DOM イベントリスナー追加のヘルパー
     */
    addEventListener(element, event, callback, options = {}) {
        const boundCallback = callback.bind(this);
        element.addEventListener(event, boundCallback, options);
        
        this.domEventListeners.push({
            element,
            event,
            callback: boundCallback,
            options
        });
    }

    /**
     * 要素作成のヘルパー
     */
    createElement(tag, classes = [], attributes = {}) {
        const element = document.createElement(tag);
        
        if (classes.length > 0) {
            element.classList.add(...classes);
        }
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'data') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    element.dataset[dataKey] = dataValue;
                });
            } else {
                element.setAttribute(key, value);
            }
        });
        
        return element;
    }

    /**
     * テンプレートからHTML要素を生成
     */
    createFromTemplate(template, data = {}) {
        // シンプルなテンプレート置換
        let html = template;
        Object.entries(data).forEach(([key, value]) => {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            html = html.replace(regex, value);
        });
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        return tempDiv.children.length === 1 
            ? tempDiv.firstElementChild 
            : tempDiv.children;
    }

    /**
     * コンポーネントの更新
     */
    async update(data = null) {
        if (this.isDestroyed) {
            console.warn(`Cannot update destroyed component ${this.id}`);
            return;
        }

        try {
            this.startPerformanceMark('update');
            
            await this.beforeUpdate(data);
            await this.performUpdate(data);
            await this.afterUpdate(data);
            
            this.endPerformanceMark('update');
            
            this.eventBus.publish('component.updated', {
                id: this.id,
                type: this.constructor.name,
                data
            });
        } catch (error) {
            console.error(`Failed to update component ${this.id}:`, error);
        }
    }

    /**
     * 更新前処理（サブクラスでオーバーライド）
     */
    async beforeUpdate(data) {
        // サブクラスで実装
    }

    /**
     * 実際の更新処理（サブクラスでオーバーライド）
     */
    async performUpdate(data) {
        // サブクラスで実装
    }

    /**
     * 更新後処理（サブクラスでオーバーライド）
     */
    async afterUpdate(data) {
        // サブクラスで実装
    }

    /**
     * 表示/非表示切り替え
     */
    show() {
        if (this.element) {
            this.element.style.display = '';
            this.element.classList.remove('hidden');
            this.eventBus.publish('component.shown', { id: this.id });
        }
    }

    hide() {
        if (this.element) {
            this.element.style.display = 'none';
            this.element.classList.add('hidden');
            this.eventBus.publish('component.hidden', { id: this.id });
        }
    }

    /**
     * テーマ変更ハンドラー
     */
    handleThemeChange(theme) {
        if (this.element) {
            this.element.dataset.theme = theme;
            this.options.theme = theme;
        }
    }

    /**
     * 設定更新ハンドラー
     */
    handleSettingsUpdate(settings) {
        // 必要に応じてサブクラスでオーバーライド
    }

    /**
     * パフォーマンス計測
     */
    startPerformanceMark(operation) {
        const mark = `${this.id}-${operation}-start`;
        performance.mark(mark);
        this.performanceMarks.set(operation, mark);
    }

    endPerformanceMark(operation) {
        const startMark = this.performanceMarks.get(operation);
        if (startMark) {
            const endMark = `${this.id}-${operation}-end`;
            performance.mark(endMark);
            performance.measure(`${this.id}-${operation}`, startMark, endMark);
        }
    }

    getPerformanceTime(operation) {
        const measures = performance.getEntriesByName(`${this.id}-${operation}`);
        return measures.length > 0 ? Math.round(measures[0].duration) : 0;
    }

    /**
     * リサイズハンドラー
     */
    handleResize() {
        // サブクラスでオーバーライド
    }

    /**
     * エラーハンドリング
     */
    handleError(error, context = '') {
        console.error(`Error in component ${this.id} ${context}:`, error);
        this.eventBus.publish('component.error', {
            id: this.id,
            type: this.constructor.name,
            error,
            context
        });
    }

    /**
     * デバッグ情報を取得
     */
    getDebugInfo() {
        return {
            id: this.id,
            type: this.constructor.name,
            isInitialized: this.isInitialized,
            isDestroyed: this.isDestroyed,
            options: this.options,
            eventListeners: this.eventUnsubscribers.length,
            domEventListeners: this.domEventListeners.length,
            performanceMarks: Object.fromEntries(this.performanceMarks)
        };
    }

    /**
     * コンポーネントの破棄
     */
    destroy() {
        if (this.isDestroyed) {
            console.warn(`Component ${this.id} is already destroyed`);
            return;
        }

        try {
            // 破棄前処理
            this.beforeDestroy();
            
            // イベントリスナーの削除
            this.eventUnsubscribers.forEach(unsubscriber => unsubscriber());
            this.eventUnsubscribers = [];
            
            // DOMイベントリスナーの削除
            this.domEventListeners.forEach(({ element, event, callback, options }) => {
                element.removeEventListener(event, callback, options);
            });
            this.domEventListeners = [];
            
            // DOM要素の削除
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
            
            // パフォーマンスマークの削除
            this.performanceMarks.forEach(mark => {
                try {
                    performance.clearMarks(mark);
                } catch (e) {
                    // Ignore errors
                }
            });
            
            // 破棄後処理
            this.afterDestroy();
            
            this.isDestroyed = true;
            
            // 破棄完了イベント
            this.eventBus.publish('component.destroyed', {
                id: this.id,
                type: this.constructor.name
            });
            
            if (this.options.debug) {
                console.log(`Component ${this.id} destroyed`);
            }
        } catch (error) {
            console.error(`Failed to destroy component ${this.id}:`, error);
        }
    }

    /**
     * 破棄前処理（サブクラスでオーバーライド）
     */
    beforeDestroy() {
        // サブクラスで実装
    }

    /**
     * 破棄後処理（サブクラスでオーバーライド）
     */
    afterDestroy() {
        // サブクラスで実装
    }
}

export default BaseComponent;