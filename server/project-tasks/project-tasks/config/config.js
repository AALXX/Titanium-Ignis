"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
//* MySql Config
const POSTGRESQL_HOST = process.env.POSTGRESQL_HOST || '0.0.0.0';
const POSTGRESQL_DATABASE = process.env.POSTGRESQL_DATABASE || 'app_db';
const POSTGRESQL_USER = process.env.POSTGRESQL_USER || 'root';
const POSTGRESQL_PASSWORD = process.env.POSTGRESQL_PASSWORD || 'root';
const POSTGRESQL = {
    host: POSTGRESQL_HOST,
    user: POSTGRESQL_USER,
    password: POSTGRESQL_PASSWORD,
    database: POSTGRESQL_DATABASE,
};
//* API config
const SERVER_HSOTNAME = process.env.SERVER_HSOTNAME || 'localhost';
const SERVER_PORT = process.env.PORT || 7070;
const SERVER = {
    hostname: SERVER_HSOTNAME,
    port: SERVER_PORT,
};
const config = {
    pg: POSTGRESQL,
    server: SERVER,
};
exports.default = config;
