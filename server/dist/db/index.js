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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = exports.db = void 0;
const mysql2_1 = require("drizzle-orm/mysql2");
const promise_1 = __importDefault(require("mysql2/promise"));
const schema = __importStar(require("./schema"));
const getDatabaseConfig = () => {
    let dbUrl = process.env.DATABASE_URL;
    // FAIL-SAFE: Automatically swap to the local cPanel MySQL database
    // if running in the production cPanel environment to prevent firewall hangs/timeouts.
    const isCPanel = process.platform !== 'win32' &&
        (process.env.IS_CPANEL === 'true' ||
            process.env.HOME?.includes('coolstou') ||
            process.env.USER === 'coolstou' ||
            process.env.PWD?.includes('coolstou'));
    if (isCPanel && (!dbUrl || dbUrl.includes('aivencloud.com') || dbUrl.includes('mysql.sock'))) {
        console.log('🤖 Auto-detect: Running on cPanel production. Swapping to local TCP database connection...');
        dbUrl = 'mysql://coolstou_coolstaff:%40Cool132435@127.0.0.1:3306/coolstou_db';
    }
    const rawUrl = dbUrl || 'mysql://root:password@127.0.0.1:3306/daera';
    // Base options for maximum resilience, preventing socket hangs and pool exhaustion
    const baseOptions = {
        waitForConnections: true,
        connectionLimit: 25,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        maxIdle: 20,
        idleTimeout: 60000,
        connectTimeout: 20000,
    };
    try {
        const parsed = new URL(rawUrl);
        const host = parsed.hostname;
        const port = parsed.port ? parseInt(parsed.port, 10) : 3306;
        const user = decodeURIComponent(parsed.username || '');
        const password = decodeURIComponent(parsed.password || '');
        const database = parsed.pathname ? parsed.pathname.replace(/^\//, '') : '';
        // If on cPanel or connecting to localhost, strip SSL to avoid self-signed / rejectUnauthorized crashes
        const isLocalhost = host === 'localhost' || host === '127.0.0.1';
        let sslConfig = undefined;
        if (!isCPanel && !isLocalhost && (rawUrl.includes('ssl=') || rawUrl.includes('aivencloud.com'))) {
            sslConfig = { rejectUnauthorized: false };
        }
        const config = {
            ...baseOptions,
            host,
            port,
            user,
            password,
            database,
            ssl: sslConfig,
        };
        // Unix socket fallback on cPanel if TCP port 3306 is blocked or socket is preferred
        const cpanelSocketPath = '/var/lib/mysql/mysql.sock';
        if (isCPanel && process.env.USE_UNIX_SOCKET === 'true') {
            config.socketPath = cpanelSocketPath;
            delete config.host;
            delete config.port;
        }
        return config;
    }
    catch (err) {
        console.warn('[DB] Failed to parse DATABASE_URL as URL. Using raw string with pool options.');
        return {
            uri: rawUrl,
            ...baseOptions,
        };
    }
};
const poolConnection = promise_1.default.createPool(getDatabaseConfig());
exports.db = (0, mysql2_1.drizzle)(poolConnection, { schema, mode: 'default' });
exports.pool = poolConnection;
__exportStar(require("./schema"), exports);
exports.default = exports.db;
