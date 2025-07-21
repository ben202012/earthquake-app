class EarthquakeAPI {
    constructor() {
        this.websocket = null;
        this.reconnectCount = 0;
        this.isConnecting = false;
        this.jmaPollingInterval = null;
        this.eventListeners = {
            p2pData: [],
            jmaData: [],
            connectionChange: [],
            error: []
        };
    }

    addEventListener(type, callback) {
        if (this.eventListeners[type]) {
            this.eventListeners[type].push(callback);
        }
    }

    removeEventListener(type, callback) {
        if (this.eventListeners[type]) {
            this.eventListeners[type] = this.eventListeners[type].filter(cb => cb !== callback);
        }
    }

    emit(type, data) {
        if (this.eventListeners[type]) {
            this.eventListeners[type].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${type} event listener:`, error);
                }
            });
        }
    }

    async init() {
        try {
            await this.connectWebSocket();
            this.startJMAPolling();
            console.log('EarthquakeAPI initialized successfully');
        } catch (error) {
            console.error('Failed to initialize EarthquakeAPI:', error);
            this.emit('error', { source: 'init', error });
        }
    }

    async connectWebSocket() {
        if (this.isConnecting || (this.websocket && this.websocket.readyState === WebSocket.OPEN)) {
            return;
        }

        this.isConnecting = true;
        
        try {
            this.websocket = new WebSocket(CONFIG.API.P2P_WEBSOCKET_URL);
            
            this.websocket.onopen = () => {
                console.log('P2P WebSocket connected');
                this.isConnecting = false;
                this.reconnectCount = 0;
                this.emit('connectionChange', { source: 'p2p', status: 'connected' });
            };

            this.websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleP2PMessage(data);
                } catch (error) {
                    console.error('Error parsing P2P message:', error);
                    this.emit('error', { source: 'p2p', error: 'Parse error' });
                }
            };

            this.websocket.onclose = (event) => {
                console.log('P2P WebSocket disconnected:', event.code, event.reason);
                this.isConnecting = false;
                this.emit('connectionChange', { source: 'p2p', status: 'disconnected' });
                this.handleReconnect();
            };

            this.websocket.onerror = (error) => {
                console.error('P2P WebSocket error:', error);
                this.isConnecting = false;
                this.emit('error', { source: 'p2p', error: 'Connection error' });
            };

        } catch (error) {
            this.isConnecting = false;
            throw error;
        }
    }

    handleP2PMessage(data) {
        if (data.code === CONFIG.EARTHQUAKE.CODE_EARTHQUAKE) {
            const earthquakeData = this.parseP2PData(data);
            this.emit('p2pData', earthquakeData);
            console.log('P2P earthquake data received:', earthquakeData);
        }
    }

    parseP2PData(data) {
        const earthquake = data.earthquake || {};
        const hypocenter = earthquake.hypocenter || {};
        
        return {
            source: 'p2p',
            time: new Date(earthquake.time || data.time),
            location: hypocenter.name || '不明',
            latitude: hypocenter.latitude,
            longitude: hypocenter.longitude,
            depth: hypocenter.depth,
            magnitude: hypocenter.magnitude,
            maxIntensity: this.convertP2PIntensity(earthquake.maxScale),
            tsunami: earthquake.domesticTsunami !== 'None',
            points: data.points || [],
            rawData: data
        };
    }

    convertP2PIntensity(scale) {
        return CONFIG.INTENSITY_SCALE_MAP[scale] || '不明';
    }

    async handleReconnect() {
        if (this.reconnectCount >= CONFIG.API.RECONNECT_ATTEMPTS) {
            console.error('Max reconnection attempts reached');
            this.emit('error', { source: 'p2p', error: 'Max reconnections exceeded' });
            return;
        }

        this.reconnectCount++;
        console.log(`Attempting to reconnect (${this.reconnectCount}/${CONFIG.API.RECONNECT_ATTEMPTS})`);
        
        setTimeout(() => {
            this.connectWebSocket();
        }, CONFIG.API.RECONNECT_DELAY * this.reconnectCount);
    }

    startJMAPolling() {
        this.stopJMAPolling();
        
        this.jmaPollingInterval = setInterval(() => {
            this.fetchJMAData();
        }, CONFIG.API.JMA_POLL_INTERVAL);

        this.fetchJMAData();
    }

    stopJMAPolling() {
        if (this.jmaPollingInterval) {
            clearInterval(this.jmaPollingInterval);
            this.jmaPollingInterval = null;
        }
    }

    async fetchJMAData() {
        try {
            const response = await fetch(CONFIG.API.JMA_BASE_URL, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const earthquakeData = this.parseJMAData(data);
            
            if (earthquakeData) {
                this.emit('jmaData', earthquakeData);
                console.log('JMA earthquake data received:', earthquakeData);
            }

            this.emit('connectionChange', { source: 'jma', status: 'connected' });

        } catch (error) {
            console.error('Error fetching JMA data:', error);
            this.emit('connectionChange', { source: 'jma', status: 'disconnected' });
            this.emit('error', { source: 'jma', error: error.message });
        }
    }

    parseJMAData(data) {
        if (!data || !Array.isArray(data) || data.length === 0) {
            return null;
        }

        const earthquake = data[0].earthquake;
        if (!earthquake) return null;
        
        const hypocenter = earthquake.hypocenter || {};
        
        return {
            source: 'jma',
            time: new Date(earthquake.time),
            location: hypocenter.name || '不明',
            latitude: hypocenter.latitude,
            longitude: hypocenter.longitude,
            depth: hypocenter.depth,
            magnitude: hypocenter.magnitude,
            maxIntensity: this.convertP2PIntensity(earthquake.maxScale) || '不明',
            tsunami: earthquake.domesticTsunami !== 'None',
            areas: data[0].points || [],
            rawData: data[0]
        };
    }

    getConnectionStatus() {
        return {
            p2p: this.websocket && this.websocket.readyState === WebSocket.OPEN,
            jma: this.jmaPollingInterval !== null
        };
    }

    disconnect() {
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        
        this.stopJMAPolling();
        this.reconnectCount = 0;
        this.isConnecting = false;
        
        console.log('EarthquakeAPI disconnected');
    }

    async reconnect() {
        this.disconnect();
        await this.init();
    }
}