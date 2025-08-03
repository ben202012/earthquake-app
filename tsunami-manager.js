/**
 * 津波状態管理システム (リアルタイム対応)
 * 30%完成度版 - 基盤機能実装
 */

class TsunamiManager {
    constructor() {
        this.currentState = {
            active: false,
            regions: new Map(), // 地域コード -> 津波情報
            lastUpdate: null,
            source: 'none' // 'jma', 'fallback', 'none'
        };
        
        this.config = {
            // リアルタイム更新設定
            enableRealtime: false, // 30%版では定期更新のみ
            updateInterval: 300000, // 5分間隔
            enablePeriodicUpdate: true, // 30%版新機能
            
            // API設定 (将来実装用)
            dmdataApiKey: null,
            jmaXmlEndpoint: 'https://xml.kishou.go.jp/',
            
            // 津波レベル定義
            levels: {
                'major_warning': { name: '大津波警報', priority: 4, color: '#8B0000' },
                'warning': { name: '津波警報', priority: 3, color: '#FF0000' },
                'advisory': { name: '津波注意報', priority: 2, color: '#FFD700' },
                'forecast': { name: '津波予報', priority: 1, color: '#90EE90' },
                'cleared': { name: '解除', priority: 0, color: '#808080' }
            },
            
            // 津波予報区マスタ (気象庁公式)
            forecastAreas: {
                '191': { name: '北海道太平洋沿岸東部', prefecture: '北海道' },
                '192': { name: '北海道太平洋沿岸中部', prefecture: '北海道' },
                '193': { name: '北海道太平洋沿岸西部', prefecture: '北海道' },
                '201': { name: '青森県太平洋沿岸', prefecture: '青森県' },
                '211': { name: '岩手県', prefecture: '岩手県' },
                '221': { name: '宮城県', prefecture: '宮城県' },
                '231': { name: '福島県', prefecture: '福島県' },
                '241': { name: '茨城県', prefecture: '茨城県' },
                '251': { name: '千葉県九十九里・外房', prefecture: '千葉県' },
                '252': { name: '千葉県内房', prefecture: '千葉県' },
                '281': { name: '小笠原諸島', prefecture: '東京都' }
            }
        };
        
        this.callbacks = {
            onStateChange: [],
            onRegionUpdate: [],
            onError: []
        };
        
        // 定期更新タイマー
        this.updateTimer = null;
        
        // シミュレーションモード (30%版機能)
        this.simulationMode = {
            enabled: false,
            scenarios: this.getSimulationScenarios()
        };
        
        this.initializeState();
    }
    
    /**
     * 初期状態設定
     */
    initializeState() {
        console.log('🌊 津波状態管理システム初期化');
        
        // 現在は全地域解除状態
        this.currentState.active = false;
        this.currentState.regions.clear();
        this.currentState.lastUpdate = new Date();
        this.currentState.source = 'none';
        
        this.notifyStateChange();
    }
    
    /**
     * 津波情報更新 (30%版 - 手動更新)
     * @param {Object} tsunamiData - 津波データ
     */
    updateTsunamiState(tsunamiData) {
        console.log('🔄 津波状態更新開始');
        
        const previousState = this.cloneState();
        let hasActiveRegions = false;
        
        this.currentState.regions.clear();
        
        if (tsunamiData && tsunamiData.features) {
            tsunamiData.features.forEach(feature => {
                const props = feature.properties;
                const areaCode = props.AREA_CODE;
                const status = props.STATUS;
                
                // アクティブな津波情報のみを管理
                if (!this.isStatusCleared(status)) {
                    this.currentState.regions.set(areaCode, {
                        areaCode,
                        areaName: props.AREA_NAME,
                        status,
                        waveHeight: props.WAVE_HEIGHT || '不明',
                        arrivalTime: props.ARRIVAL_TIME || '不明',
                        issuedAt: props.ISSUED_AT || new Date().toISOString(),
                        geometry: feature.geometry
                    });
                    hasActiveRegions = true;
                }
            });
        }
        
        this.currentState.active = hasActiveRegions;
        this.currentState.lastUpdate = new Date();
        this.currentState.source = tsunamiData ? 'jma' : 'none';
        
        // 状態変化を通知
        this.notifyStateChange(previousState);
        
        console.log(`📊 津波状態更新完了: ${this.currentState.regions.size}地域がアクティブ`);
    }
    
    /**
     * ステータスが解除状態かチェック
     */
    isStatusCleared(status) {
        const clearedStatuses = ['cleared', 'cancelled', 'lifted', 'discontinued', 'none'];
        return clearedStatuses.includes(status);
    }
    
    /**
     * アクティブな津波地域取得
     */
    getActiveRegions() {
        return Array.from(this.currentState.regions.values());
    }
    
