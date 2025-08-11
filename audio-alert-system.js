/**
 * 音声警報システム
 * Web Audio APIを使用したプログラム的音声生成による警報システム
 */

class AudioAlertSystem {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.isInitialized = false;
        this.currentPlayingNodes = new Map();
        
        // 音声設定
        this.config = {
            sampleRate: 44100,
            defaultVolume: 0.5,
            fadeTime: 0.1,
            
            // 警報レベル別音声パターン
            alertPatterns: {
                'major_warning': {
                    type: 'emergency_siren',
                    frequency: [800, 1200], // Hz - 交互に鳴る
                    duration: 2.0,          // 秒
                    interval: 0.5,          // 秒 - 周波数切り替え間隔
                    volume: 0.8,
                    repeat: true,
                    repeatInterval: 3000    // ミリ秒
                },
                'warning': {
                    type: 'warning_tone',
                    frequency: [600, 900],
                    duration: 1.5,
                    interval: 0.7,
                    volume: 0.6,
                    repeat: true,
                    repeatInterval: 5000
                },
                'advisory': {
                    type: 'notification',
                    frequency: [440, 550],
                    duration: 1.0,
                    interval: 0.8,
                    volume: 0.4,
                    repeat: false,
                    repeatInterval: 0
                },
                'test': {
                    type: 'test_tone',
                    frequency: [523.25], // C5音
                    duration: 0.5,
                    interval: 0,
                    volume: 0.3,
                    repeat: false,
                    repeatInterval: 0
                }
            }
        };
        
