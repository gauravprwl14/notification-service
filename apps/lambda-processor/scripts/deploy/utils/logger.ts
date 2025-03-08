/**
 * @fileoverview Logger utility for deployment process
 * Provides consistent logging functionality across the deployment process
 */

import chalk from 'chalk';

/**
 * Log levels with their corresponding colors
 */
const LOG_LEVELS = {
    INFO: chalk.green,
    WARN: chalk.yellow,
    ERROR: chalk.red,
    DEBUG: chalk.blue
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

/**
 * Logger class for handling all logging operations
 */
class Logger {
    /**
     * Formats a log message with timestamp and level
     * @param level - Log level
     * @param message - Message to log
     * @param args - Additional arguments to log
     * @returns Formatted log message
     */
    private format(level: LogLevel, message: string, ...args: any[]): string {
        const timestamp = new Date().toISOString();
        const colorFn = LOG_LEVELS[level];
        const levelStr = colorFn(`[${level}]`);
        const argsStr = args.length ? ' ' + args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
        ).join(' ') : '';
        
        return `${levelStr} ${timestamp} - ${message}${argsStr}`;
    }

    /**
     * Logs an info message
     * @param message - Message to log
     * @param args - Additional arguments to log
     */
    info(message: string, ...args: any[]): void {
        console.log(this.format('INFO', message, ...args));
    }

    /**
     * Logs a warning message
     * @param message - Message to log
     * @param args - Additional arguments to log
     */
    warn(message: string, ...args: any[]): void {
        console.warn(this.format('WARN', message, ...args));
    }

    /**
     * Logs an error message
     * @param message - Message to log
     * @param args - Additional arguments to log
     */
    error(message: string, ...args: any[]): void {
        console.error(this.format('ERROR', message, ...args));
    }

    /**
     * Logs a debug message
     * @param message - Message to log
     * @param args - Additional arguments to log
     */
    debug(message: string, ...args: any[]): void {
        if (process.env.LOG_LEVEL === 'debug') {
            console.debug(this.format('DEBUG', message, ...args));
        }
    }
}

export const logger = new Logger(); 