/**
 * セキュリティ設定ファイル
 * 地震情報システム v3.3
 */

module.exports = {
    // CORS設定
    cors: {
        allowedOrigins: [
            'http://localhost:8080',
            'http://127.0.0.1:8080',
            'https://localhost:8080'
        ],
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Origin',
            'X-Requested-With',
            'Content-Type',
            'Accept',
            'Authorization',
            'Cache-Control'
        ],
        allowCredentials: true
    },

    // HTTPセキュリティヘッダー
    headers: {
        // Content Security Policy
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'", // 一時的に復活（大きなクラス定義のため）
                    "'unsafe-hashes'", // イベントハンドラー用のハッシュを許可（互換性のため）
                    // 外部スクリプトファイルのみ許可
                    'https://unpkg.com',
                    'https://cdn.jsdelivr.net',
                    'https://cdnjs.cloudflare.com'
                ],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'", // テスト環境用：インラインスタイルを許可
                    "'unsafe-hashes'", // インラインスタイル用のハッシュを許可
                    // nonce方式を使用（動的に追加される）
                    'https://unpkg.com',
                    'https://fonts.googleapis.com'
                ],
                fontSrc: [
                    "'self'",
                    'https://fonts.gstatic.com'
                ],
                imgSrc: [
                    "'self'",
                    'data:',
                    'https:',
                    'http:'
                ],
                connectSrc: [
                    "'self'",
                    'https://api.p2pquake.net',
                    'wss://api.p2pquake.net',
                    'https://earthquake.usgs.gov',
                    'https://www.seismicportal.eu',
                    'https://www.jma.go.jp',
                    'https://tsunami.gov',
                    // CDN: ライブラリ source map（leaflet.js.map など）取得のため
                    'https://unpkg.com',
                    'https://cdn.jsdelivr.net',
                    'https://cdnjs.cloudflare.com'
                ],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"]
            }
        },
        
        // X-Frame-Options
        xFrameOptions: 'DENY',
        
        // X-XSS-Protection
        xXSSProtection: '1; mode=block',
        
        // X-Content-Type-Options
        xContentTypeOptions: 'nosniff',
        
        // Referrer-Policy
        referrerPolicy: 'strict-origin-when-cross-origin',
        
        // Strict-Transport-Security
        strictTransportSecurity: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: false
        }
    },

    // プロキシ設定
    proxy: {
        allowedHosts: [
            'api.p2pquake.net',
            'earthquake.usgs.gov',
            'www.seismicportal.eu',
            'www.jma.go.jp',
            'tsunami.gov'
        ],
        maxRedirects: 5,
        timeout: 30000
    },

    // ログ設定
    logging: {
        logAccess: true,
        includeErrorDetails: true,
        logLevel: 'info'
    },

    // レート制限設定
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15分
        max: 100 // 最大100リクエスト
    }
};
