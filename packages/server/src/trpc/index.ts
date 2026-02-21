/**
 * tRPC Initialization
 * 
 * Core tRPC setup and type-safe exports.
 */

import { initTRPC } from '@trpc/server';
import { Context } from './context.js';

/**
 * Initialize tRPC with context type
 */
const t = initTRPC.context<Context>().create();

/**
 * Export reusable pieces
 */
export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
