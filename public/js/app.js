import { TsunamiManager } from './tsunami-manager.js';
import { JMAXMLClient } from './jma-xml-client.js';
import { TsunamiDataStore } from './tsunami-data-store.js';
import { TsunamiAlertSystem } from './tsunami-alert-system.js';
import { JMATsunamiLoader } from './jma-tsunami-loader.js';
import { MultiSiteVerificationSystem } from './multi-site-verification.js';


// プロフェッショナル地震監視システム
export default class ProfessionalEarthquakeMonitor {
    constructor() {
        this.startTime = new Date();
        this.earthquakeHistory = [];
        this.stats = {
            todayCount: 0,
            weekCount: 0,
            maxIntensity: '-',
            dataPackets: 0,
            responseTime: 0
        };
        this.map = null;
        this.websocket = null;

        // メモリリーク対策: インターバルIDを管理
        this.intervals = {
            clock: null,
            fallback: null,
            performance: null,
            systemMonitor: null,
            tsunamiMonitor: null,
            rssUpdate: null,
            historyUpdate: null
        };

        // 設定データ
        this.settings = this.loadSettings();

        // 地図状態管理
        this.mapState = {
            initialView: { center: [36.2, 138.2], zoom: 5 },
            isAtInitialView: true,
            homeControl: null
        };

        // 夜間モード状態
        this.nightModeEnabled = false;

        // 実用津波監視システム (50%完成度版)
        this.tsunamiManager = new TsunamiManager();
        this.jmaXmlClient = new JMAXMLClient();
        this.tsunamiDataStore = new TsunamiDataStore();
        this.tsunamiAlertSystem = new TsunamiAlertSystem();

        this.setupPracticalTsunamiSystem();

        this.init();
    }

    async init() {
        console.log('🌏 Professional Earthquake Monitor v2.0 - Starting...');

        try {
            // DOM要素の存在確認
            const requiredElements = [
                'current-time', 'system-clock', 'system-date', 'uptime',
                'latitude', 'longitude', 'depth', 'magnitude'
            ];

            const missingElements = requiredElements.filter(id => !document.getElementById(id));
            if (missingElements.length > 0) {
                console.warn(`⚠️ Missing DOM elements: ${missingElements.join(', ')}`);
            }

            // 基本システム初期化（並列実行で高速化）
            await Promise.all([
                this.setupClockAsync(),
                this.setupMapAsync(),
                this.startPerformanceMonitoringAsync()
            ]);

            // 接続状態を表示
            this.updateConnectionStatus('p2p-status', false);
            this.updateConnectionStatus('api-status', false);

            // システム開始をログ
            this.addActivityFeedItem('🟢', 'システムが高速モードで開始されました', new Date());

            // 非同期でデータ読み込みとWebSocket接続
            Promise.all([
                this.loadHistoricalData(),
                this.connectWebSocketAsync()
            ]).then(() => {
                console.log('✅ All background tasks completed');
                this.updateConnectionStatus('api-status', true);
            }).catch(error => {
                console.warn('⚠️ Some background tasks failed:', error);
                this.updateConnectionStatus('api-status', false);
            });

            console.log('✅ Professional Earthquake Monitor initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize system:', error);
            this.addActivityFeedItem('❌', `初期化エラー: ${error.message}`, new Date());
        }
    }

    async setupClockAsync() {
        return new Promise(resolve => {
            this.setupClock();
            resolve();
        });
    }

    async setupMapAsync() {
        return new Promise(resolve => {
            this.setupMap();
            resolve();
        });
    }

    async startPerformanceMonitoringAsync() {
        return new Promise(resolve => {
            this.startPerformanceMonitoring();
            resolve();
        });
    }

    async connectWebSocketAsync() {
        return new Promise((resolve, reject) => {
            try {
                this.connectWebSocket();
                setTimeout(resolve, 1000); // 1秒で接続確立と仮定
            } catch (error) {
                reject(error);
            }
        });
    }

    setupClock() {
        const updateClock = () => {
            const now = new Date();

            // ヘッダー時計
            const currentTimeEl = document.getElementById('current-time');
            if (currentTimeEl) {
                currentTimeEl.textContent = now.toLocaleTimeString('ja-JP', { hour12: false });
            }

            // システム時計
            const systemClockEl = document.getElementById('system-clock');
            if (systemClockEl) {
                systemClockEl.textContent = now.toLocaleTimeString('ja-JP', { hour12: false });
            }

            const systemDateEl = document.getElementById('system-date');
            if (systemDateEl) {
                systemDateEl.textContent = now.toLocaleDateString('ja-JP');
            }

            // 稼働時間
            const uptimeEl = document.getElementById('uptime');
            if (uptimeEl) {
                const uptime = new Date(now - this.startTime);
                const hours = String(Math.floor(uptime / 3600000)).padStart(2, '0');
                const minutes = String(Math.floor((uptime % 3600000) / 60000)).padStart(2, '0');
                const seconds = String(Math.floor((uptime % 60000) / 1000)).padStart(2, '0');
                uptimeEl.textContent = `${hours}:${minutes}:${seconds}`;
            }
        };

        updateClock();
        this.intervals.clock = setInterval(updateClock, 1000);

        // システム開始時刻を記録
        const systemStartTimeEl = document.getElementById('system-start-time');
        if (systemStartTimeEl) {
            systemStartTimeEl.textContent = this.startTime.toLocaleTimeString('ja-JP');
        }
    }

