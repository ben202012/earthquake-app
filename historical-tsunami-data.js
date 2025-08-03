/**
 * 過去津波データ初期投入システム
 * 貴重な過去津波データを活用して実用性を向上
 */

class HistoricalTsunamiData {
    constructor() {
        this.historicalEvents = [
            // 2024年能登半島地震津波
            {
                id: 'noto_2024_0101',
                timestamp: '2024-01-01T07:10:00Z',
                event: '2024年能登半島地震津波',
                earthquake: {
                    magnitude: 7.6,
                    depth: 16,
                    latitude: 37.5,
                    longitude: 136.6,
                    location: '石川県能登地方'
                },
                tsunamiData: {
                    type: "FeatureCollection",
                    features: [
                        {
                            type: "Feature",
                            properties: {
                                AREA_CODE: "280",
                                AREA_NAME: "石川県能登",
                                STATUS: "warning",
                                WAVE_HEIGHT: "5m",
                                ARRIVAL_TIME: "既に到達と推定",
                                SOURCE: "HISTORICAL_JMA"
                            }
                        },
                        {
                            type: "Feature", 
                            properties: {
                                AREA_CODE: "281",
                                AREA_NAME: "新潟県上中下越",
                                STATUS: "advisory",
                                WAVE_HEIGHT: "1m",
                                ARRIVAL_TIME: "07:20頃",
                                SOURCE: "HISTORICAL_JMA"
                            }
                        }
                    ]
                }
            },
            
            // 2011年東日本大震災津波
            {
                id: 'tohoku_2011_0311',
                timestamp: '2011-03-11T05:46:23Z',
                event: '2011年東日本大震災津波',
                earthquake: {
                    magnitude: 9.0,
                    depth: 24,
                    latitude: 38.3,
                    longitude: 142.4,
                    location: '三陸沖'
                },
                tsunamiData: {
                    type: "FeatureCollection",
                    features: [
                        {
                            type: "Feature",
                            properties: {
                                AREA_CODE: "191",
                                AREA_NAME: "岩手県",
                                STATUS: "major_warning",
                                WAVE_HEIGHT: "10m以上",
                                ARRIVAL_TIME: "既に到達と推定",
                                SOURCE: "HISTORICAL_JMA"
                            }
                        },
                        {
                            type: "Feature",
                            properties: {
                                AREA_CODE: "192", 
                                AREA_NAME: "宮城県",
                                STATUS: "major_warning",
                                WAVE_HEIGHT: "10m以上",
                                ARRIVAL_TIME: "既に到達と推定",
                                SOURCE: "HISTORICAL_JMA"
                            }
                        },
                        {
                            type: "Feature",
                            properties: {
                                AREA_CODE: "193",
                                AREA_NAME: "福島県",
                                STATUS: "major_warning", 
                                WAVE_HEIGHT: "10m以上",
                                ARRIVAL_TIME: "既に到達と推定",
                                SOURCE: "HISTORICAL_JMA"
                            }
                        }
                    ]
                }
            },
            
            // 2022年トンガ火山津波
            {
                id: 'tonga_2022_0115',
                timestamp: '2022-01-15T04:15:00Z',
                event: '2022年トンガ火山津波',
                earthquake: {
                    magnitude: 0, // 火山噴火による
                    depth: 0,
                    latitude: -20.5,
                    longitude: -175.4,
                    location: 'トンガ・フンガトンガ火山'
                },
                tsunamiData: {
                    type: "FeatureCollection",
                    features: [
                        {
                            type: "Feature",
                            properties: {
                                AREA_CODE: "100",
                                AREA_NAME: "奄美群島・トカラ列島",
                                STATUS: "advisory",
                                WAVE_HEIGHT: "1.2m",
                                ARRIVAL_TIME: "23:55頃",
                                SOURCE: "HISTORICAL_JMA"
                            }
                        },
                        {
                            type: "Feature",
                            properties: {
                                AREA_CODE: "110",
                                AREA_NAME: "岩手県",
                                STATUS: "advisory",
                                WAVE_HEIGHT: "2.8m",
                                ARRIVAL_TIME: "03:26頃",
                                SOURCE: "HISTORICAL_JMA"
                            }
                        }
                    ]
                }
            },
            
            // 2016年福島県沖地震津波
            {
                id: 'fukushima_2016_1122',
                timestamp: '2016-11-22T02:59:49Z',
                event: '2016年福島県沖地震津波',
                earthquake: {
                    magnitude: 7.4,
                    depth: 25,
                    latitude: 37.3,
                    longitude: 141.6,
                    location: '福島県沖'
                },
                tsunamiData: {
                    type: "FeatureCollection",
                    features: [
                        {
                            type: "Feature",
                            properties: {
                                AREA_CODE: "193",
                                AREA_NAME: "福島県",
                                STATUS: "warning",
                                WAVE_HEIGHT: "3m",
                                ARRIVAL_TIME: "03:10頃",
                                SOURCE: "HISTORICAL_JMA"
                            }
                        },
                        {
                            type: "Feature",
                            properties: {
                                AREA_CODE: "192",
                                AREA_NAME: "宮城県",
                                STATUS: "advisory",
                                WAVE_HEIGHT: "1m",
                                ARRIVAL_TIME: "03:10頃",
                                SOURCE: "HISTORICAL_JMA"
                            }
                        }
                    ]
                }
            },
            
            // 2010年チリ地震津波
            {
                id: 'chile_2010_0227',
                timestamp: '2010-02-27T06:34:00Z',
                event: '2010年チリ地震津波',
                earthquake: {
                    magnitude: 8.8,
                    depth: 35,
                    latitude: -36.1,
                    longitude: -72.9,
                    location: 'チリ中部沿岸'
                },
                tsunamiData: {
                    type: "FeatureCollection",
                    features: [
                        {
                            type: "Feature",
                            properties: {
                                AREA_CODE: "100",
                                AREA_NAME: "青森県太平洋沿岸",
                                STATUS: "advisory",
                                WAVE_HEIGHT: "1m",
                                ARRIVAL_TIME: "28日17:00頃",
                                SOURCE: "HISTORICAL_JMA"
                            }
                        },
                        {
                            type: "Feature",
                            properties: {
                                AREA_CODE: "101",
                                AREA_NAME: "岩手県",
                                STATUS: "advisory",
                                WAVE_HEIGHT: "1.2m",
                                ARRIVAL_TIME: "28日17:00頃",
                                SOURCE: "HISTORICAL_JMA"
                            }
                        }
                    ]
                }
            }
        ];
    }
    
