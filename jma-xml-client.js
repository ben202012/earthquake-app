/**
 * 気象庁XML津波データ実取得クライアント
 * 実用機能50%達成のための実装
 */

class JMAXMLClient {
    constructor() {
        this.config = {
            // 気象庁XML配信サービス (PULL型)
            xmlEndpoints: {
                primary: 'https://xml.kishou.go.jp/data/tsunami/',
                secondary: 'https://xml.kishou.go.jp/forecast/tsunami/',
                historical: 'https://xml.kishou.go.jp/historicaldata/'
            },
            
            // 注意: 外部プロキシサービスは信頼性とセキュリティ上の問題があります
            // 可能な限り自前のプロキシ機能やCORS設定で対応することを推奨
            proxyService: null, // 'https://api.allorigins.win/get?url=' - セキュリティ上無効化
            corsProxyAlternative: null, // 'https://corsproxy.io/?' - セキュリティ上無効化
            
            // 代替案: 自前のプロキシエンドポイントを使用
            selfProxyEndpoint: '/api/proxy/jma',
            
            // 更新間隔
            updateInterval: 60000, // 1分間隔
            retryInterval: 30000,   // エラー時30秒後リトライ
            
            // 津波XML電文コード
            xmlCodes: {
                tsunami_warning: 'VTSE41',
                tsunami_info: 'VTSE51', 
                tsunami_cancel: 'VTSE52'
            }
        };
        
        this.state = {
            isActive: false,
            lastUpdate: null,
            error: null,
            retryCount: 0,
            maxRetries: 5
        };
        
        this.updateTimer = null;
        this.callbacks = {
            onTsunamiData: [],
            onError: [],
            onStateChange: []
        };
    }
    
    /**
     * 実際の気象庁津波XMLデータ取得
     */
    async fetchTsunamiXML() {
        console.log('📡 気象庁津波XML取得開始...');
        
        try {
            // 複数のエンドポイントを試行
            const endpoints = [
                this.config.xmlEndpoints.primary,
                this.config.xmlEndpoints.secondary
            ];
            
            for (const endpoint of endpoints) {
                try {
                    const data = await this.fetchWithProxy(endpoint);
                    if (data) {
                        console.log('✅ 気象庁XMLデータ取得成功');
                        return this.parseTsunamiXML(data);
                    }
                } catch (error) {
                    console.warn(`⚠️ エンドポイント失敗: ${endpoint}`, error.message);
                }
            }
            
            throw new Error('全ての気象庁エンドポイントが利用不可');
            
        } catch (error) {
            console.error('❌ 気象庁XML取得失敗:', error);
            throw error;
        }
    }
    
    /**
     * セキュアなプロキシ経由でのデータ取得
     * 外部プロキシサービスを廃止し、自前のプロキシ機能を使用
     */
    async fetchWithProxy(url) {
        // セキュリティ改善: 外部プロキシサービスの使用を停止
        // 自前のプロキシエンドポイントを使用
        
        try {
            // 自前のプロキシサーバーを使用（セキュア）
            const selfProxyUrl = `${this.config.selfProxyEndpoint}?url=${encodeURIComponent(url)}`;
            
            const response = await fetch(selfProxyUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/xml, text/xml, */*',
                    'User-Agent': 'JMA-Tsunami-Monitor/1.0',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                // セキュリティ: タイムアウト設定でDDoS防止
                signal: AbortSignal.timeout(15000)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const text = await response.text();
            return text;
            
        } catch (error) {
            console.warn(`セキュアプロキシ失敗: ${error.message}`);
            
            // フォールバック: 直接取得を試行（CORSエラーの可能性あり）
            try {
                console.log('🔄 直接API接続にフォールバック中...');
                const directResponse = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/xml, text/xml, */*',
                        'User-Agent': 'JMA-Tsunami-Monitor/1.0'
                    },
                    signal: AbortSignal.timeout(10000)
                });
                
