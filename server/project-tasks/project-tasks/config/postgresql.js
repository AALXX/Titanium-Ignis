"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connect = exports.createPool = exports.query = void 0;
const pg_1 = require("pg");
const config_1 = __importDefault(require("./config"));
const logging_1 = __importDefault(require("./logging"));
/**
 * Creates a PostgreSQL connection pool with the specified configuration.
 *
 * @return {Pool} A PostgreSQL connection pool instance.
 */
const createPool = () => {
    const pool = new pg_1.Pool({
        max: 10, // Adjust the connection limit as needed
        user: config_1.default.pg.user,
        password: config_1.default.pg.password,
        host: config_1.default.pg.host,
        database: config_1.default.pg.database,
    });
    // Optional: Handle connection errors
    pool.on('error', (err) => {
        logging_1.default.error('PostgreSQL Pool Error:', err.message);
    });
    return pool;
};
exports.createPool = createPool;
/**
 * Executes a SQL query against a PostgreSQL database using the provided client and returns the result rows.
 *
 * @param {PoolClient} client - The PostgreSQL client to use for the query.
 * @param {queryString} queryString - The SQL query string to execute.
 * @param {any[]} values - Optional array of values to substitute into the query string.
 * @return {Promise<any>} A Promise that resolves to the rows returned by the query.
 * @throws An error if the query fails to execute.
 */
const query = async (client, queryString, values) => {
    const NAMESPACE = 'PG_QUERY_FUNC';
    try {
        const result = await client.query(queryString, values);
        return result.rows;
    }
    catch (error) {
        logging_1.default.error(NAMESPACE, error.message);
        throw error;
    }
};
exports.query = query;
/**
 * Connects to the PostgreSQL database using the provided pool.
 * @param {Pool} pool - The PostgreSQL connection pool to use for the connection.
 * @return {PoolClient | null} A PostgreSQL client if successful, or `null` if an error occurs.
 */
const connect = async (pool) => {
    try {
        // Get a connection from the pool
        return await pool.connect();
    }
    catch (error) {
        logging_1.default.error('PG_CONNECT', error.message);
        return null;
    }
};
exports.connect = connect;