    /**
     * 特定地域の津波情報取得
     */
    getRegionInfo(areaCode) {
        return this.currentState.regions.get(areaCode) || null;
    }
    
    /**
     * 津波レベル別地域取得
     */
    getRegionsByLevel(level) {
        return this.getActiveRegions().filter(region => region.status === level);
    }
    
    /**
     * 最高津波レベル取得
     */
    getHighestTsunamiLevel() {
        if (!this.currentState.active) return null;
        
        let highestLevel = null;
        let highestPriority = -1;
        
        this.getActiveRegions().forEach(region => {
            const levelConfig = this.config.levels[region.status];
            if (levelConfig && levelConfig.priority > highestPriority) {
                highestLevel = region.status;
                highestPriority = levelConfig.priority;
            }
        });
        
        return highestLevel;
    }
    
    /**
     * 津波統計情報取得
     */
    getStatistics() {
        const stats = {
            totalActive: this.currentState.regions.size,
            byLevel: {},
            lastUpdate: this.currentState.lastUpdate,
            source: this.currentState.source,
            isActive: this.currentState.active
        };
        
        // レベル別統計
        Object.keys(this.config.levels).forEach(level => {
            stats.byLevel[level] = this.getRegionsByLevel(level).length;
        });
        
        return stats;
    }
    
    /**
     * 状態変化通知
     */
    notifyStateChange(previousState = null) {
        const currentStats = this.getStatistics();
        
        this.callbacks.onStateChange.forEach(callback => {
            try {
                callback(currentStats, previousState);
            } catch (error) {
                console.error('津波状態変化通知エラー:', error);
            }
        });
    }
    