                if (directResponse.ok) {
                    console.log('✅ 直接接続成功');
                    return await directResponse.text();
                }
            } catch (directError) {
                console.warn('直接接続も失敗:', directError.message);
            }
            
            throw new Error('セキュアなデータ取得に失敗しました');
        }
    }
    
    /**
     * 津波XMLデータ解析
     */
    parseTsunamiXML(xmlText) {
        try {
            // XMLパーサーを使用
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            // パースエラーチェック
            const parseError = xmlDoc.querySelector('parsererror');
            if (parseError) {
                throw new Error('XML解析エラー: ' + parseError.textContent);
            }
            
            // 津波情報を抽出
            const tsunamiData = this.extractTsunamiInfo(xmlDoc);
            
            console.log('📊 津波XML解析完了:', tsunamiData);
            return tsunamiData;
            
        } catch (error) {
            console.error('❌ XML解析失敗:', error);
            throw error;
        }
    }
    
    /**
     * XML から津波情報を抽出
     */
    extractTsunamiInfo(xmlDoc) {
        const result = {
            type: 'FeatureCollection',
            features: [],
            metadata: {
                source: 'JMA-XML',
                timestamp: new Date().toISOString(),
                isActive: false
            }
        };
        
        try {
            // 基本情報取得
            const info = xmlDoc.querySelector('Head > Title');
            const eventTime = xmlDoc.querySelector('Head > ReportDateTime');
            const status = xmlDoc.querySelector('Head > Status');
            
            result.metadata.title = info?.textContent || '津波情報';
            result.metadata.eventTime = eventTime?.textContent || new Date().toISOString();
            result.metadata.status = status?.textContent || 'Unknown';
            
            // 津波予報区情報取得
            const areas = xmlDoc.querySelectorAll('Area');
            
            areas.forEach(area => {
                const areaCode = area.querySelector('Code')?.textContent;
                const areaName = area.querySelector('Name')?.textContent;
                const category = area.querySelector('Category')?.textContent;
                
                if (areaCode && areaName) {
                    // カテゴリから津波レベルを判定
                    const tsunamiLevel = this.categorizeTsunamiLevel(category);
                    
                    // アクティブな津波情報の場合のみ追加
                    if (tsunamiLevel !== 'cleared') {
                        result.features.push({
                            type: 'Feature',
                            properties: {
                                AREA_CODE: areaCode,
                                AREA_NAME: areaName,
                                STATUS: tsunamiLevel,
                                WAVE_HEIGHT: this.extractWaveHeight(area),
                                ARRIVAL_TIME: this.extractArrivalTime(area),
                                ISSUED_AT: result.metadata.eventTime,
                                SOURCE: 'JMA-XML-REAL'
                            },
                            geometry: this.getAreaGeometry(areaCode)
                        });
                        
                        result.metadata.isActive = true;
                    }
                }
            });
            
            console.log(`📍 津波予報区 ${result.features.length} 地域を解析`);
            return result;
            
        } catch (error) {
            console.error('津波情報抽出エラー:', error);
            return result; // 空のデータを返す
        }
    }
    
    /**
     * カテゴリから津波レベルを判定
     */
    categorizeTsunamiLevel(category) {
        if (!category) return 'cleared';
        
        const levelMap = {
            '大津波警報': 'major_warning',
            '津波警報': 'warning', 
            '津波注意報': 'advisory',
            '津波予報': 'forecast',
            '解除': 'cleared',
            'なし': 'cleared'
        };
        
        return levelMap[category] || 'advisory';
    }
    
    /**
     * 予想津波高を抽出
     */
    extractWaveHeight(areaElement) {
        const height = areaElement.querySelector('MaxHeight')?.textContent ||
                     areaElement.querySelector('Height')?.textContent;
        
        if (height) {
            return height.includes('m') ? height : `${height}m`;
        }
        
        return '不明';
    }
    
    /**
     * 津波到達予想時刻を抽出
     */
    extractArrivalTime(areaElement) {
        const arrivalTime = areaElement.querySelector('ArrivalTime')?.textContent ||
                           areaElement.querySelector('FirstArrivalTime')?.textContent;
        
        return arrivalTime || '推定中';
    }
    
    /**
     * 地域コードから地理情報取得
     */
    getAreaGeometry(areaCode) {
        // 簡易的な座標データ (実際のプロジェクトではより詳細な地理データを使用)
        const geometryMap = {
            '100': [[[140.0, 35.0], [141.0, 35.0], [141.0, 36.0], [140.0, 36.0], [140.0, 35.0]]],
            '191': [[[145.0, 42.0], [146.0, 42.0], [146.0, 43.0], [145.0, 43.0], [145.0, 42.0]]],
            '192': [[[143.0, 41.0], [144.0, 41.0], [144.0, 42.0], [143.0, 42.0], [143.0, 41.0]]],
            '201': [[[140.5, 40.0], [141.5, 40.0], [141.5, 41.0], [140.5, 41.0], [140.5, 40.0]]],
            '211': [[[141.0, 39.0], [142.0, 39.0], [142.0, 40.0], [141.0, 40.0], [141.0, 39.0]]],
            '221': [[[140.5, 38.0], [141.5, 38.0], [141.5, 39.0], [140.5, 39.0], [140.5, 38.0]]],
            '231': [[[140.0, 37.0], [141.0, 37.0], [141.0, 38.0], [140.0, 38.0], [140.0, 37.0]]],
            '241': [[[140.0, 36.0], [141.0, 36.0], [141.0, 37.0], [140.0, 37.0], [140.0, 36.0]]],
            '251': [[[140.0, 35.0], [141.0, 35.0], [141.0, 36.0], [140.0, 36.0], [140.0, 35.0]]],
            '281': [[[142.0, 26.0], [143.0, 26.0], [143.0, 27.0], [142.0, 27.0], [142.0, 26.0]]]
        };
        
        return {
            type: 'Polygon',
            coordinates: geometryMap[areaCode] || geometryMap['100']
        };
    }
    
    /**
     * リアルタイム情報取得開始
     */
    startRealTimeMonitoring() {
        console.log('🔄 気象庁津波XMLリアルタイム情報取得開始');

        this.state.isActive = true;
        this.state.retryCount = 0;

        // 即座に初回取得
        this.performUpdate();

        // 定期取得開始
        this.updateTimer = setInterval(() => {
            this.performUpdate();
        }, this.config.updateInterval);

        this.notifyStateChange();
    }

    /**
     * 情報取得停止
     */
    stopRealTimeMonitoring() {
        console.log('⏹️ 気象庁津波XMLリアルタイム情報取得停止');
        
        this.state.isActive = false;
        
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
        
        this.notifyStateChange();
    }
    
    /**
     * 更新実行
     */
    async performUpdate() {
        try {
            const tsunamiData = await this.fetchTsunamiXML();
            
            // 成功時
            this.state.lastUpdate = new Date();
            this.state.error = null;
            this.state.retryCount = 0;
            
            // コールバック通知
            this.notifyTsunamiData(tsunamiData);
            
        } catch (error) {
            // エラー時
            this.state.error = error.message;
            this.state.retryCount++;
            
            console.error(`❌ 津波データ更新失敗 (${this.state.retryCount}/${this.state.maxRetries}):`, error);
            
            // 最大リトライ回数に達した場合
            if (this.state.retryCount >= this.state.maxRetries) {
                console.error('🚨 気象庁XMLサービス接続不可 - フォールバックモードに切り替え');
                this.notifyError(new Error('気象庁XMLサービスに接続できません'));
            } else {
                // リトライスケジュール
                setTimeout(() => {
                    if (this.state.isActive) {
                        this.performUpdate();
                    }
                }, this.config.retryInterval);
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
     * 津波データ通知
     */
    notifyTsunamiData(data) {
        this.callbacks.onTsunamiData.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('津波データコールバックエラー:', error);
            }
        });
    }
    
    /**
     * エラー通知
     */
    notifyError(error) {
        this.callbacks.onError.forEach(callback => {
            try {
                callback(error);
            } catch (err) {
                console.error('エラーコールバック失敗:', err);
            }
        });
    }
    
    /**
     * 状態変化通知
     */
    notifyStateChange() {
        this.callbacks.onStateChange.forEach(callback => {
            try {
                callback(this.state);
            } catch (error) {
                console.error('状態変化コールバックエラー:', error);
            }
        });
    }
    
    /**
     * 状態取得
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * 手動更新
     */
    async manualUpdate() {
        console.log('🔄 気象庁XML手動更新実行');
        return await this.performUpdate();
    }
}

// グローバル公開
if (typeof window !== 'undefined') {
    window.JMAXMLClient = JMAXMLClient;
}

// Node.js環境対応
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JMAXMLClient;
}

console.log('📡 気象庁XML津波データクライアント準備完了');