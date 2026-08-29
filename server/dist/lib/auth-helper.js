"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSession = getSession;
const auth_1 = require("./auth");
const node_1 = require("better-auth/node");
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
async function getSession(req) {
    // Strategy 0: Bearer Token Header (Direct DB Query for Cross-Domain / Third-Party Cookie Bypass)
    try {
        const authHeader = req.headers.authorization || req.headers['authorization'];
        if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7).trim();
            if (token) {
                const rows = await db_1.db
                    .select({
                    session: db_1.session,
                    user: db_1.user,
                })
                    .from(db_1.session)
                    .innerJoin(db_1.user, (0, drizzle_orm_1.eq)(db_1.session.userId, db_1.user.id))
                    .where((0, drizzle_orm_1.eq)(db_1.session.token, token))
                    .limit(1);
                if (rows.length > 0 && rows[0].session.expiresAt > new Date()) {
                    return {
                        session: rows[0].session,
                        user: rows[0].user,
                    };
                }
            }
        }
    }
    catch (err) {
        console.warn('[AUTH-HELPER] Strategy 0 (Bearer token DB query) failed:', err);
    }
    // Strategy 1: Better Auth's official fromNodeHeaders converter
    try {
        const session = await auth_1.auth.api.getSession({
            headers: (0, node_1.fromNodeHeaders)(req.headers),
        });
        if (session)
            return session;
    }
    catch (err) {
        console.warn('[AUTH-HELPER] Strategy 1 (fromNodeHeaders) failed:', err);
    }
    // Strategy 2: Raw Node/Express headers casted as any
    try {
        const session = await auth_1.auth.api.getSession({
            headers: req.headers,
        });
        if (session)
            return session;
    }
    catch (err) {
        console.warn('[AUTH-HELPER] Strategy 2 (raw headers) failed:', err);
    }
    // Strategy 3: Standard Fetch Headers object manual mapping
    try {
        const webHeaders = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
            if (Array.isArray(value)) {
                value.forEach(v => webHeaders.append(key, v));
            }
            else if (value) {
                webHeaders.set(key, value);
            }
        }
        const session = await auth_1.auth.api.getSession({
            headers: webHeaders,
        });
        if (session)
            return session;
    }
    catch (err) {
        console.warn('[AUTH-HELPER] Strategy 3 (manual Headers) failed:', err);
    }
    return null;
}
