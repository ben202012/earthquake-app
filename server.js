const http = require('http');
const https = require('https');
const net = require('net');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const { exec } = require('child_process');

// セキュリティ設定の読み込み
let SECURITY_CONFIG;
try {
    SECURITY_CONFIG = require('./security-config.js');
    console.log('✅ セキュリティ設定ファイルを読み込みました');
} catch (error) {
    console.warn('⚠️ セキュリティ設定ファイルが見つかりません。デフォルト設定を使用します。');
    // デフォルトのセキュリティ設定
    SECURITY_CONFIG = {
        cors: {
            allowedOrigins: ['http://localhost:8080'],
            allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            allowCredentials: false
        },
        proxy: {
            allowedHosts: ['earthquake.usgs.gov', 'www.jma.go.jp']
        }
    };
}

const DEFAULT_PORT = 8080;
const MAX_PORT = 8099;

/**
 * 指定範囲内で利用可能なポートを探す
 */
function findAvailablePort(startPort, maxPort) {
    return new Promise((resolve, reject) => {
        function tryPort(p) {
            if (p > maxPort) {
                reject(new Error(`利用可能なポートが見つかりません (${startPort}-${maxPort})`));
                return;
            }
            const tester = net.createServer();
            tester.once('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.log(`⚠️ ポート ${p} は使用中です。次を試します...`);
                    tryPort(p + 1);
                } else {
                    reject(err);
                }
            });
            tester.once('listening', () => {
                tester.close(() => resolve(p));
            });
            // host を指定しない → 実サーバー (server.listen) のデフォルト (IPv6 ::/IPv4 両対応) と同じ振る舞いにする
            // 127.0.0.1 だけでテストすると、ゾンビプロセスが IPv6 ::8080 を握っている場合に誤検知して衝突する
            tester.listen(p);
        }
        tryPort(startPort);
    });
}

/**
 * セキュアなnonce生成関数
 * CSP (Content Security Policy) で使用するランダムな値を生成
 */
function generateNonce() {
    return crypto.randomBytes(16).toString('base64');
}

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml'
};

// 外部API設定（動作確認済み）
const externalAPIs = {
    'usgs': 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_hour.geojson',
    'emsc': 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/1.0_hour.geojson',
    'jma': 'https://www.jma.go.jp/bosai/forecast/data/forecast/130000.json',
    'noaa': 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson'
};

// 気象庁XML API設定（JMAXMLClient用のカスタムエンドポイント）
const jmaXmlAPIs = {
    'tsunami': 'https://xml.kishou.go.jp/data/tsunami/',
    'forecast': 'https://xml.kishou.go.jp/forecast/tsunami/',
    'historical': 'https://xml.kishou.go.jp/historicaldata/'
};

/**
 * 安全なCORSヘッダーを設定する関数
 */
function setSafeCORSHeaders(req, res) {
    const origin = req.headers.origin;
    const allowedOrigins = SECURITY_CONFIG.cors.allowedOrigins;
    
    // オリジンが許可リストに含まれている場合のみ設定
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', SECURITY_CONFIG.cors.allowedMethods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', SECURITY_CONFIG.cors.allowedHeaders.join(', '));
    
    if (SECURITY_CONFIG.cors.allowCredentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
}

/**
 * 安全なエラーレスポンスを生成する関数
 * 本番環境では詳細情報を隠蔽し、開発環境では詳細を表示
 */
function createSafeErrorResponse(error, context = {}) {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const includeDetails = SECURITY_CONFIG.logging.includeErrorDetails || isDevelopment;
    
    // ベースエラー情報
    const baseError = {
        error: 'サーバーエラーが発生しました',
        timestamp: new Date().toISOString(),
        requestId: context.requestId || Math.random().toString(36).substr(2, 9)
    };
    
    // 開発環境または設定で許可されている場合のみ詳細情報を含める
    if (includeDetails) {
        baseError.details = {
            message: error.message,
            type: error.name || 'Error',
            ...(context.url && { url: context.url }),
            ...(context.method && { method: context.method })
        };
        
        // スタックトレースは開発環境のみ
        if (isDevelopment && error.stack) {
            baseError.details.stack = error.stack;
        }
    }
    
    // セキュリティログ記録
    if (SECURITY_CONFIG.logging.logAccess) {
        console.warn(`🚨 エラー発生 [${baseError.requestId}]:`, error.message);
    }
    
    return baseError;
}

