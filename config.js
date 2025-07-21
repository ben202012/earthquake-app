const CONFIG = {
    API: {
        P2P_WEBSOCKET_URL: 'wss://api.p2pquake.net/v2/ws',
        JMA_BASE_URL: 'https://api.p2pquake.net/v2/history?codes=551&limit=10',
        RECONNECT_ATTEMPTS: 5,
        RECONNECT_DELAY: 3000,
        JMA_POLL_INTERVAL: 60000
    },
    
    EARTHQUAKE: {
        CODE_EARTHQUAKE: 551,
        DEFAULT_MAGNITUDE_THRESHOLD: 4.0,
        DEFAULT_INTENSITY_THRESHOLD: 3,
        MAX_HISTORY_COUNT: 50,
        HISTORY_RETENTION_DAYS: 7
    },
    
    STORAGE_KEYS: {
        SETTINGS: 'earthquake_settings',
        HISTORY: 'earthquake_history',
        CONNECTION_STATUS: 'connection_status'
    },
    
    DEFAULT_SETTINGS: {
        magnitudeThreshold: 4.0,
        intensityThreshold: 3,
        notificationSound: true,
        volume: 50,
        autoZoom: true
    },
    
    MAP: {
        DEFAULT_CENTER: [35.6762, 139.6503],
        DEFAULT_ZOOM: 6,
        TILE_LAYER_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        TILE_LAYER_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    
    NOTIFICATION: {
        TITLE: '地震速報',
        ICON: '/favicon.ico',
        DEFAULT_DURATION: 10000
    },
    
    UI: {
        ERROR_MESSAGE_DURATION: 5000,
        LOADING_TIMEOUT: 30000
    },
    
    INTENSITY_SCALE_MAP: {
        10: '1',
        20: '2', 
        30: '3',
        40: '4',
        45: '5弱',
        50: '5強',
        55: '6弱',
        60: '6強',
        70: '7'
    },
    
    INTENSITY_COLORS: {
        '1': '#4CAF50',
        '2': '#8BC34A',
        '3': '#FFEB3B',
        '4': '#FF9800',
        '5弱': '#FF5722',
        '5強': '#F44336',
        '6弱': '#E91E63',
        '6強': '#9C27B0',
        '7': '#673AB7'
    }
};