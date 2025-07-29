"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const LOG_FILE_PATH = path_1.default.join(process.cwd(), '/log/api.log');
const getTimeStamp = () => {
    return new Date().toLocaleString();
};
// Check if the log file exists, and if not, create the file and the directory
const ensureLogFileExists = () => {
    const logDir = path_1.default.dirname(LOG_FILE_PATH);
    // Check if the directory exists, if not, create it
    if (!fs_1.default.existsSync(logDir)) {
        fs_1.default.mkdirSync(logDir, { recursive: true });
    }
    // Check if the file exists, if not, create an empty log file
    if (!fs_1.default.existsSync(LOG_FILE_PATH)) {
        fs_1.default.writeFileSync(LOG_FILE_PATH, ''); // Create the file
    }
};
const writeToFile = (logMessage) => {
    fs_1.default.appendFile(LOG_FILE_PATH, logMessage + '\n', (err) => {
        if (err) {
            console.error('Failed to write to log file:', err);
        }
    });
};
const formatLogMessage = (level, namespace, message, object) => {
    const baseMessage = `[${getTimeStamp()}] [${level}] [${namespace}] ${message}`;
    return object ? `${baseMessage} ${JSON.stringify(object)}` : baseMessage;
};
const log = (level, namespace, message, object) => {
    const logMessage = formatLogMessage(level, namespace, message, object);
    console[level.toLowerCase()](logMessage);
    writeToFile(logMessage);
};
const info = (namespace, message, object) => {
    log('INFO', namespace, message, object);
};
const warn = (namespace, message, object) => {
    log('WARN', namespace, message, object);
};
const error = (namespace, message, object) => {
    log('ERROR', namespace, message, object);
};
const debug = (namespace, message, object) => {
    log('DEBUG', namespace, message, object);
};
exports.default = {
    info,
    warn,
    error,
    debug,
    ensureLogFileExists,
};
