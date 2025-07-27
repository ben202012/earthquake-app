/**
 * 地震データモデル - 厳密なデータ構造定義
 * KyoshinEewViewerIngenのModelsアプローチを参考
 */

class Coordinates {
    constructor(latitude, longitude) {
        this.latitude = parseFloat(latitude);
        this.longitude = parseFloat(longitude);
    }

    isValid() {
        return !isNaN(this.latitude) && !isNaN(this.longitude) &&
               this.latitude >= -90 && this.latitude <= 90 &&
               this.longitude >= -180 && this.longitude <= 180;
    }

    toString() {
        return `${this.latitude.toFixed(3)}, ${this.longitude.toFixed(3)}`;
    }

    toArray() {
        return [this.latitude, this.longitude];
    }

    distanceTo(other) {
        // Haversine formula for distance calculation
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(other.latitude - this.latitude);
        const dLon = this.toRadians(other.longitude - this.longitude);
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRadians(this.latitude)) * Math.cos(this.toRadians(other.latitude)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRadians(degrees) {
        return degrees * (Math.PI/180);
    }
}

class IntensityPoint {
    constructor(data) {
        this.prefecture = data.pref || '';
        this.address = data.addr || '';
        this.scale = parseInt(data.scale) || 0;
        this.coordinates = data.lat && data.lng ? new Coordinates(data.lat, data.lng) : null;
    }

    get intensityLevel() {
        // P2P intensity scale to JMA intensity conversion
        const scaleMap = {
            10: '1', 20: '2', 30: '3', 40: '4', 45: '5弱', 50: '5強',
            55: '6弱', 60: '6強', 70: '7'
        };
        return scaleMap[this.scale] || this.scale.toString();
    }

    get intensityColor() {
        const colorMap = {
            10: '#0066ff', 20: '#0099ff', 30: '#00cc00', 40: '#ffcc00',
            45: '#ff9900', 50: '#ff6600', 55: '#ff3300', 60: '#cc0000', 70: '#990033'
        };
        return colorMap[this.scale] || '#666666';
    }

    isValid() {
        return this.prefecture && this.scale >= 0;
    }
}

class Earthquake {
    constructor(rawData, source = 'unknown') {
        // 基本プロパティ
        this.id = this.generateId(rawData, source);
        this.source = source;
        this.timestamp = this.parseTimestamp(rawData.time);
        this.receivedAt = new Date();
        
        // 地震情報
        this.magnitude = parseFloat(rawData.magnitude) || null;
        this.depth = parseInt(rawData.depth) || null;
        this.location = rawData.location || rawData.hypocenter?.name || '';
        
        // 座標情報
        this.coordinates = this.parseCoordinates(rawData);
        
        // 震度情報
        this.maxIntensity = this.parseMaxIntensity(rawData);
        this.intensityPoints = this.parseIntensityPoints(rawData);
        
        // 津波情報
        this.tsunami = this.parseTsunamiInfo(rawData);
        
        // メタデータ
        this.code = rawData.code || null;
        this.revision = rawData.revision || 1;
        this.isEEW = this.determineEEWStatus(rawData);
        
        // 検証
        this.validate();
    }

