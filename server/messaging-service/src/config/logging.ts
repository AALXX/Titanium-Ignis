import fs from 'fs';
import path from 'path';

const LOG_FILE_PATH = '/log/api.log';

const getTimeStamp = (): string => {
    return new Date().toLocaleString();
};

// Check if the log file exists, and if not, create the file and the directory
const ensureLogFileExists = () => {
    const logDir = path.dirname(LOG_FILE_PATH);

    // Check if the directory exists, if not, create it
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    // Check if the file exists, if not, create an empty log file
    if (!fs.existsSync(LOG_FILE_PATH)) {
        fs.writeFileSync(LOG_FILE_PATH, ''); // Create the file
    }
};

const writeToFile = (logMessage: string) => {
    fs.appendFile(LOG_FILE_PATH, logMessage + '\n', (err) => {
        if (err) {
            console.error('Failed to write to log file:', err);
        }
    });
};

const formatLogMessage = (level: string, namespace: string, message: string, object?: any): string => {
    const baseMessage = `[${getTimeStamp()}] [${level}] [${namespace}] ${message}`;
    return object ? `${baseMessage} ${JSON.stringify(object)}` : baseMessage;
};

const log = (level: string, namespace: string, message: string, object?: any) => {
    const logMessage = formatLogMessage(level, namespace, message, object);
    console[level.toLowerCase() as 'log' | 'warn' | 'error' | 'debug'](logMessage);
    writeToFile(logMessage);
};

const info = (namespace: string, message: string, object?: any) => {
    log('INFO', namespace, message, object);
};

const warn = (namespace: string, message: string, object?: any) => {
    log('WARN', namespace, message, object);
};

const error = (namespace: string, message: string, object?: any) => {
    log('ERROR', namespace, message, object);
};

const debug = (namespace: string, message: string, object?: any) => {
    log('DEBUG', namespace, message, object);
};

export default {
    info,
    warn,
    error,
    debug,
    ensureLogFileExists,
};