    /**
     * イベントリスナー登録
     */
    on(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(callback);
        }
    }
    
    /**
     * 状態のクローン作成
     */
    cloneState() {
        return {
            active: this.currentState.active,
            regions: new Map(this.currentState.regions),
            lastUpdate: this.currentState.lastUpdate,
            source: this.currentState.source
        };
    }
    
    /**
     * 手動更新実行 (30%版メイン機能)
     */
    async manualUpdate() {
        console.log('🔄 津波情報手動更新開始');
        
        try {
            // フォールバックローダーを使用
            const loader = new JMATsunamiLoader();
            const tsunamiData = await loader.loadTsunamiAreas();
            
            if (tsunamiData) {
                this.updateTsunamiState(tsunamiData);
                return { success: true, message: '津波情報更新完了' };
            } else {
                throw new Error('津波データ取得失敗');
            }
            
        } catch (error) {
            console.error('津波情報更新エラー:', error);
            this.notifyError(error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * エラー通知
     */
    notifyError(error) {
        this.callbacks.onError.forEach(callback => {
            try {
                callback(error);
            } catch (err) {
                console.error('エラー通知失敗:', err);
            }
        });
    }
    
    /**
     * 定期更新開始 (30%版機能)
     */
    startPeriodicUpdate() {
        if (!this.config.enablePeriodicUpdate) return;
        
        console.log(`🔄 津波情報定期更新開始 (${this.config.updateInterval / 1000}秒間隔)`);
        
        this.updateTimer = setInterval(async () => {
            try {
                await this.manualUpdate();
                console.log('🔄 定期更新完了');
            } catch (error) {
                console.error('🚨 定期更新エラー:', error);
            }
        }, this.config.updateInterval);
    }
    
    /**
     * 定期更新停止
     */
    stopPeriodicUpdate() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
            console.log('⏹️ 津波情報定期更新停止');
        }
    }
    
    /**
     * シミュレーションシナリオ取得
     */
    getSimulationScenarios() {
        return {
            'scenario1': {
                name: '東日本大震災級津波警報',
                description: '2011年東日本大震災規模の津波警報シミュレーション',
                regions: [
                    { areaCode: '191', status: 'major_warning', waveHeight: '10m以上' },
                    { areaCode: '192', status: 'major_warning', waveHeight: '10m以上' },
                    { areaCode: '201', status: 'major_warning', waveHeight: '10m以上' },
                    { areaCode: '211', status: 'major_warning', waveHeight: '10m以上' },
                    { areaCode: '221', status: 'major_warning', waveHeight: '10m以上' },
                    { areaCode: '231', status: 'warning', waveHeight: '3m' },
                    { areaCode: '241', status: 'warning', waveHeight: '3m' },
                    { areaCode: '251', status: 'advisory', waveHeight: '1m' }
                ]
            },
            'scenario2': {
                name: '関東地方津波注意報',
                description: '関東沖地震による津波注意報',
                regions: [
                    { areaCode: '231', status: 'advisory', waveHeight: '1m' },
                    { areaCode: '241', status: 'advisory', waveHeight: '1m' },
                    { areaCode: '251', status: 'advisory', waveHeight: '1m' },
                    { areaCode: '252', status: 'advisory', waveHeight: '1m' }
                ]
            },
            'scenario3': {
                name: '南海トラフ津波警報',
                description: '南海トラフ巨大地震津波警報',
                regions: [
                    { areaCode: '211', status: 'warning', waveHeight: '5m' },
                    { areaCode: '221', status: 'warning', waveHeight: '5m' },
                    { areaCode: '231', status: 'warning', waveHeight: '3m' },
                    { areaCode: '241', status: 'warning', waveHeight: '3m' },
                    { areaCode: '251', status: 'advisory', waveHeight: '2m' }
                ]
            },
            'cleared': {
                name: '全津波警報解除',
                description: '全ての津波警報・注意報解除',
                regions: []
            }
        };
    }
    
    /**
     * シミュレーション実行
     */
    runSimulation(scenarioKey) {
        const scenario = this.simulationMode.scenarios[scenarioKey];
        if (!scenario) {
            throw new Error(`シナリオ '${scenarioKey}' が見つかりません`);
        }
        
        console.log(`🎬 津波シミュレーション実行: ${scenario.name}`);
        
        // シミュレーションデータを作成
        const simulationData = {
            type: "FeatureCollection",
            features: scenario.regions.map(region => ({
                type: "Feature",
                properties: {
                    AREA_CODE: region.areaCode,
                    AREA_NAME: this.config.forecastAreas[region.areaCode]?.name || '不明',
                    STATUS: region.status,
                    WAVE_HEIGHT: region.waveHeight,
                    ARRIVAL_TIME: '推定中',
                    ISSUED_AT: new Date().toISOString(),
                    SIMULATION: true
                },
                geometry: this.getDefaultGeometry(region.areaCode)
            }))
        };
        
        this.simulationMode.enabled = true;
        this.updateTsunamiState(simulationData);
        
        console.log(`✅ シミュレーション完了: ${scenario.regions.length}地域に影響`);
        
        return {
            success: true,
            scenario: scenario.name,
            affectedRegions: scenario.regions.length
        };
    }
    
    /**
     * シミュレーション停止
     */
    stopSimulation() {
        if (this.simulationMode.enabled) {
            console.log('🛑 津波シミュレーション停止');
            this.simulationMode.enabled = false;
            this.initializeState(); // 通常状態に戻す
        }
    }
    
    /**
     * デフォルト地理情報取得 (簡易版)
     */
    getDefaultGeometry(areaCode) {
        // 簡易的な座標データ (実際の形状ではない)
        const defaultCoords = {
            '191': [[[145.0, 42.0], [146.0, 42.0], [146.0, 43.0], [145.0, 43.0], [145.0, 42.0]]],
            '192': [[[143.0, 41.0], [144.0, 41.0], [144.0, 42.0], [143.0, 42.0], [143.0, 41.0]]],
            '201': [[[140.5, 40.0], [141.5, 40.0], [141.5, 41.0], [140.5, 41.0], [140.5, 40.0]]],
            '211': [[[141.0, 39.0], [142.0, 39.0], [142.0, 40.0], [141.0, 40.0], [141.0, 39.0]]],
            '221': [[[140.5, 38.0], [141.5, 38.0], [141.5, 39.0], [140.5, 39.0], [140.5, 38.0]]],
            '231': [[[140.0, 37.0], [141.0, 37.0], [141.0, 38.0], [140.0, 38.0], [140.0, 37.0]]],
            '241': [[[140.0, 36.0], [141.0, 36.0], [141.0, 37.0], [140.0, 37.0], [140.0, 36.0]]],
            '251': [[[140.0, 35.0], [141.0, 35.0], [141.0, 36.0], [140.0, 36.0], [140.0, 35.0]]],
            '252': [[[139.5, 35.0], [140.5, 35.0], [140.5, 35.5], [139.5, 35.5], [139.5, 35.0]]],
            '281': [[[142.0, 26.0], [143.0, 26.0], [143.0, 27.0], [142.0, 27.0], [142.0, 26.0]]]
        };
        
        return {
            type: "Polygon",
            coordinates: defaultCoords[areaCode] || [[[140.0, 35.0], [141.0, 35.0], [141.0, 36.0], [140.0, 36.0], [140.0, 35.0]]]
        };
    }
    
    /**
     * デバッグ情報出力
     */
    debug() {
        return {
            state: this.currentState,
            config: this.config,
            statistics: this.getStatistics(),
            simulation: this.simulationMode,
            updateTimer: this.updateTimer !== null
        };
    }
}

// グローバル公開
if (typeof window !== 'undefined') {
    window.TsunamiManager = TsunamiManager;
}

// Node.js環境対応
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TsunamiManager;
}

console.log('🌊 津波状態管理システム (30%完成度版) 準備完了');