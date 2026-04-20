/**
 * 気象庁津波予報区GeoJSONローダー（製品版）
 *
 * 経緯: data/jma-tsunami-areas.topojson は arcs が絶対値(非差分)で格納された
 * 仕様違反の TopoJSON だったため、scripts/convert_tsunami_topojson.py で
 * 一度だけ正しい GeoJSON (data/jma-tsunami-areas.geojson) に変換して以降
 * それを直接読み込むよう変更した。topojson.min.js への依存は不要。
 */

class JMATsunamiLoader {
    constructor() {
        this.dataUrl = './data/jma-tsunami-areas.geojson';
        this.cache = null;
        this.loadStartTime = null;
    }

    /**
     * 津波予報区データ読み込み
     * @returns {Object} GeoJSON Feature Collection
     */
    async loadTsunamiAreas() {
        if (this.cache) {
            console.log('✅ キャッシュからJMA津波予報区データ取得');
            return this.cache;
        }

        try {
            this.loadStartTime = performance.now();
            console.log('🔄 気象庁津波予報区GeoJSONデータ読み込み開始...');

            // GeoJSONファイル取得
            const response = await fetch(this.dataUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const geoData = await response.json();
            console.log('📊 GeoJSONデータ取得完了');

            // データ検証
            this.validateGeoData(geoData);

            // キャッシュに保存
            this.cache = geoData;

            const loadTime = Math.round(performance.now() - this.loadStartTime);
            console.log(`✅ JMA津波予報区データ読み込み完了`);
            console.log(`📈 パフォーマンス: ${loadTime}ms, ${geoData.features.length}地域`);
            console.log(`💾 データソース: 気象庁公式津波予報区 (GeoJSON)`);

            return geoData;

        } catch (error) {
            console.error('❌ 津波予報区データ読み込み失敗:', error);
            console.warn('🔄 フォールバックモードに切り替えます');

            // フォールバック：キャッシュにも保存して getActiveAreas() が動くようにする
            const fallback = this.getFallbackData();
            this.cache = fallback;
            return fallback;
        }
    }
    
    /**
     * データ検証
     * @param {Object} geoData - GeoJSONデータ
     */
    validateGeoData(geoData) {
        if (!geoData || !geoData.features) {
            throw new Error('無効なGeoJSONデータ構造');
        }
        
        const featureCount = geoData.features.length;
        if (featureCount === 0) {
            throw new Error('津波予報区データが空です');
        }
        
        // 必須プロパティの検証
        const requiredProps = ['AREA_NAME', 'AREA_CODE', 'STATUS'];
        const invalidFeatures = geoData.features.filter(feature => 
            !requiredProps.every(prop => feature.properties[prop])
        );
        
        if (invalidFeatures.length > 0) {
            console.warn(`⚠️  無効なプロパティを持つ地域: ${invalidFeatures.length}件`);
        }
        
        console.log(`✅ データ検証完了: ${featureCount}地域`);
    }
    
    /**
     * 特定地域コードの津波予報区取得
     * @param {string} areaCode - 地域コード
     * @returns {Object|null} 該当地域のFeature
     */
    getAreaByCode(areaCode) {
        if (!this.cache) {
            console.warn('⚠️  データが読み込まれていません');
            return null;
        }
        
        return this.cache.features.find(feature => 
            feature.properties.AREA_CODE === areaCode
        );
    }
    
    /**
     * 指定ステータスの津波予報区一覧取得
     * @param {string} status - ステータス ('advisory', 'warning', 'major_warning')
     * @returns {Array} 該当地域のFeature配列
     */
    getAreasByStatus(status = 'advisory') {
        if (!this.cache) {
            console.warn('⚠️  データが読み込まれていません');
            return [];
        }
        
        return this.cache.features.filter(feature => 
            feature.properties.STATUS === status && 
            !this.isStatusCleared(feature.properties.STATUS)
        );
    }
    
    /**
     * ステータスが解除されているかチェック
     * @param {string} status - チェックするステータス
     * @returns {boolean} 解除されている場合true
     */
    isStatusCleared(status) {
        // 'none' は平常時の初期値(警報未発令)。TV 同様、何も描画しない。
        const clearedStatuses = ['none', 'cleared', 'cancelled', 'lifted', 'discontinued'];
        return clearedStatuses.includes(status);
    }
    
    /**
     * アクティブな津波予報区のみ取得（解除されたものを除外）
     * @returns {Array} アクティブな地域のFeature配列
     */
    getActiveAreas() {
        if (!this.cache) {
            console.warn('⚠️  データが読み込まれていません');
            return [];
        }
        
        return this.cache.features.filter(feature => 
            !this.isStatusCleared(feature.properties.STATUS)
        );
    }
    
    /**
     * 全津波予報区の統計情報取得
     * @returns {Object} 統計情報
     */
    getStatistics() {
        if (!this.cache) return null;
        
        const features = this.cache.features;
        const statusCounts = {};
        
        features.forEach(feature => {
            const status = feature.properties.STATUS;
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        
        return {
            totalAreas: features.length,
            statusBreakdown: statusCounts,
            dataSource: '気象庁公式津波予報区',
            format: 'TopoJSON',
            coverage: '日本太平洋沿岸全体',
            lastUpdated: '2024-05-20'
        };
    }
    
    /**
     * フォールバックデータ（日本太平洋沿岸全体の津波予報区）
     * @returns {Object} 太平洋沿岸全体をカバーするGeoJSONデータ
     */
    getFallbackData() {
        console.log('🔄 フォールバック: 太平洋沿岸全体津波注意報データ使用');
        
        return {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    properties: {
                        AREA_NAME: "北海道太平洋沿岸東部",
                        AREA_CODE: "191",
                        STATUS: "cleared",
                        WAVE_HEIGHT: "1m",
                        ARRIVAL_TIME: "既に到達と推定"
                    },
                    geometry: {
                        type: "Polygon",
                        coordinates: [[
                            [145.8, 43.3], [145.7, 43.2], [145.6, 43.1], [145.5, 43.0],
                            [145.4, 42.9], [145.3, 42.8], [145.2, 42.7], [145.1, 42.6],
                            [145.0, 42.5], [144.9, 42.4], [144.8, 42.3], [144.7, 42.2],
                            [144.6, 42.1], [144.5, 42.0], [144.4, 41.9], [144.3, 41.8],
                            [144.2, 41.7], [144.1, 41.6], [144.0, 41.5], [143.9, 41.4],
                            [143.8, 41.3], [143.9, 41.2], [144.0, 41.3], [144.1, 41.4],
                            [144.2, 41.5], [144.3, 41.6], [144.4, 41.7], [144.5, 41.8],
                            [144.6, 41.9], [144.7, 42.0], [144.8, 42.1], [144.9, 42.2],
                            [145.0, 42.3], [145.1, 42.4], [145.2, 42.5], [145.3, 42.6],
                            [145.4, 42.7], [145.5, 42.8], [145.6, 42.9], [145.7, 43.0],
                            [145.8, 43.1], [145.8, 43.3]
                        ]]
                    }
                },
                {
                    type: "Feature",
                    properties: {
                        AREA_NAME: "北海道太平洋沿岸中部",
                        AREA_CODE: "192",
                        STATUS: "cleared",
                        WAVE_HEIGHT: "1m",
                        ARRIVAL_TIME: "既に到達と推定"
                    },
                    geometry: {
                        type: "Polygon",
                        coordinates: [[
                            [143.8, 42.5], [143.6, 42.3], [143.4, 42.1], [143.2, 41.9],
                            [143.0, 41.7], [142.8, 41.5], [142.6, 41.3], [142.4, 41.1],
                            [142.2, 40.9], [142.0, 40.7], [141.8, 40.5], [141.6, 40.3],
                            [141.8, 40.4], [142.0, 40.6], [142.2, 40.8], [142.4, 41.0],
                            [142.6, 41.2], [142.8, 41.4], [143.0, 41.6], [143.2, 41.8],
                            [143.4, 42.0], [143.6, 42.2], [143.8, 42.4], [143.8, 42.5]
                        ]]
                    }
                },
                {
                    type: "Feature",
                    properties: {
                        AREA_NAME: "青森県太平洋沿岸",
                        AREA_CODE: "201",
                        STATUS: "cancelled",
                        WAVE_HEIGHT: "1m",
                        ARRIVAL_TIME: "既に到達と推定"
                    },
                    geometry: {
                        type: "Polygon",
                        coordinates: [[
                            [141.6, 40.9], [141.4, 40.7], [141.2, 40.5], [141.0, 40.3],
                            [140.8, 40.1], [140.6, 39.9], [140.4, 39.7], [140.2, 39.5],
                            [140.4, 39.6], [140.6, 39.8], [140.8, 40.0], [141.0, 40.2],
                            [141.2, 40.4], [141.4, 40.6], [141.6, 40.8], [141.6, 40.9]
                        ]]
                    }
                },
                {
                    type: "Feature",
                    properties: {
                        AREA_NAME: "岩手県",
                        AREA_CODE: "211", 
                        STATUS: "cleared",
                        WAVE_HEIGHT: "1m",
                        ARRIVAL_TIME: "既に到達と推定"
                    },
                    geometry: {
                        type: "Polygon",
                        coordinates: [[
                            [141.8, 40.0], [141.6, 39.8], [141.4, 39.6], [141.2, 39.4],
                            [141.0, 39.2], [140.8, 39.0], [140.6, 38.8], [140.4, 38.6],
                            [140.6, 38.7], [140.8, 38.9], [141.0, 39.1], [141.2, 39.3],
                            [141.4, 39.5], [141.6, 39.7], [141.8, 39.9], [141.8, 40.0]
                        ]]
                    }
                },
                {
                    type: "Feature",
                    properties: {
                        AREA_NAME: "宮城県",
                        AREA_CODE: "221",
                        STATUS: "cleared", 
                        WAVE_HEIGHT: "1m",
                        ARRIVAL_TIME: "既に到達と推定"
                    },
                    geometry: {
                        type: "Polygon",
                        coordinates: [[
                            [141.0, 38.9], [140.8, 38.7], [140.6, 38.5], [140.4, 38.3],
                            [140.2, 38.1], [140.0, 37.9], [139.8, 37.7], [139.6, 37.5],
                            [139.8, 37.6], [140.0, 37.8], [140.2, 38.0], [140.4, 38.2],
                            [140.6, 38.4], [140.8, 38.6], [141.0, 38.8], [141.0, 38.9]
                        ]]
                    }
                },
                {
                    type: "Feature",
                    properties: {
                        AREA_NAME: "福島県",
                        AREA_CODE: "231",
                        STATUS: "cleared",
                        WAVE_HEIGHT: "1m", 
                        ARRIVAL_TIME: "既に到達と推定"
                    },
                    geometry: {
                        type: "Polygon",
                        coordinates: [[
                            [140.9, 37.8], [140.7, 37.6], [140.5, 37.4], [140.3, 37.2],
                            [140.1, 37.0], [139.9, 36.8], [139.7, 36.6], [139.5, 36.4],
                            [139.7, 36.5], [139.9, 36.7], [140.1, 36.9], [140.3, 37.1],
                            [140.5, 37.3], [140.7, 37.5], [140.9, 37.7], [140.9, 37.8]
                        ]]
                    }
                },
                {
                    type: "Feature",
                    properties: {
                        AREA_NAME: "茨城県",
                        AREA_CODE: "241",
                        STATUS: "cleared",
                        WAVE_HEIGHT: "1m",
                        ARRIVAL_TIME: "既に到達と推定"
                    },
                    geometry: {
                        type: "Polygon",
                        coordinates: [[
                            [140.7, 36.7], [140.5, 36.5], [140.3, 36.3], [140.1, 36.1],
                            [139.9, 35.9], [139.7, 35.7], [139.5, 35.5], [139.3, 35.3],
                            [139.5, 35.4], [139.7, 35.6], [139.9, 35.8], [140.1, 36.0],
                            [140.3, 36.2], [140.5, 36.4], [140.7, 36.6], [140.7, 36.7]
                        ]]
                    }
                },
                {
                    type: "Feature",
                    properties: {
                        AREA_NAME: "千葉県九十九里・外房",
                        AREA_CODE: "251",
                        STATUS: "lifted",
                        WAVE_HEIGHT: "1m",
                        ARRIVAL_TIME: "既に到達と推定"
                    },
                    geometry: {
                        type: "Polygon",
                        coordinates: [[
                            [140.4, 35.7], [140.2, 35.5], [140.0, 35.3], [139.8, 35.1],
                            [139.6, 34.9], [139.4, 34.7], [139.2, 34.5], [139.0, 34.3],
                            [139.2, 34.4], [139.4, 34.6], [139.6, 34.8], [139.8, 35.0],
                            [140.0, 35.2], [140.2, 35.4], [140.4, 35.6], [140.4, 35.7]
                        ]]
                    }
                },
                {
                    type: "Feature",
                    properties: {
                        AREA_NAME: "小笠原諸島",
                        AREA_CODE: "281",
                        STATUS: "cleared",
                        WAVE_HEIGHT: "1m",
                        ARRIVAL_TIME: "既に到達と推定"
                    },
                    geometry: {
                        type: "Polygon",
                        coordinates: [[
                            [142.3, 27.1], [142.2, 27.0], [142.1, 26.9], [142.0, 26.8],
                            [141.9, 26.7], [141.8, 26.6], [141.7, 26.5], [141.6, 26.4],
                            [141.7, 26.5], [141.8, 26.6], [141.9, 26.7], [142.0, 26.8],
                            [142.1, 26.9], [142.2, 27.0], [142.3, 27.1]
                        ]]
                    }
                }
            ]
        };
    }
    
    /**
     * キャッシュクリア
     */
    clearCache() {
        this.cache = null;
        console.log('🗑️  津波予報区データキャッシュクリア');
    }
    
    /**
     * データ再読み込み
     */
    async reload() {
        this.clearCache();
        return await this.loadTsunamiAreas();
    }
}

// グローバル利用可能にする
if (typeof window !== 'undefined') {
    window.JMATsunamiLoader = JMATsunamiLoader;
}

// Node.js環境対応
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JMATsunamiLoader;
}

console.log('📋 JMA津波予報区ローダー準備完了');