        this.state = {
            currentAlerts: new Map(),
            repeatTimers: new Map(),
            isPlaying: false,
            masterVolume: 0.5
        };
    }
    
    /**
     * 音声システム初期化
     */
    async initialize() {
        console.log('🔊 音声警報システム初期化開始');
        
        try {
            // AudioContextの作成
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // マスター音量ノード作成
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = this.state.masterVolume;
            
            // AudioContextがsuspendedの場合は再開
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.isInitialized = true;
            console.log('✅ 音声警報システム初期化完了');
            
            return true;
            
        } catch (error) {
            console.error('❌ 音声システム初期化失敗:', error);
            return false;
        }
    }
    
    /**
     * 警報音再生
     */
    async playAlert(alertLevel, options = {}) {
        console.log(`🔊 警報音再生: ${alertLevel}`);
        
        // 初期化チェック
        if (!this.isInitialized) {
            const initialized = await this.initialize();
            if (!initialized) {
                console.warn('⚠️ 音声システム初期化失敗 - 警報音をスキップ');
                return false;
            }
        }
        
        // AudioContext再開（ブラウザの自動再生制限対応）
        if (this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
            } catch (error) {
                console.warn('⚠️ AudioContext再開失敗:', error);
                return false;
            }
        }
        
        const pattern = this.config.alertPatterns[alertLevel];
        if (!pattern) {
            console.warn(`⚠️ 未定義の警報レベル: ${alertLevel}`);
            return false;
        }
        
        // 既存の同レベル警報を停止
        this.stopAlert(alertLevel);
        
        // 音声生成・再生
        const alertId = `${alertLevel}_${Date.now()}`;
        
        try {
            // 警報音生成・再生
            await this.generateAndPlaySound(alertId, pattern, options);
            
            // リピート設定
            if (pattern.repeat && pattern.repeatInterval > 0) {
                this.setupRepeat(alertId, alertLevel, pattern, options);
            }
            
            return true;
            
        } catch (error) {
            console.error(`❌ 警報音再生失敗 (${alertLevel}):`, error);
            return false;
        }
    }
    
    /**
     * 音声生成・再生
     */
    async generateAndPlaySound(alertId, pattern, options = {}) {
        const startTime = this.audioContext.currentTime;
        const volume = options.volume !== undefined ? options.volume : pattern.volume;
        
        // 複数周波数対応
        const frequencies = Array.isArray(pattern.frequency) ? pattern.frequency : [pattern.frequency];
        const nodes = [];
        
        for (let i = 0; i < frequencies.length; i++) {
            const freq = frequencies[i];
            const delay = i * pattern.interval;
            
            // オシレーター作成
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // 音色設定（警報レベルに応じて変更）
            oscillator.type = this.getWaveType(pattern.type);
            oscillator.frequency.setValueAtTime(freq, startTime + delay);
            
            // エンベロープ設定（フェードイン・アウト）
            gainNode.gain.setValueAtTime(0, startTime + delay);
            gainNode.gain.linearRampToValueAtTime(volume, startTime + delay + this.config.fadeTime);
            gainNode.gain.setValueAtTime(volume, startTime + delay + pattern.duration - this.config.fadeTime);
            gainNode.gain.linearRampToValueAtTime(0, startTime + delay + pattern.duration);
            
            // 接続
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // 再生制御
            oscillator.start(startTime + delay);
            oscillator.stop(startTime + delay + pattern.duration);
            
            nodes.push({ oscillator, gainNode });
        }
        
        // アクティブノード管理
        this.currentPlayingNodes.set(alertId, nodes);
        
        // 終了時のクリーンアップ（メモリリーク対策）
        const cleanupDelay = (pattern.duration + Math.max(...frequencies.map((_, i) => i * pattern.interval))) * 1000;
        if (window.timerManager) {
            window.timerManager.setTimeout(() => {
                this.currentPlayingNodes.delete(alertId);
            }, cleanupDelay);
        } else {
            setTimeout(() => {
                this.currentPlayingNodes.delete(alertId);
            }, cleanupDelay);
        }
    }
    
    /**
     * 波形タイプ決定
     */
    getWaveType(patternType) {
        switch (patternType) {
            case 'emergency_siren':
                return 'square'; // 緊急時は目立つ矩形波
            case 'warning_tone':
                return 'triangle'; // 警告は中間的な三角波
            case 'notification':
                return 'sine'; // 通知は穏やかな正弦波
            case 'test_tone':
                return 'sine'; // テストも正弦波
            default:
                return 'sine';
        }
    }
    
    /**
     * リピート設定
     */
    setupRepeat(alertId, alertLevel, pattern, options) {
        // メモリリーク対策: TimerManagerを使用
        let repeatTimer;
        if (window.timerManager) {
            repeatTimer = window.timerManager.setInterval(async () => {
                if (this.state.currentAlerts.has(alertLevel)) {
                    await this.generateAndPlaySound(`${alertId}_repeat_${Date.now()}`, pattern, options);
                } else {
                    window.timerManager.clearTimer(repeatTimer);
                    this.state.repeatTimers.delete(alertLevel);
                }
            }, pattern.repeatInterval, { stopOnError: true });
        } else {
            repeatTimer = setInterval(async () => {
                if (this.state.currentAlerts.has(alertLevel)) {
                    await this.generateAndPlaySound(`${alertId}_repeat_${Date.now()}`, pattern, options);
                } else {
                    clearInterval(repeatTimer);
                    this.state.repeatTimers.delete(alertLevel);
                }
            }, pattern.repeatInterval);
        }
        
        this.state.repeatTimers.set(alertLevel, repeatTimer);
        this.state.currentAlerts.set(alertLevel, alertId);
    }
    
    /**
     * 警報音停止
     */
    stopAlert(alertLevel) {
        console.log(`🔇 警報音停止: ${alertLevel}`);
        
        // リピートタイマー停止
        if (this.state.repeatTimers.has(alertLevel)) {
            clearInterval(this.state.repeatTimers.get(alertLevel));
            this.state.repeatTimers.delete(alertLevel);
        }
        
        // アクティブ警報削除
        this.state.currentAlerts.delete(alertLevel);
        
        // 再生中ノードの停止は自動的に行われる（scheduled stop）
    }
    
    /**
     * 全警報音停止
     */
    stopAllAlerts() {
        console.log('🔇 全警報音停止');
        
        // 全リピートタイマー停止
        this.state.repeatTimers.forEach((timer, alertLevel) => {
            clearInterval(timer);
        });
        this.state.repeatTimers.clear();
        
        // 全アクティブ警報削除
        this.state.currentAlerts.clear();
        
        // 再生中ノード強制停止
        this.currentPlayingNodes.forEach((nodes, alertId) => {
            nodes.forEach(({ oscillator, gainNode }) => {
                try {
                    oscillator.stop();
                } catch (error) {
                    // already stopped - ignore
                }
            });
        });
        this.currentPlayingNodes.clear();
    }
    
    /**
     * マスター音量設定
     */
    setMasterVolume(volume) {
        if (!this.isInitialized || !this.masterGain) return;
        
        const clampedVolume = Math.max(0, Math.min(1, volume));
        this.state.masterVolume = clampedVolume;
        
        // スムーズな音量変更
        this.masterGain.gain.linearRampToValueAtTime(
            clampedVolume, 
            this.audioContext.currentTime + 0.1
        );
        
        console.log(`🔊 マスター音量設定: ${Math.round(clampedVolume * 100)}%`);
    }
    
    /**
     * テスト音再生
     */
    async playTestSound() {
        console.log('🧪 テスト音再生');
        return await this.playAlert('test');
    }
    
    /**
     * システム状態取得
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            audioContextState: this.audioContext?.state,
            activeAlerts: Array.from(this.state.currentAlerts.keys()),
            masterVolume: this.state.masterVolume,
            isPlaying: this.currentPlayingNodes.size > 0
        };
    }
    
    /**
     * システム破棄
     */
    destroy() {
        console.log('🔇 音声警報システム終了');
        
        this.stopAllAlerts();
        
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        this.isInitialized = false;
    }
}

// グローバル音声システムインスタンス
window.audioAlertSystem = new AudioAlertSystem(); 