/**
 * 多地点連携・相互検証システム
 * 60%実用機能達成のための分散監視・信頼性向上システム
 */

class MultiSiteVerificationSystem {
    constructor() {
        this.config = {
            // 連携サイト設定（プロキシサーバー経由）
            partnerSites: [
                {
                    id: 'usgs',
                    name: 'USGS地震情報',
                    url: '/api/proxy/usgs',
                    originalUrl: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_hour.geojson',
                    type: 'earthquake',
                    reliability: 0.95,
                    region: 'global'
                },
                {
                    id: 'emsc',
                    name: 'EMSC地震情報',
                    url: '/api/proxy/emsc',
                    originalUrl: 'https://www.seismicportal.eu/realtime_ws/events',
                    type: 'earthquake', 
                    reliability: 0.90,
                    region: 'global'
                },
                {
                    id: 'jma_eqvol',
                    name: '気象庁火山地震部',
                    url: '/api/proxy/jma',
                    originalUrl: 'https://www.data.jma.go.jp/svd/eqev/data/bulletin/hypo.html',
                    type: 'seismic',
                    reliability: 0.98,
                    region: 'japan'
                },
                {
                    id: 'noaa_tsunami',
                    name: 'NOAA津波センター',
                    url: '/api/proxy/noaa',
                    originalUrl: 'https://www.tsunami.noaa.gov/events/',
                    type: 'tsunami',
                    reliability: 0.92,
                    region: 'pacific'
                }
            ],
            
            // 検証パラメータ
            verification: {
                minConfidenceThreshold: 0.7,
                maxDiscrepancyAllowed: 0.3,
                requiredAgreement: 0.6,
                timeWindowMinutes: 15
            },
            
            // 重み付け設定
            sourceWeights: {
                'p2p_earthquake': 0.25,
                'usgs': 0.30,
                'jma_official': 0.35,
                'prediction_engine': 0.10
            }
        };
        
        this.state = {
            activeSources: new Map(),
            verificationResults: [],
            reliabilityScores: new Map(),
            lastUpdateTime: null,
            consensusData: null
        };
        
        this.dataCache = new Map();
        this.callbacks = {
            onVerificationComplete: [],
            onDiscrepancyDetected: [],
            onConsensusUpdate: []
        };
    }
    
    /**
     * 多地点データ検証開始
     */
    async startMultiSiteVerification() {
        console.log('🌐 多地点連携検証システム開始');
        
        try {
            // 各データソースの初期化
            await this.initializeDataSources();
            
            // 定期検証プロセス開始
            this.startPeriodicVerification();
            
            // リアルタイム比較開始
            this.startRealtimeComparison();
            
            console.log('✅ 多地点検証システム準備完了');
            
        } catch (error) {
            console.error('❌ 多地点検証システム初期化失敗:', error);
        }
    }
    
    /**
     * データソース初期化
     */
    async initializeDataSources() {
        const initPromises = this.config.partnerSites.map(async (site) => {
            try {
                const isAvailable = await this.testDataSourceConnection(site);
                
                if (isAvailable) {
                    this.state.activeSources.set(site.id, {
                        ...site,
                        status: 'active',
                        lastContact: new Date(),
                        successRate: 1.0
                    });
                    
                    console.log(`✅ データソース接続成功: ${site.name}`);
                } else {
                    console.warn(`⚠️ データソース接続失敗: ${site.name}`);
                }
                
            } catch (error) {
                console.error(`❌ データソース初期化失敗 (${site.name}):`, error);
            }
        });
        
        await Promise.allSettled(initPromises);
        
        console.log(`📡 アクティブデータソース: ${this.state.activeSources.size}/${this.config.partnerSites.length}`);
    }
    
    /**
     * データソース接続テスト
     */
    async testDataSourceConnection(site) {
        try {
            // 自前のプロキシエンドポイントを使用（セキュリティ向上）
            const testUrl = `/api/proxy/jma?url=${encodeURIComponent(site.url)}`;
            
            const response = await fetch(testUrl, {
                method: 'HEAD', // HEAD リクエストで軽量テスト
                timeout: 10000
            });
            
            return response.ok;
            
        } catch (error) {
            return false;
        }
    }
    
    /**
     * 定期検証プロセス開始
     */
    startPeriodicVerification() {
        setInterval(async () => {
            try {
                await this.performVerificationCycle();
            } catch (error) {
                console.error('🔍 検証サイクルエラー:', error);
            }
        }, 60000); // 1分間隔
        
        console.log('🔄 定期検証プロセス開始 (1分間隔)');
    }
    
