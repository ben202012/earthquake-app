const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = 8080;

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

// プロキシ関数（リダイレクト対応版）
function proxyRequest(targetUrl, req, res, redirectCount = 0) {
    const maxRedirects = 5;
    
    if (redirectCount > maxRedirects) {
        console.error(`❌ 最大リダイレクト数を超過: ${targetUrl}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            error: 'Too many redirects', 
            url: targetUrl 
        }));
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
        
        // CORS ヘッダーを追加
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: 'Response read error', 
                    message: err.message 
                }));
            }
        });
    });
    
    proxyReq.on('error', (err) => {
        console.error(`❌ プロキシエラー: ${err.message} - ${targetUrl}`);
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: 'Proxy request failed', 
                message: err.message,
                url: targetUrl 
            }));
        }
    });
    
    proxyReq.setTimeout(30000, () => {
        console.error(`❌ プロキシタイムアウト: ${targetUrl}`);
        proxyReq.destroy();
        if (!res.headersSent) {
            res.writeHead(504, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: 'Proxy timeout', 
                url: targetUrl 
            }));
        }
    });
    
    proxyReq.end();
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;
    
    // CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // API プロキシエンドポイント
    if (pathname.startsWith('/api/proxy/')) {
        const apiId = pathname.replace('/api/proxy/', '');
        
        if (externalAPIs[apiId]) {
            proxyRequest(externalAPIs[apiId], req, res);
            return;
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'API endpoint not found', apiId }));
            return;
        }
    }
    
    // カスタムAPIエンドポイント
    if (pathname === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'running',
            timestamp: new Date().toISOString(),
            server: 'EarthquakeMonitor v3.0',
            availableAPIs: Object.keys(externalAPIs)
        }));
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
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end('<h1>500 - Internal Server Error</h1>');
            }
        } else {
            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(data);
        }
    });
});

server.listen(port, () => {
    console.log(`🌏 地震監視システム v3.0 サーバーが起動しました`);
    console.log(`📍 アクセスURL: http://localhost:${port}`);
    console.log(`🔧 メインアプリ: http://localhost:${port}/index.html`);
    console.log(`🧪 音声テスト: http://localhost:${port}/audio-test.html`);
    console.log(`📡 プロキシAPI: http://localhost:${port}/api/proxy/[usgs|emsc|jma|noaa]`);
    console.log(`📊 サーバー状態: http://localhost:${port}/api/status`);
    console.log(`💾 停止するには Ctrl+C を押してください`);
});

process.on('SIGINT', () => {
    console.log('\n🛑 サーバーを停止しています...');
    server.close(() => {
        console.log('✅ サーバーが正常に停止しました');
        process.exit(0);
    });
});