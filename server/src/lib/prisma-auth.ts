import { PrismaClient } from '@prisma/client';

declare global {
  var prismaAuthGlobal: PrismaClient | undefined;
}

const prismaAuth: PrismaClient =
  globalThis.prismaAuthGlobal ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaAuthGlobal = prismaAuth;
}

export default prismaAuth;
