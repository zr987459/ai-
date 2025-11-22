
export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  details?: any;
}

const LOG_STORAGE_KEY = 'app_system_logs';
const MAX_LOGS = 100;

class LoggerService {
  private logs: LogEntry[] = [];

  constructor() {
    this.loadLogs();
  }

  private loadLogs() {
    try {
      const saved = localStorage.getItem(LOG_STORAGE_KEY);
      if (saved) {
        this.logs = JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load logs", e);
    }
  }

  private saveLogs() {
    try {
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(this.logs));
    } catch (e) {
      console.error("Failed to save logs", e);
    }
  }

  private addLog(level: 'INFO' | 'WARN' | 'ERROR', message: string, details?: any) {
    const entry: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      level,
      message,
      details: details ? JSON.parse(JSON.stringify(details, Object.getOwnPropertyNames(details))) : undefined
    };

    this.logs.unshift(entry); // Add to beginning
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }
    this.saveLogs();
    console.log(`[${level}] ${message}`, details || '');
  }

  info(message: string, details?: any) {
    this.addLog('INFO', message, details);
  }

  warn(message: string, details?: any) {
    this.addLog('WARN', message, details);
  }

  error(message: string, details?: any) {
    this.addLog('ERROR', message, details);
  }

  getLogs() {
    return this.logs;
  }

  clear() {
    this.logs = [];
    this.saveLogs();
  }
}

export const logger = new LoggerService();
