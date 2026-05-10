/**
 * Standard PrismaClient for Better Auth.
 * We use a separate instance for authentication to ensure clean separation
 * and consistent database access across the app.
 */
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prismaAuthGlobal: PrismaClient | undefined;
}

const prismaAuth: PrismaClient =
  globalThis.prismaAuthGlobal ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaAuthGlobal = prismaAuth;
}

export default prismaAuth;