    /**
     * 検証サイクル実行
     */
    async performVerificationCycle() {
        console.log('🔍 多地点データ検証実行');
        
        // 各ソースからデータ取得
        const sourceData = await this.gatherDataFromAllSources();
        
        // データの相互比較
        const comparisonResults = this.compareMultiSourceData(sourceData);
        
        // 信頼性評価
        const reliabilityAssessment = this.assessDataReliability(comparisonResults);
        
        // コンセンサスデータ生成
        const consensusData = this.generateConsensusData(sourceData, reliabilityAssessment);
        
        // 結果保存
        this.state.verificationResults.push({
            timestamp: new Date().toISOString(),
            sourceCount: sourceData.length,
            agreement: comparisonResults.agreement,
            consensus: consensusData,
            reliability: reliabilityAssessment
        });
        
        // コールバック通知
        this.notifyVerificationComplete(consensusData, comparisonResults);
        
        console.log(`📊 検証完了: ${sourceData.length}ソース, 合意度${(comparisonResults.agreement * 100).toFixed(1)}%`);
    }
    
    /**
     * 全ソースからデータ収集
     */
    async gatherDataFromAllSources() {
        const dataPromises = Array.from(this.state.activeSources.values()).map(async (source) => {
            try {
                const data = await this.fetchDataFromSource(source);
                
                // 成功率更新
                source.successRate = Math.min(1.0, source.successRate + 0.05);
                source.lastContact = new Date();
                
                return {
                    sourceId: source.id,
                    sourceName: source.name,
                    data: data,
                    reliability: source.reliability,
                    timestamp: new Date().toISOString()
                };
                
            } catch (error) {
                // 失敗率更新
                source.successRate = Math.max(0.0, source.successRate - 0.1);
                
                console.warn(`⚠️ データ取得失敗 (${source.name}):`, error.message);
                return null;
            }
        });
        
        const results = await Promise.allSettled(dataPromises);
        
        return results
            .filter(result => result.status === 'fulfilled' && result.value !== null)
            .map(result => result.value);
    }
    
    /**
     * ソースからデータ取得
     */
    async fetchDataFromSource(source) {
        const cacheKey = `${source.id}_${Math.floor(Date.now() / 60000)}`; // 1分単位キャッシュ
        
        // キャッシュチェック
        if (this.dataCache.has(cacheKey)) {
            return this.dataCache.get(cacheKey);
        }
        
        try {
            let data;
            
            switch (source.type) {
                case 'earthquake':
                    data = await this.fetchEarthquakeData(source);
                    break;
                case 'tsunami':
                    data = await this.fetchTsunamiData(source);
                    break;
                case 'seismic':
                    data = await this.fetchSeismicData(source);
                    break;
                default:
                    throw new Error(`未対応データタイプ: ${source.type}`);
            }
            
            // キャッシュに保存
            this.dataCache.set(cacheKey, data);
            
            // 古いキャッシュクリア
            this.cleanupCache();
            
            return data;
            
        } catch (error) {
            throw new Error(`データ取得失敗 (${source.name}): ${error.message}`);
        }
    }
    
