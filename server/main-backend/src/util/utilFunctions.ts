import bcrypt from 'bcrypt';
import crypto from 'crypto';
import logging from '../config/logging';
import { connect, query } from '../config/postgresql';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { Connection, Pool, PoolClient } from 'pg';

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

const generateSecurePassword = (length = 16) => {
    const password = [];
    const usedTypes = new Set();

    // Ensure at least one character from each type
    for (const type of charTypes) {
        const char = type.chars[crypto.randomInt(type.chars.length)];
        password.push(char);
        usedTypes.add(type.name);
    }

    // Fill the rest with random characters
    while (password.length < length) {
        const char = allChars[crypto.randomInt(allChars.length)];
        password.push(char);
    }

    // Shuffle the password
    for (let i = password.length - 1; i > 0; i--) {
        const j = crypto.randomInt(i + 1);
        [password[i], password[j]] = [password[j], password[i]];
    }

    return password.join('');
};

/**
 ** Hash the password inputed by user
 * @param {string} password
 */
const HashPassword = async (password: string) => {
    const NAMESPACE = 'HASH_PASSWORD_FUNCTION';

    try {
        // Generate a salt
        const salt = await bcrypt.genSalt(11);

        // Hash password
        return await bcrypt.hash(password, salt);
    } catch (error) {
        logging.error(NAMESPACE, error as string);
    }

    // Return null if error
    return null;
};

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

const CreateSesionToken = (): string => {
    // const secretExt = new Date().getTime().toString();

    const jwtSecretKey = `${process.env.ACCOUNT_SECRET}`;

    const userprivateToken = jwt.sign({}, jwtSecretKey, { expiresIn: '1d' });

    return userprivateToken;
};

/**
 * Checks if a given email address exists in the users table.
 *
 * @param {PoolClient} connecttion - The database connection pool.
 * @param {string} userEmail - The email address to check.
 * @return {boolean} `true` if the email address exists, `false` otherwise.
 */
const checkEmailExists = async (connection: PoolClient, userEmail: string): Promise<boolean> => {
    const NAMESPACE = 'CHECK_EMAIL_EXISTS_FUNC';
    const QueryString = `SELECT 1 FROM users WHERE UserEmail = $1 LIMIT 1;`;

    try {
        if (userEmail === 'undefined' || userEmail === '') {
            return false;
        }

        if (connection == null) {
            return false;
        }

        const Response = await query(connection, QueryString, [userEmail]);
        const userData = JSON.parse(JSON.stringify(Response));

        if (userData.length > 0) {
            return true;
        } else {
            return false;
        }
    } catch (error: any) {
        connection?.release();
        logging.error(NAMESPACE, error.message, error);
        return false;
    }
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
    const QueryString = `SELECT UserPrivateToken FROM users WHERE UserSessionToken='${sessionToken}';`;

    try {
        if (sessionToken === 'undefined') {
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
}

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

        const Response = await query(connection, QueryString);
        const userData = JSON.parse(JSON.stringify(Response));
        if (Object.keys(userData).length != 0) {
            return userData[0].UserPrivateToken;
        } else {
            return null;
        }
    } catch (error: any) {
        connection?.release();
        logging.error(NAMESPACE, error.message, error);
        return null;
    }
};

const getUserEmailFromPrivateToken = async (connection: PoolClient, userPrivateToken: string): Promise<string | null> => {
    const NAMESPACE = 'GET_USER_EMAIL_FUNC';
    const QueryString = `SELECT UserEmail FROM users WHERE UserPrivateToken='${userPrivateToken}';`;

    try {
        if (userPrivateToken === 'undefined') {
            return null;
        }

        if (connection == null) {
            return null;
        }

        const userData = await query(connection!, QueryString);
        if (Object.keys(userData).length != 0) {
            return userData[0].useremail;
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


const RemoveDirectory = (folderPath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        fs.readdir(folderPath, (err, files) => {
            if (err) {
                return reject(err);
            }

            // Iterate over all files and subdirectories
            Promise.all(
                files.map((file) => {
                    const currentPath = path.join(folderPath, file);

                    return new Promise<void>((resolve, reject) => {
                        fs.lstat(currentPath, (err, stats) => {
                            if (err) {
                                return reject(err);
                            }

                            if (stats.isDirectory()) {
                                // Recursively delete subdirectory
                                RemoveDirectory(currentPath).then(resolve).catch(reject);
                            } else {
                                // Delete file
                                fs.unlink(currentPath, (err) => {
                                    if (err) {
                                        return reject(err);
                                    }
                                    resolve();
                                });
                            }
                        });
                    });
                }),
            )
                .then(() => {
                    // Delete the now-empty folder
                    fs.rmdir(folderPath, (err) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve();
                    });
                })
                .catch(reject);
        });
    });
};

export default {
    HashPassword,
    generateSecurePassword,
    checkEmailExists,
    CreateToken,
    CreateSesionToken,
    getUserEmailFromPrivateToken,
    getUserPublicTokenFromPrivateToken,
    getUserPrivateTokenFromPublicToken,
    getUserPrivateTokenFromSessionToken,
    RemoveDirectory,
};