/**
 * セキュリティヘッダーを設定する関数
 * XSS、クリックジャッキング、MIMEタイプ偽装等を防御
 */
function setSecurityHeaders(req, res, nonce = null) {
    // Content Security Policy (CSP) - XSS攻撃を防ぐ
    const cspDirectives = { ...SECURITY_CONFIG.headers.contentSecurityPolicy.directives };
    
    // nonceが提供された場合、script-srcとstyle-srcを動的に更新
    if (nonce) {
        // テスト環境では unsafe-inline を保持し、nonce も追加
        cspDirectives.scriptSrc = cspDirectives.scriptSrc
            .concat([`'nonce-${nonce}'`]);
        
        cspDirectives.styleSrc = cspDirectives.styleSrc
            .concat([`'nonce-${nonce}'`]);
    }
    
    const cspString = Object.entries(cspDirectives)
        .map(([directive, sources]) => {
            const directiveName = directive.replace(/([A-Z])/g, '-$1').toLowerCase();
            return `${directiveName} ${sources.join(' ')}`;
        })
        .join('; ');
    
    res.setHeader('Content-Security-Policy', cspString);
    
    // X-Frame-Options - クリックジャッキング攻撃を防ぐ
    res.setHeader('X-Frame-Options', SECURITY_CONFIG.headers.xFrameOptions);
    
    // X-XSS-Protection - ブラウザ内蔵のXSS保護を有効化
    res.setHeader('X-XSS-Protection', SECURITY_CONFIG.headers.xXSSProtection);
    
    // X-Content-Type-Options - MIMEタイプ偽装攻撃を防ぐ
    res.setHeader('X-Content-Type-Options', SECURITY_CONFIG.headers.xContentTypeOptions);
    
    // Referrer-Policy - リファラー情報の制御
    res.setHeader('Referrer-Policy', SECURITY_CONFIG.headers.referrerPolicy);
    
    // HTTPS接続の場合のみHSTSヘッダーを設定
    if (req.connection.encrypted || req.headers['x-forwarded-proto'] === 'https') {
        const hsts = SECURITY_CONFIG.headers.strictTransportSecurity;
        let hstsValue = `max-age=${hsts.maxAge}`;
        if (hsts.includeSubDomains) hstsValue += '; includeSubDomains';
        if (hsts.preload) hstsValue += '; preload';
        
        res.setHeader('Strict-Transport-Security', hstsValue);
    }
}

/**
 * URLのホストが許可されているかチェックする関数
 */
function isAllowedHost(targetUrl) {
    try {
        const parsedUrl = new URL(targetUrl);
        return SECURITY_CONFIG.proxy.allowedHosts.includes(parsedUrl.hostname);
    } catch (error) {
        console.error('❌ URL解析エラー:', error);
        return false;
    }
}

