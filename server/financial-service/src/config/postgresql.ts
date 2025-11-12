import { Pool, PoolClient } from 'pg';
import config from './config';
import logging from './logging';
import express from 'express';

interface CustomRequest extends express.Request {
    pool?: Pool;
    userRole?: any;
}

/**
 * Creates a PostgreSQL connection pool with the specified configuration.
 *
 * @return {Pool} A PostgreSQL connection pool instance.
 */
const createPool = () => {
    const pool = new Pool({
        max: 10, // Adjust the connection limit as needed
        user: config.pg.user,
        password: config.pg.password,
        host: config.pg.host,
        database: config.pg.database,
    });

    // Optional: Handle connection errors
    pool.on('error', (err) => {
        logging.error('PostgreSQL Pool Error:', err.message);
    });

    return pool;
};

/**
 * Executes a SQL query against a PostgreSQL database using the provided client and returns the result rows.
 *
 * @param {PoolClient} client - The PostgreSQL client to use for the query.
 * @param {queryString} queryString - The SQL query string to execute.
 * @param {any[]} values - Optional array of values to substitute into the query string.
 * @return {Promise<any>} A Promise that resolves to the rows returned by the query.
 * @throws An error if the query fails to execute.
 */
const query = async (client: PoolClient, queryString: string, values?: any[]): Promise<any> => {
    const NAMESPACE = 'PG_QUERY_FUNC';
    try {
        const result = await client.query(queryString, values);
        return result.rows;
    } catch (error: any) {
        logging.error(NAMESPACE, error.message);
        throw error;
    }
};

/**
 * Connects to the PostgreSQL database using the provided pool.
 * @param {Pool} pool - The PostgreSQL connection pool to use for the connection.
 * @return {PoolClient | null} A PostgreSQL client if successful, or `null` if an error occurs.
 */
const connect = async (pool: Pool) => {
    try {
        // Get a connection from the pool
        return await pool.connect();
    } catch (error: any) {
        logging.error('PG_CONNECT', error.message);
        return null;
    }
};

export { query, createPool, connect, CustomRequest };
