class EarthquakeMap {
    constructor(containerId) {
        this.containerId = containerId;
        this.map = null;
        this.markers = [];
        this.epicenterMarker = null;
        this.intensityCircles = [];
        this.settings = CONFIG.DEFAULT_SETTINGS;
        
        this.init();
    }

    init() {
        this.initializeMap();
        this.loadSettings();
        console.log('EarthquakeMap initialized');
    }

    initializeMap() {
        try {
            this.map = L.map(this.containerId, {
                center: CONFIG.MAP.DEFAULT_CENTER,
                zoom: CONFIG.MAP.DEFAULT_ZOOM,
                zoomControl: true,
                attributionControl: true
            });

            L.tileLayer(CONFIG.MAP.TILE_LAYER_URL, {
                attribution: CONFIG.MAP.TILE_LAYER_ATTRIBUTION,
                maxZoom: 18,
                minZoom: 4
            }).addTo(this.map);

            this.map.on('click', (e) => {
                console.log('Map clicked:', e.latlng);
            });

        } catch (error) {
            console.error('Failed to initialize map:', error);
        }
    }

    loadSettings() {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.SETTINGS);
        if (saved) {
            try {
                this.settings = { ...CONFIG.DEFAULT_SETTINGS, ...JSON.parse(saved) };
            } catch (error) {
                console.error('Error loading map settings:', error);
            }
        }
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }

    displayEarthquake(earthquakeData) {
        this.clearMarkers();
        
        if (!earthquakeData.latitude || !earthquakeData.longitude) {
            console.warn('Earthquake data missing coordinates');
            return;
        }

        this.addEpicenterMarker(earthquakeData);
        this.addIntensityData(earthquakeData);
        
        if (this.settings.autoZoom) {
            this.zoomToEarthquake(earthquakeData);
        }
    }

    addEpicenterMarker(earthquakeData) {
        const lat = earthquakeData.latitude;
        const lng = earthquakeData.longitude;
        
        if (!lat || !lng) return;

        const magnitude = earthquakeData.magnitude;
        const iconSize = this.calculateIconSize(magnitude);
        const color = this.getEpicenterColor(magnitude);

        const epicenterIcon = L.divIcon({
            className: 'epicenter-marker',
            html: `<div style="
                width: ${iconSize}px;
                height: ${iconSize}px;
                background-color: ${color};
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: ${Math.max(10, iconSize / 3)}px;
            ">M${magnitude || '?'}</div>`,
            iconSize: [iconSize, iconSize],
            iconAnchor: [iconSize / 2, iconSize / 2]
        });

        this.epicenterMarker = L.marker([lat, lng], { icon: epicenterIcon })
            .addTo(this.map)
            .bindPopup(this.createEpicenterPopup(earthquakeData));

        this.markers.push(this.epicenterMarker);
    }

    calculateIconSize(magnitude) {
        if (!magnitude) return 20;
        return Math.max(20, Math.min(60, magnitude * 8));
    }

    getEpicenterColor(magnitude) {
        if (!magnitude) return '#666';
        if (magnitude < 4) return '#4CAF50';
        if (magnitude < 5) return '#FF9800';
        if (magnitude < 6) return '#FF5722';
        if (magnitude < 7) return '#E91E63';
        return '#9C27B0';
    }

    createEpicenterPopup(earthquakeData) {
        const time = earthquakeData.time.toLocaleString('ja-JP');
        const location = earthquakeData.location || '不明';
        const magnitude = earthquakeData.magnitude ? `M${earthquakeData.magnitude}` : '不明';
        const depth = earthquakeData.depth ? `${earthquakeData.depth}km` : '不明';
        const intensity = earthquakeData.maxIntensity || '不明';
        
        return `
            <div class="earthquake-popup">
                <h4>震源情報</h4>
                <p><strong>発生時刻:</strong> ${time}</p>
                <p><strong>震源地:</strong> ${location}</p>
                <p><strong>マグニチュード:</strong> ${magnitude}</p>
                <p><strong>深さ:</strong> ${depth}</p>
                <p><strong>最大震度:</strong> ${intensity}</p>
                ${earthquakeData.tsunami ? '<p style="color: red;"><strong>津波警報発令中</strong></p>' : ''}
            </div>
        `;
    }

    addIntensityData(earthquakeData) {
        if (earthquakeData.source === 'p2p' && earthquakeData.points) {
            this.addP2PIntensityPoints(earthquakeData.points);
        } else if (earthquakeData.source === 'jma' && earthquakeData.areas) {
            this.addJMAIntensityAreas(earthquakeData.areas);
        }
    }

    addP2PIntensityPoints(points) {
        points.forEach(point => {
            const lat = point.lat || this.getCoordinatesByName(point.pref, point.addr)?.lat;
            const lng = point.lng || this.getCoordinatesByName(point.pref, point.addr)?.lng;
            
            if (!lat || !lng) return;
            
            const intensity = CONFIG.INTENSITY_SCALE_MAP[point.scale] || point.scale;
            const color = CONFIG.INTENSITY_COLORS[intensity] || '#666';
            
            const marker = L.circleMarker([lat, lng], {
                radius: 8,
                fillColor: color,
                color: 'white',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.7
            }).addTo(this.map);
            
            marker.bindPopup(`
                <div class="intensity-popup">
                    <h5>${point.addr || point.pref}</h5>
                    <p><strong>震度:</strong> ${intensity}</p>
                </div>
            `);
            
            this.markers.push(marker);
        });
    }

    addJMAIntensityAreas(areas) {
        areas.forEach(area => {
            const intensity = area.intensity;
            const color = this.getIntensityColor(intensity);
            
            const marker = L.marker([area.lat || 35.6762, area.lng || 139.6503], {
                icon: L.divIcon({
                    className: 'intensity-marker',
                    html: `<div style="
                        background-color: ${color};
                        color: white;
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-weight: bold;
                        font-size: 12px;
                        text-align: center;
                        min-width: 40px;
                    ">${intensity}</div>`,
                    iconSize: [40, 20],
                    iconAnchor: [20, 10]
                })
            }).addTo(this.map);
            
            marker.bindPopup(`
                <div class="intensity-popup">
                    <h5>${area.name}</h5>
                    <p><strong>震度:</strong> ${intensity}</p>
                </div>
            `);
            
            this.markers.push(marker);
        });
    }

    getIntensityColor(intensity) {
        return CONFIG.INTENSITY_COLORS[intensity] || '#666';
    }

    zoomToEarthquake(earthquakeData) {
        if (!earthquakeData.latitude || !earthquakeData.longitude) return;
        
        let zoom = CONFIG.MAP.DEFAULT_ZOOM;
        const magnitude = earthquakeData.magnitude;
        
        if (magnitude) {
            if (magnitude >= 7) zoom = 8;
            else if (magnitude >= 6) zoom = 9;
            else if (magnitude >= 5) zoom = 10;
            else zoom = 11;
        }
        
        this.map.setView([earthquakeData.latitude, earthquakeData.longitude], zoom, {
            animate: true,
            duration: 1
        });
    }

    clearMarkers() {
        this.markers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = [];
        this.epicenterMarker = null;
        
        this.intensityCircles.forEach(circle => {
            this.map.removeLayer(circle);
        });
        this.intensityCircles = [];
    }

    addIntensityCircle(lat, lng, radius, intensity) {
        const color = this.getIntensityColor(intensity);
        
        const circle = L.circle([lat, lng], {
            radius: radius * 1000,
            fillColor: color,
            color: color,
            weight: 2,
            opacity: 0.6,
            fillOpacity: 0.2
        }).addTo(this.map);
        
        this.intensityCircles.push(circle);
        return circle;
    }

    resize() {
        if (this.map) {
            setTimeout(() => {
                this.map.invalidateSize();
            }, 100);
        }
    }

    setView(lat, lng, zoom) {
        if (this.map) {
            this.map.setView([lat, lng], zoom);
        }
    }

    getCenter() {
        return this.map ? this.map.getCenter() : null;
    }

    getZoom() {
        return this.map ? this.map.getZoom() : CONFIG.MAP.DEFAULT_ZOOM;
    }

    getCoordinatesByName(pref, addr) {
        const prefectureCoordinates = {
            '北海道': { lat: 43.064, lng: 141.347 },
            '青森県': { lat: 40.824, lng: 140.740 },
            '岩手県': { lat: 39.703, lng: 141.153 },
            '宮城県': { lat: 38.268, lng: 140.872 },
            '秋田県': { lat: 39.719, lng: 140.103 },
            '山形県': { lat: 38.240, lng: 140.363 },
            '福島県': { lat: 37.750, lng: 140.468 },
            '茨城県': { lat: 36.342, lng: 140.447 },
            '栃木県': { lat: 36.566, lng: 139.883 },
            '群馬県': { lat: 36.391, lng: 139.061 },
            '埼玉県': { lat: 35.857, lng: 139.649 },
            '千葉県': { lat: 35.605, lng: 140.123 },
            '東京都': { lat: 35.676, lng: 139.650 },
            '神奈川県': { lat: 35.448, lng: 139.643 },
            '新潟県': { lat: 37.902, lng: 139.023 },
            '富山県': { lat: 36.695, lng: 137.211 },
            '石川県': { lat: 36.595, lng: 136.626 },
            '福井県': { lat: 36.065, lng: 136.222 },
            '山梨県': { lat: 35.664, lng: 138.568 },
            '長野県': { lat: 36.651, lng: 138.181 },
            '岐阜県': { lat: 35.391, lng: 136.722 },
            '静岡県': { lat: 34.977, lng: 138.383 },
            '愛知県': { lat: 35.180, lng: 136.907 },
            '三重県': { lat: 34.730, lng: 136.509 },
            '滋賀県': { lat: 35.004, lng: 135.869 },
            '京都府': { lat: 35.021, lng: 135.756 },
            '大阪府': { lat: 34.686, lng: 135.520 },
            '兵庫県': { lat: 34.691, lng: 135.183 },
            '奈良県': { lat: 34.685, lng: 135.805 },
            '和歌山県': { lat: 34.226, lng: 135.167 },
            '鳥取県': { lat: 35.504, lng: 134.238 },
            '島根県': { lat: 35.472, lng: 133.051 },
            '岡山県': { lat: 34.662, lng: 133.935 },
            '広島県': { lat: 34.396, lng: 132.460 },
            '山口県': { lat: 34.186, lng: 131.471 },
            '徳島県': { lat: 34.066, lng: 134.559 },
            '香川県': { lat: 34.340, lng: 134.043 },
            '愛媛県': { lat: 33.842, lng: 132.766 },
            '高知県': { lat: 33.560, lng: 133.531 },
            '福岡県': { lat: 33.607, lng: 130.418 },
            '佐賀県': { lat: 33.250, lng: 130.299 },
            '長崎県': { lat: 32.745, lng: 129.874 },
            '熊本県': { lat: 32.790, lng: 130.742 },
            '大分県': { lat: 33.238, lng: 131.613 },
            '宮崎県': { lat: 31.911, lng: 131.424 },
            '鹿児島県': { lat: 31.560, lng: 130.558 },
            '沖縄県': { lat: 26.213, lng: 127.681 }
        };
        
        return prefectureCoordinates[pref] || null;
    }

    destroy() {
        if (this.map) {
            this.clearMarkers();
            this.map.remove();
            this.map = null;
        }
    }
}