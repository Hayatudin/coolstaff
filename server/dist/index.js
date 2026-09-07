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
    const origin = req.headers.origin;
    if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        return res.status(200).send();
    }
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
// Root route
app.get('/', (req, res) => {
    res.json({ message: 'API is running' });
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
