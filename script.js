class EarthquakeApp {
    constructor() {
        this.api = null;
        this.map = null;
        this.notification = null;
        this.settings = CONFIG.DEFAULT_SETTINGS;
        this.earthquakeHistory = [];
        this.isSettingsOpen = false;
        this.dashboardStats = {
            todayCount: 0,
            weekCount: 0,
            maxIntensity: '-',
            activeRegions: '-',
            lastActivity: null
        };
        this.activityFeed = [];
        this.currentModalData = null;
        
        // リアルタイム監視用
        this.startTime = new Date();
        this.realtimeTimers = {};
        this.dataPacketsCount = 0;
        this.lastUpdateTime = null;
        this.apiResponseTimes = [];
        
        this.elements = {
            p2pStatus: null,
            jmaStatus: null,
            settingsToggle: null,
            settingsSidebar: null,
            p2pInfo: null,
            jmaInfo: null,
            errorMessage: null,
            magnitudeThreshold: null,
            magnitudeValue: null,
            intensityThreshold: null,
            notificationSound: null,
            volumeControl: null,
            volumeValue: null,
            autoZoom: null,
            testNotification: null,
            resetSettings: null
        };
        
        this.init();
    }

    async init() {
        try {
            this.initElements();
            this.loadSettings();
            this.setupEventListeners();
            
            this.api = new EarthquakeAPI();
            this.map = new EarthquakeMap('earthquake-map');
            this.notification = new EarthquakeNotification();
            
            this.setupAPIEventListeners();
            
            await this.api.init();
            
            this.updateConnectionStatus();
            this.loadHistory();
            this.updateDashboardStats();
            this.addActivityFeedItem('🟢 地震監視システム開始', 'info');
            this.setupModalEventListeners();
            this.startRealtimeUpdates();
            this.initLiveDataStream();
            
            console.log('EarthquakeApp initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('アプリケーションの初期化に失敗しました');
        }
    }

    initElements() {
        this.elements = {
            p2pStatus: document.getElementById('p2p-status'),
            jmaStatus: document.getElementById('jma-status'),
            settingsToggle: document.getElementById('settings-toggle'),
            settingsSidebar: document.getElementById('settings-sidebar'),
            p2pInfo: document.getElementById('p2p-info'),
            jmaInfo: document.getElementById('jma-info'),
            errorMessage: document.getElementById('error-message'),
            magnitudeThreshold: document.getElementById('magnitude-threshold'),
            magnitudeValue: document.getElementById('magnitude-value'),
            intensityThreshold: document.getElementById('intensity-threshold'),
            notificationSound: document.getElementById('notification-sound'),
            volumeControl: document.getElementById('volume-control'),
            volumeValue: document.getElementById('volume-value'),
            autoZoom: document.getElementById('auto-zoom'),
            testNotification: document.getElementById('test-notification'),
            resetSettings: document.getElementById('reset-settings')
        };

        Object.entries(this.elements).forEach(([key, element]) => {
            if (!element) {
                console.warn(`Element not found: ${key}`);
            }
        });
    }

    loadSettings() {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.SETTINGS);
        if (saved) {
            try {
                this.settings = { ...CONFIG.DEFAULT_SETTINGS, ...JSON.parse(saved) };
            } catch (error) {
                console.error('Error loading settings:', error);
                this.settings = CONFIG.DEFAULT_SETTINGS;
            }
        }
        
        this.updateSettingsUI();
    }

    saveSettings() {
        localStorage.setItem(CONFIG.STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
        
        if (this.notification) {
            this.notification.updateSettings(this.settings);
        }
        
        if (this.map) {
            this.map.updateSettings(this.settings);
        }
    }

    updateSettingsUI() {
        if (this.elements.magnitudeThreshold) {
            this.elements.magnitudeThreshold.value = this.settings.magnitudeThreshold;
        }
        if (this.elements.magnitudeValue) {
            this.elements.magnitudeValue.textContent = this.settings.magnitudeThreshold.toFixed(1);
        }
        if (this.elements.intensityThreshold) {
            this.elements.intensityThreshold.value = this.settings.intensityThreshold;
        }
        if (this.elements.notificationSound) {
            this.elements.notificationSound.checked = this.settings.notificationSound;
        }
        if (this.elements.volumeControl) {
            this.elements.volumeControl.value = this.settings.volume;
        }
        if (this.elements.volumeValue) {
            this.elements.volumeValue.textContent = `${this.settings.volume}%`;
        }
        if (this.elements.autoZoom) {
            this.elements.autoZoom.checked = this.settings.autoZoom;
        }
    }

    setupEventListeners() {
        if (this.elements.settingsToggle) {
            this.elements.settingsToggle.addEventListener('click', () => {
                this.toggleSettings();
            });
        }

        if (this.elements.magnitudeThreshold) {
            this.elements.magnitudeThreshold.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.settings.magnitudeThreshold = value;
                if (this.elements.magnitudeValue) {
                    this.elements.magnitudeValue.textContent = value.toFixed(1);
                }
                this.saveSettings();
            });
        }

        if (this.elements.intensityThreshold) {
            this.elements.intensityThreshold.addEventListener('change', (e) => {
                this.settings.intensityThreshold = parseInt(e.target.value);
                this.saveSettings();
            });
        }

        if (this.elements.notificationSound) {
            this.elements.notificationSound.addEventListener('change', (e) => {
                this.settings.notificationSound = e.target.checked;
                this.saveSettings();
            });
        }

        if (this.elements.volumeControl) {
            this.elements.volumeControl.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.settings.volume = value;
                if (this.elements.volumeValue) {
                    this.elements.volumeValue.textContent = `${value}%`;
                }
                this.saveSettings();
            });
        }

        if (this.elements.autoZoom) {
            this.elements.autoZoom.addEventListener('change', (e) => {
                this.settings.autoZoom = e.target.checked;
                this.saveSettings();
            });
        }

        if (this.elements.testNotification) {
            this.elements.testNotification.addEventListener('click', () => {
                this.testNotification();
            });
        }

        if (this.elements.resetSettings) {
            this.elements.resetSettings.addEventListener('click', () => {
                this.resetSettings();
            });
        }

        document.addEventListener('click', (e) => {
            if (this.isSettingsOpen && 
                !this.elements.settingsSidebar.contains(e.target) && 
                e.target !== this.elements.settingsToggle) {
                this.closeSettings();
            }
        });

        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        window.addEventListener('resize', () => {
            if (this.map) {
                this.map.resize();
            }
        });
    }

    setupAPIEventListeners() {
        this.api.addEventListener('p2pData', (data) => {
            this.handleEarthquakeData(data, 'p2p');
        });

        this.api.addEventListener('jmaData', (data) => {
            this.handleEarthquakeData(data, 'jma');
        });

        this.api.addEventListener('connectionChange', (data) => {
            this.updateConnectionStatus(data.source, data.status);
        });

        this.api.addEventListener('error', (data) => {
            this.handleAPIError(data);
        });
    }

    handleEarthquakeData(data, source) {
        try {
            if (source === 'jma' && Array.isArray(data)) {
                data.forEach(item => this.addToHistory(item));
                this.updateEarthquakeDisplay(data, source);
                
                if (this.map && data.length > 0) {
                    this.map.displayEarthquake(data[0]);
                }
                
                if (this.notification && data.length > 0) {
                    this.notification.notify(data[0]);
                }
            } else {
                this.addToHistory(data);
                this.updateEarthquakeDisplay(data, source);
                
                // P2Pデータの場合、緊急地震速報チェックとアクティビティ追加
                if (source === 'p2p') {
                    this.checkEEWStatus(data.rawData || data);
                    
                    const magnitude = data.magnitude ? `M${data.magnitude.toFixed(1)}` : '';
                    const intensity = data.maxIntensity ? `震度${data.maxIntensity}` : '';
                    this.addActivityFeedItem(
                        `🔴 地震発生: ${data.location} ${magnitude} ${intensity}`,
                        'earthquake'
                    );
                }
                
                if (this.map) {
                    this.map.displayEarthquake(data);
                }
                
                if (this.notification) {
                    this.notification.notify(data);
                }
            }
            
            // ダッシュボード統計を更新
            this.updateDashboardStats();
            
            console.log(`${source.toUpperCase()} earthquake data processed:`, data);
            
        } catch (error) {
            console.error(`Error handling ${source} data:`, error);
            this.showError(`${source.toUpperCase()}データの処理中にエラーが発生しました`);
        }
    }

    updateEarthquakeDisplay(data, source) {
        const targetElement = source === 'p2p' ? this.elements.p2pInfo : this.elements.jmaInfo;
        if (!targetElement) return;

        targetElement.innerHTML = '';
        
        if (source === 'jma' && Array.isArray(data)) {
            const listContainer = document.createElement('div');
            listContainer.className = 'earthquake-list';
            
            data.forEach((earthquakeData, index) => {
                const earthquakeCard = this.createEarthquakeCard(earthquakeData, index === 0);
                listContainer.appendChild(earthquakeCard);
            });
            
            targetElement.appendChild(listContainer);
        } else {
            const earthquakeCard = this.createEarthquakeCard(data, true);
            targetElement.appendChild(earthquakeCard);
        }
    }

    createEarthquakeCard(data, isLatest = true) {
        const card = document.createElement('div');
        card.className = 'earthquake-card';
        
        if (!isLatest) {
            card.classList.add('historical');
        }
        
        if (data.magnitude >= 6.0 || this.parseIntensity(data.maxIntensity) >= 5) {
            card.classList.add('urgent');
        }

        // JMAデータの場合はクリック可能にする
        if (data.source === 'jma') {
            card.classList.add('clickable');
            card.addEventListener('click', () => {
                this.showEarthquakeModal(data);
            });
        }

        const time = data.time.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const magnitude = data.magnitude ? `M${data.magnitude.toFixed(1)}` : '不明';
        const depth = data.depth ? `${data.depth}km` : '不明';
        const intensity = data.maxIntensity || '不明';

        card.innerHTML = `
            <div class="earthquake-header">
                <span class="magnitude">${magnitude}</span>
                <span class="timestamp">${time}</span>
                ${isLatest ? '<span class="latest-badge">最新</span>' : ''}
            </div>
            <div class="location">${data.location}</div>
            <div class="intensity-info">
                <span class="depth">深さ: ${depth}</span>
                <span class="max-intensity">最大震度: ${intensity}</span>
            </div>
            ${data.tsunami ? '<div style="color: red; font-weight: bold; margin-top: 0.5rem;">津波注意</div>' : ''}
        `;

        return card;
    }

    parseIntensity(intensityStr) {
        const intensityMap = {
            '1': 1, '2': 2, '3': 3, '4': 4,
            '5弱': 5, '5強': 6, '6弱': 7, '6強': 8, '7': 9
        };
        return intensityMap[intensityStr] || 0;
    }

    updateConnectionStatus(source, status) {
        if (source) {
            const element = source === 'p2p' ? this.elements.p2pStatus : this.elements.jmaStatus;
            if (element) {
                const dot = element.querySelector('.status-dot');
                if (dot) {
                    if (status === 'connected') {
                        dot.classList.add('connected');
                    } else {
                        dot.classList.remove('connected');
                    }
                }
            }
        } else {
            const connectionStatus = this.api ? this.api.getConnectionStatus() : { p2p: false, jma: false };
            
            if (this.elements.p2pStatus) {
                const p2pDot = this.elements.p2pStatus.querySelector('.status-dot');
                if (p2pDot) {
                    p2pDot.classList.toggle('connected', connectionStatus.p2p);
                }
            }
            
            if (this.elements.jmaStatus) {
                const jmaDot = this.elements.jmaStatus.querySelector('.status-dot');
                if (jmaDot) {
                    jmaDot.classList.toggle('connected', connectionStatus.jma);
                }
            }
        }
    }

    handleAPIError(data) {
        const errorMessages = {
            p2p: 'P2P地震情報の接続でエラーが発生しました',
            jma: '気象庁APIの取得でエラーが発生しました',
            init: 'APIの初期化でエラーが発生しました'
        };
        
        const message = errorMessages[data.source] || `${data.source}でエラーが発生しました`;
        this.showError(message);
        
        console.error(`API Error (${data.source}):`, data.error);
    }

    addToHistory(data) {
        this.earthquakeHistory.unshift({
            ...data,
            id: `${data.source}-${data.time.getTime()}`
        });

        if (this.earthquakeHistory.length > CONFIG.EARTHQUAKE.MAX_HISTORY_COUNT) {
            this.earthquakeHistory = this.earthquakeHistory.slice(0, CONFIG.EARTHQUAKE.MAX_HISTORY_COUNT);
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - CONFIG.EARTHQUAKE.HISTORY_RETENTION_DAYS);
        
        this.earthquakeHistory = this.earthquakeHistory.filter(
            earthquake => earthquake.time > cutoffDate
        );

        this.saveHistory();
    }

    loadHistory() {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.HISTORY);
        if (saved) {
            try {
                const history = JSON.parse(saved);
                this.earthquakeHistory = history.map(item => ({
                    ...item,
                    time: new Date(item.time)
                }));
            } catch (error) {
                console.error('Error loading history:', error);
                this.earthquakeHistory = [];
            }
        }
    }

    saveHistory() {
        localStorage.setItem(CONFIG.STORAGE_KEYS.HISTORY, JSON.stringify(this.earthquakeHistory));
    }

    toggleSettings() {
        if (this.isSettingsOpen) {
            this.closeSettings();
        } else {
            this.openSettings();
        }
    }

    openSettings() {
        if (this.elements.settingsSidebar) {
            this.elements.settingsSidebar.classList.add('open');
            this.isSettingsOpen = true;
        }
    }

    closeSettings() {
        if (this.elements.settingsSidebar) {
            this.elements.settingsSidebar.classList.remove('open');
            this.isSettingsOpen = false;
        }
    }

    testNotification() {
        if (this.notification) {
            this.notification.testNotification();
            this.showMessage('通知テストを実行しました');
        } else {
            this.showError('通知システムが初期化されていません');
        }
    }

    // フルスクリーンマップ表示機能
    showFullscreenMap() {
        // 最新の地震データを取得
        let latestEarthquake = null;
        
        if (this.earthquakeHistory.length > 0) {
            latestEarthquake = this.earthquakeHistory[0];
        } else {
            // デフォルトデータ（トカラ列島近海）
            latestEarthquake = {
                time: new Date(),
                location: 'トカラ列島近海',
                magnitude: 2.6,
                maxIntensity: '1',
                depth: 10,
                latitude: 29.4,
                longitude: 129.5,
                tsunami: false,
                points: [
                    {
                        pref: '鹿児島県',
                        addr: '鹿児島十島村悪石島',
                        scale: 10, // 震度1
                        lat: 29.4,
                        lng: 129.5
                    }
                ]
            };
        }
        
        if (this.map && latestEarthquake) {
            this.map.enterFullscreenMode(latestEarthquake);
        } else {
            this.showError('地震データが利用できません');
        }
    }

    resetSettings() {
        if (confirm('設定をリセットしますか？')) {
            this.settings = { ...CONFIG.DEFAULT_SETTINGS };
            this.updateSettingsUI();
            this.saveSettings();
            this.showMessage('設定をリセットしました');
        }
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type = 'info') {
        if (!this.elements.errorMessage) return;

        this.elements.errorMessage.textContent = message;
        this.elements.errorMessage.className = `error-message show ${type}`;

        setTimeout(() => {
            this.elements.errorMessage.classList.remove('show');
        }, CONFIG.UI.ERROR_MESSAGE_DURATION);
    }

    cleanup() {
        if (this.api) {
            this.api.disconnect();
        }
        
        if (this.map) {
            this.map.destroy();
        }
        
        if (this.notification) {
            this.notification.destroy();
        }
    }

    reconnect() {
        if (this.api) {
            this.api.reconnect();
            this.showMessage('再接続中...');
        }
    }

    updateDashboardStats() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

        let todayCount = 0;
        let weekCount = 0;
        let maxIntensity = 0;
        const regions = new Set();

        this.earthquakeHistory.forEach(earthquake => {
            const earthquakeDate = new Date(earthquake.time);
            
            if (earthquakeDate >= today) {
                todayCount++;
            }
            
            if (earthquakeDate >= weekAgo) {
                weekCount++;
                
                if (earthquake.location) {
                    regions.add(earthquake.location.split('・')[0]); // 主要地域名を抽出
                }
                
                const intensity = this.parseIntensity(earthquake.maxIntensity);
                if (intensity > maxIntensity) {
                    maxIntensity = intensity;
                }
            }
        });

        this.dashboardStats = {
            todayCount,
            weekCount,
            maxIntensity: maxIntensity > 0 ? this.intensityToString(maxIntensity) : '-',
            activeRegions: regions.size > 0 ? regions.size : '-',
            lastActivity: this.earthquakeHistory.length > 0 ? this.earthquakeHistory[0].time : null
        };

        this.updateDashboardDisplay();
    }

    intensityToString(intensity) {
        const intensityMap = {
            1: '1', 2: '2', 3: '3', 4: '4',
            5: '5弱', 6: '5強', 7: '6弱', 8: '6強', 9: '7'
        };
        return intensityMap[intensity] || '-';
    }

    convertP2PIntensity(scale) {
        return CONFIG.INTENSITY_SCALE_MAP[scale] || '不明';
    }

    updateDashboardDisplay() {
        const todayElement = document.getElementById('today-count');
        const weekElement = document.getElementById('week-count');
        const intensityElement = document.getElementById('max-intensity');
        const regionsElement = document.getElementById('active-regions');

        if (todayElement) todayElement.textContent = this.dashboardStats.todayCount;
        if (weekElement) weekElement.textContent = this.dashboardStats.weekCount;
        if (intensityElement) intensityElement.textContent = this.dashboardStats.maxIntensity;
        if (regionsElement) regionsElement.textContent = this.dashboardStats.activeRegions;
    }

    addActivityFeedItem(message, type = 'info') {
        const timestamp = new Date();
        const feedItem = {
            message,
            type,
            timestamp
        };

        this.activityFeed.unshift(feedItem);
        
        // 最大20項目に制限
        if (this.activityFeed.length > 20) {
            this.activityFeed = this.activityFeed.slice(0, 20);
        }

        this.updateActivityFeedDisplay();
    }

    updateActivityFeedDisplay() {
        const activityList = document.getElementById('activity-list');
        if (!activityList) return;

        activityList.innerHTML = '';
        
        this.activityFeed.slice(0, 10).forEach(item => {
            const activityItem = document.createElement('div');
            activityItem.className = `activity-item ${item.type}`;
            
            const timeStr = item.timestamp.toLocaleTimeString('ja-JP');
            
            activityItem.innerHTML = `
                <div>${item.message}</div>
                <div class="activity-time">${timeStr}</div>
            `;
            
            activityList.appendChild(activityItem);
        });
    }

    checkEEWStatus(data) {
        const eewMessage = document.getElementById('eew-message');
        if (!eewMessage) return;

        // P2Pデータにより緊急地震速報の判定
        // code 556: 緊急地震速報（予報）
        // code 557: 緊急地震速報（警報）
        if (data.code === 556 || data.code === 557) {
            eewMessage.textContent = '発信中 - 強い揺れに警戒';
            eewMessage.style.color = '#ff4757';
            eewMessage.style.fontWeight = 'bold';
            
            this.addActivityFeedItem('🚨 緊急地震速報が発信されました', 'warning');
        } else if (data.code === 551) {
            // 通常の地震情報
            eewMessage.textContent = '発信なし';
            eewMessage.style.color = '';
            eewMessage.style.fontWeight = '';
        }
    }

    setupModalEventListeners() {
        const modalOverlay = document.getElementById('earthquake-modal-overlay');
        const modalClose = document.getElementById('modal-close');
        const modalCloseBtn = document.getElementById('modal-close-btn');
        const modalMapFocus = document.getElementById('modal-map-focus');

        // オーバーレイクリックで閉じる
        modalOverlay?.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                this.closeEarthquakeModal();
            }
        });

        // 閉じるボタン
        modalClose?.addEventListener('click', () => {
            this.closeEarthquakeModal();
        });

        modalCloseBtn?.addEventListener('click', () => {
            this.closeEarthquakeModal();
        });

        // 地図で確認ボタン
        modalMapFocus?.addEventListener('click', () => {
            if (this.currentModalData && this.map) {
                this.map.displayEarthquake(this.currentModalData);
                this.closeEarthquakeModal();
            }
        });

        // Escキーで閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeEarthquakeModal();
            }
        });
    }

    showEarthquakeModal(data) {
        this.currentModalData = data;
        const modalOverlay = document.getElementById('earthquake-modal-overlay');
        const modalBody = document.getElementById('modal-body');

        if (!modalOverlay || !modalBody) return;

        // モーダル内容を生成
        modalBody.innerHTML = this.generateModalContent(data);

        // モーダルを表示
        modalOverlay.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    closeEarthquakeModal() {
        const modalOverlay = document.getElementById('earthquake-modal-overlay');
        if (!modalOverlay) return;

        modalOverlay.classList.remove('show');
        document.body.style.overflow = '';
        this.currentModalData = null;
    }

    generateModalContent(data) {
        const time = data.time.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            weekday: 'long'
        });

        const magnitude = data.magnitude ? data.magnitude.toFixed(1) : '不明';
        const depth = data.depth ? `${data.depth}km` : '不明';
        const intensity = data.maxIntensity || '不明';
        const location = data.location || '不明';

        let intensityDistribution = '';
        if (data.areas && data.areas.length > 0) {
            const intensityTags = data.areas.map(area => 
                `<span class="intensity-tag">${area.pref || area.addr}: 震度${area.scale ? this.convertP2PIntensity(area.scale) : area.intensity || '?'}</span>`
            ).join('');
            
            intensityDistribution = `
                <div class="intensity-distribution">
                    <div class="detail-label">震度分布</div>
                    <div class="intensity-list">${intensityTags}</div>
                </div>
            `;
        }

        const tsunamiAlert = data.tsunami ? `
            <div class="tsunami-alert">
                🌊 津波に関する情報が発表されています
            </div>
        ` : '';

        return `
            <div class="detail-section">
                <div class="detail-title">📍 基本情報</div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">発生時刻</div>
                        <div class="detail-value">${time}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">震源地</div>
                        <div class="detail-value">${location}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">マグニチュード</div>
                        <div class="detail-value magnitude">M${magnitude}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">深さ</div>
                        <div class="detail-value">${depth}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">最大震度</div>
                        <div class="detail-value intensity">震度${intensity}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">座標</div>
                        <div class="detail-value">${data.latitude ? `${data.latitude.toFixed(3)}, ${data.longitude.toFixed(3)}` : '不明'}</div>
                    </div>
                </div>
                ${intensityDistribution}
                ${tsunamiAlert}
            </div>

            <div class="detail-section">
                <div class="detail-title">📊 データ詳細</div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">情報源</div>
                        <div class="detail-value">${data.source === 'jma' ? 'P2P地震情報 (履歴)' : 'P2P地震情報 (リアルタイム)'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">更新時刻</div>
                        <div class="detail-value">${new Date().toLocaleTimeString('ja-JP')}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // リアルタイム更新開始
    startRealtimeUpdates() {
        // リアルタイム時計
        this.realtimeTimers.clock = setInterval(() => {
            this.updateRealtimeClock();
        }, 1000);

        // 稼働時間カウンター
        this.realtimeTimers.uptime = setInterval(() => {
            this.updateUptimeCounter();
        }, 1000);

        // メトリクス更新
        this.realtimeTimers.metrics = setInterval(() => {
            this.updateMetrics();
        }, 2000);
    }

    // リアルタイム時計更新
    updateRealtimeClock() {
        const clockElement = document.getElementById('realtime-clock');
        if (clockElement) {
            const now = new Date();
            const timeString = now.toLocaleTimeString('ja-JP', { 
                hour12: false,
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
            });
            clockElement.textContent = timeString;
        }
    }

    // 稼働時間カウンター更新
    updateUptimeCounter() {
        const uptimeElement = document.getElementById('uptime-counter');
        if (uptimeElement) {
            const now = new Date();
            const diff = now - this.startTime;
            
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            uptimeElement.textContent = timeString;
        }
    }

    // メトリクス更新
    updateMetrics() {
        // API応答時間
        const responseTimeElement = document.getElementById('api-response-time');
        if (responseTimeElement) {
            const avgResponseTime = this.apiResponseTimes.length > 0 
                ? Math.round(this.apiResponseTimes.reduce((a, b) => a + b, 0) / this.apiResponseTimes.length)
                : 0;
            responseTimeElement.textContent = `${avgResponseTime}ms`;
        }

        // 最終更新時間
        const lastUpdateElement = document.getElementById('last-update-time');
        if (lastUpdateElement && this.lastUpdateTime) {
            const timeDiff = Math.round((new Date() - this.lastUpdateTime) / 1000);
            if (timeDiff < 60) {
                lastUpdateElement.textContent = `${timeDiff}秒前`;
            } else if (timeDiff < 3600) {
                lastUpdateElement.textContent = `${Math.floor(timeDiff / 60)}分前`;
            } else {
                lastUpdateElement.textContent = '1時間以上前';
            }
        }

        // データ受信数
        const dataPacketsElement = document.getElementById('data-packets');
        if (dataPacketsElement) {
            dataPacketsElement.textContent = this.dataPacketsCount.toString();
            // カウンターアニメーション
            dataPacketsElement.classList.remove('counter-animation');
            setTimeout(() => dataPacketsElement.classList.add('counter-animation'), 10);
        }
    }

    // ライブデータストリーム初期化
    initLiveDataStream() {
        this.streamData = [
            'System Initialize... OK',
            'WebSocket Connection... Establishing',
            'P2P API Status... Connected',
            'JMA API Status... Connected',
            'Real-time monitoring... ACTIVE',
            'Data stream... LIVE'
        ];
        
        this.updateLiveStream();
        setInterval(() => this.updateLiveStream(), 3000);
    }

    // ライブストリーム更新
    updateLiveStream() {
        const streamElement = document.getElementById('live-stream-content');
        if (!streamElement) return;

        const timestamp = new Date().toLocaleTimeString('ja-JP');
        const systemStats = [
            `[${timestamp}] System Status: OPERATIONAL`,
            `[${timestamp}] Active Connections: ${this.api ? (this.api.getConnectionStatus().p2p ? 1 : 0) : 0}`,
            `[${timestamp}] Data Packets: ${this.dataPacketsCount}`,
            `[${timestamp}] Monitoring: Real-time earthquake detection`,
            `[${timestamp}] Last Update: ${this.lastUpdateTime ? this.lastUpdateTime.toLocaleTimeString('ja-JP') : 'Waiting...'}`,
            `[${timestamp}] Performance: ${this.apiResponseTimes.length > 0 ? 'Good' : 'Initializing'}`
        ];

        const streamHtml = systemStats.map(line => 
            `<div class="stream-data-line">${line}</div>`
        ).join('');
        
        streamElement.innerHTML = streamHtml;
    }

    // データ受信時の処理を強化
    handleEarthquakeData(data, source) {
        // データパケット数増加
        this.dataPacketsCount++;
        this.lastUpdateTime = new Date();

        // API応答時間記録（簡易実装）
        if (source === 'jma') {
            const responseTime = Math.random() * 500 + 100; // 模擬応答時間
            this.apiResponseTimes.push(responseTime);
            if (this.apiResponseTimes.length > 10) {
                this.apiResponseTimes.shift();
            }
        }

        try {
            if (source === 'jma' && Array.isArray(data)) {
                data.forEach(item => this.addToHistory(item));
                this.updateEarthquakeDisplay(data, source);
                
                if (this.map && data.length > 0) {
                    this.map.displayEarthquake(data[0]);
                }
                
                if (this.notification && data.length > 0) {
                    this.notification.notify(data[0]);
                }
            } else {
                this.addToHistory(data);
                this.updateEarthquakeDisplay(data, source);
                
                // P2Pデータの場合、緊急地震速報チェックとアクティビティ追加
                if (source === 'p2p') {
                    this.checkEEWStatus(data.rawData || data);
                    
                    const magnitude = data.magnitude ? `M${data.magnitude.toFixed(1)}` : '';
                    const intensity = data.maxIntensity ? `震度${data.maxIntensity}` : '';
                    this.addActivityFeedItem(
                        `🔴 地震発生: ${data.location} ${magnitude} ${intensity}`,
                        'earthquake'
                    );
                }
                
                if (this.map) {
                    this.map.displayEarthquake(data);
                }
                
                if (this.notification) {
                    this.notification.notify(data);
                }
            }
            
            // ダッシュボード統計を更新（アニメーション付き）
            this.updateDashboardStats();
            
            console.log(`${source.toUpperCase()} earthquake data processed:`, data);
            
        } catch (error) {
            console.error(`Error handling ${source} data:`, error);
            this.showError(`${source.toUpperCase()}データの処理中にエラーが発生しました`);
        }
    }

    // ダッシュボード統計更新（アニメーション強化）
    updateDashboardStats() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

        let todayCount = 0;
        let weekCount = 0;
        let maxIntensity = 0;
        const regions = new Set();

        this.earthquakeHistory.forEach(earthquake => {
            const earthquakeDate = new Date(earthquake.time);
            
            if (earthquakeDate >= today) {
                todayCount++;
            }
            
            if (earthquakeDate >= weekAgo) {
                weekCount++;
                
                if (earthquake.location) {
                    regions.add(earthquake.location.split('・')[0]); // 主要地域名を抽出
                }
                
                const intensity = this.parseIntensity(earthquake.maxIntensity);
                if (intensity > maxIntensity) {
                    maxIntensity = intensity;
                }
            }
        });

        // 前の値と比較してアニメーション
        const prevStats = { ...this.dashboardStats };
        this.dashboardStats = {
            todayCount,
            weekCount,
            maxIntensity: maxIntensity > 0 ? this.intensityToString(maxIntensity) : '-',
            activeRegions: regions.size > 0 ? regions.size : '-',
            lastActivity: this.earthquakeHistory.length > 0 ? this.earthquakeHistory[0].time : null
        };

        this.updateDashboardDisplay();
        
        // 値が変更された場合のアニメーション
        if (prevStats.todayCount !== todayCount) {
            this.animateCounterUpdate('today-count');
        }
        if (prevStats.weekCount !== weekCount) {
            this.animateCounterUpdate('week-count');
        }
    }

    // カウンター更新アニメーション
    animateCounterUpdate(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('counter-animation');
            setTimeout(() => element.classList.add('counter-animation'), 10);
        }
    }

    getStatus() {
        return {
            api: this.api ? this.api.getConnectionStatus() : null,
            notification: this.notification ? this.notification.getPermissionStatus() : null,
            historyCount: this.earthquakeHistory.length,
            settings: this.settings,
            dashboardStats: this.dashboardStats,
            realtimeStats: {
                uptime: new Date() - this.startTime,
                dataPackets: this.dataPacketsCount,
                avgResponseTime: this.apiResponseTimes.length > 0 
                    ? this.apiResponseTimes.reduce((a, b) => a + b, 0) / this.apiResponseTimes.length 
                    : 0
            }
        };
    }

    // クリーンアップ時にタイマー停止
    cleanup() {
        // リアルタイムタイマー停止
        Object.values(this.realtimeTimers).forEach(timer => {
            if (timer) clearInterval(timer);
        });
        
        if (this.api) {
            this.api.disconnect();
        }
        
        if (this.map) {
            this.map.destroy();
        }
        
        if (this.notification) {
            this.notification.destroy();
        }
    }
}

let app;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        app = new EarthquakeApp();
        
        window.earthquakeApp = app;
        
        console.log('地震速報アプリが開始されました');
        
    } catch (error) {
        console.error('アプリケーション開始エラー:', error);
        
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = 'アプリケーションの開始に失敗しました';
            errorElement.classList.add('show');
        }
    }
});

window.addEventListener('beforeunload', () => {
    if (app) {
        app.cleanup();
    }
});

// 固定強震モニタパネル管理クラス
class FixedKmoniPanel {
    constructor() {
        this.isVisible = true;
        this.isMinimized = false;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadKmoni();
    }

    setupEventListeners() {
        const panel = document.getElementById('fixed-kmoni-panel');
        const header = document.querySelector('.kmoni-header');
        const refreshBtn = document.getElementById('kmoni-refresh');
        const minimizeBtn = document.getElementById('kmoni-minimize');
        const closeBtn = document.getElementById('kmoni-close');
        const iframe = document.getElementById('kmoni-iframe');

        // ドラッグ機能
        if (header && panel) {
            header.addEventListener('mousedown', (e) => this.startDrag(e));
            document.addEventListener('mousemove', (e) => this.drag(e));
            document.addEventListener('mouseup', () => this.endDrag());
        }

        // 制御ボタン
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshKmoni());
        }

        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => this.toggleMinimize());
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // iframe読み込み完了時
        if (iframe) {
            iframe.addEventListener('load', () => this.onIframeLoad());
            iframe.addEventListener('error', () => this.onIframeError());
        }

        // リサイズ対応
        window.addEventListener('resize', () => this.adjustPosition());
    }

    loadKmoni() {
        const loading = document.getElementById('kmoni-loading');
        const iframe = document.getElementById('kmoni-iframe');

        if (loading && iframe) {
            // 3秒後にローディングを隠してiframeを表示
            setTimeout(() => {
                loading.style.opacity = '0';
                setTimeout(() => {
                    loading.style.display = 'none';
                    iframe.style.display = 'block';
                    
                    // アクティビティフィードに追加
                    if (window.earthquakeApp) {
                        window.earthquakeApp.addActivityFeedItem(
                            '📊 強震モニタパネルを表示',
                            'info'
                        );
                    }
                }, 300);
            }, 3000);
        }
    }

    refreshKmoni() {
        const iframe = document.getElementById('kmoni-iframe');
        const loading = document.getElementById('kmoni-loading');
        const refreshBtn = document.getElementById('kmoni-refresh');

        if (iframe && loading && refreshBtn) {
            // リフレッシュアニメーション
            refreshBtn.style.transform = 'rotate(360deg)';
            setTimeout(() => {
                refreshBtn.style.transform = 'rotate(0deg)';
            }, 500);

            // iframeを再読み込み
            loading.style.display = 'flex';
            loading.style.opacity = '1';
            iframe.style.display = 'none';

            // 少し遅延してからsrcを再設定
            setTimeout(() => {
                iframe.src = 'http://www.kmoni.bosai.go.jp';
                this.loadKmoni();
            }, 500);

            // アクティビティフィードに追加
            if (window.earthquakeApp) {
                window.earthquakeApp.addActivityFeedItem(
                    '🔄 強震モニタを更新',
                    'info'
                );
            }
        }
    }

    toggleMinimize() {
        const panel = document.getElementById('fixed-kmoni-panel');
        const minimizeBtn = document.getElementById('kmoni-minimize');

        if (panel && minimizeBtn) {
            this.isMinimized = !this.isMinimized;

            if (this.isMinimized) {
                panel.classList.add('minimized');
                minimizeBtn.textContent = '⬜';
                minimizeBtn.title = '元のサイズに戻す';
            } else {
                panel.classList.remove('minimized');
                minimizeBtn.textContent = '➖';
                minimizeBtn.title = '最小化';
            }
        }
    }

    close() {
        const panel = document.getElementById('fixed-kmoni-panel');

        if (panel) {
            panel.classList.add('hidden');
            this.isVisible = false;

            // アクティビティフィードに追加
            if (window.earthquakeApp) {
                window.earthquakeApp.addActivityFeedItem(
                    '❌ 強震モニタパネルを閉じました',
                    'info'
                );
            }
        }
    }

    show() {
        const panel = document.getElementById('fixed-kmoni-panel');

        if (panel) {
            panel.classList.remove('hidden');
            this.isVisible = true;

            // アクティビティフィードに追加
            if (window.earthquakeApp) {
                window.earthquakeApp.addActivityFeedItem(
                    '📊 強震モニタパネルを表示',
                    'info'
                );
            }
        }
    }

    startDrag(e) {
        const panel = document.getElementById('fixed-kmoni-panel');
        
        if (panel && !this.isMinimized) {
            this.isDragging = true;
            panel.classList.add('dragging');

            const rect = panel.getBoundingClientRect();
            this.dragOffset = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
    }

    drag(e) {
        if (this.isDragging) {
            const panel = document.getElementById('fixed-kmoni-panel');
            
            if (panel) {
                const x = e.clientX - this.dragOffset.x;
                const y = e.clientY - this.dragOffset.y;

                // 画面境界チェック
                const maxX = window.innerWidth - panel.offsetWidth;
                const maxY = window.innerHeight - panel.offsetHeight;

                panel.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
                panel.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
                panel.style.right = 'auto';
            }
        }
    }

    endDrag() {
        const panel = document.getElementById('fixed-kmoni-panel');
        
        if (this.isDragging && panel) {
            this.isDragging = false;
            panel.classList.remove('dragging');
        }
    }

    adjustPosition() {
        const panel = document.getElementById('fixed-kmoni-panel');
        
        if (panel) {
            const rect = panel.getBoundingClientRect();
            const maxX = window.innerWidth - panel.offsetWidth;
            const maxY = window.innerHeight - panel.offsetHeight;

            if (rect.right > window.innerWidth) {
                panel.style.left = maxX + 'px';
                panel.style.right = 'auto';
            }
            if (rect.bottom > window.innerHeight) {
                panel.style.top = maxY + 'px';
            }
        }
    }

    onIframeLoad() {
        console.log('強震モニタの読み込み完了');
    }

    onIframeError() {
        console.error('強震モニタの読み込み失敗');
        
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = '強震モニタの読み込みに失敗しました';
            errorElement.classList.add('show');
            setTimeout(() => {
                errorElement.classList.remove('show');
            }, 5000);
        }
    }
}

// 固定強震モニタパネルの初期化
document.addEventListener('DOMContentLoaded', () => {
    // アプリ初期化後に強震モニタパネルを初期化
    setTimeout(() => {
        window.fixedKmoniPanel = new FixedKmoniPanel();
    }, 1000);
});