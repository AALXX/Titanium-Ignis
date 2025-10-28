import bcrypt from 'bcrypt';
import crypto from 'crypto';
import logging from '../config/logging';
import { connect, query } from '../config/postgresql';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { Connection, Pool, PoolClient } from 'pg';
import { redisClient } from '../config/redis';

//* /////////////////////////////
//*      Account related       //
//* /////////////////////////////

const allChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
const charTypes = [
    { chars: 'abcdefghijklmnopqrstuvwxyz', name: 'lowercase' },
    { chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', name: 'uppercase' },
    { chars: '0123456789', name: 'number' },
    { chars: '!@#$%^&*()_+-=[]{}|;:,.<>?', name: 'symbol' },
];


/**
 ** creates a token
 * @return {string}
 */
const CreateToken = (): string => {
    const secretExt = new Date().getTime().toString();

    const jwtSecretKey = `${process.env.ACCOUNT_SECRET}` + secretExt;

    const userprivateToken = jwt.sign({}, jwtSecretKey);

    return userprivateToken;
};



/**
 * Retrieves the user's private token from their public token.
 *
 * @param {PoolClient} connection - The database connection pool.
 * @param {string} sessionToken - The user's public token.
 * @return {string | null} The user's private token, or `null` if not found or an error occurred.
 */
const getUserPrivateTokenFromSessionToken = async (connection: PoolClient, sessionToken: string): Promise<string | null> => {
    const NAMESPACE = 'GET_USER_PRIVATE_TOKEN_FUNC';

    if (!sessionToken || sessionToken === 'undefined') {
        return null;
    }

    if (!connection) {
        return null;
    }

    const queryString = `
        SELECT u.UserPrivateToken
        FROM account_sessions s
        INNER JOIN users u ON s.userID = u.id
        WHERE s.userSessionToken = $1
        LIMIT 1;
    `;

    try {
        const result = await query(connection, queryString, [sessionToken]);
        if (result.length > 0) {
            return result[0].userprivatetoken;
        } else {
            return null;
        }
    } catch (error: any) {
        connection?.release();
        logging.error(NAMESPACE, error.message, error);
        return null;
    }
};

/**
 * Retrieves the user's private token from their public token.
 *
 * @param {PoolClient} connection - The database connection pool.
 * @param {string} userToken - The user's public token.
 * @return {string} The user's private token, or `null` if not found or an error occurred.
 */
const getUserPrivateTokenFromPublicToken = async (connection: PoolClient, userToken: string): Promise<string | null> => {
    const NAMESPACE = 'GET_USER_PRIVATE_TOKEN_FUNC';
    const QueryString = `SELECT UserPrivateToken FROM users WHERE UserPublicToken='${userToken}';`;

    try {
        if (userToken === 'undefined') {
            return null;
        }

        if (connection == null) {
            return null;
        }

        const userData = await query(connection, QueryString);
        if (Object.keys(userData).length != 0) {
            return userData[0].userprivatetoken;
        } else {
            return null;
        }
    } catch (error: any) {
        connection?.release();
        logging.error(NAMESPACE, error.message, error);
        return null;
    }
};

const getUserPublicTokenFromPrivateToken = async (connection: PoolClient, userPrivateToken: string): Promise<string | null> => {
    const NAMESPACE = 'GET_USER_PRIVATE_TOKEN_FUNC';
    const QueryString = `SELECT UserPublicToken FROM users WHERE UserPrivateToken='${userPrivateToken}';`;

    try {
        if (userPrivateToken === 'undefined') {
            connection.release();

            return null;
        }

        if (connection == null) {
            return null;
        }

        const resp = await query(connection, QueryString);
        if (Object.keys(resp).length != 0) {
            return resp[0].userpublictoken;
        } else {
            return null;
        }
    } catch (error: any) {
        connection?.release();
        logging.error(NAMESPACE, error.message, error);
        return null;
    }
};

const checkProjectExists = async (connection: PoolClient, ProjectToken: string): Promise<boolean> => {
    const projectCheckQuery = `
        SELECT ProjectToken 
        FROM projects 
        WHERE ProjectToken = $1
    `;
    const projectResult = await query(connection, projectCheckQuery, [ProjectToken]);
    return projectResult && projectResult.length > 0;
};



export default {
    CreateToken,
    checkProjectExists,
    getUserPublicTokenFromPrivateToken,
    getUserPrivateTokenFromPublicToken,
    getUserPrivateTokenFromSessionToken,

};
