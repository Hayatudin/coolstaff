"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
// 1. ULTIMATE CORS FIX - Allow everything correctly with credentials
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    else {
        // Fallback for requests without Origin header (like same-origin or direct)
        // We don't use '*' because it breaks with Credentials: true
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        return res.status(200).send();
    }
    next();
});
app.use((0, cookie_parser_1.default)());
// Better Auth handler — MUST come before body parsers
const auth_1 = require("./lib/auth");
const node_1 = require("better-auth/node");
app.all('/api/auth/*', async (req, res, next) => {
    try {
        return await (0, node_1.toNodeHandler)(auth_1.auth)(req, res);
    }
    catch (err) {
        console.error('🔥 Better Auth Error:', err);
        return res.status(500).json({ error: err?.message || 'Authentication error', details: String(err) });
    }
});
// Body parsers — AFTER auth handler (express.json drains the stream)
app.use(express_1.default.json({ limit: '80mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '80mb' }));
const crypto_1 = require("./lib/crypto");
// Static files
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'public/uploads')));
// UNBLOCKABLE ASSET PROXY (Fixes cPanel CORS issues)
app.get('/api/assets/*', (req, res) => {
    let assetPath = req.params[0] || '';
    if (assetPath.startsWith('ENC-')) {
        assetPath = (0, crypto_1.decryptPath)(assetPath);
    }
    // Strip leading slash to prevent joining issues
    const cleanAssetPath = assetPath.startsWith('/') ? assetPath.substring(1) : assetPath;
    const fullPath = path_1.default.join(process.cwd(), 'public', cleanAssetPath);
    if (fs_1.default.existsSync(fullPath)) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        return res.sendFile(fullPath);
    }
    res.status(404).send('Asset not found');
});
// Routes
const candidates_1 = __importDefault(require("./routes/candidates"));
const brokers_1 = __importDefault(require("./routes/brokers"));
const leaders_1 = __importDefault(require("./routes/leaders"));
const users_1 = __importDefault(require("./routes/users"));
const cv_1 = __importDefault(require("./routes/cv"));
const generated_cvs_1 = __importDefault(require("./routes/generated-cvs"));
const files_1 = __importDefault(require("./routes/files"));
const deployments_1 = __importDefault(require("./routes/deployments"));
const ocr_1 = __importDefault(require("./routes/ocr"));
const extract_1 = __importDefault(require("./routes/extract"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const account_1 = __importDefault(require("./routes/account"));
const search_1 = __importDefault(require("./routes/search"));
const cron_1 = __importDefault(require("./routes/cron"));
const quick_registrations_1 = __importDefault(require("./routes/quick-registrations"));
const invoices_1 = __importDefault(require("./routes/invoices"));
const settings_1 = __importDefault(require("./routes/settings"));
const video_uploads_1 = __importDefault(require("./routes/video-uploads"));
const agency_1 = __importDefault(require("./routes/agency"));
const passports_1 = __importDefault(require("./routes/passports"));
app.use('/api/candidates', candidates_1.default);
app.use('/api/brokers', brokers_1.default);
app.use('/api/leaders', leaders_1.default);
app.use('/api/users', users_1.default);
app.use('/api/cv', cv_1.default);
app.use('/api/generated-cvs', generated_cvs_1.default);
app.use('/api/ocr', ocr_1.default);
app.use('/api/extract', extract_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/account', account_1.default);
app.use('/api/search', search_1.default);
app.use('/api/cron', cron_1.default);
app.use('/api/quick-registrations', quick_registrations_1.default);
app.use('/api/invoices', invoices_1.default);
app.use('/api/settings', settings_1.default);
app.use('/api/video-uploads', video_uploads_1.default);
app.use('/api/files', files_1.default);
app.use('/api/deployments', deployments_1.default);
app.use('/api/agency', agency_1.default);
app.use('/api/passports', passports_1.default);
// Database Debug Endpoint (Direct Browser Diagnostics)
app.get('/api/debug-db', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    const envInfo = {
        HOME: process.env.HOME,
        USER: process.env.USER,
        PWD: process.env.PWD,
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        DATABASE_URL_RAW: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.split('@')[1] || process.env.DATABASE_URL}` : 'not set',
    };
    const isCPanel = process.env.HOME?.includes('coolstou') ||
        process.env.USER === 'coolstou' ||
        process.env.PWD?.includes('coolstou') ||
        process.env.BETTER_AUTH_URL?.includes('coolstaffagency.com');
    let dbUrlSelected = process.env.DATABASE_URL || '';
    if (isCPanel) {
        dbUrlSelected = 'mysql://coolstou_coolstaff:***@127.0.0.1:3306/coolstou_db';
    }
    else {
        dbUrlSelected = dbUrlSelected ? `${dbUrlSelected.split('@')[1] || dbUrlSelected}` : 'none';
    }
    const diagnostics = {
        status: 'checking',
        isCPanelDetected: !!isCPanel,
        dbUrlSelected: dbUrlSelected.replace(/:[^@:]*@/, ':***@'), // extra mask safety
        environment: {
            ...envInfo,
            DATABASE_URL_RAW: envInfo.DATABASE_URL_RAW.replace(/:[^@:]*@/, ':***@'),
        },
    };
    try {
        const { pool, db, user: userTable, candidate: candidateTable } = await Promise.resolve().then(() => __importStar(require('./db')));
        const { count } = await Promise.resolve().then(() => __importStar(require('drizzle-orm')));
        // Attempt database query with a 3-second timeout so it doesn't hang
        const dbPromise = (async () => {
            const [rawResult] = await pool.query('SELECT 1 + 1 AS result');
            const userCountRes = await db.select({ value: count() }).from(userTable);
            const candCountRes = await db.select({ value: count() }).from(candidateTable);
            // Diagnose tables and columns
            let tables = [];
            try {
                const [tRows] = await pool.query('SHOW TABLES');
                tables = tRows;
            }
            catch (e) {
                tables = [{ error: e.message }];
            }
            let leaderColumns = [];
            try {
                const [lRows] = await pool.query('SHOW COLUMNS FROM Leader');
                leaderColumns = lRows;
            }
            catch (e) {
                leaderColumns = [{ error: e.message }];
            }
            let brokerColumns = [];
            try {
                const [bRows] = await pool.query('SHOW COLUMNS FROM Broker');
                brokerColumns = bRows;
            }
            catch (e) {
                brokerColumns = [{ error: e.message }];
            }
            return {
                rawResult,
                userCount: userCountRes[0]?.value || 0,
                candidateCount: candCountRes[0]?.value || 0,
                tables,
                leaderColumns,
                brokerColumns
            };
        })();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Database query timed out (3000ms exceeded). Check if server firewall blocks port.')), 3000));
        const result = await Promise.race([dbPromise, timeoutPromise]);
        diagnostics.status = 'success';
        diagnostics.message = 'Database is CONNECTED and responding!';
        diagnostics.queryResult = result;
    }
    catch (error) {
        diagnostics.status = 'error';
        diagnostics.message = 'Database diagnostic failed!';
        diagnostics.error = error.message || String(error);
    }
    // Scan typical MySQL sockets on cPanel to help diagnose connections
    const socketPaths = [
        '/var/lib/mysql/mysql.sock',
        '/var/run/mysqld/mysqld.sock',
        '/tmp/mysql.sock',
        '/tmp/mysql.sock.lock',
        '/var/run/mysql/mysql.sock',
    ];
    const socketCheck = {};
    socketPaths.forEach(p => {
        try {
            socketCheck[p] = fs_1.default.existsSync(p);
        }
        catch {
            socketCheck[p] = false;
        }
    });
    diagnostics.socketCheck = socketCheck;
    // Run low-level network connectivity tests using built-in 'net' module
    const net = await Promise.resolve().then(() => __importStar(require('net')));
    const checkPort = (host, port) => {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(1500);
            socket.connect(port, host, () => {
                socket.destroy();
                resolve({ open: true });
            });
            socket.on('error', (e) => {
                socket.destroy();
                resolve({ open: false, error: e.message });
            });
            socket.on('timeout', () => {
                socket.destroy();
                resolve({ open: false, error: 'Timeout' });
            });
        });
    };
    const checkUnix = (path) => {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(1500);
            socket.connect(path, () => {
                socket.destroy();
                resolve({ open: true });
            });
            socket.on('error', (e) => {
                socket.destroy();
                resolve({ open: false, error: e.message });
            });
            socket.on('timeout', () => {
                socket.destroy();
                resolve({ open: false, error: 'Timeout' });
            });
        });
    };
    try {
        diagnostics.netConnectTest = {
            localhost_3306: await checkPort('localhost', 3306),
            ip_127_0_0_1_3306: await checkPort('127.0.0.1', 3306),
            unix_socket_var_lib: await checkUnix('/var/lib/mysql/mysql.sock'),
            unix_socket_tmp: await checkUnix('/tmp/mysql.sock'),
        };
    }
    catch (netErr) {
        diagnostics.netConnectTestError = netErr.message || String(netErr);
    }
    res.json(diagnostics);
});
// Root route
app.get('/', (req, res) => {
    res.json({ message: 'COOLSTAFF API is running' });
});
// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err);
    // Ensure CORS headers are present even on error
    const origin = req.headers.origin;
    if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message || 'Unknown error',
        code: err.code
    });
});
// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}`);
    // 1. Run database self-healing checks to inject missing tables/columns
    try {
        const { ensureDatabaseSchema } = await Promise.resolve().then(() => __importStar(require('./lib/db-healing')));
        await ensureDatabaseSchema();
    }
    catch (dbErr) {
        console.error('❌ Failed to run database self-healing check on startup:', dbErr);
    }
});