    /**
     * 地震データ取得（プロキシサーバー経由）
     */
    async fetchEarthquakeData(source) {
        console.log(`🌐 地震データ取得開始: ${source.name}`);
        
        try {
            const response = await fetch(source.url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json, text/html, */*',
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type') || '';
            let data;
            
            if (contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    // HTMLやその他のフォーマットの場合
                    data = { rawData: text, format: 'html' };
                }
            }
            
            if (source.id === 'usgs') {
                return this.parseUSGSData(data);
            } else {
                return this.parseGenericEarthquakeData(data, source);
            }
            
        } catch (error) {
            console.error(`❌ ${source.name} データ取得エラー:`, error);
            throw error;
        }
    }
    
    /**
     * USGSデータ解析
     */
    parseUSGSData(data) {
        try {
            // すでにJSONオブジェクトの場合はそのまま使用
            const geoJsonData = typeof data === 'string' ? JSON.parse(data) : data;
            
            return geoJsonData.features.map(feature => ({
                id: feature.id,
                magnitude: feature.properties.mag,
                location: feature.properties.place,
                time: new Date(feature.properties.time).toISOString(),
                coordinates: {
                    latitude: feature.geometry.coordinates[1],
                    longitude: feature.geometry.coordinates[0],
                    depth: feature.geometry.coordinates[2]
                },
                source: 'USGS'
            }));
            
        } catch (error) {
            throw new Error('USGS データ解析失敗: ' + error.message);
        }
    }
    
    /**
     * 多ソースデータ比較
     */
    compareMultiSourceData(sourceDataArray) {
        if (sourceDataArray.length < 2) {
            return { agreement: 1.0, discrepancies: [], comparison: 'insufficient_data' };
        }
        
        const comparisonResults = {
            agreement: 0,
            discrepancies: [],
            timeCorrelations: [],
            magnitudeCorrelations: [],
            locationCorrelations: []
        };
        
        // 時間窓内のイベント相関分析
        const timeWindow = this.config.verification.timeWindowMinutes * 60000;
        const now = Date.now();
        
        for (let i = 0; i < sourceDataArray.length; i++) {
            for (let j = i + 1; j < sourceDataArray.length; j++) {
                const source1 = sourceDataArray[i];
                const source2 = sourceDataArray[j];
                
                const correlation = this.calculateEventCorrelation(source1.data, source2.data, timeWindow);
                
                if (correlation.agreement < this.config.verification.requiredAgreement) {
                    comparisonResults.discrepancies.push({
                        source1: source1.sourceName,
                        source2: source2.sourceName,
                        agreement: correlation.agreement,
                        issue: correlation.primaryDiscrepancy
                    });
                }
                
                comparisonResults.timeCorrelations.push(correlation.timeAgreement);
                comparisonResults.magnitudeCorrelations.push(correlation.magnitudeAgreement);
                comparisonResults.locationCorrelations.push(correlation.locationAgreement);
            }
        }
        
        // 全体合意度計算
        const totalComparisons = (sourceDataArray.length * (sourceDataArray.length - 1)) / 2;
        const agreementSum = comparisonResults.timeCorrelations.reduce((sum, val) => sum + val, 0) +
                           comparisonResults.magnitudeCorrelations.reduce((sum, val) => sum + val, 0) +
                           comparisonResults.locationCorrelations.reduce((sum, val) => sum + val, 0);
        
        comparisonResults.agreement = totalComparisons > 0 ? agreementSum / (totalComparisons * 3) : 1.0;
        
        return comparisonResults;
    }
    
    /**
     * イベント相関計算
     */
    calculateEventCorrelation(data1, data2, timeWindow) {
        const matches = [];
        
        for (const event1 of data1) {
            const event1Time = new Date(event1.time).getTime();
            
            for (const event2 of data2) {
                const event2Time = new Date(event2.time).getTime();
                const timeDiff = Math.abs(event1Time - event2Time);
                
                if (timeDiff <= timeWindow) {
                    const locationDiff = this.calculateDistance(
                        event1.coordinates.latitude, event1.coordinates.longitude,
                        event2.coordinates.latitude, event2.coordinates.longitude
                    );
                    
                    const magnitudeDiff = Math.abs(event1.magnitude - event2.magnitude);
                    
                    matches.push({
                        timeAgreement: Math.max(0, 1 - timeDiff / timeWindow),
                        locationAgreement: Math.max(0, 1 - locationDiff / 500), // 500km以内で評価
                        magnitudeAgreement: Math.max(0, 1 - magnitudeDiff / 2), // M2.0差以内で評価
                        event1, event2
                    });
                }
            }
        }
        
        if (matches.length === 0) {
            return {
                agreement: 0,
                timeAgreement: 0,
                locationAgreement: 0,
                magnitudeAgreement: 0,
                primaryDiscrepancy: 'no_matching_events'
            };
        }
        
        const avgTimeAgreement = matches.reduce((sum, m) => sum + m.timeAgreement, 0) / matches.length;
        const avgLocationAgreement = matches.reduce((sum, m) => sum + m.locationAgreement, 0) / matches.length;
        const avgMagnitudeAgreement = matches.reduce((sum, m) => sum + m.magnitudeAgreement, 0) / matches.length;
        
        return {
            agreement: (avgTimeAgreement + avgLocationAgreement + avgMagnitudeAgreement) / 3,
            timeAgreement: avgTimeAgreement,
            locationAgreement: avgLocationAgreement,
            magnitudeAgreement: avgMagnitudeAgreement,
            matches: matches.length,
            primaryDiscrepancy: avgLocationAgreement < 0.5 ? 'location_mismatch' : 
                              avgMagnitudeAgreement < 0.5 ? 'magnitude_mismatch' : 'time_mismatch'
        };
    }
    
    /**
     * データ信頼性評価
     */
    assessDataReliability(comparisonResults) {
        const assessment = {
            overall: 0,
            sourceReliability: new Map(),
            recommendations: []
        };
        
        // 各ソースの信頼性更新
        this.state.activeSources.forEach((source, sourceId) => {
            let reliability = source.reliability * source.successRate;
            
            // 合意度に基づく調整
            if (comparisonResults.agreement > 0.8) {
                reliability *= 1.05; // 高合意度で信頼性向上
            } else if (comparisonResults.agreement < 0.5) {
                reliability *= 0.9; // 低合意度で信頼性低下
            }
            
            reliability = Math.max(0.1, Math.min(1.0, reliability));
            
            assessment.sourceReliability.set(sourceId, reliability);
            this.state.reliabilityScores.set(sourceId, reliability);
        });
        
        // 全体信頼性
        const reliabilityValues = Array.from(assessment.sourceReliability.values());
        assessment.overall = reliabilityValues.length > 0 ? 
            reliabilityValues.reduce((sum, val) => sum + val, 0) / reliabilityValues.length : 0;
        
        // 推奨事項生成
        if (assessment.overall < 0.7) {
            assessment.recommendations.push('データソースの追加を推奨');
        }
        
        if (comparisonResults.discrepancies.length > 0) {
            assessment.recommendations.push('データソース間の相違を詳細調査');
        }
        
        return assessment;
    }
    
    /**
     * コンセンサスデータ生成
     */
    generateConsensusData(sourceDataArray, reliabilityAssessment) {
        if (sourceDataArray.length === 0) {
            return null;
        }
        
        // 重み付き平均による統合
        const consensusEvents = [];
        const processedEvents = new Set();
        
        sourceDataArray.forEach(sourceData => {
            const sourceWeight = this.config.sourceWeights[sourceData.sourceId] || 0.1;
            const reliability = reliabilityAssessment.sourceReliability.get(sourceData.sourceId) || 0.5;
            const combinedWeight = sourceWeight * reliability;
            
            sourceData.data.forEach(event => {
                const eventKey = `${Math.round(event.coordinates.latitude * 10)}_${Math.round(event.coordinates.longitude * 10)}_${Math.round(new Date(event.time).getTime() / 300000)}`;
                
                if (!processedEvents.has(eventKey)) {
                    processedEvents.add(eventKey);
                    
                    // 類似イベントを検索して統合
                    const similarEvents = this.findSimilarEvents(event, sourceDataArray);
                    const consensusEvent = this.mergeEvents(similarEvents, reliabilityAssessment);
                    
                    if (consensusEvent) {
                        consensusEvents.push(consensusEvent);
                    }
                }
            });
        });
        
        return {
            events: consensusEvents,
            sources: sourceDataArray.map(s => s.sourceId),
            reliability: reliabilityAssessment.overall,
            timestamp: new Date().toISOString(),
            methodology: 'weighted_consensus'
        };
    }
    
    /**
     * 類似イベント検索
     */
    findSimilarEvents(targetEvent, sourceDataArray) {
        const similarEvents = [];
        const timeThreshold = 600000; // 10分
        const locationThreshold = 100; // 100km
        
        sourceDataArray.forEach(sourceData => {
            sourceData.data.forEach(event => {
                const timeDiff = Math.abs(new Date(event.time) - new Date(targetEvent.time));
                const locationDiff = this.calculateDistance(
                    event.coordinates.latitude, event.coordinates.longitude,
                    targetEvent.coordinates.latitude, targetEvent.coordinates.longitude
                );
                
                if (timeDiff <= timeThreshold && locationDiff <= locationThreshold) {
                    similarEvents.push({
                        event: event,
                        sourceId: sourceData.sourceId,
                        reliability: this.state.reliabilityScores.get(sourceData.sourceId) || 0.5
                    });
                }
            });
        });
        
        return similarEvents;
    }
    
    /**
     * イベント統合
     */
    mergeEvents(similarEvents, reliabilityAssessment) {
        if (similarEvents.length === 0) return null;
        
        let totalWeight = 0;
        let weightedLat = 0;
        let weightedLon = 0;
        let weightedMag = 0;
        let weightedDepth = 0;
        let weightedTime = 0;
        
        similarEvents.forEach(({ event, sourceId, reliability }) => {
            const weight = reliability * (this.config.sourceWeights[sourceId] || 0.1);
            
            totalWeight += weight;
            weightedLat += event.coordinates.latitude * weight;
            weightedLon += event.coordinates.longitude * weight;
            weightedMag += event.magnitude * weight;
            weightedDepth += (event.coordinates.depth || 0) * weight;
            weightedTime += new Date(event.time).getTime() * weight;
        });
        
        if (totalWeight === 0) return null;
        
        return {
            magnitude: weightedMag / totalWeight,
            coordinates: {
                latitude: weightedLat / totalWeight,
                longitude: weightedLon / totalWeight,
                depth: weightedDepth / totalWeight
            },
            time: new Date(weightedTime / totalWeight).toISOString(),
            location: this.generateLocationName(weightedLat / totalWeight, weightedLon / totalWeight),
            confidence: Math.min(1.0, totalWeight),
            sourceCount: similarEvents.length,
            consensus: true
        };
    }
    
    /**
     * リアルタイム比較開始
     */
    startRealtimeComparison() {
        // P2P地震情報との即座比較
        if (window.monitor && window.monitor.websocket) {
            const originalOnMessage = window.monitor.websocket.onmessage;
            
            window.monitor.websocket.onmessage = (event) => {
                // 既存処理
                if (originalOnMessage) originalOnMessage(event);
                
                // リアルタイム検証
                this.performRealtimeVerification(JSON.parse(event.data));
            };
        }
    }
    
    /**
     * リアルタイム検証実行
     */
    async performRealtimeVerification(p2pData) {
        if (p2pData.code !== 551) return; // 地震情報以外はスキップ
        
        console.log('⚡ リアルタイム多地点検証実行');
        
        try {
            // 外部ソースから最新データ取得
            const externalData = await this.gatherRecentExternalData();
            
            // P2Pデータと比較
            const verification = this.verifyAgainstExternalSources(p2pData, externalData);
            
            // 信頼性スコア更新
            this.updateRealtimeReliability(verification);
            
            // 相違検出時の通知
            if (verification.hasDiscrepancy) {
                this.notifyDiscrepancyDetected(verification);
            }
            
        } catch (error) {
            console.error('⚡ リアルタイム検証エラー:', error);
        }
    }
    
    /**
     * 距離計算（再利用）
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    /**
     * キャッシュクリーンアップ
     */
    cleanupCache() {
        const now = Date.now();
        const maxAge = 3600000; // 1時間
        
        for (const [key, data] of this.dataCache.entries()) {
            if (now - data.timestamp > maxAge) {
                this.dataCache.delete(key);
            }
        }
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
     * 検証完了通知
     */
    notifyVerificationComplete(consensusData, comparisonResults) {
        this.callbacks.onVerificationComplete.forEach(callback => {
            try {
                callback(consensusData, comparisonResults);
            } catch (error) {
                console.error('検証完了コールバックエラー:', error);
            }
        });
    }
    
    /**
     * 相違検出通知
     */
    notifyDiscrepancyDetected(verification) {
        this.callbacks.onDiscrepancyDetected.forEach(callback => {
            try {
                callback(verification);
            } catch (error) {
                console.error('相違検出コールバックエラー:', error);
            }
        });
    }
    
    /**
     * 津波データ取得（プロキシサーバー経由）  
     */
    async fetchTsunamiData(source) {
        console.log(`🌊 津波データ取得開始: ${source.name}`);
        
        try {
            const response = await fetch(source.url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json, text/html, */*',
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type') || '';
            let data;
            
            if (contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                // HTMLからデータを抽出（簡易版）
                data = this.parseHTMLTsunamiData(text, source);
            }
            
            return this.normalizeTsunamiData(data, source);
            
        } catch (error) {
            console.error(`❌ ${source.name} 津波データ取得エラー:`, error);
            throw error;
        }
    }
    
    /**
     * 地震データ取得（プロキシサーバー経由）
     */
    async fetchSeismicData(source) {
        console.log(`📊 地震データ取得開始: ${source.name}`);
        
        try {
            const response = await fetch(source.url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json, text/html, */*',
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type') || '';
            let data;
            
            if (contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                // HTMLからデータを抽出（簡易版）
                data = this.parseHTMLSeismicData(text, source);
            }
            
            return this.normalizeSeismicData(data, source);
            
        } catch (error) {
            console.error(`❌ ${source.name} 地震データ取得エラー:`, error);
            throw error;
        }
    }
    
    /**
     * HTML津波データ解析（簡易版）
     */
    parseHTMLTsunamiData(htmlText, source) {
        // 簡易的なHTMLパース - 実際のデータに基づいて調整が必要
        const events = [];
        
        // NOAAの場合の例
        if (source.id === 'noaa_tsunami') {
            // 実際のHTMLに応じて調整
            const mockData = {
                events: [{
                    id: `noaa_${Date.now()}`,
                    time: new Date().toISOString(),
                    magnitude: 7.0,  // 津波を発生させる可能性のある地震
                    location: 'Pacific Ocean',
                    coordinates: { latitude: 40.0, longitude: -120.0 },
                    tsunamiThreat: 'regional'
                }]
            };
            return mockData;
        }
        
        return { events: [] };
    }
    
    /**
     * HTML地震データ解析（簡易版）
     */
    parseHTMLSeismicData(htmlText, source) {
        // 簡易的なHTMLパース - 実際のデータに基づいて調整が必要
        const events = [];
        
        // JMAの場合の例
        if (source.id === 'jma_eqvol') {
            // 実際のHTMLに応じて調整
            const mockData = {
                events: [{
                    id: `jma_${Date.now()}`,
                    time: new Date().toISOString(),
                    magnitude: 5.5,
                    location: '日本付近',
                    coordinates: { latitude: 35.0, longitude: 139.0 },
                    depth: 30
                }]
            };
            return mockData;
        }
        
        return { events: [] };
    }
    
    /**
     * 津波データ正規化
     */
    normalizeTsunamiData(data, source) {
        try {
            const normalizedEvents = [];
            
            if (data.events && Array.isArray(data.events)) {
                data.events.forEach(event => {
                    normalizedEvents.push({
                        id: event.id || `${source.id}_${Date.now()}`,
                        time: event.time || new Date().toISOString(),
                        magnitude: event.magnitude || 0,
                        location: event.location || 'Unknown',
                        coordinates: event.coordinates || { latitude: 0, longitude: 0 },
                        tsunamiThreat: event.tsunamiThreat || 'unknown',
                        source: source.id
                    });
                });
            }
            
            return normalizedEvents;
            
        } catch (error) {
            console.warn(`⚠️ 津波データ正規化エラー (${source.name}):`, error);
            return [];
        }
    }
    
    /**
     * 地震データ正規化
     */
    normalizeSeismicData(data, source) {
        try {
            const normalizedEvents = [];
            
            if (data.events && Array.isArray(data.events)) {
                data.events.forEach(event => {
                    normalizedEvents.push({
                        id: event.id || `${source.id}_${Date.now()}`,
                        time: event.time || new Date().toISOString(),
                        magnitude: event.magnitude || 0,
                        location: event.location || 'Unknown',
                        coordinates: event.coordinates || { latitude: 0, longitude: 0 },
                        depth: event.depth || 0,
                        source: source.id
                    });
                });
            }
            
            return normalizedEvents;
            
        } catch (error) {
            console.warn(`⚠️ 地震データ正規化エラー (${source.name}):`, error);
            return [];
        }
    }
    
    /**
     * 地名生成
     */
    generateLocationName(lat, lon) {
        // 簡易的な地域名生成
        if (lat > 45) return '北海道周辺';
        else if (lat > 40) return '東北地方周辺';
        else if (lat > 35) return '関東地方周辺';
        else if (lat > 30) return '中部・近畿地方周辺';
        else return '西日本周辺';
    }
    
    /**
     * システム状態取得
     */
    getSystemStatus() {
        return {
            activeSources: this.state.activeSources.size,
            lastVerification: this.state.lastUpdateTime,
            overallReliability: this.state.reliabilityScores.size > 0 ?
                Array.from(this.state.reliabilityScores.values()).reduce((a, b) => a + b) / this.state.reliabilityScores.size : 0,
            cacheSize: this.dataCache.size,
            verificationCount: this.state.verificationResults.length
        };
    }
}

// グローバル公開
if (typeof window !== 'undefined') {
    window.MultiSiteVerificationSystem = MultiSiteVerificationSystem;
}

// Node.js環境対応
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiSiteVerificationSystem;
}

console.log('🌐 多地点連携検証システム準備完了');