// プロキシ関数（リダイレクト対応版・セキュリティ強化版）
function proxyRequest(targetUrl, req, res, redirectCount = 0) {
    const maxRedirects = SECURITY_CONFIG.proxy.maxRedirects || 5;
    
    // ホストの許可チェック
    if (!isAllowedHost(targetUrl)) {
        console.error(`❌ 許可されていないホストへのアクセス: ${targetUrl}`);
        const safeError = createSafeErrorResponse(
            new Error('アクセス権限がありません'),
            { url: targetUrl, method: req.method }
        );
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(safeError));
        return;
    }
    
    if (redirectCount > maxRedirects) {
        console.error(`❌ 最大リダイレクト数を超過: ${targetUrl}`);
        const safeError = createSafeErrorResponse(
            new Error('リダイレクト回数が上限を超過しました'),
            { url: targetUrl, method: req.method }
        );
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(safeError));
        return;
    }
    
    console.log(`🔄 プロキシ要求: ${targetUrl} ${redirectCount > 0 ? `(リダイレクト ${redirectCount})` : ''}`);
    
    const options = url.parse(targetUrl);
    options.method = req.method;
    options.headers = {
        'User-Agent': 'EarthquakeMonitor/3.0 (+http://localhost:8080)',
        'Accept': 'application/json, text/html, */*',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
    };
    
    const protocol = options.protocol === 'https:' ? https : http;
    
    const proxyReq = protocol.request(options, (proxyRes) => {
        // リダイレクト処理
        if ([301, 302, 303, 307, 308].includes(proxyRes.statusCode)) {
            const location = proxyRes.headers.location;
            if (location) {
                console.log(`🔀 リダイレクト: ${proxyRes.statusCode} → ${location}`);
                const newUrl = location.startsWith('http') ? location : url.resolve(targetUrl, location);
                return proxyRequest(newUrl, req, res, redirectCount + 1);
            }
        }
        
        // 安全なCORSヘッダーを設定
        setSafeCORSHeaders(req, res);
        // セキュリティヘッダーを設定
        setSecurityHeaders(req, res);
        res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'application/json');
        
        // データを一度だけ読み込み
        let body = [];
        proxyRes.on('data', (chunk) => {
            body.push(chunk);
        });
        
        proxyRes.on('end', () => {
            const fullBody = Buffer.concat(body);
            res.writeHead(proxyRes.statusCode);
            res.end(fullBody);
            
            console.log(`✅ プロキシ応答: ${proxyRes.statusCode} - ${targetUrl} (${fullBody.length}bytes)`);
        });
        
        proxyRes.on('error', (err) => {
            console.error(`❌ レスポンス読み込みエラー: ${err.message}`);
            if (!res.headersSent) {
                const safeError = createSafeErrorResponse(
                    err,
                    { url: targetUrl, method: req.method }
                );
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(safeError));
            }
        });
    });
    
    proxyReq.on('error', (err) => {
        console.error(`❌ プロキシエラー: ${err.message} - ${targetUrl}`);
        if (!res.headersSent) {
            const safeError = createSafeErrorResponse(
                err,
                { url: targetUrl, method: req.method }
            );
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(safeError));
        }
    });
    
    proxyReq.setTimeout(30000, () => {
        console.error(`❌ プロキシタイムアウト: ${targetUrl}`);
        proxyReq.destroy();
        if (!res.headersSent) {
            const safeError = createSafeErrorResponse(
                new Error('リクエストがタイムアウトしました'),
                { url: targetUrl, method: req.method }
            );
            res.writeHead(504, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(safeError));
        }
    });
    
    proxyReq.end();
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;
    
    // 安全なCORSヘッダーを設定
    setSafeCORSHeaders(req, res);
    // セキュリティヘッダーを設定（HTMLファイル以外はnonce不要）
    if (!pathname.endsWith('.html')) {
        setSecurityHeaders(req, res);
    }
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // API プロキシエンドポイント
    if (pathname.startsWith('/api/proxy/')) {
        const apiId = pathname.replace('/api/proxy/', '');
        
        // JMA専用プロキシエンドポイント（セキュリティ強化）
        if (apiId === 'jma' && parsedUrl.query.url) {
            const targetUrl = decodeURIComponent(parsedUrl.query.url);
            
            // JMAドメインのみ許可（セキュリティ対策）
            const allowedDomains = [
                'www.jma.go.jp',
                'api.p2pquake.net',
                'earthquake.usgs.gov'
            ];
            
            try {
                const urlObj = new URL(targetUrl);
                if (allowedDomains.includes(urlObj.hostname)) {
                    proxyRequest(targetUrl, req, res);
                } else {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        error: 'Forbidden domain',
                        message: '許可されていないドメインです'
                    }));
                }
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: 'Invalid URL',
                    message: '無効なURLです'
                }));
            }
            return;
        }
        
        // 一般的な外部API
        if (externalAPIs[apiId]) {
            proxyRequest(externalAPIs[apiId], req, res);
            return;
        }
        
        // 重複処理を削除（上記のJMA専用プロキシで処理済み）
        
        // 該当するAPIが見つからない場合
        const safeError = createSafeErrorResponse(
            new Error('APIエンドポイントが見つかりません'),
            { method: req.method, endpoint: apiId }
        );
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(safeError));
        return;
    }
    
    // カスタムAPIエンドポイント
    if (pathname === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'running',
            timestamp: new Date().toISOString(),
            server: 'EarthquakeMonitor v3.3',
            availableAPIs: Object.keys(externalAPIs)
        }));
        return;
    }

    // シャットダウンエンドポイント（ブラウザ UI の「終了」ボタンから呼び出される）
    if (pathname === '/api/shutdown' && req.method === 'POST') {
        // CSRF 対策: Origin ヘッダが許可リストのオリジンと一致するときだけ受理
        // （ブラウザが強制付与し改竄不可。悪意のある外部サイトからの POST を遮断）
        const origin = req.headers.origin;
        if (!origin || !SECURITY_CONFIG.cors.allowedOrigins.includes(origin)) {
            console.warn(`🚫 シャットダウン要求を拒否: origin="${origin || '(なし)'}"`);
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Origin not allowed' }));
            return;
        }
        console.log('🛑 シャットダウン要求を受信しました');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'shutting down' }));
        // レスポンスが確実に送信されるよう遅延してから停止
        setTimeout(() => {
            server.close(() => {
                console.log('✅ サーバー停止完了 (ブラウザ要求)');
                process.exit(0);
            });
            // 応答待ちコネクションがあってもフェイルセーフで終了
            setTimeout(() => process.exit(0), 2000);
        }, 500);
        return;
    }
    
    // 静的ファイル配信
    // Default to index.html
    if (pathname === '/') {
        pathname = '/index.html';
    }
    
    const filePath = path.join(__dirname, pathname);
    const ext = path.extname(filePath);
    const mimeType = mimeTypes[ext] || 'text/plain';
    
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - ファイルが見つかりません</h1>');
            } else {
                // ファイル読み込みエラーの詳細をログに記録（本番では非表示）
                const safeError = createSafeErrorResponse(
                    err,
                    { file: filePath, method: req.method }
                );
                console.error('ファイル読み込みエラー:', safeError);
                
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end('<h1>500 - サーバーエラー</h1>');
            }
        } else {
            let responseData = data;
            let nonce = null;
            
            // HTMLファイルの場合の処理（一時的にnonce生成を無効化）
            if (ext === '.html') {
                // テスト環境ではnonce生成を無効にして、unsafe-inlineを使用
                console.log(`📄 HTMLファイル配信 (${pathname}): nonce無効モード`);
                // nonce = generateNonce(); // 一時的に無効化
            }
            
            // セキュリティヘッダーを設定（nonceを含む）
            setSecurityHeaders(req, res, nonce);
            
            // 静的ファイル配信
            res.writeHead(200, { 
                'Content-Type': mimeType,
                // 追加のセキュリティヘッダー（既に設定済みだが念のため）
                'X-Content-Type-Options': 'nosniff'
            });
            res.end(responseData);
        }
    });
});

