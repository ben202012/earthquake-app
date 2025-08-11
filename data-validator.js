/**
 * データ検証クラス - 外部APIデータの検証強化
 * 津波警報システム v3.0
 */

class DataValidator {
    constructor() {
        this.schemas = this.initializeSchemas();
        this.anomalyDetector = new AnomalyDetector();
        this.validationStats = {
            totalValidations: 0,
            passed: 0,
            failed: 0,
            anomaliesDetected: 0
        };
        
        console.log('✅ DataValidator初期化完了 - 強化されたデータ検証有効');
    }
    
    /**
     * スキーマの初期化
     */
    initializeSchemas() {
        return {
            earthquake: {
                required: ['magnitude', 'location', 'time', 'depth'],
                types: {
                    magnitude: 'number',
                    location: 'object',
                    time: 'string',
                    depth: 'number',
                    intensity: 'number'
                },
                ranges: {
                    magnitude: { min: 0, max: 10 },
                    depth: { min: 0, max: 1000 },
                    intensity: { min: 1, max: 7 }
                }
            },
            tsunami: {
                required: ['area', 'level', 'arrivalTime', 'waveHeight'],
                types: {
                    area: 'string',
                    level: 'string',
                    arrivalTime: 'string',
                    waveHeight: 'number'
                },
                ranges: {
                    waveHeight: { min: 0, max: 50 }
                },
                enums: {
                    level: ['注意報', '警報', '大津波警報']
                }
            },
            jmaXml: {
                required: ['Report', 'Control'],
                types: {
                    Report: 'object',
                    Control: 'object'
                }
            }
        };
    }
    
    /**
     * メインの検証メソッド
     */
    validate(data, schemaType, options = {}) {
        this.validationStats.totalValidations++;
        
        try {
            const result = {
                isValid: true,
                errors: [],
                warnings: [],
                sanitizedData: null,
                anomalies: []
            };
            
            // 基本的な型チェック
            if (!this.validateBasicStructure(data, schemaType, result)) {
                this.validationStats.failed++;
                return result;
            }
            
            // スキーマ検証
            if (!this.validateSchema(data, schemaType, result)) {
                this.validationStats.failed++;
                return result;
            }
            
            // データサニタイゼーション
            result.sanitizedData = this.sanitizeData(data, schemaType);
            
            // 異常値検出
            if (options.detectAnomalies !== false) {
                result.anomalies = this.anomalyDetector.detect(result.sanitizedData, schemaType);
                if (result.anomalies.length > 0) {
                    this.validationStats.anomaliesDetected++;
                }
            }
            
            this.validationStats.passed++;
            return result;
            
        } catch (error) {
            this.validationStats.failed++;
            if (window.errorHandler) {
                window.errorHandler.error('データ検証エラー', { error, data, schemaType });
            }
            
            return {
                isValid: false,
                errors: [`検証処理エラー: ${error.message}`],
                warnings: [],
                sanitizedData: null,
                anomalies: []
            };
        }
    }
    
    /**
     * 基本構造の検証
     */
    validateBasicStructure(data, schemaType, result) {
        if (data === null || data === undefined) {
            result.isValid = false;
            result.errors.push('データがnullまたはundefinedです');
            return false;
        }
        
        if (typeof data !== 'object') {
            result.isValid = false;
            result.errors.push('データがオブジェクトではありません');
            return false;
        }
        
        return true;
    }
    