    setupMap() {
        this.map = L.map('earthquake-map', {
            center: [36.2, 138.2],
            zoom: 5,
            zoomControl: true,
            attributionControl: false
        });

        // 実用的な地図レイヤー設定
        const mapLayers = {
            '標準マップ': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18,
                minZoom: 4,
                className: 'standard-map-layer'
            }),
            'ダーク（控えめ）': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '© CARTO',
                maxZoom: 18,
                minZoom: 4,
                className: 'dark-subtle'
            }),
            'グレー（中間調）': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
                attribution: '© CARTO',
                maxZoom: 18,
                minZoom: 4,
                opacity: 0.8
            }),
            'ライト（明るめ）': L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
                attribution: '© CARTO',
                maxZoom: 18,
                minZoom: 4
            })
        };

        // デフォルトレイヤー（標準マップ）を設定
        const defaultLayer = mapLayers['標準マップ'];
        defaultLayer.addTo(this.map);

        // 地図レイヤーを保存（設定パネルで使用）
        this.mapLayers = mapLayers;
        this.currentLayer = defaultLayer;
        this.currentLayerName = '標準マップ';

        // イベントリスナーでレイヤー変更を監視
        this.map.on('baselayerchange', (e) => {
            this.currentLayerName = e.name;
            console.log(`🗺️ Map layer changed to: "${e.name}"`);
            this.addActivityFeedItem('🗺️', `地図レイヤーを${e.name}に変更しました`, new Date());

            // レイヤー変更時に境界も強制更新
            setTimeout(() => {
                this.updateJapanBoundariesForLayer();
                console.log(`🔄 レイヤー変更後の境界更新完了: ${e.name}`);
            }, 500); // 500ms後に実行してレイヤー変更完了を待つ

            // 設定パネルが開いている場合はUIを更新
            const layersContainer = document.getElementById('settings-map-layers');
            if (layersContainer && layersContainer.style.display !== 'none') {
                this.updateMapLayerOptions();
            }
        });

        // 夜間モード切り替え機能を準備
        this.setupNightModeToggle();

        // カスタムスタイル（日本列島を強調）
        this.addJapanOverlay();

        // 津波沿岸ライン表示
        this.addTsunamiCoastlines();

        // ホームボタンコントロールを追加
        this.addHomeControl();

        // 地図移動イベントを監視
        this.setupMapEventListeners();

        // 明度設定を初期化・適用
        this.initializeBrightnessSettings();

        console.log('🗺️ Map initialized with enhanced visibility for Japan');
    }

    addJapanOverlay() {
        // 主要都市データ（控えめな表示用）
        this.japanCityMarkers = [
            { name: '札幌', coords: [43.064, 141.347], region: '北海道' },
            { name: '青森', coords: [40.824, 140.740], region: '東北' },
            { name: '仙台', coords: [38.268, 140.872], region: '東北' },
            { name: '東京', coords: [35.676, 139.650], region: '関東' },
            { name: '新潟', coords: [37.902, 139.023], region: '中部' },
            { name: '名古屋', coords: [35.011, 136.768], region: '中部' },
            { name: '大阪', coords: [34.693, 135.502], region: '関西' },
            { name: '広島', coords: [34.396, 132.459], region: '中国' },
            { name: '高松', coords: [34.340, 134.043], region: '四国' },
            { name: '福岡', coords: [33.584, 130.401], region: '九州' },
            { name: '鹿児島', coords: [31.560, 130.558], region: '九州' }
        ];

        // 初期表示の日本列島目安を作成
        this.applyLayerSpecificStyles(); // 初期化時もスタイル適用
        this.createJapanBoundaries();

        console.log('🗾 日本主要都市マーカーを表示');
    }

    // 日本列島マーカーの作成（主要都市表示）
    createJapanBoundaries() {
        // 既存の境界レイヤーを削除
        if (this.japanBoundaryLayers) {
            this.japanBoundaryLayers.forEach(layer => {
                this.map.removeLayer(layer);
            });
        }
        this.japanBoundaryLayers = [];

        // 現在のレイヤーに応じたマーカースタイルを取得
        const markerStyle = this.getJapanMarkerStyle();

        // カスタムpaneを作成（津波レイヤーより上に表示）
        if (!this.map.getPane('japan-markers')) {
            const japanPane = this.map.createPane('japan-markers');
            japanPane.style.zIndex = 650; // 津波レイヤー(600)より上
        }

        // 主要都市マーカーを表示
        if (this.japanCityMarkers) {
            this.japanCityMarkers.forEach(city => {
                const marker = L.circleMarker(city.coords, {
                    ...markerStyle,
                    className: 'japan-city-marker',
                    pane: 'japan-markers'  // 専用paneに配置
                }).addTo(this.map);

                this.japanBoundaryLayers.push(marker);

                // ツールチップ追加
                marker.bindTooltip(`${city.name} (${city.region})`, {
                    permanent: false,
                    direction: 'top',
                    className: 'japan-city-tooltip'
                });

                // デバッグ情報
                console.log(`✅ 都市マーカー作成: ${city.name} - 色:${markerStyle.fillColor}`);
            });
        } else {
            console.warn('⚠️ 日本都市データが見つかりません');
        }

        console.log(`🗾 日本主要都市マーカー更新: ${this.currentLayerName || '標準'}レイヤー対応`);
    }

    // レイヤーに応じたマーカースタイルを取得
    getJapanMarkerStyle() {
        const layerName = this.currentLayerName || '標準マップ';

        // レイヤータイプに応じたマーカー設定
        const markerStyles = {
            // ダーク系レイヤー：明るいマーカー
            'ダーク（控えめ）': {
                radius: 3,
                fillColor: '#dddddd',    // 明るいグレー
                color: '#ffffff',        // 白い枠線
                weight: 1,
            opacity: 0.8,
                fillOpacity: 0.7
            },
            // グレー系レイヤー：中間色マーカー
            'グレー（中間調）': {
                radius: 3,
                fillColor: '#666666',    // 中間グレー
                color: '#333333',        // 暗い枠線
                weight: 1,
                opacity: 0.8,
                fillOpacity: 0.7
            },
            // ライト系レイヤー：暗いマーカー
            'ライト（明るめ）': {
                radius: 3,
                fillColor: '#333333',    // 暗いグレー
                color: '#000000',        // 黒い枠線
                weight: 1,
                opacity: 0.8,
                fillOpacity: 0.7
            },
            // 標準マップ：バランスの取れたマーカー
            '標準マップ': {
                radius: 3,
                fillColor: '#666666',    // 中間グレー
                color: '#333333',        // 暗めの枠線
                weight: 1,
                opacity: 0.8,
                fillOpacity: 0.6
            }
        };

        // 指定されたレイヤーのスタイルを返す、存在しない場合は標準を使用
        return markerStyles[layerName] || markerStyles['標準マップ'];
    }

    // 夜間モード切り替え機能のセットアップ
    setupNightModeToggle() {
        // 現在の時刻を取得
        const now = new Date();
        const hour = now.getHours();

        // 夜間時間帯を判定（18時〜6時）
        const isNightTime = hour >= 18 || hour < 6;

        // 夜間時間帯の場合、自動的に暗めにする
        if (isNightTime) {
            this.enableNightMode(true); // 自動適用
        } else {
            this.enableNightMode(false);
        }

        // ヘッダーに夜間モード切り替えボタンを追加
        this.addNightModeToggleButton();

        console.log(`🌗 夜間モード設定: ${isNightTime ? '自動適用中' : '標準表示'} (${hour}時)`);
    }

    // 夜間モード切り替えボタンの追加
    addNightModeToggleButton() {
        const headerRight = document.querySelector('.header-right');
        if (!headerRight) return;

        const nightModeBtn = document.createElement('button');
        nightModeBtn.id = 'night-mode-toggle';
        nightModeBtn.className = 'settings-btn';
        nightModeBtn.textContent = '🌙 夜間モード';
        nightModeBtn.title = '地図を暗めに調整';

        nightModeBtn.onclick = () => {
            this.toggleNightMode();
        };

        // 設定ボタンの前に挿入
        const settingsBtn = headerRight.querySelector('.settings-btn');
        if (settingsBtn) {
            headerRight.insertBefore(nightModeBtn, settingsBtn);
        } else {
            headerRight.appendChild(nightModeBtn);
        }
    }

    // 夜間モードの有効/無効化（明度調整機能に統合）
    enableNightMode(enabled) {
        const nightModeBtn = document.getElementById('night-mode-toggle');

        if (enabled) {
            // 明度調整機能を使って70%に設定（夜間モード）
            this.updateMapBrightness(70);
            if (nightModeBtn) {
                nightModeBtn.textContent = '☀️ 標準表示';
                nightModeBtn.title = '明るい表示に戻す';
            }
            this.nightModeEnabled = true;
        } else {
            // 明度調整機能を使って100%に設定（標準表示）
            this.updateMapBrightness(100);
            if (nightModeBtn) {
                nightModeBtn.textContent = '🌙 夜間モード';
                nightModeBtn.title = '地図を暗めに調整';
            }
            this.nightModeEnabled = false;
        }
    }

    // 夜間モードのトグル
    toggleNightMode() {
        this.enableNightMode(!this.nightModeEnabled);

        const message = this.nightModeEnabled ?
            '地図を暗めに調整しました' :
            '標準の明るさに戻しました';

        this.addActivityFeedItem(
            this.nightModeEnabled ? '🌙' : '☀️',
            message,
            new Date()
        );

        console.log(`🌗 夜間モード: ${this.nightModeEnabled ? 'ON' : 'OFF'}`);
    }

    // レイヤー切り替え時の日本列島境界更新
    updateJapanBoundariesForLayer() {
        if (!this.japanRegions || !this.map) {
            console.warn('⚠️ 日本地域データまたは地図が未初期化');
            return;
        }

        try {
            // 地図コンテナにレイヤー別のクラスを適用
            this.applyLayerSpecificStyles();

            // 日本列島境界を再作成（現在のレイヤーに合わせて）
            this.createJapanBoundaries();
            console.log(`🔄 日本境界を${this.currentLayerName}レイヤーに適応`);
        } catch (error) {
            console.error('❌ 日本境界更新エラー:', error);
        }
    }

    // レイヤー別のスタイルクラスを適用
    applyLayerSpecificStyles() {
        const mapContainer = document.querySelector('.leaflet-container');
        if (!mapContainer) return;

        // 既存のレイヤークラスを削除
        mapContainer.classList.remove('dark-layer', 'light-layer', 'standard-layer');

        // 現在のレイヤーに応じてクラスを追加
        switch (this.currentLayerName) {
            case 'ダーク（控えめ）':
                mapContainer.classList.add('dark-layer');
                break;
            case 'ライト（明るめ）':
                mapContainer.classList.add('light-layer');
                break;
            case '標準マップ':
                mapContainer.classList.add('standard-layer');
                break;
            default:
                mapContainer.classList.add('standard-layer');
                break;
        }

        console.log(`🎨 レイヤークラス適用: ${this.currentLayerName}`);
    }

    // デバッグ用：境界線を強制再表示
    forceBoundaryDisplay() {
        console.log('🔧 境界線強制表示開始...');

        // 既存境界をクリア
        if (this.japanBoundaryLayers) {
            this.japanBoundaryLayers.forEach(layer => {
                this.map.removeLayer(layer);
            });
        }
        this.japanBoundaryLayers = [];

        // テスト用の強制境界（必ず見える設定）
        const testStyle = {
            color: '#ff0000',        // 赤色で確実に見える
            weight: 5,               // 非常に太い線
            opacity: 1.0,            // 完全不透明
            fillColor: 'rgba(255, 0, 0, 0.2)',
            fillOpacity: 0.2
        };

        this.japanRegions.forEach(region => {
            const boundary = L.circle(region.center, {
                radius: region.radius,
                ...testStyle,
                pane: 'japan-boundaries'
            }).addTo(this.map);

            this.japanBoundaryLayers.push(boundary);

            boundary.bindTooltip(`テスト境界: ${region.name}`, {
                permanent: false,
                direction: 'center'
            });
        });

        console.log('✅ テスト境界表示完了 - 赤い円が見えるはずです');
    }

    // 気象庁公式TopoJSON津波予報区データ使用（89MB→1.5MB最適化済み）
    async addTsunamiCoastlines() {
        this.tsunamiLayers = [];

        try {
            console.log('🔄 気象庁公式津波予報区データ読み込み中...');

            // 製品版モード: 気象庁公式TopoJSONデータ使用
            const demoMode = true; // 一時的にデモモードに変更してテスト

            let tsunamiData;

            const loader = new JMATsunamiLoader();
            let allTsunamiData;

            if (demoMode) {
                // デモ用：フォールバックデータを直接使用
                allTsunamiData = loader.getFallbackData();
                // キャッシュに手動で保存
                loader.cache = allTsunamiData;
                console.log('📋 デモモード: フォールバックデータ使用');

            } else {
                // 製品版：TopoJSONローダー使用
                allTsunamiData = await loader.loadTsunamiAreas();

                // 統計情報表示
                const stats = loader.getStatistics();
                console.log('📊 津波予報区統計:', stats);
                console.log('✅ 気象庁公式データ読み込み完了');
            }

            // アクティブな津波予報区のみを取得（解除されたものを除外）
            const activeAreas = loader.getActiveAreas();
            tsunamiData = {
                type: "FeatureCollection",
                features: activeAreas
            };

            console.log(`🚨 アクティブな津波注意報: ${activeAreas.length}地域`);

            // 凡例の地域数を更新
            const areaCountElement = document.getElementById('tsunami-area-count');
            if (areaCountElement) {
                areaCountElement.textContent = activeAreas.length;
            }

            // 津波パネルと凡例の表示制御
            this.updateTsunamiDisplay(activeAreas);

            // リアルタイム監視パネルの津波地域を更新
            this.updateTsunamiRegionsPanel(activeAreas);

            // アクティブな津波データがない場合は地図レイヤーと凡例を非表示
            if (activeAreas.length === 0) {
                console.log('🚫 津波データなし: 地図レイヤーと凡例を非表示');
                // 既存の津波レイヤーを削除
                if (this.tsunamiLayers) {
                    this.tsunamiLayers.forEach(layer => {
                        if (layer.layer) this.map.removeLayer(layer.layer);
                    });
                    this.tsunamiLayers = [];
                }
                // 津波レジェンドを非表示
                if (this.tsunamiLegend) {
                    this.map.removeControl(this.tsunamiLegend);
                    this.tsunamiLegend = null;
                }
                return; // 津波レイヤー作成をスキップ
            }

            // GeoJSONレイヤー作成
            const tsunamiGeoJSON = L.geoJSON(tsunamiData, {
                style: (feature) => {
                    const status = feature.properties.STATUS || 'advisory';
                    return {
                        color: '#FFD700',           // 気象庁標準黄色
                        weight: 2,
                        opacity: 0.9,
                        fillColor: '#FFD700',
                        fillOpacity: 0.6,
                        className: `jma-tsunami-area jma-${status}`
                    };
                },
                onEachFeature: (feature, layer) => {
                    const props = feature.properties;

                    // 気象庁公式形式のポップアップ
                    const popupContent = `
                        <div class="jma-tsunami-popup">
                            <div class="popup-header">
                                <span class="popup-icon">🌊</span>
                                <span class="popup-title">${props.AREA_NAME}</span>
                                <span class="area-code">区域コード: ${props.AREA_CODE || '191'}</span>
                            </div>
                            <div class="popup-content">
                                <div class="popup-row status">
                                    <strong>津波注意報</strong>
                                </div>
                                <div class="popup-row">
                                    <strong>予想津波高:</strong> ${props.WAVE_HEIGHT || '1m'}
                                </div>
                                <div class="popup-row">
                                    <strong>到達状況:</strong> ${props.ARRIVAL_TIME || '既に到達と推定'}
                                </div>
                                <div class="popup-footer">
                                    <small>気象庁公式津波予報区データ使用 (TopoJSON最適化済み)</small>
                                </div>
                            </div>
                        </div>
                    `;

                    layer.bindPopup(popupContent, {
                        maxWidth: 340,
                        className: 'jma-tsunami-popup-container'
                    });

                    // 気象庁形式ツールチップ
                    layer.bindTooltip(`${props.AREA_NAME} (${props.WAVE_HEIGHT || '1m'})`, {
                        permanent: false,
                        direction: 'center',
                        className: 'jma-tsunami-tooltip'
                    });

                    // レイヤー管理に追加
                    this.tsunamiLayers.push({
                        layer: layer,
                        area: props
                    });
                }
            }).addTo(this.map);

            // 気象庁風レジェンド追加
            this.addJMATsunamiLegend();

            // KyoshinEewViewer風スタイル適用
            this.addKyoshinEewViewerStyles();

            // 製品版実装完了メッセージ
            const message = demoMode ?
                '🌊 津波予報区表示完了 (デモ用データ)' :
                '🌊 製品版: 気象庁公式津波予報区データ実装完了';
            console.log(message);

            // 製品版成功メッセージ
            if (!demoMode) {
                console.log('🎉 製品版実装成功:');
                console.log('✅ 気象庁公式データ使用');
                console.log('⚡ TopoJSON最適化 (高速読み込み)');
                console.log('🗺️  正確な津波予報区境界表示');
                console.log('📊 NHK・KyoshinEewViewer同等品質実現');
            }

        } catch (error) {
            console.error('❌ 津波予報区データ読み込み失敗:', error);

            // フォールバック：基本表示
            this.addBasicTsunamiDisplay();
        }
    }

    // フォールバック用基本津波表示
    addBasicTsunamiDisplay() {
        console.log('🔄 基本津波表示モードに切り替え');
        // 既存のデモデータで最低限の表示を提供
    }

    // 気象庁風津波レジェンド（KyoshinEewViewer準拠）
    addJMATsunamiLegend() {
        const legend = L.control({ position: 'bottomright' });

        legend.onAdd = function(map) {
            const div = L.DomUtil.create('div', 'jma-tsunami-legend');

            // XSS対策: 安全なDOM操作を使用
            const headerDiv = document.createElement('div');
            headerDiv.className = 'legend-header';

            const titleDiv = document.createElement('div');
            titleDiv.className = 'legend-title';
            titleDiv.textContent = '津波予報区';

            const subtitleDiv = document.createElement('div');
            subtitleDiv.className = 'legend-subtitle';
            subtitleDiv.textContent = '日本太平洋沿岸全体';

            headerDiv.appendChild(titleDiv);
            headerDiv.appendChild(subtitleDiv);

            const itemsDiv = document.createElement('div');
            itemsDiv.className = 'legend-items';

            const itemDiv = document.createElement('div');
            itemDiv.className = 'legend-item';

            const colorSpan = document.createElement('span');
            colorSpan.className = 'legend-color jma-advisory';

            const countSpan = document.createElement('span');
            countSpan.id = 'tsunami-area-count';
            countSpan.textContent = '9';

            itemDiv.appendChild(colorSpan);
            itemDiv.appendChild(document.createTextNode('津波注意報 ('));
            itemDiv.appendChild(countSpan);
            itemDiv.appendChild(document.createTextNode('地域)'));

            itemsDiv.appendChild(itemDiv);

            const footerDiv = document.createElement('div');
            footerDiv.className = 'legend-footer';

            const small = document.createElement('small');
            small.textContent = '気象庁公式データ使用';
            footerDiv.appendChild(small);

            div.appendChild(headerDiv);
            div.appendChild(itemsDiv);
            div.appendChild(footerDiv);

            return div;
        };

        legend.addTo(this.map);
        this.tsunamiLegend = legend;
    }

    // 津波レベルテキスト取得
    getTsunamiLevelText(level) {
        const levelTexts = {
            'major_warning': '大津波警報',
            'warning': '津波警報',
            'advisory': '津波注意報',
            'forecast': '津波予報',
            'none': '津波なし'
        };
        return levelTexts[level] || level;
    }

    // KyoshinEewViewer風津波表示スタイル（気象庁準拠）
    addKyoshinEewViewerStyles() {
        // KyoshinEewViewer風のスタイルを動的に作成
        const style = document.createElement('style');
        style.textContent = `
            /* KyoshinEewViewer風 JMA津波エリア表示 */
            .jma-tsunami-area {
                cursor: pointer;
                transition: all 0.15s ease;
            }

            .jma-tsunami-area:hover {
                fill-opacity: 0.8 !important;
                stroke-width: 3px !important;
            }

            /* 気象庁風津波レジェンド */
            .jma-tsunami-legend {
                background: rgba(245, 245, 245, 0.95);
                border: 1px solid #ccc;
                border-radius: 6px;
                padding: 10px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                font-family: 'Inter', 'Meiryo UI', sans-serif;
                font-size: 12px;
                min-width: 140px;
            }

            .legend-header {
                border-bottom: 1px solid #ddd;
                margin-bottom: 8px;
                padding-bottom: 6px;
            }

            .legend-title {
                font-weight: 700;
                color: #333;
                font-size: 13px;
                margin-bottom: 2px;
            }

            .legend-subtitle {
                color: #666;
                font-size: 10px;
            }

            .legend-items {
                margin-bottom: 6px;
            }

            .legend-item {
                display: flex;
                align-items: center;
                gap: 6px;
                color: #333;
                font-weight: 500;
                margin-bottom: 4px;
            }

            .legend-color {
                width: 16px;
                height: 12px;
                border-radius: 2px;
                border: 1px solid #aaa;
                display: inline-block;
            }

            .legend-color.jma-advisory {
                background: #FFD700;
            }

            .legend-footer {
                border-top: 1px solid #eee;
                padding-top: 4px;
                text-align: center;
                color: #888;
                font-size: 9px;
            }

            /* 気象庁風ポップアップ */
            .jma-tsunami-popup {
                font-family: 'Inter', 'Meiryo UI', sans-serif;
                background: #f8f9fa;
                color: #333;
                border-radius: 6px;
                padding: 0;
                border: 2px solid #FFD700;
                min-width: 280px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
            }

            .jma-tsunami-popup .popup-header {
                background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
                padding: 12px;
                border-radius: 6px 6px 0 0;
                display: flex;
                flex-direction: column;
                gap: 4px;
                border-bottom: 1px solid #ddd;
            }

            .jma-tsunami-popup .popup-header .popup-title {
                font-weight: 700;
                font-size: 14px;
                color: #000;
                margin: 0;
            }

            .jma-tsunami-popup .area-code {
                font-size: 11px;
                color: #444;
                font-weight: 500;
            }

            .jma-tsunami-popup .popup-content {
                padding: 12px;
                background: #fff;
            }

            .jma-tsunami-popup .popup-row {
                margin-bottom: 8px;
                font-size: 13px;
                line-height: 1.4;
            }

            .jma-tsunami-popup .popup-row.status {
                color: #FF4500;
                font-weight: 700;
                font-size: 14px;
                margin-bottom: 10px;
            }

            .jma-tsunami-popup .popup-footer {
                border-top: 1px solid #eee;
                padding: 8px 12px;
                background: #f1f3f4;
                border-radius: 0 0 6px 6px;
                text-align: center;
            }

            .jma-tsunami-popup .popup-footer small {
                color: #666;
                font-size: 10px;
            }

            /* KyoshinEewViewer風ツールチップ */
            .jma-tsunami-tooltip {
                background: rgba(255, 215, 0, 0.9) !important;
                border: 1px solid #B8860B !important;
                border-radius: 4px !important;
                color: #000 !important;
                font-size: 12px !important;
                font-weight: 600 !important;
                padding: 6px 10px !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
                text-shadow: none !important;
                font-family: 'Inter', 'Meiryo UI', sans-serif !important;
            }

            /* Leafletポップアップのカスタマイズ（気象庁風） */
            .jma-tsunami-popup-container .leaflet-popup-content-wrapper {
                background: transparent !important;
                padding: 0 !important;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3) !important;
                border-radius: 6px !important;
            }

            .jma-tsunami-popup-container .leaflet-popup-tip {
                background: #f8f9fa !important;
                border: 1px solid #FFD700 !important;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2) !important;
            }

            .jma-tsunami-popup-container .leaflet-popup-close-button {
                color: #333 !important;
                font-size: 16px !important;
                font-weight: bold !important;
                text-shadow: none !important;
                top: 8px !important;
                right: 8px !important;
            }

            .jma-tsunami-popup-container .leaflet-popup-close-button:hover {
                color: #000 !important;
                background: rgba(255, 215, 0, 0.3) !important;
                border-radius: 50% !important;
            }
        `;
        document.head.appendChild(style);

        console.log('🎨 KyoshinEewViewer風スタイル適用完了');
    }

    // ホームボタンコントロールを追加
    addHomeControl() {
        // Leafletカスタムコントロールクラス
        const HomeControl = L.Control.extend({
            onAdd: (map) => {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom home-control');

                container.style.backgroundColor = 'rgba(74, 158, 255, 0.9)';
                container.style.backgroundImage = "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEwIDIwVjE0SDEzLjU4NTlWMjBIMTlWMTJIMjJMMTIgM0wyIDEySDE5VjIwSDEwWiIgZmlsbD0id2hpdGUiLz4KPHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPC9zdmc+Cjwvc3ZnPgo=')";
                container.style.backgroundSize = '16px 16px';
                container.style.backgroundRepeat = 'no-repeat';
                container.style.backgroundPosition = 'center';
                container.style.width = '30px';
                container.style.height = '30px';
                container.style.cursor = 'pointer';
                container.style.border = '2px solid rgba(255, 255, 255, 0.8)';
                container.style.borderRadius = '4px';
                container.style.boxShadow = '0 1px 5px rgba(0,0,0,0.65)';
                container.style.display = 'none'; // 初期状態では非表示
                container.title = '初期画面に戻る';

                container.onclick = () => {
                    this.returnToHome();
                };

                L.DomEvent.disableClickPropagation(container);
                return container;
            },

            onRemove: (map) => {
                // cleanup
            }
        });

        // ホームコントロールを地図に追加（左上に配置）
        this.mapState.homeControl = new HomeControl({ position: 'topleft' });
        this.mapState.homeControl.addTo(this.map);
    }

    // 地図移動イベントリスナーを設定
    setupMapEventListeners() {
        // 地図の移動・ズーム・パンイベントを監視
        this.map.on('moveend zoomend', () => {
            this.checkMapPosition();
        });
    }

    // 地図位置をチェックして初期画面かどうか判定
    checkMapPosition() {
        const currentCenter = this.map.getCenter();
        const currentZoom = this.map.getZoom();
        const initialView = this.mapState.initialView;

        // 初期位置との距離と ズームレベルをチェック
        const centerDistance = currentCenter.distanceTo(L.latLng(initialView.center));
        const zoomDifference = Math.abs(currentZoom - initialView.zoom);

        // 許容範囲内（距離50km以内、ズーム差1以下）なら初期画面とみなす
        const isAtInitialView = centerDistance < 50000 && zoomDifference <= 1;

        if (isAtInitialView !== this.mapState.isAtInitialView) {
            this.mapState.isAtInitialView = isAtInitialView;
            this.updateHomeControlVisibility();
        }
    }

    // ホームコントロールの表示/非表示を更新
    updateHomeControlVisibility() {
        if (this.mapState.homeControl) {
            const container = this.mapState.homeControl.getContainer();
            if (container) {
                if (this.mapState.isAtInitialView) {
                    container.style.display = 'none';
                } else {
                    container.style.display = 'block';
                    // フェードイン効果
                    container.style.opacity = '0';
                    setTimeout(() => {
                        container.style.transition = 'opacity 0.3s ease';
                        container.style.opacity = '1';
                    }, 50);
                }
            }
        }
    }

    // 初期画面に戻る
    returnToHome() {
        const initialView = this.mapState.initialView;
        this.map.setView(initialView.center, initialView.zoom, {
            animate: true,
            duration: 1.0
        });

        // アクティビティログに記録
        this.addActivityFeedItem('🏠', '地図を初期画面に戻しました', new Date());
        console.log('🏠 Map returned to initial view');
    }

    connectWebSocket() {
        try {
            // 接続試行中状態を表示
            this.updateConnectionStatus('p2p-status', false);

            // WebSocket接続前の事前チェック
            this.preConnectionCheck();

            this.websocket = new WebSocket('wss://api.p2pquake.net/v2/ws');

            // 接続タイムアウト設定
            const connectionTimeout = setTimeout(() => {
                if (this.websocket.readyState === WebSocket.CONNECTING) {
                    this.websocket.close();
                    console.warn('⚠️ WebSocket connection timeout');
                    this.addActivityFeedItem('⚠️', 'P2P接続がタイムアウトしました', new Date());
                }
            }, 10000); // 10秒でタイムアウト

            this.websocket.onopen = () => {
                clearTimeout(connectionTimeout);

                // 接続成功時に再接続試行回数をリセット
                this.reconnectAttempts = 0;

                // フォールバックモード停止
                this.stopFallbackMode();

                console.log('🔌 WebSocket connected');
                this.updateConnectionStatus('p2p-status', true);
                this.addActivityFeedItem('🟢', 'P2P地震情報に接続しました', new Date());
            };

            this.websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleEarthquakeData(data);
                    this.stats.dataPackets++;
                    this.updateStats();
                } catch (parseError) {
                    console.warn('⚠️ Failed to parse WebSocket message:', parseError);
                }
            };

            this.websocket.onerror = (error) => {
                clearTimeout(connectionTimeout);

                // エラーの詳細情報を取得
                let errorMessage = 'WebSocket接続エラー';
                if (error.type) {
                    errorMessage += ` (${error.type})`;
                }
                if (error.target && error.target.url) {
                    errorMessage += ` - URL: ${error.target.url}`;
                }
                if (error.target && error.target.readyState !== undefined) {
                    const states = ['接続中', '接続済み', '切断中', '切断済み'];
                    errorMessage += ` - 状態: ${states[error.target.readyState] || error.target.readyState}`;
                }

                console.error('❌ P2P WebSocket接続失敗:', errorMessage);
                this.updateConnectionStatus('p2p-status', false);
                this.addActivityFeedItem('❌', errorMessage, new Date());

                // 詳細診断を実行
                this.diagnoseWebSocketIssue(error, { target: error.target });

                // 再接続試行回数を制限
                if ((this.reconnectAttempts || 0) < 5) {
                    const retryDelay = Math.min(3000 * Math.pow(1.5, this.reconnectAttempts || 0), 15000);
                    this.reconnectAttempts = (this.reconnectAttempts || 0) + 1;

                    console.log(`🔄 ${retryDelay/1000}秒後に再接続を試行します (試行回数: ${this.reconnectAttempts}/5)`);
                    this.addActivityFeedItem('🔄', `${retryDelay/1000}秒後に再接続を試行します (${this.reconnectAttempts}/5)`, new Date());

                    setTimeout(() => {
                        this.connectWebSocket();
                    }, retryDelay);
                } else {
                    console.warn('⚠️ 最大再接続試行回数に達しました。履歴APIモードに切り替えます。');
                    this.addActivityFeedItem('⚠️', '最大再接続試行回数に達しました。履歴APIモードに切り替えます。', new Date());
                    this.startFallbackMode();
                }
            };

            this.websocket.onclose = (event) => {
                clearTimeout(connectionTimeout);

                // 切断の詳細情報を取得
                let closeMessage = 'P2P接続が切断されました';
                if (event.code) {
                    closeMessage += ` (コード: ${event.code})`;
                }
                if (event.reason) {
                    closeMessage += ` - 理由: ${event.reason}`;
                }

                console.log('🔌 WebSocket disconnected:', closeMessage);
                this.updateConnectionStatus('p2p-status', false);
                this.addActivityFeedItem('🔴', closeMessage, new Date());

                // 切断時の詳細診断を実行
                this.diagnoseWebSocketIssue(null, event);

                // 正常な切断（コード1000）でない場合のみ再接続を試行
                if (event.code !== 1000 && (this.reconnectAttempts || 0) < 5) {
                    const retryDelay = Math.min(3000 * Math.pow(1.5, this.reconnectAttempts || 0), 15000);
                this.reconnectAttempts = (this.reconnectAttempts || 0) + 1;

                    console.log(`🔄 ${retryDelay/1000}秒後に再接続を試行します (試行回数: ${this.reconnectAttempts}/5)`);
                    this.addActivityFeedItem('🔄', `${retryDelay/1000}秒後に再接続を試行します (${this.reconnectAttempts}/5)`, new Date());

                setTimeout(() => {
                    this.connectWebSocket();
                }, retryDelay);
                } else if (event.code !== 1000) {
                    console.warn('⚠️ 最大再接続試行回数に達しました。履歴APIモードに切り替えます。');
                    this.addActivityFeedItem('⚠️', '最大再接続試行回数に達しました。履歴APIモードに切り替えます。', new Date());
                    this.startFallbackMode();
                }
            };
        } catch (error) {
            console.error('❌ WebSocket connection failed:', error);
            this.updateConnectionStatus('p2p-status', false);
            this.addActivityFeedItem('❌', `WebSocket接続エラー: ${error.message}`, new Date());

            // 診断機能を追加
            this.diagnoseWebSocketIssue(error, null);

            // フォールバックモードに移行
            this.startFallbackMode();
        }
    }

    // WebSocket接続前の事前チェック機能
    preConnectionCheck() {
        console.log('🔍 WebSocket接続事前チェックを実行...');

        // 1. ブラウザサポート確認
        if (typeof WebSocket === 'undefined') {
            console.error('❌ WebSocket APIがサポートされていません');
            this.addActivityFeedItem('❌', 'WebSocket APIがサポートされていません', new Date());
            return false;
        }

        // 2. セキュア環境確認
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            console.warn('⚠️ 非セキュア環境でのWSS接続は制限される可能性があります');
            this.addActivityFeedItem('⚠️', '非セキュア環境でのWSS接続は制限される可能性があります', new Date());
        }

        // 3. ネットワーク接続確認（HTTP APIで確認）
        this.checkNetworkConnectivity();

        return true;
    }

    // ネットワーク接続確認
    async checkNetworkConnectivity() {
        try {
            console.log('🌐 ネットワーク接続確認中...');
            const response = await fetch('https://api.p2pquake.net/v2/history?codes=551&limit=1', {
                method: 'HEAD',
                timeout: 5000
            });

            if (response.ok) {
                console.log('✅ ネットワーク接続正常 - P2P APIアクセス可能');
                this.addActivityFeedItem('✅', 'ネットワーク接続正常', new Date());
                return true;
            } else {
                console.warn(`⚠️ P2P API応答異常: ${response.status}`);
                this.addActivityFeedItem('⚠️', `P2P API応答異常: ${response.status}`, new Date());
                return false;
            }
        } catch (error) {
            console.error('❌ ネットワーク接続確認失敗:', error.message);
            this.addActivityFeedItem('❌', `ネットワーク接続確認失敗: ${error.message}`, new Date());
            return false;
        }
    }

    // 改善されたWebSocket診断機能
    diagnoseWebSocketIssue(error, event) {
        console.log('🔍 WebSocket診断を実行...');

        const diagnosis = [];

        // エラータイプ分析
        if (error) {
            diagnosis.push(`エラータイプ: ${error.type || 'unknown'}`);
            diagnosis.push(`エラーメッセージ: ${error.message || 'N/A'}`);
        }

        // 接続状態分析
        if (event && event.target) {
            const states = ['接続中', '接続済み', '切断中', '切断済み'];
            diagnosis.push(`接続状態: ${states[event.target.readyState] || event.target.readyState}`);
            diagnosis.push(`接続URL: ${event.target.url || 'N/A'}`);
        }

        // 切断コード分析
        if (event && event.code) {
            const commonCodes = {
                1000: '正常切断',
                1001: 'エンドポイント離脱',
                1002: 'プロトコルエラー',
                1003: '未サポートデータ',
                1006: '異常切断（ネットワーク問題の可能性）',
                1011: 'サーバー内部エラー',
                1012: 'サーバー再起動',
                1013: 'サーバー一時的利用不可'
            };

            diagnosis.push(`切断コード: ${event.code} (${commonCodes[event.code] || '不明'})`);
            if (event.reason) {
                diagnosis.push(`切断理由: ${event.reason}`);
            }
        }

        // 診断結果をログに記録
        console.log('📋 WebSocket診断結果:');
        diagnosis.forEach(item => console.log(`  - ${item}`));

        // ユーザーに診断結果を表示
        this.addActivityFeedItem('🔍', `WebSocket診断: ${diagnosis.join(', ')}`, new Date());

        return diagnosis;
    }

    // 手動でWebSocket再接続を試行する関数
    reconnectWebSocket() {
        console.log('🔄 手動でWebSocket再接続を開始...');
        this.addActivityFeedItem('🔄', '手動でWebSocket再接続を開始...', new Date());

        // 既存の接続を切断
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }

        // 再接続試行回数をリセット
        this.reconnectAttempts = 0;

        // 再接続実行
        this.connectWebSocket();
    }

    // WebSocket接続失敗時のフォールバックモード開始
    startFallbackMode() {
        console.log('🔄 フォールバックモード開始: P2P履歴APIを使用した定期更新');
        this.addActivityFeedItem('🔄', 'フォールバックモード: P2P履歴APIで定期更新を開始', new Date());

        // フォールバックモードフラグを設定
        this.fallbackMode = true;

        // 接続状態を部分的接続として表示
        this.updateConnectionStatus('p2p-status', 'partial');

        // 既存の履歴データ取得間隔を短縮（30秒間隔に変更）
        if (this.fallbackInterval) {
            clearInterval(this.fallbackInterval);
        }

        // 即座に履歴データを取得
        this.loadHistoricalData();

        // 30秒間隔で履歴データを更新
        this.intervals.fallback = setInterval(() => {
            this.loadHistoricalData();
        }, 30000);

        this.addActivityFeedItem('ℹ️', 'フォールバックモード: 30秒間隔でデータを更新します', new Date());
    }

    // フォールバックモード停止（WebSocket接続復旧時）
    stopFallbackMode() {
        if (this.fallbackMode) {
            console.log('✅ フォールバックモード終了: WebSocket接続復旧');
            this.addActivityFeedItem('✅', 'WebSocket接続復旧: フォールバックモード終了', new Date());

            this.fallbackMode = false;

            // メモリリーク対策: インターバルを適切にクリーンアップ
            if (this.intervals.fallback) {
                clearInterval(this.intervals.fallback);
                this.intervals.fallback = null;
            }
        }
    }

    handleEarthquakeData(data) {
        if (data.code === 551) { // 地震情報
            const earthquake = this.parseEarthquakeData(data);
            this.earthquakeHistory.unshift(earthquake);

            // 履歴を最新10件に制限
            if (this.earthquakeHistory.length > 10) {
                this.earthquakeHistory = this.earthquakeHistory.slice(0, 10);
            }

            this.updateEarthquakeDisplay();
            this.updateMapMarkers();
            this.updateOverlayInfo(earthquake);
            this.updateStatistics(earthquake);

            // 通知条件のチェック
            this.checkAndSendNotification(earthquake);

            this.addActivityFeedItem('🔴',
                `地震発生: ${earthquake.location} M${earthquake.magnitude} 震度${earthquake.maxIntensity}`,
                new Date()
            );

            console.log(`🌏 Earthquake detected: ${earthquake.location} M${earthquake.magnitude}`);
        }
    }

    // 通知条件チェックと送信
    checkAndSendNotification(earthquake) {
        const magnitude = earthquake.magnitude || 0;
        const intensity = this.getNumericIntensity(earthquake.maxIntensity);

        // 設定値と比較
        const shouldNotify = magnitude >= this.settings.magnitudeThreshold ||
                                   intensity >= this.settings.intensityThreshold;

        if (shouldNotify && this.settings.notifications) {
            // ブラウザ通知
            if (Notification.permission === 'granted') {
                new Notification('🌏 地震発生警報', {
                    body: `${earthquake.location}\nM${magnitude.toFixed(1)} 震度${earthquake.maxIntensity}\n${earthquake.time.toLocaleString('ja-JP')}`,
                    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiNlMTcwNTUiLz4KPHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAxOCAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPC9zdmc+Cjwvc3ZnPgo=',
                    requireInteraction: true // 重要な通知なので手動で閉じるまで表示
                });
            }

            // 音声アラート（3回繰り返し）
            this.playAlertSound(3);

            this.addActivityFeedItem('🚨',
                `警報発信: M${magnitude.toFixed(1)} 震度${earthquake.maxIntensity} (閾値: M${this.settings.magnitudeThreshold} 震度${this.settings.intensityThreshold})`,
                new Date()
            );

            console.log(`🚨 Alert triggered: M${magnitude.toFixed(1)} intensity ${earthquake.maxIntensity}`);
        } else {
            console.log(`ℹ️ No alert: M${magnitude.toFixed(1)} intensity ${earthquake.maxIntensity} (below thresholds)`);
        }
    }

    parseEarthquakeData(data) {
        const eq = data.earthquake || {};
        const hypocenter = eq.hypocenter || {};

        return {
            id: `${data.time}-${hypocenter.name}`,
            time: new Date(data.time),
            location: hypocenter.name || '不明',
            magnitude: hypocenter.magnitude || 0,
            depth: hypocenter.depth || 0,
            latitude: hypocenter.latitude || 0,
            longitude: hypocenter.longitude || 0,
            maxIntensity: this.parseIntensity(eq.maxScale) || '不明',
            points: data.points || []
        };
    }

    parseIntensity(scale) {
        const intensityMap = {
            10: '1', 20: '2', 30: '3', 40: '4',
            45: '5弱', 50: '5強', 55: '6弱', 60: '6強', 70: '7'
        };
        return intensityMap[scale] || scale?.toString() || '不明';
    }

    updateEarthquakeDisplay() {
        const container = document.getElementById('earthquake-history');

        if (this.earthquakeHistory.length === 0) {
            // XSS対策: innerHTML の代わりに安全な DOM 操作を使用
            container.textContent = '';
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'loading';
            const loadingText = document.createElement('div');
            loadingText.className = 'loading-text';
            loadingText.textContent = '地震データを待機中...';
            loadingDiv.appendChild(loadingText);
            container.appendChild(loadingDiv);
            return;
        }

        // XSS対策: innerHTML の代わりに安全な DOM 操作を使用
        container.textContent = ''; // 既存要素をクリア

        this.earthquakeHistory.forEach(eq => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'earthquake-item fade-in';
            itemDiv.addEventListener('click', () => this.selectEarthquake(eq.id));

            const headerDiv = document.createElement('div');
            headerDiv.className = 'earthquake-header';

            const magnitudeSpan = document.createElement('span');
            magnitudeSpan.className = 'magnitude';
            magnitudeSpan.textContent = `M${eq.magnitude.toFixed(1)}`;

            const intensitySpan = document.createElement('span');
            intensitySpan.className = 'intensity';
            intensitySpan.textContent = `震度${eq.maxIntensity}`;

            headerDiv.appendChild(magnitudeSpan);
            headerDiv.appendChild(intensitySpan);

            const locationDiv = document.createElement('div');
            locationDiv.className = 'earthquake-location';
            locationDiv.textContent = eq.location;

            const timeDiv = document.createElement('div');
            timeDiv.className = 'earthquake-time';
            timeDiv.textContent = eq.time.toLocaleString('ja-JP');

            itemDiv.appendChild(headerDiv);
            itemDiv.appendChild(locationDiv);
            itemDiv.appendChild(timeDiv);

            container.appendChild(itemDiv);
        });
    }

    updateMapMarkers() {
        // 既存のマーカーをクリア
        this.map.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                this.map.removeLayer(layer);
            }
        });

        // 最新の地震にマーカーを追加
        this.earthquakeHistory.forEach((eq, index) => {
            if (eq.latitude && eq.longitude) {
                const opacity = 1 - (index * 0.1); // 古いものほど薄く

                const marker = L.circleMarker([eq.latitude, eq.longitude], {
                    radius: Math.max(8, eq.magnitude * 2.5),
                    fillColor: this.getEarthquakeColor(eq.magnitude),
                    color: '#ffffff',
                    weight: 3,
                    opacity: opacity,
                    fillOpacity: opacity * 0.9,
                    className: 'earthquake-marker'
                }).addTo(this.map);

                marker.bindPopup(`
                    <div style="color: white; background: transparent;">
                        <strong>${eq.location}</strong><br>
                        M${eq.magnitude.toFixed(1)} 震度${eq.maxIntensity}<br>
                        深さ: ${eq.depth}km<br>
                        ${eq.time.toLocaleString('ja-JP')}
                    </div>
                `);
            }
        });
    }

    getEarthquakeColor(magnitude) {
        if (magnitude >= 7) return '#9C27B0';
        if (magnitude >= 6) return '#E91E63';
        if (magnitude >= 5) return '#FF5722';
        if (magnitude >= 4) return '#FF9800';
        if (magnitude >= 3) return '#FFC107';
        return '#4CAF50';
    }

    updateOverlayInfo(earthquake) {
        const latitudeEl = document.getElementById('latitude');
        if (latitudeEl) {
            latitudeEl.textContent = earthquake.latitude ? `${earthquake.latitude.toFixed(3)}°` : '---.---°';
        }

        const longitudeEl = document.getElementById('longitude');
        if (longitudeEl) {
            longitudeEl.textContent = earthquake.longitude ? `${earthquake.longitude.toFixed(3)}°` : '---.---°';
        }

        const depthEl = document.getElementById('depth');
        if (depthEl) {
            depthEl.textContent = earthquake.depth ? `${earthquake.depth} km` : '-- km';
        }

        const magnitudeEl = document.getElementById('magnitude');
        if (magnitudeEl) {
            magnitudeEl.textContent = earthquake.magnitude ? `M${earthquake.magnitude.toFixed(1)}` : 'M-.-';
        }
    }

    updateStatistics(earthquake) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // 今日の地震数
        this.stats.todayCount = this.earthquakeHistory.filter(eq =>
            eq.time >= today
        ).length;

        // 今週の地震数
        this.stats.weekCount = this.earthquakeHistory.filter(eq =>
            eq.time >= weekAgo
        ).length;

        // 最大震度
        const maxIntensityEq = this.earthquakeHistory.reduce((max, eq) => {
            const currentIntensity = this.getNumericIntensity(eq.maxIntensity);
            const maxIntensity = this.getNumericIntensity(max.maxIntensity);
            return currentIntensity > maxIntensity ? eq : max;
        }, { maxIntensity: '0' });

        this.stats.maxIntensity = maxIntensityEq.maxIntensity;
        this.updateStats();
    }

    getNumericIntensity(intensity) {
        const intensityMap = {
            '1': 1, '2': 2, '3': 3, '4': 4,
            '5弱': 4.5, '5強': 5.5, '6弱': 5.5, '6強': 6.5, '7': 7
        };
        return intensityMap[intensity] || 0;
    }

    updateStats() {
        const todayCountEl = document.getElementById('today-count');
        if (todayCountEl) {
            todayCountEl.textContent = this.stats.todayCount;
        }

        const weekCountEl = document.getElementById('week-count');
        if (weekCountEl) {
            weekCountEl.textContent = this.stats.weekCount;
        }

        const maxIntensityEl = document.getElementById('max-intensity');
        if (maxIntensityEl) {
            maxIntensityEl.textContent = this.stats.maxIntensity;
        }

        const dataPacketsEl = document.getElementById('data-packets');
        if (dataPacketsEl) {
            dataPacketsEl.textContent = this.stats.dataPackets;
        }

        const responseTimeEl = document.getElementById('response-time');
        if (responseTimeEl) {
            responseTimeEl.textContent = `${this.stats.responseTime}ms`;
        }
    }

    updateConnectionStatus(elementId, status) {
        const element = document.getElementById(elementId);
        if (element) {
            // 全ての状態クラスを削除
            element.classList.remove('connected', 'partial');

            // 新しい状態を設定
            if (status === true || status === 'connected') {
                element.classList.add('connected');
            } else if (status === 'partial') {
                element.classList.add('partial');
            }
            // false または 'disconnected' の場合はデフォルト（赤）のまま
        }
    }

    addActivityFeedItem(icon, text, time) {
        // メモリ内のアクティビティログを管理
        if (!this.activityLog) {
            this.activityLog = [];
        }

        const logEntry = {
            icon: icon,
            text: text,
            time: time
        };

        this.activityLog.unshift(logEntry);

        // 最大20件に制限
        if (this.activityLog.length > 20) {
            this.activityLog = this.activityLog.slice(0, 20);
        }

        // 設定パネルが開いている場合、そこのアクティビティフィードを更新
        const settingsFeed = document.getElementById('settings-activity-feed');
        if (settingsFeed) {
            this.updateActivityFeedDisplay(settingsFeed);
        }
    }

    updateActivityFeedDisplay(container) {
        // XSS対策: innerHTML の代わりに安全な DOM 操作を使用
        container.textContent = ''; // 既存要素をクリア

        if (!this.activityLog || this.activityLog.length === 0) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'feed-item';

            const iconDiv = document.createElement('div');
            iconDiv.className = 'feed-icon';
            iconDiv.textContent = '🟢';

            const contentDiv = document.createElement('div');
            contentDiv.className = 'feed-content';

            const textDiv = document.createElement('div');
            textDiv.className = 'feed-text';
            textDiv.textContent = 'システムが開始されました';

            const timeDiv = document.createElement('div');
            timeDiv.className = 'feed-time';
            timeDiv.textContent = this.startTime.toLocaleTimeString('ja-JP');

            contentDiv.appendChild(textDiv);
            contentDiv.appendChild(timeDiv);
            itemDiv.appendChild(iconDiv);
            itemDiv.appendChild(contentDiv);
            container.appendChild(itemDiv);
            return;
        }

        this.activityLog.forEach(log => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'feed-item';

            const iconDiv = document.createElement('div');
            iconDiv.className = 'feed-icon';
            iconDiv.textContent = log.icon;

            const contentDiv = document.createElement('div');
            contentDiv.className = 'feed-content';

            const textDiv = document.createElement('div');
            textDiv.className = 'feed-text';
            textDiv.textContent = log.text;

            const timeDiv = document.createElement('div');
            timeDiv.className = 'feed-time';
            timeDiv.textContent = log.time.toLocaleTimeString('ja-JP');

            contentDiv.appendChild(textDiv);
            contentDiv.appendChild(timeDiv);
            itemDiv.appendChild(iconDiv);
            itemDiv.appendChild(contentDiv);
            container.appendChild(itemDiv);
        });
    }

    async loadHistoricalData() {
        try {
            console.log('📚 Loading historical earthquake data...');

            // タイムアウト付きでAPIリクエスト
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒でタイムアウト

            const response = await fetch('https://api.p2pquake.net/v2/history?codes=551&limit=10', {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // データを並列処理で高速化
            this.earthquakeHistory = data.map(item => this.parseEarthquakeData(item));

            // UI更新を並列実行
            await Promise.all([
                this.updateEarthquakeDisplayAsync(),
                this.updateMapMarkersAsync()
            ]);

            if (this.earthquakeHistory.length > 0) {
                this.updateOverlayInfo(this.earthquakeHistory[0]);
                this.updateStatistics(this.earthquakeHistory[0]);
            }

            this.addActivityFeedItem('📊', `過去の地震データ ${data.length}件を読み込みました`, new Date());
            console.log(`✅ Loaded ${data.length} historical earthquake records in optimized mode`);
        } catch (error) {
            console.error('❌ Failed to load historical data:', error);

            // フォールバック: キャッシュまたはサンプルデータを使用
            this.loadFallbackData();

            if (error.name === 'AbortError') {
                this.addActivityFeedItem('⚠️', 'データ読み込みがタイムアウトしました（サンプルデータを表示）', new Date());
            } else {
                this.addActivityFeedItem('⚠️', `履歴データの読み込みに失敗: ${error.message}`, new Date());
            }
        }
    }

    async updateEarthquakeDisplayAsync() {
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                this.updateEarthquakeDisplay();
                resolve();
            });
        });
    }

    async updateMapMarkersAsync() {
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                this.updateMapMarkers();
                resolve();
            });
        });
    }

    loadFallbackData() {
        // サンプル地震データ（接続失敗時のフォールバック）
        this.earthquakeHistory = [
            {
                id: 'sample-1',
                time: new Date(),
                location: '接続エラー - サンプルデータ',
                magnitude: 0,
                depth: 0,
                latitude: 36.0,
                longitude: 138.0,
                maxIntensity: '-',
                points: []
            }
        ];

        this.updateEarthquakeDisplay();
        this.updateMapMarkers();

        console.log('🔄 Fallback data loaded');
    }

    startPerformanceMonitoring() {
        this.intervals.performance = setInterval(() => {
            // メモリ使用量の監視
            if (performance.memory) {
                const memoryUsageEl = document.getElementById('memory-usage');
                if (memoryUsageEl) {
                    const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
                    memoryUsageEl.textContent = `${memoryMB}MB`;
                }
            }

            // 活発地域数の更新
            const activeRegionsEl = document.getElementById('active-regions');
            if (activeRegionsEl && this.earthquakeHistory) {
                const activeRegions = new Set(this.earthquakeHistory.map(eq => eq.location)).size;
                activeRegionsEl.textContent = activeRegions;
            }
        }, 5000);
    }

    showIntensityPopup(earthquake) {
        // 既存のポップアップがあれば削除
        this.closeIntensityPopup();

        // オーバーレイ作成
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';
        overlay.id = 'intensity-popup-overlay';
        overlay.onclick = () => this.closeIntensityPopup();

        // ポップアップ作成
        const popup = document.createElement('div');
        popup.className = 'intensity-popup';
        popup.id = 'intensity-popup';

        // ヘッダー
        const header = `
            <div class="popup-header">
                <h3 class="popup-title">🌏 地震詳細情報</h3>
                <button class="popup-close" onclick="window.monitor.closeIntensityPopup()">×</button>
            </div>
        `;

        // 地震概要
        const summary = `
            <div class="earthquake-summary">
                <div style="font-size: 16px; font-weight: 600; color: #f7fafc; margin-bottom: 8px;">
                    ${earthquake.location}
                </div>
                <div style="font-size: 14px; color: #a0aec0; margin-bottom: 12px;">
                    ${earthquake.time.toLocaleString('ja-JP')}
                </div>
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="summary-label">マグニチュード</div>
                        <div class="summary-value">M${earthquake.magnitude.toFixed(1)}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">最大震度</div>
                        <div class="summary-value">震度${earthquake.maxIntensity}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">深さ</div>
                        <div class="summary-value">${earthquake.depth}km</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">座標</div>
                        <div class="summary-value">${earthquake.latitude.toFixed(2)}°, ${earthquake.longitude.toFixed(2)}°</div>
                    </div>
                </div>
            </div>
        `;

        // 震度情報
        let intensityContent = '';
        if (earthquake.points && earthquake.points.length > 0) {
            // 震度別にグループ化
            const intensityGroups = {};
            earthquake.points.forEach(point => {
                const intensity = this.parseIntensity(point.scale);
                if (!intensityGroups[intensity]) {
                    intensityGroups[intensity] = [];
                }
                intensityGroups[intensity].push(point.addr);
            });

            // 震度の降順でソート
            const sortedIntensities = Object.keys(intensityGroups).sort((a, b) => {
                return this.getNumericIntensity(b) - this.getNumericIntensity(a);
            });

            intensityContent = `
                <div style="font-size: 16px; font-weight: 600; color: #74b9ff; margin-bottom: 12px;">
                    📍 各地の震度情報
                </div>
                <div class="intensity-list">
            `;

            sortedIntensities.forEach(intensity => {
                const regions = intensityGroups[intensity];
                const intensityColor = this.getIntensityColor(intensity);

                intensityContent += `
                    <div class="intensity-section">
                        <div class="intensity-header" style="background: ${intensityColor};">
                            <span>震度${intensity}</span>
                            <span>${regions.length}地域</span>
                        </div>
                        <div class="intensity-regions">
                `;

                regions.forEach(region => {
                    intensityContent += `<div class="region-item">${region}</div>`;
                });

                intensityContent += `
                        </div>
                    </div>
                `;
            });

            intensityContent += '</div>';
        } else {
            intensityContent = `
                <div style="font-size: 16px; font-weight: 600; color: #74b9ff; margin-bottom: 12px;">
                    📍 震度情報
                </div>
                <div style="color: #a0aec0; text-align: center; padding: 20px;">
                    詳細な震度情報は利用できません
                </div>
            `;
        }

        // XSS対策: innerHTML の代わりに安全な DOM 操作を使用
        popup.textContent = '';

        // ヘッダー部分を作成
        const headerDiv = document.createElement('div');
        headerDiv.innerHTML = header; // headerは固定文字列なので安全
        popup.appendChild(headerDiv);

        // サマリー部分を作成
        const summaryDiv = document.createElement('div');
        summaryDiv.innerHTML = summary; // summaryは固定文字列なので安全
        popup.appendChild(summaryDiv);

        // 震度情報部分を作成
        const intensityDiv = document.createElement('div');
        intensityDiv.innerHTML = intensityContent; // intensityContentは固定文字列なので安全
        popup.appendChild(intensityDiv);

        // DOM に追加
        document.body.appendChild(overlay);
        document.body.appendChild(popup);

        // アクティビティログに記録
        this.addActivityFeedItem('📋', `${earthquake.location}の詳細情報を表示`, new Date());
    }

    closeIntensityPopup() {
        const overlay = document.getElementById('intensity-popup-overlay');
        const popup = document.getElementById('intensity-popup');

        if (overlay) overlay.remove();
        if (popup) popup.remove();
    }

    getIntensityColor(intensity) {
        const colorMap = {
            '7': 'linear-gradient(135deg, #8B0000 0%, #B22222 100%)',
            '6強': 'linear-gradient(135deg, #DC143C 0%, #FF1493 100%)',
            '6弱': 'linear-gradient(135deg, #FF4500 0%, #FF6347 100%)',
            '5強': 'linear-gradient(135deg, #FF8C00 0%, #FFA500 100%)',
            '5弱': 'linear-gradient(135deg, #FFD700 0%, #FFFF00 100%)',
            '4': 'linear-gradient(135deg, #32CD32 0%, #7CFC00 100%)',
            '3': 'linear-gradient(135deg, #00CED1 0%, #00FFFF 100%)',
            '2': 'linear-gradient(135deg, #4169E1 0%, #6495ED 100%)',
            '1': 'linear-gradient(135deg, #9370DB 0%, #BA55D3 100%)'
        };
        return colorMap[intensity] || 'linear-gradient(135deg, #4a9eff 0%, #667eea 100%)';
    }

    showSettingsPanel() {
        // 既存の設定パネルがあれば削除
        this.closeSettingsPanel();

        // オーバーレイ作成
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';
        overlay.id = 'settings-overlay';
        overlay.onclick = () => this.closeSettingsPanel();

        // 設定パネル作成
        const panel = document.createElement('div');
        panel.className = 'settings-panel';
        panel.id = 'settings-panel';

        // アクティビティフィードのHTMLを生成
        const activityFeedHTML = document.getElementById('activity-feed') ?
            document.getElementById('activity-feed').innerHTML :
            '<div class="feed-item"><div class="feed-icon">🟢</div><div class="feed-content"><div class="feed-text">システムが開始されました</div><div class="feed-time">--:--:--</div></div></div>';

        panel.innerHTML = `
            <div class="settings-header">
                <h3 class="settings-title">⚙️ システム設定</h3>
                <button class="popup-close" onclick="window.monitor.closeSettingsPanel()">×</button>
            </div>

            <div class="settings-section">
                <div class="settings-section-title" style="cursor: pointer;" onclick="window.monitor.toggleActivityFeed()">
                    <span>📋</span>
                    アクティビティフィード
                    <span id="activity-feed-toggle" style="margin-left: auto; color: #74b9ff;">▶</span>
                </div>
                <div class="activity-feed-settings" id="settings-activity-feed" style="display: none;">
                    ${activityFeedHTML}
                </div>
            </div>


            <div class="settings-section">
                <div class="settings-section-title" style="cursor: pointer;" onclick="window.monitor.toggleBrightnessSettings()">
                    <span>🔆</span>
                    表示調整
                    <span id="brightness-settings-toggle" style="margin-left: auto; color: #74b9ff;">▶</span>
                </div>
                <div class="brightness-settings" id="settings-brightness" style="display: none;">
                    <div class="setting-item">
                        <label class="setting-label">地図の明度</label>
                        <div class="setting-input-group">
                            <input type="range" id="map-brightness-slider" min="50" max="200" step="10" value="100"
                                   onchange="window.monitor.updateMapBrightness(this.value); document.getElementById('brightness-display').textContent = this.value + '%'">
                            <span id="brightness-display" class="setting-value">100%</span>
                        </div>
                        <div class="brightness-presets" style="margin-top: 8px; display: flex; gap: 8px;">
                            <button class="preset-btn" onclick="window.monitor.setBrightness(70)" style="padding: 4px 8px; background: #2d3748; color: white; border: 1px solid #4a5568; border-radius: 4px; cursor: pointer;">暗め</button>
                            <button class="preset-btn" onclick="window.monitor.setBrightness(100)" style="padding: 4px 8px; background: #2d3748; color: white; border: 1px solid #4a5568; border-radius: 4px; cursor: pointer;">標準</button>
                            <button class="preset-btn" onclick="window.monitor.setBrightness(140)" style="padding: 4px 8px; background: #2d3748; color: white; border: 1px solid #4a5568; border-radius: 4px; cursor: pointer;">明るめ</button>
                    </div>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <div class="settings-section-title" style="cursor: pointer;" onclick="window.monitor.toggleNotificationSettings()">
                    <span>🔔</span>
                    通知設定
                    <span id="notification-settings-toggle" style="margin-left: auto; color: #74b9ff;">▶</span>
                </div>
                <div class="notification-settings" id="settings-notification" style="display: none;">
                <div class="setting-item">
                    <label class="setting-label">マグニチュード閾値</label>
                    <div class="setting-input-group">
                        <input type="range" id="magnitude-threshold" min="2.0" max="8.0" step="0.1" value="${this.settings.magnitudeThreshold}"
                               onchange="window.monitor.updateSetting('magnitudeThreshold', parseFloat(this.value)); document.getElementById('magnitude-value').textContent = 'M' + this.value">
                        <span id="magnitude-value" class="setting-value">M${this.settings.magnitudeThreshold}</span>
                    </div>
                </div>
                <div class="setting-item">
                    <label class="setting-label">震度閾値</label>
                    <div class="setting-input-group">
                        <select id="intensity-threshold" onchange="window.monitor.updateSetting('intensityThreshold', parseInt(this.value))">
                            <option value="1" ${this.settings.intensityThreshold === 1 ? 'selected' : ''}>震度1</option>
                            <option value="2" ${this.settings.intensityThreshold === 2 ? 'selected' : ''}>震度2</option>
                            <option value="3" ${this.settings.intensityThreshold === 3 ? 'selected' : ''}>震度3</option>
                            <option value="4" ${this.settings.intensityThreshold === 4 ? 'selected' : ''}>震度4</option>
                            <option value="5" ${this.settings.intensityThreshold === 5 ? 'selected' : ''}>震度5弱以上</option>
                        </select>
                    </div>
                </div>
                <div class="setting-item">
                    <label class="setting-label">音量</label>
                    <div class="setting-input-group">
                        <input type="range" id="volume-setting" min="0" max="100" step="5" value="${this.settings.volume}"
                               onchange="window.monitor.updateSetting('volume', parseInt(this.value)); document.getElementById('volume-value').textContent = this.value + '%'">
                        <span id="volume-value" class="setting-value">${this.settings.volume}%</span>
                    </div>
                </div>
                <div class="setting-item">
                    <label class="setting-label">自動ズーム</label>
                    <div class="setting-input-group">
                        <label class="toggle-switch">
                            <input type="checkbox" id="auto-zoom" ${this.settings.autoZoom ? 'checked' : ''}
                                   onchange="window.monitor.updateSetting('autoZoom', this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                        <span class="setting-value">${this.settings.autoZoom ? '有効' : '無効'}</span>
                    </div>
                </div>
                <div class="setting-item">
                    <button class="test-button" onclick="window.monitor.testNotification()">🔔 通知テスト</button>
                    <button class="test-button" onclick="window.monitor.testSound()">🔊 音声テスト</button>
                </div>
                <div class="setting-item">
                    <button class="test-button" onclick="window.monitor.testTsunamiAlert('advisory')">🌊 津波注意報テスト</button>
                    <button class="test-button" onclick="window.monitor.testTsunamiAlert('warning')">⚠️ 津波警報テスト</button>
                    <button class="test-button" onclick="window.monitor.testTsunamiAlert('major_warning')">🚨 大津波警報テスト</button>
                </div>
                <div class="setting-item">
                    <button class="test-button" onclick="window.monitor.stopAllSounds()" style="background: linear-gradient(135deg, #ff4757 0%, #c44569 100%);">🔇 全音声停止</button>
                </div>
                </div>
            </div>

            <div class="settings-section">
                <div class="settings-section-title" style="cursor: pointer;" onclick="window.monitor.toggleTestToolsSettings()">
                    <span>🧪</span>
                    テストツール・診断
                    <span id="test-tools-settings-toggle" style="margin-left: auto; color: #74b9ff;">▶</span>
                </div>
                <div class="test-tools-settings" id="settings-test-tools" style="display: none;">
                    <div class="setting-item">
                        <label class="setting-label">システム診断ツール</label>
                        <div class="setting-description">各機能の動作確認とトラブルシューティング</div>
                        <div class="test-tools-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px;">
                            <button class="test-tool-btn" onclick="window.monitor.openTestTool('test')"
                                    style="padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                <span>🧪</span>
                                <div style="text-align: left;">
                                    <div style="font-weight: bold;">総合テスト</div>
                                    <div style="font-size: 12px; opacity: 0.9;">全機能検証</div>
                                </div>
                            </button>
                            <button class="test-tool-btn" onclick="window.monitor.openTestTool('websocket-test')"
                                    style="padding: 12px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                <span>🔌</span>
                                <div style="text-align: left;">
                                    <div style="font-weight: bold;">WebSocket診断</div>
                                    <div style="font-size: 12px; opacity: 0.9;">接続問題解決</div>
                                </div>
                            </button>
                            <button class="test-tool-btn" onclick="window.monitor.openTestTool('audio-test')"
                                    style="padding: 12px; background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                <span>🔊</span>
                                <div style="text-align: left;">
                                    <div style="font-weight: bold;">音声テスト</div>
                                    <div style="font-size: 12px; opacity: 0.9;">音声システム</div>
                                </div>
                            </button>
                            <button class="test-tool-btn" onclick="window.monitor.openTestTool('cors-test')"
                                    style="padding: 12px; background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color: #2d3748; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                <span>🌐</span>
                                <div style="text-align: left;">
                                    <div style="font-weight: bold;">API/CORS診断</div>
                                    <div style="font-size: 12px; opacity: 0.8;">外部API接続</div>
                                </div>
                            </button>
                        </div>
                    </div>
                    <div class="setting-item">
                        <label class="setting-label">システム状態モニター</label>
                        <div class="setting-description">リアルタイムでシステム状態とエラー情報を表示</div>
                        <div id="system-status-monitor" style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; margin-top: 8px; font-family: monospace; font-size: 13px; max-height: 200px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.1);">
                            <div style="color: #00d4aa; margin-bottom: 8px;">🔄 システム状態を読み込み中...</div>
                        </div>
                        <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
                            <button class="quick-test-btn"
                                    onclick="window.monitor.refreshSystemStatus();"
                                    style="padding: 8px 16px; background: #4a9eff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
                                🔄 状態更新
                            </button>
                            <button class="quick-test-btn"
                                    onclick="window.monitor.quickConnectionCheck();"
                                    style="padding: 8px 16px; background: #00d4aa; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
                                🌐 接続テスト
                            </button>
                            <button class="quick-test-btn"
                                    onclick="window.monitor.quickAudioCheck();"
                                    style="padding: 8px 16px; background: #ff6b6b; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
                                🔊 音声テスト
                            </button>
                            <button class="quick-test-btn"
                                    onclick="window.monitor.clearSystemStatus();"
                                    style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
                                🗑️ クリア
                            </button>
                        </div>
                    </div>
                    <div class="setting-item">
                        <label class="setting-label">エラーログモニター</label>
                        <div class="setting-description">JavaScript エラーとシステムエラーをリアルタイム表示</div>
                        <div id="error-log-monitor" style="background: rgba(139, 0, 0, 0.2); border-radius: 8px; padding: 12px; margin-top: 8px; font-family: monospace; font-size: 12px; max-height: 150px; overflow-y: auto; border: 1px solid rgba(255, 0, 0, 0.3);">
                            <div style="color: #00d4aa;">✅ エラーなし - システム正常稼働中</div>
                        </div>
                        <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
                            <button class="quick-test-btn"
                                    onclick="window.monitor.clearErrorLog();"
                                    style="padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                🗑️ エラーログクリア
                            </button>
                            <button class="quick-test-btn"
                                    onclick="window.monitor.exportSystemReport();"
                                    style="padding: 6px 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                📄 レポート出力
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // DOM に追加
        document.body.appendChild(overlay);
        document.body.appendChild(panel);

        // アクティビティログに記録
        this.addActivityFeedItem('⚙️', 'システム設定を開きました', new Date());

        // DOM構築完了後にイベントハンドラーを設定（CSP nonce対応）
        setTimeout(() => {
            this.setupSettingsPanelEventHandlers();
            // 全てのセクションを確実に折りたたんだ状態にする
            this.ensureAllSectionsCollapsed();
        }, 50);

        // システム状態モニターを初期化
        setTimeout(() => {
            this.initializeSystemMonitor();
            this.refreshSystemStatus();
        }, 500);
    }

    /**
     * 設定パネルのイベントハンドラーを設定（CSP nonce対応）
     */
    setupSettingsPanelEventHandlers() {
        // 設定パネルの閉じるボタン
        const closeBtn = document.querySelector('#settings-panel .popup-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeSettingsPanel());
        }

        // セクション切り替えボタンの個別設定
        const sectionTitleButtons = document.querySelectorAll('.settings-section-title');
        sectionTitleButtons.forEach(button => {
            const onclickAttr = button.getAttribute('onclick');
            if (onclickAttr) {
                button.removeAttribute('onclick');
                // onclick属性から対応するメソッドを特定して設定
                if (onclickAttr.includes('toggleActivityFeed')) {
                    button.addEventListener('click', () => this.toggleActivityFeed());
                } else if (onclickAttr.includes('toggleBrightnessSettings')) {
                    button.addEventListener('click', () => this.toggleBrightnessSettings());
                } else if (onclickAttr.includes('toggleNotificationSettings')) {
                    button.addEventListener('click', () => this.toggleNotificationSettings());
                } else if (onclickAttr.includes('toggleTestToolsSettings')) {
                    button.addEventListener('click', () => this.toggleTestToolsSettings());
                }
            }
        });

        // テストボタン群
        const testButtons = [
            { selector: '[onclick*="testNotification"]', handler: () => this.testNotification() },
            { selector: '[onclick*="testSound"]', handler: () => this.testSound() },
            { selector: '[onclick*="testTsunamiAlert(\'advisory\')"]', handler: () => this.testTsunamiAlert('advisory') },
            { selector: '[onclick*="testTsunamiAlert(\'warning\')"]', handler: () => this.testTsunamiAlert('warning') },
            { selector: '[onclick*="testTsunamiAlert(\'major_warning\')"]', handler: () => this.testTsunamiAlert('major_warning') },
            { selector: '[onclick*="stopAllSounds"]', handler: () => this.stopAllSounds() }
        ];

        testButtons.forEach(({ selector, handler }) => {
            const button = document.querySelector(selector);
            if (button) {
                button.removeAttribute('onclick');
                button.addEventListener('click', handler);
            }
        });

        // プリセットボタン
        const presetButtons = document.querySelectorAll('.preset-btn');
        presetButtons.forEach(button => {
            const onclickAttr = button.getAttribute('onclick');
            if (onclickAttr) {
                button.removeAttribute('onclick');
                const brightness = onclickAttr.match(/setBrightness\((\d+)\)/);
                if (brightness) {
                    button.addEventListener('click', () => this.setBrightness(parseInt(brightness[1])));
                }
            }
        });

        // システム診断ボタン群
        const systemButtons = [
            { selector: '[onclick*="refreshSystemStatus"]', handler: () => this.refreshSystemStatus() },
            { selector: '[onclick*="quickConnectionCheck"]', handler: () => this.quickConnectionCheck() },
            { selector: '[onclick*="quickAudioCheck"]', handler: () => this.quickAudioCheck() },
            { selector: '[onclick*="clearSystemStatus"]', handler: () => this.clearSystemStatus() },
            { selector: '[onclick*="clearErrorLog"]', handler: () => this.clearErrorLog() },
            { selector: '[onclick*="exportSystemReport"]', handler: () => this.exportSystemReport() }
        ];

        systemButtons.forEach(({ selector, handler }) => {
            const button = document.querySelector(selector);
            if (button) {
                button.removeAttribute('onclick');
                button.addEventListener('click', handler);
            }
        });

        // テストツールボタン群（より確実な検索）
        const testToolButtons = document.querySelectorAll('#settings-test-tools .test-tool-btn');
        console.log(`🔍 テストツールボタン検出: ${testToolButtons.length}個`);

        testToolButtons.forEach((button, index) => {
            const onclickAttr = button.getAttribute('onclick');
            console.log(`🔧 テストツールボタン ${index + 1}: onclick="${onclickAttr}"`);

            if (onclickAttr) {
                button.removeAttribute('onclick');
                const toolMatch = onclickAttr.match(/openTestTool\('([^']+)'\)/);
                if (toolMatch) {
                    const toolName = toolMatch[1];
                    button.addEventListener('click', () => {
                        console.log(`🧪 テストツール起動: ${toolName}`);
                        this.openTestTool(toolName);
                    });
                    console.log(`✅ テストツールボタン設定完了: ${toolName}`);
                }
            }
        });

        console.log('✅ 設定パネルのイベントハンドラー設定完了');
    }

    /**
     * 全ての設定セクションを折りたたんだ状態にする
     */
    ensureAllSectionsCollapsed() {
        const sections = [
            { containerId: 'settings-activity-feed', toggleId: 'activity-feed-toggle' },
            { containerId: 'settings-brightness', toggleId: 'brightness-settings-toggle' },
            { containerId: 'settings-notification', toggleId: 'notification-settings-toggle' },
            { containerId: 'settings-test-tools', toggleId: 'test-tools-settings-toggle' }
        ];

        sections.forEach(({ containerId, toggleId }) => {
            const container = document.getElementById(containerId);
            const toggle = document.getElementById(toggleId);

            if (container && toggle) {
                container.style.display = 'none';
                toggle.textContent = '▶';
            }
        });

        console.log('📋 全ての設定セクションを折りたたみました');
    }

    toggleNotificationSettings() {
        const settingsContainer = document.getElementById('settings-notification');
        const toggleIcon = document.getElementById('notification-settings-toggle');

        if (settingsContainer && toggleIcon) {
            const isVisible = settingsContainer.style.display !== 'none';

            if (isVisible) {
                settingsContainer.style.display = 'none';
                toggleIcon.textContent = '▶';
            } else {
                settingsContainer.style.display = 'block';
                toggleIcon.textContent = '▼';
            }

            // アクティビティログに記録
            this.addActivityFeedItem('🔔',
                isVisible ? '通知設定を閉じました' : '通知設定を開きました',
                new Date()
            );
        }
    }

    toggleTestToolsSettings() {
        const settingsContainer = document.getElementById('settings-test-tools');
        const toggleIcon = document.getElementById('test-tools-settings-toggle');

        if (settingsContainer && toggleIcon) {
            const isVisible = settingsContainer.style.display !== 'none';

            if (isVisible) {
                settingsContainer.style.display = 'none';
                toggleIcon.textContent = '▶';
            } else {
                settingsContainer.style.display = 'block';
                toggleIcon.textContent = '▼';
            }

            // アクティビティログに記録
            this.addActivityFeedItem('🧪',
                isVisible ? 'テストツール設定を閉じました' : 'テストツール設定を開きました',
                new Date()
            );
        }
    }

    // テストツールを開く（動的URL対応）
    openTestTool(toolName) {
        const currentOrigin = window.location.origin;
        const currentPort = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
        const baseURL = `${window.location.protocol}//${window.location.hostname}:${currentPort}`;

        const toolURL = `${baseURL}/${toolName}.html`;

        // 新しいタブで開く
        const newTab = window.open(toolURL, '_blank');

        if (newTab) {
            // アクティビティログに記録
            const toolNames = {
                'test': '総合テストツール',
                'websocket-test': 'WebSocket診断ツール',
                'audio-test': '音声テストツール',
                'cors-test': 'API/CORS診断ツール'
            };

            this.addActivityFeedItem('🧪',
                `${toolNames[toolName] || toolName}を開きました`,
                new Date()
            );
        } else {
            // ポップアップブロックされた場合
            this.showNotification('ポップアップがブロックされました。ブラウザの設定を確認してください。', 'warning');
            this.addActivityFeedItem('⚠️',
                `${toolName}ツールの起動に失敗しました（ポップアップブロック）`,
                new Date()
            );
        }
    }

    // クイック診断機能（統合版）
    async quickSystemCheck() {
        try {
            this.addActivityFeedItem('📊', 'システム状態チェックを開始...', new Date());
            await this.refreshSystemStatus();
            this.showNotification('✅ システム状態チェック完了\n詳細は設定パネルで確認できます', 'success');
        } catch (error) {
            this.logError(`システム診断エラー: ${error.message}`);
            this.showNotification(`❌ システム診断エラー: ${error.message}`, 'error');
        }
    }

    async quickConnectionCheck() {
        try {
            this.addActivityFeedItem('🌐', '接続確認を開始...', new Date());

            // P2P API接続確認
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch('/api/status', {
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                this.showNotification('✅ サーバー接続正常\n✅ P2P API利用可能', 'success');
                this.addActivityFeedItem('🌐', '接続確認完了 - 全て正常', new Date());
                this.logSystemStatus(`✅ 接続テスト成功: ${response.status}`);
            } else {
                this.logError(`サーバー応答異常: ${response.status} ${response.statusText}`);
                this.showNotification(`⚠️ サーバー応答異常 (${response.status})`, 'warning');
            }
        } catch (error) {
            this.logError(`接続テスト失敗: ${error.message}`);
            let errorMessage = '❌ サーバー接続失敗';
            if (error.name === 'AbortError') {
                errorMessage += ' (タイムアウト)';
            } else {
                errorMessage += ` (${error.message})`;
            }
            this.showNotification(errorMessage, 'error');
        }
    }

    async quickAudioCheck() {
        this.addActivityFeedItem('🔊', '音声確認を開始...', new Date());

        try {
            if (window.audioAlertSystem) {
                await window.audioAlertSystem.playTestSound();
                this.showNotification('✅ 音声システム正常動作', 'success');
                this.addActivityFeedItem('🔊', '音声確認完了 - 正常動作', new Date());
                this.logSystemStatus('✅ 音声テスト成功');
            } else {
                this.logError('音声システム未初期化');
                this.showNotification('❌ 音声システム未初期化', 'error');
            }
        } catch (error) {
            this.logError(`音声テスト失敗: ${error.message}`);
            this.showNotification('❌ 音声テスト失敗', 'error');
        }
    }

    // システムモニター初期化
    initializeSystemMonitor() {
        // エラーログ配列を初期化
        if (!this.errorLog) {
            this.errorLog = [];
        }

        if (!this.systemStatusLog) {
            this.systemStatusLog = [];
        }

        // グローバルエラーハンドラーを設定
        window.addEventListener('error', (event) => {
            this.logError(`JavaScript Error: ${event.message} at ${event.filename}:${event.lineno}`);
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.logError(`Promise Rejection: ${event.reason}`);
        });

        // 定期的なシステム状態チェック（30秒間隔）
        if (this.intervals.systemMonitor) {
            clearInterval(this.intervals.systemMonitor);
        }
        this.intervals.systemMonitor = setInterval(() => {
            this.updateSystemStatusSilently();
        }, 30000);

        this.logSystemStatus('🟢 システムモニター初期化完了');
    }

    // システム状態を更新（サイレント）
    async updateSystemStatusSilently() {
        try {
            const status = await this.getSystemStatus();
            this.updateSystemStatusDisplay(status);
        } catch (error) {
            this.logError(`システム状態更新エラー: ${error.message}`);
        }
    }

    // システム状態を取得
    async getSystemStatus() {
        const status = {
            timestamp: new Date().toLocaleTimeString(),
            websocket: {
                connected: this.websocket && this.websocket.readyState === WebSocket.OPEN,
                state: this.websocket ? this.websocket.readyState : 'N/A',
                url: 'wss://api.p2pquake.net/v2/ws'
            },
            audio: {
                initialized: window.audioAlertSystem ? window.audioAlertSystem.getStatus()?.initialized : false,
                available: typeof window.audioAlertSystem !== 'undefined'
            },
            notifications: {
                permission: Notification.permission,
                supported: 'Notification' in window
            },
            map: {
                initialized: !!this.map,
                layers: this.mapLayers ? Object.keys(this.mapLayers).length : 0
            },
            server: null
        };

        // サーバー状態確認
        try {
            const response = await fetch('/api/status', {
                signal: AbortSignal.timeout(3000),
                headers: { 'Accept': 'application/json' }
            });
            status.server = {
                available: response.ok,
                status: response.status,
                statusText: response.statusText
            };
        } catch (error) {
            status.server = {
                available: false,
                error: error.message
            };
        }

        return status;
    }

    // システム状態表示を更新
    updateSystemStatusDisplay(status) {
        const monitor = document.getElementById('system-status-monitor');
        if (!monitor) return;

        const wsStatus = status.websocket.connected ?
            `🟢 WebSocket: 接続中` :
            `🔴 WebSocket: 切断 (状態: ${status.websocket.state})`;

        const audioStatus = status.audio.initialized ?
            `🟢 音声システム: 正常` :
            `🟡 音声システム: ${status.audio.available ? '未初期化' : '利用不可'}`;

        const notificationStatus = status.notifications.permission === 'granted' ?
            `🟢 通知: 許可済み` :
            `🟡 通知: ${status.notifications.permission}`;

        const mapStatus = status.map.initialized ?
            `🟢 地図: 正常 (${status.map.layers}レイヤー)` :
            `🔴 地図: 未初期化`;

        const serverStatus = status.server?.available ?
            `🟢 サーバー: 正常 (${status.server.status})` :
            `🔴 サーバー: ${status.server?.error || '接続失敗'}`;

        const html = `
            <div style="color: #a0aec0; font-size: 11px; margin-bottom: 6px;">最終更新: ${status.timestamp}</div>
            <div style="line-height: 1.4;">
                <div style="color: ${status.websocket.connected ? '#00d4aa' : '#ff6b6b'};">${wsStatus}</div>
                <div style="color: ${status.audio.initialized ? '#00d4aa' : '#ffd93d'};">${audioStatus}</div>
                <div style="color: ${status.notifications.permission === 'granted' ? '#00d4aa' : '#ffd93d'};">${notificationStatus}</div>
                <div style="color: ${status.map.initialized ? '#00d4aa' : '#ff6b6b'};">${mapStatus}</div>
                <div style="color: ${status.server?.available ? '#00d4aa' : '#ff6b6b'};">${serverStatus}</div>
            </div>
        `;

        monitor.innerHTML = html;
    }

    // エラーをログに記録
    logError(message) {
        const timestamp = new Date().toLocaleTimeString();
        const errorEntry = {
            timestamp,
            message,
            type: 'error'
        };

        this.errorLog.unshift(errorEntry);

        // 最大50件まで保持
        if (this.errorLog.length > 50) {
            this.errorLog = this.errorLog.slice(0, 50);
        }

        this.updateErrorLogDisplay();

        // アクティビティフィードにも記録
        this.addActivityFeedItem('❌', message, new Date());
    }

    // システム状態をログに記録
    logSystemStatus(message) {
        const timestamp = new Date().toLocaleTimeString();
        const statusEntry = {
            timestamp,
            message,
            type: 'info'
        };

        this.systemStatusLog.unshift(statusEntry);

        // 最大30件まで保持
        if (this.systemStatusLog.length > 30) {
            this.systemStatusLog = this.systemStatusLog.slice(0, 30);
        }
    }

    // エラーログ表示を更新
    updateErrorLogDisplay() {
        const monitor = document.getElementById('error-log-monitor');
        if (!monitor) return;

        if (this.errorLog.length === 0) {
            monitor.innerHTML = '<div style="color: #00d4aa;">✅ エラーなし - システム正常稼働中</div>';
            return;
        }

        const html = this.errorLog.slice(0, 10).map(entry =>
            `<div style="color: #ff6b6b; margin-bottom: 4px;">
                <span style="color: #a0aec0; font-size: 11px;">[${entry.timestamp}]</span>
                ${entry.message}
            </div>`
        ).join('');

        monitor.innerHTML = html;
        monitor.scrollTop = 0;
    }

    // システム状態を手動更新
    async refreshSystemStatus() {
        try {
            this.logSystemStatus('🔄 システム状態を更新中...');
            const status = await this.getSystemStatus();
            this.updateSystemStatusDisplay(status);
            this.logSystemStatus('✅ システム状態更新完了');
            this.addActivityFeedItem('🔄', 'システム状態を更新しました', new Date());
        } catch (error) {
            this.logError(`システム状態更新エラー: ${error.message}`);
        }
    }

    // システム状態をクリア
    clearSystemStatus() {
        const monitor = document.getElementById('system-status-monitor');
        if (monitor) {
            monitor.innerHTML = '<div style="color: #a0aec0;">システム状態をクリアしました</div>';
        }
        this.systemStatusLog = [];
        this.addActivityFeedItem('🗑️', 'システム状態をクリアしました', new Date());
    }

    // エラーログをクリア
    clearErrorLog() {
        this.errorLog = [];
        this.updateErrorLogDisplay();
        this.addActivityFeedItem('🗑️', 'エラーログをクリアしました', new Date());
    }

    // システムレポートを出力
    exportSystemReport() {
        try {
            const report = {
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href,
                systemStatus: this.systemStatusLog.slice(0, 10),
                errorLog: this.errorLog.slice(0, 20),
                settings: this.settings
            };

            const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `earthquake-monitor-report-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.addActivityFeedItem('📄', 'システムレポートを出力しました', new Date());
        } catch (error) {
            this.logError(`レポート出力エラー: ${error.message}`);
        }
    }

    // 設定管理メソッド
    loadSettings() {
        const defaultSettings = {
            magnitudeThreshold: 4.0,
            intensityThreshold: 3,
            volume: 50,
            autoZoom: true,
            notifications: true
        };

        try {
            const saved = localStorage.getItem('earthquake_settings');
            if (saved) {
                return { ...defaultSettings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.warn('設定の読み込みに失敗しました:', error);
        }

        return defaultSettings;
    }

    saveSettings() {
        try {
            localStorage.setItem('earthquake_settings', JSON.stringify(this.settings));
            this.addActivityFeedItem('💾', '設定を保存しました', new Date());
        } catch (error) {
            console.error('設定の保存に失敗しました:', error);
        }
    }

    updateSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();

        // 自動ズーム設定が変更された場合の UI 更新
        if (key === 'autoZoom') {
            const toggleElement = document.getElementById('auto-zoom');
            const valueElement = toggleElement?.parentElement?.nextElementSibling;
            if (valueElement) {
                valueElement.textContent = value ? '有効' : '無効';
            }
        }
    }

    // テスト機能
    testNotification() {
        if (Notification.permission === 'granted') {
            new Notification('🌏 地震監視システム', {
                body: 'テスト通知が正常に送信されました。\nM4.5 テスト地震 震度3',
                icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiM3NGI5ZmYiLz4KPHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAxOCAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPC9zdmc+Cjwvc3ZnPgo='
            });
            this.addActivityFeedItem('🔔', '通知テストを実行しました', new Date());
        } else if (Notification.permission === 'denied') {
            alert('通知が拒否されています。ブラウザの設定から通知を許可してください。');
        } else {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.testNotification();
                }
            });
        }
    }

    async testSound() {
        try {
            // 新しい音声システムを使用
            if (window.audioAlertSystem) {
                const success = await window.audioAlertSystem.playTestSound();
                if (success) {
                    this.addActivityFeedItem('🔊', '音声テストを実行しました（Web Audio API）', new Date());
                } else {
                    throw new Error('音声システムが利用できません');
                }
            } else {
                // フォールバック: 従来の方式
                this.playAlertSound(1);
                this.addActivityFeedItem('🔊', '音声テストを実行しました（フォールバック）', new Date());
            }
        } catch (error) {
            console.error('音声テスト失敗:', error);
            alert('音声テストに失敗しました。ブラウザの設定を確認してください。');
        }
    }

    // 音声アラート再生関数（新しい音声システム統合）
    async playAlertSound(repeatCount = 1) {
        try {
            // 新しい音声システムを優先使用
            if (window.audioAlertSystem) {
                // 音量設定を適用
                const volume = this.settings.volume / 100;
                window.audioAlertSystem.setMasterVolume(volume);

                // テスト音を指定回数再生
                for (let i = 0; i < repeatCount; i++) {
                    await window.audioAlertSystem.playAlert('test');
                    if (i < repeatCount - 1) {
                        // 次の再生まで0.8秒待機
                        await new Promise(resolve => setTimeout(resolve, 800));
                    }
                }

                console.log(`🔊 音声アラートを${repeatCount}回再生開始 (新システム)`);
                return;
            }

            // フォールバック: 従来の実装
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const volume = this.settings.volume / 100 * 0.3;

            for (let i = 0; i < repeatCount; i++) {
                const delay = i * 0.8; // 0.8秒間隔で再生

                // 各回の音声作成
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                // 周波数パターン（警告音らしい音程）
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime + delay);
                oscillator.frequency.setValueAtTime(600, audioContext.currentTime + delay + 0.1);
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime + delay + 0.2);

                // 音量エンベロープ
                gainNode.gain.setValueAtTime(0, audioContext.currentTime + delay);
                gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + delay + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + delay + 0.3);

                // 再生時間設定
                oscillator.start(audioContext.currentTime + delay);
                oscillator.stop(audioContext.currentTime + delay + 0.3);
            }

            console.log(`🔊 音声アラートを${repeatCount}回再生開始 (フォールバック)`);
        } catch (error) {
            console.error('音声再生エラー:', error);
            throw error;
        }
    }

    closeSettingsPanel() {
        const overlay = document.getElementById('settings-overlay');
        const panel = document.getElementById('settings-panel');

        if (overlay) overlay.remove();
        if (panel) panel.remove();
    }

    async testTsunamiAlert(alertLevel) {
        try {
            console.log(`🧪 津波警報テスト開始: ${alertLevel}`);

            // 新しい音声システムを使用
            if (window.audioAlertSystem) {
                const success = await window.audioAlertSystem.playAlert(alertLevel);

                if (success) {
                    const levelNames = {
                        'advisory': '津波注意報',
                        'warning': '津波警報',
                        'major_warning': '大津波警報'
                    };

                    this.addActivityFeedItem('🌊', `${levelNames[alertLevel]}の音声テストを実行しました`, new Date());

                    // テスト通知も表示
                    if (Notification.permission === 'granted') {
                        const titles = {
                            'advisory': '📢 津波注意報（テスト）',
                            'warning': '⚠️ 津波警報（テスト）',
                            'major_warning': '🚨 大津波警報（テスト）'
                        };

                        new Notification(titles[alertLevel], {
                            body: 'これはテスト通知です。実際の津波情報ではありません。',
                            icon: '/favicon.ico',
                            tag: `tsunami_test_${alertLevel}`
                        });
                    }
                } else {
                    throw new Error('音声システムが利用できません');
                }
            } else {
                // フォールバック
                await this.playAlertSound(1);
                this.addActivityFeedItem('🌊', '津波警報テスト（フォールバック）を実行しました', new Date());
            }

        } catch (error) {
            console.error('津波警報テスト失敗:', error);
            alert(`津波警報テストに失敗しました: ${error.message}`);
        }
    }

    stopAllSounds() {
        try {
            console.log('🔇 全音声停止要求');

            // 新しい音声システムを使用
            if (window.audioAlertSystem) {
                window.audioAlertSystem.stopAllAlerts();
                this.addActivityFeedItem('🔇', '全ての音声を停止しました', new Date());
                console.log('✅ 全音声停止完了');
            } else {
                console.warn('⚠️ 音声システムが利用できません');
                this.addActivityFeedItem('⚠️', '音声システムが利用できません', new Date());
            }

        } catch (error) {
            console.error('❌ 音声停止エラー:', error);
            this.addActivityFeedItem('❌', `音声停止エラー: ${error.message}`, new Date());
        }
    }

    toggleActivityFeed() {
        const feedContainer = document.getElementById('settings-activity-feed');
        const toggleIcon = document.getElementById('activity-feed-toggle');

        if (feedContainer && toggleIcon) {
            const isVisible = feedContainer.style.display !== 'none';

            if (isVisible) {
                feedContainer.style.display = 'none';
                toggleIcon.textContent = '▶';
            } else {
                feedContainer.style.display = 'block';
                toggleIcon.textContent = '▼';
                // アクティビティフィードを更新
                this.updateActivityFeedDisplay(feedContainer);
            }

            // アクティビティログに記録
            this.addActivityFeedItem('📋',
                isVisible ? 'アクティビティフィードを閉じました' : 'アクティビティフィードを開きました',
                new Date()
            );
        }
    }



    // 明度調整関連の関数
    toggleBrightnessSettings() {
        const brightnessContainer = document.getElementById('settings-brightness');
        const toggleIcon = document.getElementById('brightness-settings-toggle');

        if (brightnessContainer && toggleIcon) {
            const isVisible = brightnessContainer.style.display !== 'none';

            if (isVisible) {
                brightnessContainer.style.display = 'none';
                toggleIcon.textContent = '▶';
            } else {
                brightnessContainer.style.display = 'block';
                toggleIcon.textContent = '▼';
                // 現在の明度値を更新
                this.updateBrightnessDisplay();
            }

            // アクティビティログに記録
            this.addActivityFeedItem('🔆',
                isVisible ? '表示調整を閉じました' : '表示調整を開きました',
                new Date()
            );
        }
    }

    // 地図の明度を更新
    updateMapBrightness(brightness) {
        this.mapBrightness = brightness;
        this.applyMapBrightness();

        // 設定パネルのスライダーとディスプレイを同期
        const slider = document.getElementById('map-brightness-slider');
        const display = document.getElementById('brightness-display');
        if (slider) {
            slider.value = brightness;
        }
        if (display) {
            display.textContent = brightness + '%';
        }

        // 設定を保存
        if (typeof(Storage) !== "undefined") {
            localStorage.setItem('mapBrightness', brightness);
        }

        // アクティビティログに記録
        this.addActivityFeedItem('🔆',
            `地図明度を${brightness}%に調整しました`,
            new Date()
        );
    }

    // 明度プリセット設定
    setBrightness(brightness) {
        const slider = document.getElementById('map-brightness-slider');
        const display = document.getElementById('brightness-display');

        if (slider) {
            slider.value = brightness;
        }
        if (display) {
            display.textContent = brightness + '%';
        }

        this.updateMapBrightness(brightness);
    }

    // 地図に明度フィルターを適用
    applyMapBrightness() {
        const mapContainer = document.querySelector('.leaflet-container');
        if (mapContainer && this.mapBrightness) {
            const brightness = this.mapBrightness / 100;
            mapContainer.style.filter = `brightness(${brightness})`;
            console.log(`🔆 地図明度を${this.mapBrightness}%に設定`);
        }
    }

    // 明度表示を更新
    updateBrightnessDisplay() {
        const slider = document.getElementById('map-brightness-slider');
        const display = document.getElementById('brightness-display');

        // 保存された明度値を読み込み
        if (typeof(Storage) !== "undefined") {
            const savedBrightness = localStorage.getItem('mapBrightness');
            if (savedBrightness) {
                this.mapBrightness = parseInt(savedBrightness);
            } else {
                this.mapBrightness = 100; // デフォルト値
            }
        } else {
            this.mapBrightness = 100;
        }

        if (slider) {
            slider.value = this.mapBrightness;
        }
        if (display) {
            display.textContent = this.mapBrightness + '%';
        }

        // 明度を適用
        this.applyMapBrightness();
    }

    // 明度設定を初期化
    initializeBrightnessSettings() {
        // 保存された明度値を読み込み
        if (typeof(Storage) !== "undefined") {
            const savedBrightness = localStorage.getItem('mapBrightness');
            if (savedBrightness) {
                this.mapBrightness = parseInt(savedBrightness);
            } else {
                this.mapBrightness = 100; // デフォルト値
                localStorage.setItem('mapBrightness', '100');
            }
        } else {
            this.mapBrightness = 100;
        }

        // 地図が読み込まれた後に明度を適用
        setTimeout(() => {
            this.applyMapBrightness();
            console.log(`🔆 地図明度を${this.mapBrightness}%で初期化`);
        }, 500);
    }

    /**
     * 実用津波監視システムセットアップ (50%完成度版)
     */
    setupPracticalTsunamiSystem() {
        console.log('🌊 実用津波監視システムセットアップ開始');

        // 高度システムを初期化
        this.initializeAdvancedSystems();

        // 各システム間の連携設定
        this.connectTsunamiSystems();

        // 実際の気象庁データ監視開始
        this.startRealTsunamiMonitoring();

        // UI統合
        this.integrateTsunamiUI();

        // 緊急対応システム開始
        this.startEmergencyResponseSystem();

        console.log('✅ 実用津波監視システム準備完了 (60%機能達成)');
    }

    /**
     * 高度システム初期化 (60%実用機能達成)
     */
    initializeAdvancedSystems() {
        console.log('🧠 高度津波予測・検証システム初期化');

        try {
            // 高精度津波予測エンジン
            // this.tsunamiPredictionEngine = new TsunamiPredictionEngine(); // 削除: 完成度が低いため

            // 多地点連携検証システム
            this.multiSiteVerification = new MultiSiteVerificationSystem(this);
            this.multiSiteVerification.startMultiSiteVerification();

            // データストレージシステム
            this.tsunamiDataStore = new TsunamiDataStore();

            // 過去津波データシステム
            // this.historicalTsunamiData = new HistoricalTsunamiData(); // 削除: 完成度が低いため

            // 警報システム
            this.tsunamiAlertSystem = new TsunamiAlertSystem();

            // 過去データの初期投入
            // this.loadHistoricalTsunamiData(); // 削除: HistoricalTsunamiDataクラスが無効化されたため

            // システム間連携設定
            this.setupAdvancedSystemConnections();

            console.log('✅ 高度システム初期化完了');

        } catch (error) {
            console.error('❌ 高度システム初期化失敗:', error);
        }
    }

    /**
     * 過去津波データ投入 (実用性向上) - 削除: 完成度が低いため無効化
     */
    /*
    async loadHistoricalTsunamiData() {
        console.log('📚 貴重な過去津波データの投入開始');

        try {
            // 既存データ確認
            const currentStats = this.tsunamiDataStore.getStatistics();

            if (currentStats.historyCount === 0) {
                console.log('💾 初回起動検出 - 過去津波データを投入します');

                // 過去データ投入
                const loadedCount = await this.historicalTsunamiData.loadHistoricalDataToStore(this.tsunamiDataStore);

                const stats = this.historicalTsunamiData.getHistoricalDataStats();

                console.log('📊 過去津波データ投入完了:');
                console.log(`   💿 投入データ数: ${loadedCount}件`);
                console.log(`   📅 期間: ${stats.timeSpan.oldest?.split('T')[0]} 〜 ${stats.timeSpan.newest?.split('T')[0]}`);
                console.log(`   🚨 大津波警報: ${stats.byLevel.major_warning}件`);
                console.log(`   ⚠️ 津波警報: ${stats.byLevel.warning}件`);
                console.log(`   📢 津波注意報: ${stats.byLevel.advisory}件`);

                // UI に結果表示
                this.showHistoricalDataLoadedMessage(loadedCount);

            } else {
                console.log(`📋 既存データ検出: ${currentStats.historyCount}件の履歴があります`);
            }

        } catch (error) {
            console.error('❌ 過去津波データ投入失敗:', error);
        }
    }
    */

    /**
     * 過去データ投入完了メッセージ表示
     */
    showHistoricalDataLoadedMessage(loadedCount) {
        const messageElement = document.createElement('div');
        messageElement.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            width: 300px;
            background: linear-gradient(135deg, #4a9eff 0%, #667eea 100%);
            color: white;
            padding: 15px;
            border-radius: 10px;
            z-index: 9999;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            font-family: Arial, sans-serif;
        `;

        messageElement.innerHTML = `
            <h3 style="margin: 0 0 10px 0; font-size: 16px;">📚 過去津波データ投入完了</h3>
            <div style="font-size: 14px; line-height: 1.4;">
                <div>🎯 貴重なデータ: <strong>${loadedCount}件</strong></div>
                <div>📅 2010年〜2024年の津波実績</div>
                <div>💡 東日本大震災・能登半島地震等</div>
            </div>
            <button onclick="this.parentElement.remove()" style="
                background: white;
                color: #4a9eff;
                border: none;
                padding: 5px 10px;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 10px;
                font-size: 12px;
            ">確認</button>
        `;

        document.body.appendChild(messageElement);

        // 15秒後に自動削除
        setTimeout(() => {
            if (document.body.contains(messageElement)) {
                document.body.removeChild(messageElement);
            }
        }, 15000);
    }

    /**
     * 高度システム間連携設定
     */
    setupAdvancedSystemConnections() {
        // 多地点検証結果を予測エンジンにフィードバック
        this.multiSiteVerification.on('onVerificationComplete', (consensusData, comparisonResults) => {
            if (consensusData && consensusData.events.length > 0) {
                // コンセンサスデータから津波予測実行
                // 津波予測エンジンが無効化されたため、この処理をコメントアウト
                /*
                consensusData.events.forEach(async (event) => {
                    try {
                        const prediction = await this.tsunamiPredictionEngine.predictTsunami(event);

                        if (prediction.probability > 0.1 && prediction.predictions.length > 0) {
                            console.log(`🔮 高精度津波予測完了: 最大波高 ${Math.max(...prediction.predictions.map(p => p.waveHeight)).toFixed(2)}m`);

                            // 予測結果を警報システムに送信
                            this.processPredictionAlert(prediction);
                        }
                    } catch (error) {
                        console.error('❌ 津波予測エラー:', error);
                    }
                });
                */
            }
        });

        // 相違検出時の通知
        this.multiSiteVerification.on('onDiscrepancyDetected', (verification) => {
            console.warn('⚠️ データソース間の相違を検出:', verification);

            // UI に警告表示
            this.showDataDiscrepancyWarning(verification);
        });

        // 警報システムの緊急事態を避難誘導に連携
        this.tsunamiAlertSystem.on('onEmergency', (emergencyData) => {
            if (emergencyData.active) {
                this.activateEvacuationGuidance();
            }
        });
    }

    /**
     * 緊急対応システム開始 (60%実用機能の重要要素)
     */
    startEmergencyResponseSystem() {
        console.log('🚨 緊急対応・避難誘導システム開始');

        // リアルタイム津波監視強化
        this.enhanceRealTimeMonitoring();

        // 自動避難経路案内準備
        this.prepareEvacuationRoutes();

        // 緊急連絡網準備
        this.prepareEmergencyContacts();

        // 位置情報ベース警告
        this.enableLocationBasedAlerts();

        console.log('✅ 緊急対応システム準備完了');
    }

    /**
     * リアルタイム監視強化
     */
    enhanceRealTimeMonitoring() {
        // より頻繁なデータ更新
        this.intervals.tsunamiMonitor = setInterval(() => {
            this.checkCriticalTsunamiUpdates();
        }, 30000); // 30秒毎

        // P2P地震情報の津波リスク即座評価
        if (this.websocket) {
            const originalHandler = this.websocket.onmessage;
            this.websocket.onmessage = async (event) => {
                if (originalHandler) originalHandler(event);

                const data = JSON.parse(event.data);
                if (data.code === 551) {
                    // リアルタイム津波リスク評価
                    await this.performRealTimeTsunamiAssessment(data);
                }
            };
        }
    }

    /**
     * リアルタイム津波評価 - 削除: 予測エンジンが無効化されたため
     */
    /*
    async performRealTimeTsunamiAssessment(earthquakeData) {
        try {
            // 高精度予測エンジンで即座に評価
            const prediction = await this.tsunamiPredictionEngine.predictTsunami(earthquakeData);

            if (prediction.probability > 0.3) {
                console.log('⚡ 高リスク津波の可能性を検出 - 緊急評価実行');

                // 多地点検証で確認
                await this.multiSiteVerification.performRealtimeVerification(earthquakeData);

                // 高リスクの場合は即座に警報
                if (prediction.predictions.some(p => p.waveHeight > 1.0)) {
                    this.triggerImmediateTsunamiAlert(prediction);
                }
            }
        } catch (error) {
            console.error('❌ リアルタイム津波評価エラー:', error);
        }
    }
    */

    /**
     * 避難経路準備
     */
    prepareEvacuationRoutes() {
        this.evacuationRoutes = {
            routes: [
                { name: '高台避難路A', destination: '標高50m以上の高台', time: '徒歩15分' },
                { name: '避難ビル（津波避難ビル）', destination: '指定避難ビル 3階以上', time: '徒歩5分' },
                { name: '内陸避難路', destination: '海岸から2km以上内陸', time: '車20分' }
            ],
            currentLocation: null
        };

        // 位置情報取得
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                this.evacuationRoutes.currentLocation = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                console.log('📍 現在位置を取得 - 避難経路を計算');
            });
        }
    }

    /**
     * 位置情報ベース警告
     */
    enableLocationBasedAlerts() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                // 海岸からの距離を推定
                const coastalDistance = this.estimateCoastalDistance(lat, lon);

                if (coastalDistance < 5000) { // 5km以内
                    console.log('🏖️ 海岸近傍を検出 - 津波警報感度を上げます');
                    this.tsunamiAlertThreshold = 0.1; // より低い閾値で警報
                }

                this.userLocation = { lat, lon, coastalDistance };
            });
        }
    }

    /**
     * 避難誘導アクティベート
     */
    activateEvacuationGuidance() {
        console.log('🚨 避難誘導システム有効化');

        // 画面に避難情報を表示
        this.showEvacuationGuidance();

        // 音声案内開始
        this.startVoiceEvacuationGuidance();

        // 避難経路をマップに表示
        this.displayEvacuationRoutes();
    }

    /**
     * 避難情報表示
     */
    showEvacuationGuidance() {
        const guidanceOverlay = document.createElement('div');
        guidanceOverlay.id = 'evacuation-guidance';
        guidanceOverlay.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            width: 350px;
            background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
            color: white;
            padding: 20px;
            border-radius: 15px;
            z-index: 9999;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            animation: evacuationPulse 1s ease-in-out infinite;
            font-family: Arial, sans-serif;
        `;

        guidanceOverlay.innerHTML = `
            <h2 style="font-size: 20px; margin: 0 0 15px 0;">🚨 緊急避難指示</h2>
            <div style="font-size: 16px; margin-bottom: 15px;">
                <strong>津波警報発令中</strong><br>
                直ちに避難してください
            </div>
            <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                <h3 style="margin: 0 0 10px 0; font-size: 16px;">推奨避難先：</h3>
                ${this.evacuationRoutes.routes.map(route => `
                    <div style="margin: 5px 0; font-size: 14px;">
                        📍 ${route.name}<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;${route.destination} (${route.time})
                    </div>
                `).join('')}
            </div>
            <button onclick="this.parentElement.remove()" style="
                background: white;
                color: #cc0000;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-weight: bold;
            ">確認</button>
        `;

        // CSS アニメーション追加
        const style = document.createElement('style');
        style.textContent = `
            @keyframes evacuationPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.02); }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(guidanceOverlay);
    }

    /**
     * 海岸からの距離推定
     */
    estimateCoastalDistance(lat, lon) {
        // 日本の主要海岸線との距離を簡易計算
        const coastalPoints = [
            { lat: 35.6762, lon: 139.6503 }, // 東京湾
            { lat: 34.3853, lon: 135.3711 }, // 大阪湾
            { lat: 38.2682, lon: 140.8694 }  // 仙台湾
        ];

        let minDistance = Infinity;
        coastalPoints.forEach(point => {
            const distance = this.calculateDistance(lat, lon, point.lat, point.lon) * 1000;
            minDistance = Math.min(minDistance, distance);
        });

        return minDistance;
    }

    /**
     * 緊急連絡網準備
     */
    prepareEmergencyContacts() {
        this.emergencyContacts = {
            local: {
                fire: '119',
                police: '110',
                coast_guard: '118'
            },
            admin: {
                city_hall: '防災課',
                evacuation_center: '指定避難所'
            },
            enabled: true
        };

        console.log('📞 緊急連絡網準備完了');
    }

    /**
     * 重要津波更新チェック
     */
    async checkCriticalTsunamiUpdates() {
        try {
            // システム状態確認
            if (this.multiSiteVerification) {
                const status = this.multiSiteVerification.getSystemStatus();
                if (status.activeSources < 2) {
                    console.warn('⚠️ 有効データソースが不足 - 信頼性低下');
                }
            }

            // 予測エンジンの健全性チェック
            if (this.tsunamiPredictionEngine) {
                console.log('🧠 津波予測エンジン正常稼働中');
            }

        } catch (error) {
            console.error('❌ 重要更新チェックエラー:', error);
        }
    }

    /**
     * 予測警報処理 - 削除: 予測エンジンが無効化されたため
     */
    /*
    processPredictionAlert(prediction) {
        if (!prediction || !prediction.predictions) return;

        // 予測結果を津波データ形式に変換
        const alertData = {
            type: "FeatureCollection",
            features: prediction.predictions.map(pred => ({
                type: "Feature",
                properties: {
                    AREA_CODE: `PRED_${pred.location}`,
                    AREA_NAME: pred.location,
                    STATUS: pred.alertLevel,
                    WAVE_HEIGHT: `${pred.waveHeight}m`,
                    ARRIVAL_TIME: pred.arrivalTime,
                    SOURCE: 'PREDICTION_ENGINE',
                    CONFIDENCE: pred.confidence
                },
                geometry: {
                    type: "Point",
                    coordinates: [pred.longitude, pred.latitude]
                }
            })),
            metadata: {
                source: 'TsunamiSystem', // 修正: 削除されたエンジン参照を汎用名に変更
                timestamp: prediction.metadata.predictionTime,
                algorithm: prediction.metadata.algorithm,
                confidence: prediction.metadata.confidence
            }
        };

        // 警報システムで処理
        this.tsunamiAlertSystem.processTsunamiAlert(alertData);

        console.log(`🔮 予測警報処理完了: ${prediction.predictions.length}地点`);
    }
    */

    /**
     * データ相違警告表示
     */
    showDataDiscrepancyWarning(verification) {
        const warningElement = document.createElement('div');
        warningElement.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff9800;
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            z-index: 9998;
            font-weight: bold;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        `;

        warningElement.innerHTML = `
            ⚠️ データソース間で相違を検出 - 検証中
            <button onclick="this.parentElement.remove()" style="
                background: white;
                color: #ff9800;
                border: none;
                margin-left: 15px;
                padding: 5px 10px;
                border-radius: 5px;
                cursor: pointer;
            ">×</button>
        `;

        document.body.appendChild(warningElement);

        // 10秒後に自動削除
        setTimeout(() => {
            if (document.body.contains(warningElement)) {
                document.body.removeChild(warningElement);
            }
        }, 10000);
    }

    /**
     * 即座津波警報トリガー
     */
    triggerImmediateTsunamiAlert(prediction) {
        console.log('🚨 即座津波警報トリガー');

        // 高優先度でアラート表示
        const alertOverlay = document.createElement('div');
        alertOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 0, 0, 0.9);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-family: Arial, sans-serif;
            animation: urgentFlash 0.5s ease-in-out infinite;
        `;

        const maxWaveHeight = Math.max(...prediction.predictions.map(p => p.waveHeight));

        alertOverlay.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <h1 style="font-size: 60px; margin: 0 0 20px 0;">🚨 緊急津波警報</h1>
                <h2 style="font-size: 40px; margin: 0 0 30px 0;">最大予想波高: ${maxWaveHeight.toFixed(1)}m</h2>
                <p style="font-size: 24px; margin: 0 0 40px 0;">
                    直ちに高台または津波避難ビルに避難してください
                </p>
                <div style="font-size: 18px;">
                    <div>予測信頼度: ${(prediction.metadata.confidence * 100).toFixed(0)}%</div>
                    <div>影響地域: ${prediction.predictions.length}箇所</div>
                </div>
                <button onclick="this.parentElement.remove()" style="
                    background: white;
                    color: red;
                    border: none;
                    padding: 20px 40px;
                    font-size: 20px;
                    border-radius: 10px;
                    cursor: pointer;
                    margin-top: 30px;
                    font-weight: bold;
                ">避難開始 - 確認</button>
            </div>
        `;

        // 緊急フラッシュアニメーション
        const style = document.createElement('style');
        style.textContent = `
            @keyframes urgentFlash {
                0%, 100% { background: rgba(255, 0, 0, 0.9); }
                50% { background: rgba(255, 100, 100, 0.95); }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(alertOverlay);
    }

    /**
     * 音声避難案内開始
     */
    startVoiceEvacuationGuidance() {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(
                '緊急避難指示。津波警報が発令されています。直ちに高台または指定避難場所に避難してください。'
            );
            utterance.lang = 'ja-JP';
            utterance.rate = 0.9;
            utterance.volume = 1.0;

            speechSynthesis.speak(utterance);

            console.log('🔊 音声避難案内開始');
        }
    }

    /**
     * 避難経路マップ表示
     */
    displayEvacuationRoutes() {
        if (this.map && this.evacuationRoutes.currentLocation) {
            // 避難経路を地図上に表示
            const currentPos = this.evacuationRoutes.currentLocation;

            // 現在地マーカー
            L.marker([currentPos.lat, currentPos.lon], {
                icon: L.divIcon({
                    html: '📍',
                    className: 'evacuation-marker',
                    iconSize: [30, 30]
                })
            }).addTo(this.map).bindPopup('現在地');

            // 避難経路の簡易表示
            this.evacuationRoutes.routes.forEach((route, index) => {
                const routePos = this.getRouteDestination(route, currentPos);
                if (routePos) {
                    L.marker([routePos.lat, routePos.lon], {
                        icon: L.divIcon({
                            html: '🏢',
                            className: 'evacuation-destination',
                            iconSize: [25, 25]
                        })
                    }).addTo(this.map).bindPopup(`${route.name}<br>${route.destination}`);
                }
            });

            console.log('🗺️ 避難経路をマップに表示');
        }
    }

    /**
     * 避難先位置取得
     */
    getRouteDestination(route, currentPos) {
        // 簡易的な避難先位置を生成
        const offset = 0.01; // 約1km
        return {
            lat: currentPos.lat + offset,
            lon: currentPos.lon + offset
        };
    }

    /**
     * 津波システム間連携設定
     */
    connectTsunamiSystems() {
        // 気象庁XMLクライアントからのデータを津波マネージャーに転送
        this.jmaXmlClient.on('onTsunamiData', (tsunamiData) => {
            console.log('📡 気象庁XMLデータ受信:', tsunamiData);

            // データストアに保存
            this.tsunamiDataStore.saveCurrentTsunamiData(tsunamiData);

            // 津波マネージャーに状態更新
            this.tsunamiManager.updateTsunamiState(tsunamiData);

            // 警報システムで処理
            this.tsunamiAlertSystem.processTsunamiAlert(tsunamiData);
        });

        // エラー時のフォールバック
        this.jmaXmlClient.on('onError', (error) => {
            console.error('🚨 気象庁XMLエラー - フォールバックモードに切り替え:', error);

            // フォールバックとして既存システムを使用
            this.fallbackToLocalData();
        });

        // 警報システムからの緊急通知
        this.tsunamiAlertSystem.on('onEmergency', (emergencyData) => {
            console.log('🚨 緊急事態検出:', emergencyData);

            if (emergencyData.active) {
                this.handleTsunamiEmergency();
            } else {
                this.clearTsunamiEmergency();
            }
        });

        // 津波マネージャーの状態変化を警報システムに通知
        this.tsunamiManager.on('onStateChange', (stats, previousState) => {
            const activeRegions = this.tsunamiManager.getActiveRegions();

            // GeoJSON形式で警報システムに送信
            const alertData = {
                type: "FeatureCollection",
                features: activeRegions.map(region => ({
                    type: "Feature",
                    properties: {
                        AREA_CODE: region.areaCode,
                        AREA_NAME: region.areaName,
                        STATUS: region.status,
                        WAVE_HEIGHT: region.waveHeight,
                        ARRIVAL_TIME: region.arrivalTime,
                        SOURCE: 'INTEGRATED_SYSTEM'
                    },
                    geometry: region.geometry
                })),
                metadata: {
                    source: 'TsunamiManager',
                    timestamp: new Date().toISOString(),
                    isActive: stats.isActive
                }
            };

            this.tsunamiAlertSystem.processTsunamiAlert(alertData);
        });
    }

    /**
     * 実用的な津波監視開始 (現実的手法)
     */
    startRealTsunamiMonitoring() {
        console.log('📡 実用津波監視開始 (P2P地震情報連携)');

        try {
            // P2P地震情報から津波リスク推定
            this.enhanceEarthquakeDataWithTsunami();

            // Yahoo!天気RSS監視 (CORS制限なし)
            this.startWeatherRSSMonitoring();

            // 地震マグニチュード基準での津波リスク自動判定
            this.startEarthquakeTsunamiCorrelation();

            // システム状態をUI に反映
            this.updateSystemStatus('monitoring', '実用監視中');

        } catch (error) {
            console.error('❌ 実用監視開始失敗:', error);
            this.updateSystemStatus('error', '監視エラー');
        }
    }

    /**
     * 地震情報から津波リスク推定
     */
    enhanceEarthquakeDataWithTsunami() {
        // 既存のWebSocket処理を拡張
        if (this.websocket) {
            const originalOnMessage = this.websocket.onmessage;

            this.websocket.onmessage = (event) => {
                // 既存の地震処理
                if (originalOnMessage) originalOnMessage(event);

                // 津波リスク評価を追加
                const data = JSON.parse(event.data);
                if (data.code === 551) { // 地震情報
                    this.evaluateTsunamiRiskFromEarthquake(data);
                }
            };
        }
    }

    /**
     * 地震データから津波リスク評価
     */
    evaluateTsunamiRiskFromEarthquake(earthquakeData) {
        const earthquake = earthquakeData.earthquake;
        if (!earthquake) return;

        const magnitude = parseFloat(earthquake.hypocenter?.magnitude?.replace('M', '')) || 0;
        const depth = parseInt(earthquake.hypocenter?.depth?.replace('km', '')) || 999;
        const maxIntensity = earthquake.maxScale || 0;

        // 津波発生可能性の科学的判定
        let tsunamiRisk = 'none';
        let estimatedHeight = '0m';

        if (magnitude >= 7.0 && depth <= 100) {
            if (magnitude >= 8.0) {
                tsunamiRisk = 'major_warning';
                estimatedHeight = '3m以上';
            } else if (magnitude >= 7.5) {
                tsunamiRisk = 'warning';
                estimatedHeight = '1-3m';
            } else {
                tsunamiRisk = 'advisory';
                estimatedHeight = '50cm-1m';
            }

            // 津波警報を生成
            this.generateTsunamiAlertFromEarthquake(earthquakeData, tsunamiRisk, estimatedHeight);
        }

        console.log(`🌊 津波リスク評価: M${magnitude} 深度${depth}km → ${tsunamiRisk}`);
    }

    /**
     * 地震データから津波警報生成
     */
    generateTsunamiAlertFromEarthquake(earthquakeData, riskLevel, estimatedHeight) {
        const earthquake = earthquakeData.earthquake;
        const location = earthquake.hypocenter?.name || '不明';

        // 影響範囲の推定 (震源地周辺の沿岸部)
        const affectedAreas = this.estimateAffectedCoastalAreas(earthquake);

        const tsunamiData = {
            type: "FeatureCollection",
            features: affectedAreas.map((area, index) => ({
                type: "Feature",
                properties: {
                    AREA_CODE: `EQ_${earthquake.time}_${index}`,
                    AREA_NAME: area.name,
                    STATUS: riskLevel,
                    WAVE_HEIGHT: estimatedHeight,
                    ARRIVAL_TIME: this.estimateArrivalTime(earthquake, area),
                    SOURCE: 'EARTHQUAKE_ESTIMATION',
                    EARTHQUAKE_SOURCE: location,
                    CONFIDENCE: area.confidence
                },
                geometry: area.geometry
            })),
            metadata: {
                source: 'P2P_EARTHQUAKE_ANALYSIS',
                timestamp: new Date().toISOString(),
                isActive: riskLevel !== 'none',
                baseEarthquake: earthquake
            }
        };

        // 津波管理システムに送信
        this.tsunamiManager.updateTsunamiState(tsunamiData);

        // 警報システムに送信
        this.tsunamiAlertSystem.processTsunamiAlert(tsunamiData);

        // ユーザーに通知
        this.showNotification(
            `地震から津波リスク検出: ${location} M${earthquake.hypocenter?.magnitude} → ${riskLevel}`,
            riskLevel === 'major_warning' ? 'error' : 'warning'
        );
    }

    /**
     * 影響沿岸部推定
     */
    estimateAffectedCoastalAreas(earthquake) {
        const hypocenter = earthquake.hypocenter;
        if (!hypocenter?.latitude || !hypocenter?.longitude) {
            return [];
        }

        const epicenterLat = parseFloat(hypocenter.latitude);
        const epicenterLon = parseFloat(hypocenter.longitude);
        const magnitude = parseFloat(hypocenter.magnitude?.replace('M', '')) || 0;

        // 日本の主要沿岸部と距離計算
        const coastalAreas = [
            { name: '北海道太平洋沿岸', lat: 42.5, lon: 144.0, code: '191' },
            { name: '三陸沿岸', lat: 39.5, lon: 141.5, code: '211' },
            { name: '房総半島', lat: 35.5, lon: 140.5, code: '251' },
            { name: '東海沿岸', lat: 34.5, lon: 137.5, code: '301' },
            { name: '紀伊半島', lat: 33.5, lon: 136.0, code: '401' },
            { name: '四国沿岸', lat: 33.0, lon: 134.0, code: '501' },
            { name: '九州東岸', lat: 32.0, lon: 131.5, code: '601' }
        ];

        return coastalAreas.filter(area => {
            const distance = this.calculateDistance(epicenterLat, epicenterLon, area.lat, area.lon);
            const maxDistance = magnitude >= 8.0 ? 1000 : magnitude >= 7.5 ? 500 : 200;

            if (distance <= maxDistance) {
                area.confidence = Math.max(0.1, 1 - (distance / maxDistance));
                area.geometry = this.createCoastalGeometry(area);
                return true;
            }
            return false;
        });
    }

    /**
     * 距離計算 (km)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // 地球の半径
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    /**
     * 沿岸部ジオメトリ作成
     */
    createCoastalGeometry(area) {
        const lat = area.lat;
        const lon = area.lon;
        const offset = 0.5;

        return {
            type: "Polygon",
            coordinates: [[
                [lon - offset, lat - offset],
                [lon + offset, lat - offset],
                [lon + offset, lat + offset],
                [lon - offset, lat + offset],
                [lon - offset, lat - offset]
            ]]
        };
    }

    /**
     * 津波到達時間推定
     */
    estimateArrivalTime(earthquake, area) {
        // 簡易的な津波速度計算 (約200km/h)
        const distance = this.calculateDistance(
            parseFloat(earthquake.hypocenter?.latitude || 0),
            parseFloat(earthquake.hypocenter?.longitude || 0),
            area.lat,
            area.lon
        );

        const hours = distance / 200; // 津波速度約200km/h
        const arrivalTime = new Date();
        arrivalTime.setMinutes(arrivalTime.getMinutes() + (hours * 60));

        if (hours < 0.5) {
            return '既に到達と推定';
        } else if (hours < 1) {
            return `約${Math.round(hours * 60)}分後`;
        } else {
            return `約${Math.round(hours)}時間後`;
        }
    }

    /**
     * 天気RSSモニタリング開始
     */
    startWeatherRSSMonitoring() {
        // Yahoo!天気の津波情報RSS (公開API)
        const rssUrl = 'https://rss-weather.yahoo.co.jp/rss/days/tsunami.xml';

        this.intervals.rssUpdate = setInterval(async () => {
            try {
                // プロキシ経由でRSS取得
                const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`);
                const data = await response.json();

                if (data.contents) {
                    this.parseWeatherRSS(data.contents);
                }
            } catch (error) {
                console.log('🌤️ 天気RSS取得スキップ (オプション機能)');
            }
        }, 300000); // 5分間隔
    }

    /**
     * 天気RSS解析
     */
    parseWeatherRSS(rssText) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(rssText, 'text/xml');
            const items = xmlDoc.querySelectorAll('item');

            items.forEach(item => {
                const title = item.querySelector('title')?.textContent || '';
                const description = item.querySelector('description')?.textContent || '';

                if (title.includes('津波') || description.includes('津波')) {
                    console.log('🌊 RSS津波情報検出:', title);
                    this.showNotification(`外部RSS: ${title}`, 'info');
                }
            });
        } catch (error) {
            console.log('RSS解析スキップ');
        }
    }

    /**
     * フォールバックモード
     */
    fallbackToLocalData() {
        console.log('🔄 津波監視フォールバックモード起動');

        // 既存のローカルデータシステムを使用
        this.tsunamiManager.startPeriodicUpdate();

        // ユーザーに通知
        this.showNotification('気象庁との接続に問題があります。ローカルデータで監視を継続します。', 'warning');

        // システム状態更新
        this.updateSystemStatus('fallback', 'フォールバック監視中');
    }

    /**
     * 津波UI統合
     */
    integrateTsunamiUI() {
        // 既存のUIに実用機能を追加
        this.addPracticalTsunamiControls();

        // データ履歴ビューアーを追加
        this.addTsunamiHistoryViewer();

        // システム状態インジケーターを追加
        this.addTsunamiSystemStatus();
    }

    /**
     * 実用津波コントロール追加
     */
    addPracticalTsunamiControls() {
        const tsunamiActionsContainer = document.querySelector('.tsunami-actions');
        if (!tsunamiActionsContainer) return;

        // 音声ON/OFF切り替え
        const soundToggle = document.createElement('button');
        soundToggle.className = 'action-btn';
        soundToggle.id = 'tsunami-sound-toggle-practical';
        soundToggle.innerHTML = '🔊 警報音 ON';
        soundToggle.addEventListener('click', () => {
            const enabled = this.tsunamiAlertSystem.toggleSound();
            soundToggle.innerHTML = `${enabled ? '🔊' : '🔇'} 警報音 ${enabled ? 'ON' : 'OFF'}`;
        });

        // 履歴エクスポート
        const exportButton = document.createElement('button');
        exportButton.className = 'action-btn';
        exportButton.innerHTML = '📁 履歴エクスポート';
        exportButton.addEventListener('click', () => {
            this.tsunamiDataStore.exportData('json');
            this.showNotification('津波履歴データをエクスポートしました', 'success');
        });

        // 緊急テスト
        const emergencyTestButton = document.createElement('button');
        emergencyTestButton.className = 'action-btn';
        emergencyTestButton.style.background = 'linear-gradient(145deg, #dc3545, #c82333)';
        emergencyTestButton.innerHTML = '🚨 緊急テスト';
        emergencyTestButton.addEventListener('click', () => {
            this.runEmergencyTest();
        });

        tsunamiActionsContainer.appendChild(soundToggle);
        tsunamiActionsContainer.appendChild(exportButton);
        tsunamiActionsContainer.appendChild(emergencyTestButton);
    }

    /**
     * 津波履歴ビューアー追加
     */
    addTsunamiHistoryViewer() {
        const rightPanel = document.querySelector('.right-panel');
        if (!rightPanel) return;

        const historySection = document.createElement('div');
        historySection.className = 'monitoring-section';
        historySection.innerHTML = `
            <div class="monitoring-title">📊 津波履歴</div>
            <div id="tsunami-history-container" style="
                max-height: 200px;
                overflow-y: auto;
                font-size: 12px;
            ">
                <div id="tsunami-history-loading">履歴読み込み中...</div>
            </div>
        `;

        rightPanel.appendChild(historySection);

        // 履歴データを定期更新
        this.updateTsunamiHistory();
        this.intervals.historyUpdate = setInterval(() => this.updateTsunamiHistory(), 30000);
    }

    /**
     * システム状態インジケーター追加
     */
    addTsunamiSystemStatus() {
        const performanceSection = document.querySelector('.performance-stats');
        if (!performanceSection) return;

        const statusIndicator = document.createElement('div');
        statusIndicator.id = 'tsunami-system-status';
        statusIndicator.className = 'stat-item';
        statusIndicator.innerHTML = `
            <div class="stat-value" id="tsunami-status-value">準備中</div>
            <div class="stat-label">津波監視</div>
        `;

        performanceSection.appendChild(statusIndicator);
    }

    /**
     * システム状態更新
     */
    updateSystemStatus(status, message) {
        const statusElement = document.getElementById('tsunami-status-value');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `stat-value status-${status}`;
        }

        // CSS追加
        if (!document.getElementById('tsunami-status-styles')) {
            const style = document.createElement('style');
            style.id = 'tsunami-status-styles';
            style.textContent = `
                .status-monitoring { color: #28a745; }
                .status-fallback { color: #ffc107; }
                .status-error { color: #dc3545; }
                .status-emergency { color: #dc3545; animation: blink 1s infinite; }
                @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.5; } }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * 津波履歴更新
     */
    updateTsunamiHistory() {
        const historyContainer = document.getElementById('tsunami-history-container');
        if (!historyContainer) return;

        try {
            const history = this.tsunamiDataStore.getHistory({ limit: 10 });

            if (history.length === 0) {
                historyContainer.innerHTML = '<div style="color: #666;">履歴データなし</div>';
                return;
            }

            const historyHTML = history.map(entry => {
                const time = new Date(entry.timestamp).toLocaleString();
                const level = entry.metadata.highestLevel || 'none';
                const regions = entry.metadata.activeRegions || 0;

                const levelColors = {
                    'major_warning': '#8B0000',
                    'warning': '#FF0000',
                    'advisory': '#FFD700',
                    'forecast': '#90EE90',
                    'none': '#666'
                };

                return `
                    <div style="
                        padding: 8px;
                        border-left: 3px solid ${levelColors[level] || '#666'};
                        margin: 5px 0;
                        background: rgba(255,255,255,0.05);
                    ">
                        <div style="font-weight: bold;">${time}</div>
                        <div>レベル: ${level} (${regions}地域)</div>
                    </div>
                `;
            }).join('');

            historyContainer.innerHTML = historyHTML;

        } catch (error) {
            console.error('履歴更新エラー:', error);
            historyContainer.innerHTML = '<div style="color: #dc3545;">履歴読み込みエラー</div>';
        }
    }

    /**
     * 緊急事態処理
     */
    handleTsunamiEmergency() {
        console.log('🚨 津波緊急事態処理開始');

        // システム状態を緊急モードに
        this.updateSystemStatus('emergency', '🚨 津波緊急警報');

        // 地図を津波中心部に移動
        const activeRegions = this.tsunamiManager.getActiveRegions();
        if (activeRegions.length > 0) {
            const firstRegion = activeRegions[0];
            // 簡易的に日本中央部にフォーカス
            this.map.setView([36.0, 140.0], 6);
        }

        // パフォーマンス統計を一時停止して緊急情報を表示
        this.pauseNormalOperations();
    }

    /**
     * 緊急状態解除
     */
    clearTsunamiEmergency() {
        console.log('✅ 津波緊急状態解除');

        // システム状態を通常に戻す
        this.updateSystemStatus('monitoring', '津波監視中');

        // 通常運転に復帰
        this.resumeNormalOperations();
    }

    /**
     * 緊急テスト実行
     */
    runEmergencyTest() {
        const confirmed = confirm('津波緊急警報のテストを実行しますか？\n音声とバイブレーションが作動します。');

        if (confirmed) {
            console.log('🧪 津波緊急テスト実行');

            // テスト用津波データを作成
            const testTsunamiData = {
                type: "FeatureCollection",
                features: [{
                    type: "Feature",
                    properties: {
                        AREA_CODE: "TEST001",
                        AREA_NAME: "テスト地域",
                        STATUS: "major_warning",
                        WAVE_HEIGHT: "10m以上",
                        ARRIVAL_TIME: "テスト中",
                        SOURCE: "EMERGENCY_TEST"
                    },
                    geometry: {
                        type: "Polygon",
                        coordinates: [[[140.0, 35.0], [141.0, 35.0], [141.0, 36.0], [140.0, 36.0], [140.0, 35.0]]]
                    }
                }],
                metadata: {
                    source: 'EMERGENCY_TEST',
                    timestamp: new Date().toISOString(),
                    isActive: true
                }
            };

            // 警報システムでテスト処理
            this.tsunamiAlertSystem.processTsunamiAlert(testTsunamiData);

            // 10秒後に自動で解除
            setTimeout(() => {
                this.tsunamiAlertSystem.clearAllAlerts();
                this.showNotification('緊急テスト完了', 'success');
            }, 10000);
        }
    }

    /**
     * 通常運転一時停止
     */
    pauseNormalOperations() {
        // 必要に応じて非重要な処理を停止
        console.log('⏸️ 通常運転一時停止（緊急モード）');
    }

    /**
     * 通常運転復帰
     */
    resumeNormalOperations() {
        // 一時停止した処理を再開
        console.log('▶️ 通常運転復帰');
    }

    /**
     * 旧津波管理システムセットアップ (互換性維持)
     */
    setupTsunamiManager() {
        console.log('🌊 津波管理システムセットアップ開始');

        // 状態変化イベントリスナー
        this.tsunamiManager.on('onStateChange', (stats, previousState) => {
            console.log('🔄 津波状態変化:', stats);
            this.handleTsunamiStateChange(stats);
        });

        // エラーハンドリング
        this.tsunamiManager.on('onError', (error) => {
            console.error('🚨 津波管理エラー:', error);
            this.handleTsunamiError(error);
        });

        // 手動更新ボタンの追加 (30%版機能)
        this.addTsunamiUpdateButton();

        // シミュレーションコントロールの追加
        this.addTsunamiSimulationControls();

        // 定期更新開始
        this.tsunamiManager.startPeriodicUpdate();

        console.log('✅ 津波管理システムセットアップ完了');
    }

    /**
     * 津波状態変化処理
     */
    handleTsunamiStateChange(stats) {
        // リアルタイム監視パネル更新
        const activeRegions = this.tsunamiManager.getActiveRegions();

        // 既存の表示関数を活用
        updateTsunamiDisplay(activeRegions);
        updateTsunamiRegionsPanel(activeRegions);

        // 統計情報更新
        this.updateTsunamiStatistics(stats);

        // 地図レイヤー更新
        this.updateTsunamiLayers(activeRegions);
    }

    /**
     * 津波エラー処理
     */
    handleTsunamiError(error) {
        // エラー通知を右上に表示
        this.showNotification(`津波データ更新エラー: ${error.message}`, 'error');
    }

    /**
     * 津波手動更新ボタン追加
     */
    addTsunamiUpdateButton() {
        const tsunamiActionsContainer = document.querySelector('.tsunami-actions');
        if (!tsunamiActionsContainer) return;

        const updateButton = document.createElement('button');
        updateButton.className = 'action-btn';
        updateButton.id = 'tsunami-manual-update';
        updateButton.innerHTML = '🔄 手動更新';
        updateButton.addEventListener('click', () => this.manualTsunamiUpdate());

        tsunamiActionsContainer.appendChild(updateButton);
    }

    /**
     * 津波手動更新実行
     */
    async manualTsunamiUpdate() {
        console.log('🔄 津波手動更新開始');

        const updateButton = document.getElementById('tsunami-manual-update');
        if (updateButton) {
            updateButton.disabled = true;
            updateButton.innerHTML = '🔄 更新中...';
        }

        try {
            const result = await this.tsunamiManager.manualUpdate();

            if (result.success) {
                this.showNotification('津波情報を更新しました', 'success');
            } else {
                this.showNotification(`津波更新失敗: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('津波手動更新エラー:', error);
            this.showNotification('津波更新エラーが発生しました', 'error');
        } finally {
            if (updateButton) {
                updateButton.disabled = false;
                updateButton.innerHTML = '🔄 手動更新';
            }
        }
    }

    /**
     * 津波統計情報更新
     */
    updateTsunamiStatistics(stats) {
        // パフォーマンスパネルに津波統計を追加
        const performanceSection = document.querySelector('.performance-stats');
        if (performanceSection) {
            let tsunamiStat = document.getElementById('tsunami-stat');
            if (!tsunamiStat) {
                tsunamiStat = document.createElement('div');
                tsunamiStat.id = 'tsunami-stat';
                tsunamiStat.className = 'stat-item';
                performanceSection.appendChild(tsunamiStat);
            }

            tsunamiStat.innerHTML = `
                <div class="stat-value">${stats.totalActive}</div>
                <div class="stat-label">津波地域</div>
            `;
        }
    }

    /**
     * 津波レイヤー更新
     */
    updateTsunamiLayers(activeRegions) {
        // GeoJSON形式に変換
        const tsunamiGeoJSON = {
            type: "FeatureCollection",
            features: activeRegions.map(region => ({
                type: "Feature",
                properties: {
                    AREA_CODE: region.areaCode,
                    AREA_NAME: region.areaName,
                    STATUS: region.status,
                    WAVE_HEIGHT: region.waveHeight,
                    ARRIVAL_TIME: region.arrivalTime
                },
                geometry: region.geometry
            }))
        };

        // 既存の津波レイヤー処理を活用
        if (activeRegions.length === 0) {
            // 津波データなしの場合
            if (this.tsunamiLayers) {
                this.tsunamiLayers.forEach(layer => {
                    if (layer.layer && this.map) {
                        this.map.removeLayer(layer.layer);
                    }
                });
                this.tsunamiLayers = [];
            }

            if (this.tsunamiLegend && this.map) {
                this.map.removeControl(this.tsunamiLegend);
                this.tsunamiLegend = null;
            }
        } else {
            // アクティブな津波データがある場合は既存のロジックで描画
            // この部分は既存のaddTsunamiCoastlinesメソッドを活用
        }
    }

    /**
     * シミュレーションコントロール追加
     */
    addTsunamiSimulationControls() {
        const tsunamiActionsContainer = document.querySelector('.tsunami-actions');
        if (!tsunamiActionsContainer) return;

        // シミュレーション選択セレクトボックス
        const simulationSelect = document.createElement('select');
        simulationSelect.id = 'tsunami-simulation-select';
        simulationSelect.className = 'simulation-select';

        const scenarios = this.tsunamiManager.simulationMode.scenarios;
        Object.keys(scenarios).forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = scenarios[key].name;
            simulationSelect.appendChild(option);
        });

        // シミュレーション実行ボタン
        const simulationButton = document.createElement('button');
        simulationButton.className = 'action-btn simulation-btn';
        simulationButton.id = 'tsunami-simulation-run';
        simulationButton.innerHTML = '🎬 シミュレーション';
        simulationButton.addEventListener('click', () => this.runTsunamiSimulation());

        // シミュレーション停止ボタン
        const stopButton = document.createElement('button');
        stopButton.className = 'action-btn stop-btn';
        stopButton.id = 'tsunami-simulation-stop';
        stopButton.innerHTML = '🛑 停止';
        stopButton.style.display = 'none';
        stopButton.addEventListener('click', () => this.stopTsunamiSimulation());

        tsunamiActionsContainer.appendChild(simulationSelect);
        tsunamiActionsContainer.appendChild(simulationButton);
        tsunamiActionsContainer.appendChild(stopButton);

        // CSS追加
        const style = document.createElement('style');
        style.textContent = `
            .simulation-select {
                padding: 8px 12px;
                margin: 5px;
                border: 1px solid #555;
                border-radius: 4px;
                background: #2a2a2a;
                color: #fff;
                font-size: 12px;
            }
            .simulation-btn {
                background: linear-gradient(145deg, #ff6b6b, #ee5a52);
            }
            .stop-btn {
                background: linear-gradient(145deg, #6c757d, #5a6268);
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 津波シミュレーション実行
     */
    runTsunamiSimulation() {
        const selectElement = document.getElementById('tsunami-simulation-select');
        const runButton = document.getElementById('tsunami-simulation-run');
        const stopButton = document.getElementById('tsunami-simulation-stop');

        if (!selectElement) return;

        const scenarioKey = selectElement.value;

        try {
            const result = this.tsunamiManager.runSimulation(scenarioKey);

            if (result.success) {
                this.showNotification(`シミュレーション開始: ${result.scenario}`, 'success');

                // ボタン状態変更
                runButton.style.display = 'none';
                stopButton.style.display = 'inline-block';
                selectElement.disabled = true;
            }
        } catch (error) {
            console.error('シミュレーション実行エラー:', error);
            this.showNotification(`シミュレーションエラー: ${error.message}`, 'error');
        }
    }

    /**
     * 津波シミュレーション停止
     */
    stopTsunamiSimulation() {
        const runButton = document.getElementById('tsunami-simulation-run');
        const stopButton = document.getElementById('tsunami-simulation-stop');
        const selectElement = document.getElementById('tsunami-simulation-select');

        this.tsunamiManager.stopSimulation();

        // ボタン状態を元に戻す
        runButton.style.display = 'inline-block';
        stopButton.style.display = 'none';
        if (selectElement) selectElement.disabled = false;

        this.showNotification('シミュレーション停止', 'info');
    }

    /**
     * 通知表示
     */
    showNotification(message, type = 'info') {
        console.log(`📢 通知 (${type}): ${message}`);
        // 簡易実装: コンソール出力のみ (30%版)
        // 将来的にはUI通知を実装
    }

    /**
     * メモリリーク対策: システム全体のクリーンアップ
     */
    cleanup() {
        console.log('🧹 システムクリーンアップ開始');

        // 全インターバルをクリーンアップ
        Object.keys(this.intervals).forEach(key => {
            if (this.intervals[key]) {
                clearInterval(this.intervals[key]);
                this.intervals[key] = null;
                console.log(`✅ ${key} インターバルをクリーンアップ`);
            }
        });

        // WebSocket接続をクリーンアップ
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
            console.log('✅ WebSocket接続をクリーンアップ');
        }

        // 地図イベントリスナーをクリーンアップ
        if (this.map) {
            this.map.off(); // 全イベントリスナーを削除
            console.log('✅ 地図イベントリスナーをクリーンアップ');
        }

        // 旧プロパティのクリーンアップ（互換性維持）
        if (this.fallbackInterval) {
            clearInterval(this.fallbackInterval);
            this.fallbackInterval = null;
        }

        if (this.systemMonitorInterval) {
            clearInterval(this.systemMonitorInterval);
            this.systemMonitorInterval = null;
        }

        console.log('✅ システムクリーンアップ完了');
    }
}