findAvailablePort(DEFAULT_PORT, MAX_PORT).then((port) => {
    // 選択されたポートを CORS 許可 origin に動的追加
    const dynamicOrigin = `http://localhost:${port}`;
    if (!SECURITY_CONFIG.cors.allowedOrigins.includes(dynamicOrigin)) {
        SECURITY_CONFIG.cors.allowedOrigins.push(dynamicOrigin);
    }

    server.listen(port, () => {
        if (port !== DEFAULT_PORT) {
            console.log(`ℹ️ デフォルトポート ${DEFAULT_PORT} が使用中のため、ポート ${port} で起動します`);
        }
        console.log(`🌏 地震・津波情報表示システム v3.3 サーバーが起動しました`);
        console.log(`📍 アクセスURL: http://localhost:${port}`);
        console.log(`🔧 メインアプリ: http://localhost:${port}/index.html`);
        console.log(`🧪 音声テスト: http://localhost:${port}/audio-test.html`);
        console.log(`📡 プロキシAPI: http://localhost:${port}/api/proxy/[usgs|emsc|jma|noaa]`);
        console.log(`📊 サーバー状態: http://localhost:${port}/api/status`);
        console.log(`💾 停止するには Ctrl+C もしくはブラウザ UI の「終了」ボタン`);

        // AUTO_OPEN=0 の場合はスキップ（例: node server.js を手動で起動する場合）
        if (process.env.AUTO_OPEN !== '0') {
            const openCmd = process.platform === 'darwin'
                ? `open http://localhost:${port}`
                : process.platform === 'win32'
                ? `start http://localhost:${port}`
                : `xdg-open http://localhost:${port}`;
            exec(openCmd, (err) => {
                if (err) console.warn('⚠️ ブラウザ自動起動失敗:', err.message);
                else console.log('🌐 ブラウザを開きました');
            });
        }
    });
}).catch((err) => {
    console.error('❌ サーバー起動失敗:', err.message);
    console.error(`   ポート ${DEFAULT_PORT}-${MAX_PORT} すべて使用中の可能性があります。`);
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('\n🛑 サーバーを停止しています...');
    server.close(() => {
        console.log('✅ サーバーが正常に停止しました');
        process.exit(0);
    });
});