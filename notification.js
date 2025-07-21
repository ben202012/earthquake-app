class EarthquakeNotification {
    constructor() {
        this.permission = 'default';
        this.audioContext = null;
        this.settings = CONFIG.DEFAULT_SETTINGS;
        this.notificationQueue = [];
        this.isProcessingQueue = false;
        
        this.init();
    }

    async init() {
        try {
            await this.requestPermission();
            this.setupAudio();
            this.loadSettings();
            console.log('EarthquakeNotification initialized');
        } catch (error) {
            console.error('Failed to initialize notifications:', error);
        }
    }

    async requestPermission() {
        if (!('Notification' in window)) {
            throw new Error('このブラウザは通知をサポートしていません');
        }

        if (Notification.permission === 'granted') {
            this.permission = 'granted';
            return true;
        }

        if (Notification.permission === 'denied') {
            this.permission = 'denied';
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;
            return permission === 'granted';
        } catch (error) {
            console.error('Permission request failed:', error);
            this.permission = 'denied';
            return false;
        }
    }

    setupAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('Audio context not available:', error);
        }
    }

    loadSettings() {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.SETTINGS);
        if (saved) {
            try {
                this.settings = { ...CONFIG.DEFAULT_SETTINGS, ...JSON.parse(saved) };
            } catch (error) {
                console.error('Error loading notification settings:', error);
            }
        }
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        localStorage.setItem(CONFIG.STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    }

    shouldNotify(earthquakeData) {
        if (this.permission !== 'granted') {
            return false;
        }

        const magnitude = earthquakeData.magnitude;
        const intensity = this.parseIntensity(earthquakeData.maxIntensity);
        
        return (
            magnitude >= this.settings.magnitudeThreshold ||
            intensity >= this.settings.intensityThreshold
        );
    }

    parseIntensity(intensityStr) {
        const intensityMap = {
            '1': 1, '2': 2, '3': 3, '4': 4,
            '5弱': 5, '5強': 6, '6弱': 7, '6強': 8, '7': 9
        };
        return intensityMap[intensityStr] || 0;
    }

    async notify(earthquakeData) {
        if (!this.shouldNotify(earthquakeData)) {
            return;
        }

        const notificationData = {
            earthquakeData,
            timestamp: Date.now()
        };

        this.notificationQueue.push(notificationData);
        
        if (!this.isProcessingQueue) {
            this.processNotificationQueue();
        }
    }

    async processNotificationQueue() {
        this.isProcessingQueue = true;

        while (this.notificationQueue.length > 0) {
            const notificationData = this.notificationQueue.shift();
            await this.showNotification(notificationData.earthquakeData);
            
            if (this.settings.notificationSound) {
                await this.playSound();
            }
            
            await this.delay(1000);
        }

        this.isProcessingQueue = false;
    }

    async showNotification(earthquakeData) {
        if (this.permission !== 'granted') {
            return;
        }

        const title = CONFIG.NOTIFICATION.TITLE;
        const body = this.formatNotificationBody(earthquakeData);
        const icon = CONFIG.NOTIFICATION.ICON;
        
        try {
            const notification = new Notification(title, {
                body,
                icon,
                tag: `earthquake-${earthquakeData.time.getTime()}`,
                requireInteraction: true,
                silent: !this.settings.notificationSound
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            setTimeout(() => {
                notification.close();
            }, CONFIG.NOTIFICATION.DEFAULT_DURATION);

            console.log('Notification shown:', body);
            return notification;

        } catch (error) {
            console.error('Failed to show notification:', error);
            this.fallbackAlert(earthquakeData);
        }
    }

    formatNotificationBody(earthquakeData) {
        const time = earthquakeData.time.toLocaleTimeString('ja-JP');
        const location = earthquakeData.location;
        const magnitude = earthquakeData.magnitude ? `M${earthquakeData.magnitude}` : '';
        const intensity = earthquakeData.maxIntensity ? `最大震度${earthquakeData.maxIntensity}` : '';
        
        let body = `${time} ${location}`;
        
        if (magnitude) {
            body += ` ${magnitude}`;
        }
        
        if (intensity) {
            body += ` ${intensity}`;
        }
        
        if (earthquakeData.tsunami) {
            body += ' 津波に注意';
        }
        
        return body;
    }

    fallbackAlert(earthquakeData) {
        const message = this.formatNotificationBody(earthquakeData);
        alert(`🚨 ${CONFIG.NOTIFICATION.TITLE}\n${message}`);
    }

    async playSound() {
        if (!this.settings.notificationSound || !this.audioContext) {
            return;
        }

        try {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime + 0.2);
            
            const volume = this.settings.volume / 100;
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.5);
            
        } catch (error) {
            console.error('Failed to play notification sound:', error);
        }
    }

    async testNotification() {
        const testData = {
            time: new Date(),
            location: 'テスト地域',
            magnitude: 5.0,
            maxIntensity: '4',
            tsunami: false
        };

        await this.notify(testData);
    }

    getPermissionStatus() {
        return {
            supported: 'Notification' in window,
            permission: this.permission,
            audio: !!this.audioContext
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    destroy() {
        this.notificationQueue = [];
        this.isProcessingQueue = false;
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}