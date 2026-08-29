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
exports.auth = void 0;
const better_auth_1 = require("better-auth");
const drizzle_1 = require("better-auth/adapters/drizzle");
const db_1 = __importDefault(require("../db"));
const schema = __importStar(require("../db/schema"));
const isProduction = process.env.NODE_ENV === 'production' ||
    process.env.BETTER_AUTH_URL?.includes('coolstaffagency.com') ||
    process.env.HOME?.includes('coolstou') ||
    process.env.USER === 'coolstou';
exports.auth = (0, better_auth_1.betterAuth)({
    secret: process.env.BETTER_AUTH_SECRET || '74RzhyeAPZVictmFaCAA/1TPEkfdE+469xOQtWgrPbI=',
    baseURL: process.env.BETTER_AUTH_URL || 'https://api.coolstaffagency.com',
    database: (0, drizzle_1.drizzleAdapter)(db_1.default, {
        provider: 'mysql',
        schema,
    }),
    emailAndPassword: {
        enabled: true,
        minPasswordLength: 6,
    },
    session: {
        expiresIn: 18000, // 5 hours session lifetime
        updateAge: 3600, // refresh session after 1 hour of activity
        cookieCache: {
            enabled: true,
            maxAge: 3600, // 1 hour client-side caching
        },
    },
    trustedOrigins: [
        'http://localhost:3000',
        'https://coolstaffagency.com',
        'https://www.coolstaffagency.com',
        'https://coolstaffagencyyy.vercel.app',
        'https://daera-agency.vercel.app',
    ],
    advanced: {
        basePath: '/api/auth',
        disableCSRFCheck: true,
        useSecureCookies: isProduction,
        defaultCookieAttributes: {
            sameSite: isProduction ? "none" : "lax",
            secure: isProduction,
        },
    },
    user: {
        additionalFields: {
            role: {
                type: 'string',
                defaultValue: 'user',
            },
            agency: {
                type: 'string',
                required: false,
            },
            majorAgency: {
                type: 'string',
                required: false,
            },
        },
    },
});
