/**
 * Simple logging utility
 * 
 * Provides structured logging for development and production.
 * Can be replaced with Pino or Winston for more advanced features.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const colors = {
  info: '\x1b[36m',    // Cyan
  warn: '\x1b[33m',    // Yellow
  error: '\x1b[31m',   // Red
  debug: '\x1b[35m',   // Magenta
  reset: '\x1b[0m',
} as const;

const log = (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const color = colors[level];
  const reset = colors.reset;
  
  const logMessage = `${color}[${timestamp}] [${level.toUpperCase()}]${reset} ${message}`;
  
  if (meta && Object.keys(meta).length > 0) {
    console.log(logMessage, meta);
  } else {
    console.log(logMessage);
  }
};

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta),
};
