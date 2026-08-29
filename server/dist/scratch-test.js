"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("./lib/auth");
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.post('/test', async (req, res) => {
    let registeredById = req.body.registeredById || null;
    console.log("From body:", registeredById);
    try {
        const { fromNodeHeaders } = require('better-auth/node');
        const session = await auth_1.auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });
        console.log("Session:", session);
        if (session?.user?.id) {
            registeredById = session.user.id;
        }
    }
    catch (err) {
        console.error("Session error:", err);
    }
    res.json({ registeredById });
});
app.listen(4001, () => console.log('Test server on 4001'));
