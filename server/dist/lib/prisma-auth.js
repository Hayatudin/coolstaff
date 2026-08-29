"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prismaAuth = globalThis.prismaAuthGlobal ?? new client_1.PrismaClient();
if (process.env.NODE_ENV !== 'production') {
    globalThis.prismaAuthGlobal = prismaAuth;
}
exports.default = prismaAuth;