    generateId(rawData, source) {
        const timestamp = this.parseTimestamp(rawData.time);
        const locationHash = this.hashString(rawData.location || '');
        return `${source}-${timestamp.getTime()}-${locationHash}`;
    }

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    parseTimestamp(timeString) {
        if (!timeString) return new Date();
        
        // Various time format support
        if (timeString instanceof Date) return timeString;
        if (typeof timeString === 'number') return new Date(timeString);
        
        // P2P format: "2025/07/26 19:52:00"
        if (timeString.includes('/')) {
            return new Date(timeString.replace(/\//g, '-'));
        }
        
        // ISO format
        return new Date(timeString);
    }

    parseCoordinates(rawData) {
        let lat, lng;
        
        if (rawData.latitude && rawData.longitude) {
            lat = rawData.latitude;
            lng = rawData.longitude;
        } else if (rawData.hypocenter) {
            lat = rawData.hypocenter.latitude;
            lng = rawData.hypocenter.longitude;
        } else if (rawData.earthquake?.hypocenter) {
            lat = rawData.earthquake.hypocenter.latitude;
            lng = rawData.earthquake.hypocenter.longitude;
        }
        
        return lat && lng ? new Coordinates(lat, lng) : null;
    }

    parseMaxIntensity(rawData) {
        if (rawData.maxIntensity) return rawData.maxIntensity;
        if (rawData.maxScale) {
            const scaleMap = {
                10: '1', 20: '2', 30: '3', 40: '4', 45: '5弱', 50: '5強',
                55: '6弱', 60: '6強', 70: '7'
            };
            return scaleMap[rawData.maxScale] || rawData.maxScale.toString();
        }
        if (rawData.earthquake?.maxScale) {
            return this.parseMaxIntensity({maxScale: rawData.earthquake.maxScale});
        }
        return null;
    }

    parseIntensityPoints(rawData) {
        const points = rawData.points || rawData.earthquake?.points || [];
        return points.map(point => new IntensityPoint(point)).filter(point => point.isValid());
    }

    parseTsunamiInfo(rawData) {
        if (rawData.tsunami !== undefined) return rawData.tsunami;
        if (rawData.domesticTsunami) {
            return rawData.domesticTsunami !== 'None' && rawData.domesticTsunami !== 'なし';
        }
        if (rawData.earthquake?.domesticTsunami) {
            return rawData.earthquake.domesticTsunami !== 'None' && rawData.earthquake.domesticTsunami !== 'なし';
        }
        return false;
    }

    determineEEWStatus(rawData) {
        // 緊急地震速報の判定 (code 556: 予報, 557: 警報)
        return rawData.code === 556 || rawData.code === 557;
    }

    validate() {
        const errors = [];
        
        if (!this.timestamp || isNaN(this.timestamp.getTime())) {
            errors.push('Invalid timestamp');
        }
        
        if (this.magnitude !== null && (isNaN(this.magnitude) || this.magnitude < 0 || this.magnitude > 10)) {
            errors.push('Invalid magnitude');
        }
        
        if (this.depth !== null && (isNaN(this.depth) || this.depth < 0)) {
            errors.push('Invalid depth');
        }
        
        if (this.coordinates && !this.coordinates.isValid()) {
            errors.push('Invalid coordinates');
        }
        
        if (errors.length > 0) {
            console.warn(`Earthquake validation warnings for ${this.id}:`, errors);
        }
        
        return errors.length === 0;
    }

    // Getters
    get magnitudeLevel() {
        if (!this.magnitude) return 'unknown';
        if (this.magnitude < 3) return 'minor';
        if (this.magnitude < 5) return 'light';
        if (this.magnitude < 6) return 'moderate';
        if (this.magnitude < 7) return 'strong';
        if (this.magnitude < 8) return 'major';
        return 'great';
    }

    get intensityLevel() {
        if (!this.maxIntensity) return 'unknown';
        const numericIntensity = this.getNumericIntensity(this.maxIntensity);
        if (numericIntensity <= 2) return 'weak';
        if (numericIntensity <= 4) return 'light';
        if (numericIntensity <= 5) return 'moderate';
        if (numericIntensity <= 6) return 'strong';
        return 'severe';
    }

    getNumericIntensity(intensity) {
        const intensityMap = {
            '1': 1, '2': 2, '3': 3, '4': 4,
            '5弱': 4.5, '5強': 5.5, '6弱': 5.5, '6強': 6.5, '7': 7
        };
        return intensityMap[intensity] || 0;
    }

    get age() {
        return Date.now() - this.timestamp.getTime();
    }

    get ageString() {
        const minutes = Math.floor(this.age / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}日前`;
        if (hours > 0) return `${hours}時間前`;
        if (minutes > 0) return `${minutes}分前`;
        return 'たった今';
    }

    // フォーマット関数
    formatTime(format = 'full') {
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: format === 'full' ? '2-digit' : undefined
        };
        
        return this.timestamp.toLocaleDateString('ja-JP', options);
    }

    formatMagnitude() {
        return this.magnitude ? `M${this.magnitude.toFixed(1)}` : 'M不明';
    }

    formatDepth() {
        return this.depth ? `深さ${this.depth}km` : '深さ不明';
    }

    formatCoordinates() {
        return this.coordinates ? this.coordinates.toString() : '座標不明';
    }

    // データ変換
    toGeoJSON() {
        if (!this.coordinates) return null;
        
        return {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [this.coordinates.longitude, this.coordinates.latitude]
            },
            properties: {
                id: this.id,
                magnitude: this.magnitude,
                depth: this.depth,
                location: this.location,
                maxIntensity: this.maxIntensity,
                timestamp: this.timestamp.toISOString(),
                source: this.source,
                tsunami: this.tsunami,
                isEEW: this.isEEW
            }
        };
    }

    toJSON() {
        return {
            id: this.id,
            source: this.source,
            timestamp: this.timestamp.toISOString(),
            receivedAt: this.receivedAt.toISOString(),
            magnitude: this.magnitude,
            depth: this.depth,
            location: this.location,
            coordinates: this.coordinates ? {
                latitude: this.coordinates.latitude,
                longitude: this.coordinates.longitude
            } : null,
            maxIntensity: this.maxIntensity,
            intensityPoints: this.intensityPoints.map(point => ({
                prefecture: point.prefecture,
                address: point.address,
                scale: point.scale,
                intensityLevel: point.intensityLevel,
                coordinates: point.coordinates ? {
                    latitude: point.coordinates.latitude,
                    longitude: point.coordinates.longitude
                } : null
            })),
            tsunami: this.tsunami,
            code: this.code,
            revision: this.revision,
            isEEW: this.isEEW
        };
    }

    // 静的メソッド
    static fromJSON(json) {
        const rawData = {
            time: json.timestamp,
            location: json.location,
            magnitude: json.magnitude,
            depth: json.depth,
            latitude: json.coordinates?.latitude,
            longitude: json.coordinates?.longitude,
            maxIntensity: json.maxIntensity,
            points: json.intensityPoints?.map(point => ({
                pref: point.prefecture,
                addr: point.address,
                scale: point.scale,
                lat: point.coordinates?.latitude,
                lng: point.coordinates?.longitude
            })),
            tsunami: json.tsunami,
            code: json.code
        };
        
        const earthquake = new Earthquake(rawData, json.source);
        earthquake.id = json.id;
        earthquake.receivedAt = new Date(json.receivedAt);
        earthquake.revision = json.revision;
        earthquake.isEEW = json.isEEW;
        
        return earthquake;
    }

    static compare(a, b) {
        // 新しい順（降順）
        return b.timestamp.getTime() - a.timestamp.getTime();
    }

    static filterByMagnitude(earthquakes, minMagnitude) {
        return earthquakes.filter(eq => eq.magnitude && eq.magnitude >= minMagnitude);
    }

    static filterByIntensity(earthquakes, minIntensity) {
        return earthquakes.filter(eq => {
            if (!eq.maxIntensity) return false;
            return eq.getNumericIntensity(eq.maxIntensity) >= eq.getNumericIntensity(minIntensity);
        });
    }

    static filterByTimeRange(earthquakes, startTime, endTime) {
        return earthquakes.filter(eq => 
            eq.timestamp >= startTime && eq.timestamp <= endTime
        );
    }

    static groupByDate(earthquakes) {
        const groups = new Map();
        
        earthquakes.forEach(earthquake => {
            const dateKey = earthquake.timestamp.toDateString();
            if (!groups.has(dateKey)) {
                groups.set(dateKey, []);
            }
            groups.get(dateKey).push(earthquake);
        });
        
        return groups;
    }
}

export default Earthquake;
export { Coordinates, IntensityPoint };