    /**
     * スキーマ検証
     */
    validateSchema(data, schemaType, result) {
        const schema = this.schemas[schemaType];
        if (!schema) {
            result.warnings.push(`未知のスキーマタイプ: ${schemaType}`);
            return true; // 未知のスキーマは警告のみ
        }
        
        let isValid = true;
        
        // 必須フィールドチェック
        for (const field of schema.required) {
            if (!(field in data)) {
                result.errors.push(`必須フィールドが不足: ${field}`);
                isValid = false;
            }
        }
        
        // 型チェック
        if (schema.types) {
            for (const [field, expectedType] of Object.entries(schema.types)) {
                if (field in data && !this.checkType(data[field], expectedType)) {
                    result.errors.push(`型エラー: ${field} は ${expectedType} である必要があります`);
                    isValid = false;
                }
            }
        }
        
        // 範囲チェック
        if (schema.ranges) {
            for (const [field, range] of Object.entries(schema.ranges)) {
                if (field in data && typeof data[field] === 'number') {
                    if (data[field] < range.min || data[field] > range.max) {
                        result.errors.push(`範囲エラー: ${field} は ${range.min} から ${range.max} の範囲である必要があります`);
                        isValid = false;
                    }
                }
            }
        }
        
        // 列挙値チェック
        if (schema.enums) {
            for (const [field, allowedValues] of Object.entries(schema.enums)) {
                if (field in data && !allowedValues.includes(data[field])) {
                    result.errors.push(`列挙値エラー: ${field} は [${allowedValues.join(', ')}] のいずれかである必要があります`);
                    isValid = false;
                }
            }
        }
        
        result.isValid = isValid;
        return isValid;
    }
    
    /**
     * 型チェック
     */
    checkType(value, expectedType) {
        switch (expectedType) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number' && !isNaN(value);
            case 'boolean':
                return typeof value === 'boolean';
            case 'object':
                return value !== null && typeof value === 'object' && !Array.isArray(value);
            case 'array':
                return Array.isArray(value);
            default:
                return true; // 未知の型は通す
        }
    }
    
    /**
     * データサニタイゼーション
     */
    sanitizeData(data, schemaType) {
        const sanitized = JSON.parse(JSON.stringify(data)); // ディープコピー
        
        // 文字列のトリム
        this.sanitizeStrings(sanitized);
        
        // 数値の正規化
        this.sanitizeNumbers(sanitized);
        
        // 危険なフィールドの削除
        this.removeDangerousFields(sanitized);
        
        return sanitized;
    }
    
    /**
     * 文字列のサニタイゼーション
     */
    sanitizeStrings(obj) {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                // 前後の空白を削除
                obj[key] = obj[key].trim();
                
                // HTMLタグを除去（基本的な対策）
                obj[key] = obj[key].replace(/<[^>]*>/g, '');
                
                // 制御文字を除去
                obj[key] = obj[key].replace(/[\x00-\x1F\x7F]/g, '');
                
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                this.sanitizeStrings(obj[key]);
            }
        }
    }
    
    /**
     * 数値のサニタイゼーション
     */
    sanitizeNumbers(obj) {
        for (const key in obj) {
            if (typeof obj[key] === 'number') {
                // NaN や Infinity のチェック
                if (isNaN(obj[key]) || !isFinite(obj[key])) {
                    obj[key] = 0; // デフォルト値に置換
                }
                
                // 極端に大きな値の制限
                if (Math.abs(obj[key]) > Number.MAX_SAFE_INTEGER) {
                    obj[key] = Math.sign(obj[key]) * Number.MAX_SAFE_INTEGER;
                }
                
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                this.sanitizeNumbers(obj[key]);
            }
        }
    }
    
    /**
     * 危険なフィールドの削除
     */
    removeDangerousFields(obj) {
        const dangerousFields = ['__proto__', 'constructor', 'prototype', 'eval', 'function'];
        
        for (const field of dangerousFields) {
            if (field in obj) {
                delete obj[field];
            }
        }
        
        for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                this.removeDangerousFields(obj[key]);
            }
        }
    }
    
    /**
     * 検証統計の取得
     */
    getValidationStats() {
        return {
            ...this.validationStats,
            successRate: this.validationStats.totalValidations > 0 
                ? (this.validationStats.passed / this.validationStats.totalValidations * 100).toFixed(2) + '%'
                : '0%'
        };
    }
    
    /**
     * スキーマの追加
     */
    addSchema(name, schema) {
        this.schemas[name] = schema;
        console.log(`📋 新しいスキーマを追加: ${name}`);
    }
    
    /**
     * 統計のリセット
     */
    resetStats() {
        this.validationStats = {
            totalValidations: 0,
            passed: 0,
            failed: 0,
            anomaliesDetected: 0
        };
        console.log('📊 検証統計をリセットしました');
    }
}

/**
 * 異常値検出クラス
 */
