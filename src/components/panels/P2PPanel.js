/**
 * P2P地震情報パネルコンポーネント
 * KyoshinEewViewerIngenのCustomControlsパターンを採用
 */
import BaseComponent from '../../core/BaseComponent.js';
import Earthquake from '../../models/Earthquake.js';

class P2PPanel extends BaseComponent {
    get defaultOptions() {
        return {
            ...super.defaultOptions,
            autoUpdate: true,
            updateInterval: 5000,
            showEEWStatus: true,
            showDashboard: true,
            showActivityFeed: true,
            maxFeedItems: 10,
            enableAnimations: true
        };
    }

    constructor(container, options = {}) {
        super(container, options);
        
        // パネル状態
        this.connectionStatus = 'disconnected';
        this.lastUpdate = null;
        this.updateTimer = null;
        this.realtimeTimer = null;
        
        // データ
        this.dashboardStats = {
            todayCount: 0,
            weekCount: 0,
            maxIntensity: '-',
            activeRegions: '-',
            lastActivity: null,
            responseTime: 0,
            dataPackets: 0
        };
        
        this.activityFeed = [];
        this.eewStatus = {
            isActive: false,
            message: '発信なし',
            lastEEW: null
        };
        
        this.startTime = new Date();
    }

    async render() {
        const template = `
            <div class="p2p-panel" data-theme="${this.options.theme}">
                <!-- パネルヘッダー -->
                <div class="panel-header">
                    <div class="panel-title">
                        <h2>P2P地震情報</h2>
                        <span class="realtime-badge ${this.options.enableAnimations ? 'animated' : ''}">LIVE</span>
                    </div>
                    <div class="monitoring-status" id="monitoring-status-${this.id}">
                        <div class="pulse-indicator ${this.connectionStatus}"></div>
                        <span class="status-text">監視中</span>
                    </div>
                </div>

                <!-- 緊急地震速報ステータス -->
                <div class="eew-status-container ${this.options.showEEWStatus ? '' : 'hidden'}">
                    <div class="eew-status" id="eew-status-${this.id}">
                        <div class="eew-indicator">
                            <div class="eew-icon ${this.options.enableAnimations ? 'sparkle' : ''}">⚡</div>
                            <div class="eew-text">
                                <span class="eew-title">緊急地震速報</span>
                                <span class="eew-message" id="eew-message-${this.id}">${this.eewStatus.message}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 日本列島活動状況ダッシュボード -->
                <div class="dashboard-container ${this.options.showDashboard ? '' : 'hidden'}">
                    <div class="japan-status-dashboard" id="dashboard-${this.id}">
                        <div class="dashboard-title">🗾 日本列島地震活動状況</div>
                        
                        <!-- リアルタイム時計とカウンター -->
                        <div class="realtime-info">
                            <div class="realtime-clock">
                                <div class="clock-display" id="realtime-clock-${this.id}">--:--:--</div>
                                <div class="clock-label">現在時刻</div>
                            </div>
                            <div class="uptime-counter">
                                <div class="uptime-display" id="uptime-counter-${this.id}">00:00:00</div>
                                <div class="uptime-label">監視時間</div>
                            </div>
                        </div>

                        <!-- データメトリクス -->
                        <div class="metrics-row">
                            <div class="metric-item">
                                <div class="metric-value pulse" id="response-time-${this.id}">0ms</div>
                                <div class="metric-label">応答時間</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-value" id="last-update-${this.id}">未取得</div>
                                <div class="metric-label">最終更新</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-value counter-animation" id="data-packets-${this.id}">0</div>
                                <div class="metric-label">受信データ</div>
                            </div>
                        </div>
                        
                        <!-- 統計グリッド -->
                        <div class="stats-grid">
                            <div class="stat-item">
                                <div class="stat-value counter-animation" id="today-count-${this.id}">0</div>
                                <div class="stat-label">今日の地震</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value counter-animation" id="week-count-${this.id}">0</div>
                                <div class="stat-label">今週の地震</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value pulse" id="max-intensity-${this.id}">-</div>
                                <div class="stat-label">最大震度</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" id="active-regions-${this.id}">-</div>
                                <div class="stat-label">活発地域</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- フルスクリーンマップボタン -->
                    <div class="fullscreen-map-button-container">
                        <button class="fullscreen-map-button" id="fullscreen-map-btn-${this.id}">
                            🗺️ QUAKE.ONE風 詳細マップ
                        </button>
                    </div>
                </div>

                <!-- リアルタイム活動フィード -->
                <div class="activity-feed-container ${this.options.showActivityFeed ? '' : 'hidden'}">
                    <div class="activity-feed" id="activity-feed-${this.id}">
                        <div class="feed-header">
                            <h3>📡 リアルタイム活動フィード</h3>
                            <div class="feed-controls">
                                <button class="feed-control-btn" id="feed-clear-${this.id}" title="フィードをクリア">🗑️</button>
                                <button class="feed-control-btn" id="feed-pause-${this.id}" title="フィードを一時停止">⏸️</button>
                            </div>
                        </div>
                        <div class="feed-content" id="feed-content-${this.id}">
                            <div class="feed-item system">
                                <div class="feed-icon">🟢</div>
                                <div class="feed-text">地震監視システム開始</div>
                                <div class="feed-time">${this.formatTime(new Date())}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.element = this.createFromTemplate(template);
        this.container.appendChild(this.element);

        // DOM要素の参照を保存
        this.cacheElements();
    }

    cacheElements() {
        this.elements = {
            monitoringStatus: document.getElementById(`monitoring-status-${this.id}`),
            eewStatus: document.getElementById(`eew-status-${this.id}`),
            eewMessage: document.getElementById(`eew-message-${this.id}`),
            realtimeClock: document.getElementById(`realtime-clock-${this.id}`),
            uptimeCounter: document.getElementById(`uptime-counter-${this.id}`),
            responseTime: document.getElementById(`response-time-${this.id}`),
            lastUpdate: document.getElementById(`last-update-${this.id}`),
            dataPackets: document.getElementById(`data-packets-${this.id}`),
            todayCount: document.getElementById(`today-count-${this.id}`),
            weekCount: document.getElementById(`week-count-${this.id}`),
            maxIntensity: document.getElementById(`max-intensity-${this.id}`),
            activeRegions: document.getElementById(`active-regions-${this.id}`),
            fullscreenMapBtn: document.getElementById(`fullscreen-map-btn-${this.id}`),
            feedContent: document.getElementById(`feed-content-${this.id}`),
            feedClear: document.getElementById(`feed-clear-${this.id}`),
            feedPause: document.getElementById(`feed-pause-${this.id}`)
        };
    }

    async setupEventListeners() {
        await super.setupEventListeners();

        // 地震データイベント
        this.subscribeToEvent('earthquake.detected', this.handleEarthquakeDetected.bind(this));
        this.subscribeToEvent('earthquake.eew', this.handleEEW.bind(this));
        this.subscribeToEvent('api.connected', this.handleAPIConnected.bind(this));
        this.subscribeToEvent('api.disconnected', this.handleAPIDisconnected.bind(this));
        this.subscribeToEvent('api.data.received', this.handleDataReceived.bind(this));

        // ボタンイベント
        this.addEventListener(this.elements.fullscreenMapBtn, 'click', this.showFullscreenMap);
        this.addEventListener(this.elements.feedClear, 'click', this.clearActivityFeed);
        this.addEventListener(this.elements.feedPause, 'click', this.toggleFeedPause);

        // 自動更新開始
        if (this.options.autoUpdate) {
            this.startAutoUpdate();
        }

        // リアルタイム時計開始
        this.startRealtimeClock();
    }

    startAutoUpdate() {
        this.updateTimer = setInterval(() => {
            this.updateDashboard();
        }, this.options.updateInterval);
    }

    startRealtimeClock() {
        this.realtimeTimer = setInterval(() => {
            this.updateRealtimeClock();
            this.updateUptimeCounter();
        }, 1000);
    }

    updateRealtimeClock() {
        if (this.elements.realtimeClock) {
            const now = new Date();
            const timeString = now.toLocaleTimeString('ja-JP', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            this.elements.realtimeClock.textContent = timeString;
        }
    }

    updateUptimeCounter() {
        if (this.elements.uptimeCounter) {
            const uptime = Date.now() - this.startTime.getTime();
            const hours = Math.floor(uptime / (1000 * 60 * 60));
            const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
            
            this.elements.uptimeCounter.textContent = 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    updateDashboard() {
        if (this.elements.responseTime) {
            this.elements.responseTime.textContent = `${this.dashboardStats.responseTime}ms`;
        }
        
        if (this.elements.lastUpdate && this.lastUpdate) {
            this.elements.lastUpdate.textContent = this.formatRelativeTime(this.lastUpdate);
        }
        
        if (this.elements.dataPackets) {
            this.elements.dataPackets.textContent = this.dashboardStats.dataPackets.toString();
        }
        
        if (this.elements.todayCount) {
            this.elements.todayCount.textContent = this.dashboardStats.todayCount.toString();
        }
        
        if (this.elements.weekCount) {
            this.elements.weekCount.textContent = this.dashboardStats.weekCount.toString();
        }
        
        if (this.elements.maxIntensity) {
            this.elements.maxIntensity.textContent = this.dashboardStats.maxIntensity;
        }
        
        if (this.elements.activeRegions) {
            this.elements.activeRegions.textContent = this.dashboardStats.activeRegions;
        }
    }

    handleEarthquakeDetected(earthquake) {
        // 統計更新
        this.updateStatistics(earthquake);
        
        // アクティビティフィード追加
        this.addActivityFeedItem({
            type: 'earthquake',
            icon: '🔴',
            text: `地震発生: ${earthquake.location} M${earthquake.magnitude || '?'} 震度${earthquake.maxIntensity || '?'}`,
            time: new Date(),
            data: earthquake
        });
        
        // アニメーション効果
        if (this.options.enableAnimations) {
            this.triggerUpdateAnimation();
        }
    }

    handleEEW(eewData) {
        this.eewStatus.isActive = true;
        this.eewStatus.message = eewData.message || '緊急地震速報発信中';
        this.eewStatus.lastEEW = new Date();
        
        this.updateEEWDisplay();
        
        this.addActivityFeedItem({
            type: 'eew',
            icon: '🚨',
            text: '緊急地震速報が発信されました',
            time: new Date(),
            data: eewData
        });
    }

    handleAPIConnected(source) {
        this.connectionStatus = 'connected';
        this.updateConnectionStatus();
        
        this.addActivityFeedItem({
            type: 'system',
            icon: '🟢',
            text: `${source} API接続成功`,
            time: new Date()
        });
    }

    handleAPIDisconnected(source) {
        this.connectionStatus = 'disconnected';
        this.updateConnectionStatus();
        
        this.addActivityFeedItem({
            type: 'system',
            icon: '🔴',
            text: `${source} API接続失敗`,
            time: new Date()
        });
    }

    handleDataReceived(data) {
        this.dashboardStats.dataPackets++;
        this.dashboardStats.responseTime = data.responseTime || 0;
        this.lastUpdate = new Date();
        
        this.updateDashboard();
    }

    updateConnectionStatus() {
        if (this.elements.monitoringStatus) {
            const pulseIndicator = this.elements.monitoringStatus.querySelector('.pulse-indicator');
            const statusText = this.elements.monitoringStatus.querySelector('.status-text');
            
            if (pulseIndicator) {
                pulseIndicator.className = `pulse-indicator ${this.connectionStatus}`;
            }
            
            if (statusText) {
                statusText.textContent = this.connectionStatus === 'connected' ? '監視中' : '接続中...';
            }
        }
    }

    updateEEWDisplay() {
        if (this.elements.eewMessage) {
            this.elements.eewMessage.textContent = this.eewStatus.message;
        }
        
        if (this.elements.eewStatus) {
            this.elements.eewStatus.classList.toggle('active', this.eewStatus.isActive);
        }
    }

    updateStatistics(earthquake) {
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        // 今日の地震かチェック
        if (earthquake.timestamp.toDateString() === today.toDateString()) {
            this.dashboardStats.todayCount++;
        }
        
        // 今週の地震かチェック
        if (earthquake.timestamp >= weekAgo) {
            this.dashboardStats.weekCount++;
        }
        
        // 最大震度更新
        if (earthquake.maxIntensity) {
            const currentMax = this.getNumericIntensity(this.dashboardStats.maxIntensity);
            const newIntensity = earthquake.getNumericIntensity(earthquake.maxIntensity);
            
            if (this.dashboardStats.maxIntensity === '-' || newIntensity > currentMax) {
                this.dashboardStats.maxIntensity = earthquake.maxIntensity;
            }
        }
        
        this.dashboardStats.lastActivity = new Date();
    }

    getNumericIntensity(intensity) {
        if (intensity === '-') return 0;
        const intensityMap = {
            '1': 1, '2': 2, '3': 3, '4': 4,
            '5弱': 4.5, '5強': 5.5, '6弱': 5.5, '6強': 6.5, '7': 7
        };
        return intensityMap[intensity] || 0;
    }

    addActivityFeedItem(item) {
        this.activityFeed.unshift(item);
        
        // 最大件数制限
        if (this.activityFeed.length > this.options.maxFeedItems) {
            this.activityFeed = this.activityFeed.slice(0, this.options.maxFeedItems);
        }
        
        this.renderActivityFeed();
    }

    renderActivityFeed() {
        if (!this.elements.feedContent) return;
        
        const feedHTML = this.activityFeed.map(item => `
            <div class="feed-item ${item.type}" data-time="${item.time.getTime()}">
                <div class="feed-icon">${item.icon}</div>
                <div class="feed-text">${item.text}</div>
                <div class="feed-time">${this.formatTime(item.time)}</div>
            </div>
        `).join('');
        
        this.elements.feedContent.innerHTML = feedHTML;
        
        // 新しいアイテムをハイライト
        if (this.options.enableAnimations) {
            const newItem = this.elements.feedContent.firstElementChild;
            if (newItem) {
                newItem.classList.add('new-item');
                setTimeout(() => newItem.classList.remove('new-item'), 2000);
            }
        }
    }

    clearActivityFeed() {
        this.activityFeed = [];
        this.renderActivityFeed();
        
        this.addActivityFeedItem({
            type: 'system',
            icon: '🗑️',
            text: 'アクティビティフィードをクリアしました',
            time: new Date()
        });
    }

    toggleFeedPause() {
        // フィード一時停止機能の実装
        this.feedPaused = !this.feedPaused;
        const button = this.elements.feedPause;
        
        if (button) {
            button.textContent = this.feedPaused ? '▶️' : '⏸️';
            button.title = this.feedPaused ? 'フィードを再開' : 'フィードを一時停止';
        }
    }

    showFullscreenMap() {
        this.eventBus.publish('map.fullscreen.request', {
            source: 'p2p-panel',
            earthquakeData: this.activityFeed.find(item => item.type === 'earthquake')?.data
        });
    }

    triggerUpdateAnimation() {
        if (this.element) {
            this.element.classList.add('updating');
            setTimeout(() => {
                this.element.classList.remove('updating');
            }, 1000);
        }
    }

    formatTime(date) {
        return date.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    formatRelativeTime(date) {
        const diff = Date.now() - date.getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        
        if (minutes < 1) return 'たった今';
        if (minutes < 60) return `${minutes}分前`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}時間前`;
        
        const days = Math.floor(hours / 24);
        return `${days}日前`;
    }

    // 公開メソッド
    updateEarthquakeData(earthquakes) {
        earthquakes.forEach(earthquake => {
            this.handleEarthquakeDetected(earthquake);
        });
    }

    setConnectionStatus(status) {
        this.connectionStatus = status;
        this.updateConnectionStatus();
    }

    getStatistics() {
        return { ...this.dashboardStats };
    }

    getActivityFeed() {
        return [...this.activityFeed];
    }

    // オーバーライド
    beforeDestroy() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }
        
        if (this.realtimeTimer) {
            clearInterval(this.realtimeTimer);
        }
    }
}

export default P2PPanel;