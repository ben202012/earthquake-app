class EarthquakeApp {
    constructor() {
        this.api = null;
        this.map = null;
        this.notification = null;
        this.settings = CONFIG.DEFAULT_SETTINGS;
        this.earthquakeHistory = [];
        this.isSettingsOpen = false;
        
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
                
                if (this.map) {
                    this.map.displayEarthquake(data);
                }
                
                if (this.notification) {
                    this.notification.notify(data);
                }
            }
            
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

    getStatus() {
        return {
            api: this.api ? this.api.getConnectionStatus() : null,
            notification: this.notification ? this.notification.getPermissionStatus() : null,
            historyCount: this.earthquakeHistory.length,
            settings: this.settings
        };
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