class AnomalyDetector {
    constructor() {
        this.historicalData = new Map();
        this.thresholds = {
            magnitude: { min: 1.0, max: 9.0, stdDevMultiplier: 2 },
            depth: { min: 0, max: 800, stdDevMultiplier: 2 },
            waveHeight: { min: 0, max: 20, stdDevMultiplier: 2.5 }
        };
    }
    
    /**
     * 異常値検出
     */
    detect(data, schemaType) {
        const anomalies = [];
        
        try {
            // 統計的異常値検出
            anomalies.push(...this.detectStatisticalAnomalies(data, schemaType));
            
            // ルールベース異常値検出
            anomalies.push(...this.detectRuleBasedAnomalies(data, schemaType));
            
            // 履歴データとの比較
            anomalies.push(...this.detectHistoricalAnomalies(data, schemaType));
            
        } catch (error) {
            if (window.errorHandler) {
                window.errorHandler.warn('異常値検出エラー', { error, data, schemaType });
            }
        }
        
        return anomalies;
    }
    
    /**
     * 統計的異常値検出
     */
    detectStatisticalAnomalies(data, schemaType) {
        const anomalies = [];
        
        for (const [field, threshold] of Object.entries(this.thresholds)) {
            if (field in data && typeof data[field] === 'number') {
                const value = data[field];
                
                // 基本範囲チェック
                if (value < threshold.min || value > threshold.max) {
                    anomalies.push({
                        type: 'range_anomaly',
                        field,
                        value,
                        expected: `${threshold.min} - ${threshold.max}`,
                        severity: 'high'
                    });
                }
            }
        }
        
        return anomalies;
    }
    
    /**
     * ルールベース異常値検出
     */
    detectRuleBasedAnomalies(data, schemaType) {
        const anomalies = [];
        
        if (schemaType === 'earthquake') {
            // 地震データの異常パターン
            if (data.magnitude && data.depth) {
                // 深い地震で高震度は異常
                if (data.depth > 300 && data.magnitude > 7) {
                    anomalies.push({
                        type: 'logical_anomaly',
                        field: 'magnitude_depth_relation',
                        value: { magnitude: data.magnitude, depth: data.depth },
                        reason: '深い地震での高震度は稀',
                        severity: 'medium'
                    });
                }
            }
        }
        
        if (schemaType === 'tsunami') {
            // 津波データの異常パターン
            if (data.waveHeight && data.level) {
                // 波高と警報レベルの不一致
                if (data.waveHeight > 5 && data.level === '注意報') {
                    anomalies.push({
                        type: 'inconsistency_anomaly',
                        field: 'waveHeight_level_mismatch',
                        value: { waveHeight: data.waveHeight, level: data.level },
                        reason: '高波高に対して警報レベルが低い',
                        severity: 'high'
                    });
                }
            }
        }
        
        return anomalies;
    }
    
    /**
     * 履歴データとの比較
     */
    detectHistoricalAnomalies(data, schemaType) {
        const anomalies = [];
        
        // 履歴データの蓄積
        if (!this.historicalData.has(schemaType)) {
            this.historicalData.set(schemaType, []);
        }
        
        const history = this.historicalData.get(schemaType);
        
        // 履歴データが十分ある場合のみ比較
        if (history.length >= 10) {
            // 簡単な統計比較（実際にはより高度な手法を使用）
            for (const field of ['magnitude', 'depth', 'waveHeight']) {
                if (field in data && typeof data[field] === 'number') {
                    const values = history.map(h => h[field]).filter(v => typeof v === 'number');
                    if (values.length >= 5) {
                        const mean = values.reduce((a, b) => a + b) / values.length;
                        const stdDev = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
                        
                        if (Math.abs(data[field] - mean) > stdDev * 3) {
                            anomalies.push({
                                type: 'statistical_anomaly',
                                field,
                                value: data[field],
                                expected: `平均: ${mean.toFixed(2)}, 標準偏差: ${stdDev.toFixed(2)}`,
                                severity: 'medium'
                            });
                        }
                    }
                }
            }
        }
        
        // 履歴に追加（最新100件まで保持）
        history.push(data);
        if (history.length > 100) {
            history.shift();
        }
        
        return anomalies;
    }
}

// グローバルインスタンス
if (typeof window !== 'undefined') {
    window.dataValidator = new DataValidator();
} else {
    module.exports = { DataValidator, AnomalyDetector };
}