    /**
     * 過去データを津波データストアに投入
     */
    async loadHistoricalDataToStore(tsunamiDataStore) {
        console.log('📚 過去津波データの投入開始');
        
        let loadedCount = 0;
        
        for (const event of this.historicalEvents) {
            try {
                // 津波データストアに保存
                const dataId = tsunamiDataStore.saveCurrentTsunamiData(event.tsunamiData);
                
                // アラートとしても記録
                tsunamiDataStore.recordAlert({
                    type: event.tsunamiData.features[0].properties.STATUS,
                    level: event.tsunamiData.features[0].properties.STATUS,
                    regions: event.tsunamiData.features.map(f => f.properties.AREA_NAME),
                    message: `${event.event} - ${event.tsunamiData.features[0].properties.WAVE_HEIGHT}`
                });
                
                loadedCount++;
                console.log(`✅ ${event.event} データ投入完了`);
                
            } catch (error) {
                console.error(`❌ ${event.event} データ投入失敗:`, error);
            }
        }
        
        console.log(`📊 過去津波データ投入完了: ${loadedCount}/${this.historicalEvents.length}件`);
        
        return loadedCount;
    }
    
    /**
     * 過去データ統計取得
     */
    getHistoricalDataStats() {
        const stats = {
            totalEvents: this.historicalEvents.length,
            byLevel: {
                major_warning: 0,
                warning: 0, 
                advisory: 0
            },
            byYear: {},
            timeSpan: {
                oldest: null,
                newest: null
            }
        };
        
        this.historicalEvents.forEach(event => {
            const year = new Date(event.timestamp).getFullYear();
            stats.byYear[year] = (stats.byYear[year] || 0) + 1;
            
            // レベル別カウント
            event.tsunamiData.features.forEach(feature => {
                const level = feature.properties.STATUS;
                if (stats.byLevel[level] !== undefined) {
                    stats.byLevel[level]++;
                }
            });
            
            // 時期範囲
            const eventDate = new Date(event.timestamp);
            if (!stats.timeSpan.oldest || eventDate < new Date(stats.timeSpan.oldest)) {
                stats.timeSpan.oldest = event.timestamp;
            }
            if (!stats.timeSpan.newest || eventDate > new Date(stats.timeSpan.newest)) {
                stats.timeSpan.newest = event.timestamp;
            }
        });
        
        return stats;
    }
}

// グローバル公開
if (typeof window !== 'undefined') {
    window.HistoricalTsunamiData = HistoricalTsunamiData;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = HistoricalTsunamiData;
}

console.log('📚 過去津波データシステム準備完了');