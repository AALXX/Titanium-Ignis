import { Pool, PoolClient } from 'pg'
import logging from '../config/logging'
import { connect, query } from '../config/postgresql'

const checkForPermissions = async (connection: PoolClient, projectToken: string, userSessionToken: string, resource: string, action: string): Promise<boolean> => {
    try {
        const userPrivateToken = await getUserPrivateTokenFromSessionToken(connection, userSessionToken)

        if (!userPrivateToken || !projectToken) {
            return false
        }

        const permissionQuery = `
            WITH user_role AS (
                SELECT r.id, r.level, r.name
                FROM projects_team_members ptm
                JOIN roles r ON r.id = ptm.role_id
                WHERE ptm.userprivatetoken = $1
                  AND ptm.projecttoken = $2
                  AND ptm.is_active = true
                ORDER BY r.level DESC
                LIMIT 1
            ),
            required_permission AS (
                SELECT p.id as permission_id
                FROM permissions p
                JOIN resources res ON res.id = p.resource_id
                JOIN actions a ON a.id = p.action_id
                WHERE res.name = $3
                  AND a.name = $4
            ),
            user_permissions AS (
                SELECT p.id as permission_id
                FROM user_role ur
                JOIN role_permissions rp ON rp.role_id = ur.id
                JOIN permissions p ON p.id = rp.permission_id
                JOIN resources res ON res.id = p.resource_id
                JOIN actions a ON a.id = p.action_id
                WHERE res.name = $3
                  AND a.name = $4
            ),
            inherited_permissions AS (
                SELECT p.id as permission_id
                FROM user_role ur
                JOIN role_inheritance ri ON ri.child_role_id = ur.id
                JOIN role_permissions rp ON rp.role_id = ri.parent_role_id
                JOIN permissions p ON p.id = rp.permission_id
                JOIN resources res ON res.id = p.resource_id
                JOIN actions a ON a.id = p.action_id
                WHERE res.name = $3
                  AND a.name = $4
            )
            SELECT 
                CASE 
                    WHEN ur.name = 'PROJECT_OWNER' THEN true
                    WHEN ur.name = 'GUEST' AND $4 != 'read' THEN false
                    WHEN up.permission_id IS NOT NULL THEN true
                    WHEN ip.permission_id IS NOT NULL THEN true
                    ELSE false
                END as has_permission
            FROM user_role ur
            LEFT JOIN required_permission rp ON true
            LEFT JOIN user_permissions up ON up.permission_id = rp.permission_id
            LEFT JOIN inherited_permissions ip ON ip.permission_id = rp.permission_id
            LIMIT 1;
        `

        const result = await query(connection, permissionQuery, [userPrivateToken, projectToken, resource, action])

        console.log('Permission Check Result:', result)

        return result?.[0]?.has_permission === true
    } catch (error: any) {
        logging.error('CHECK_FOR_PERMISSIONS', error.message)
        return false
    }
}

/**
 * Retrieves the user's private token from their public token.
 *
 * @param {PoolClient} connection - The database connection pool.
 * @param {string} sessionToken - The user's public token.
 * @return {string | null} The user's private token, or `null` if not found or an error occurred.
 */
const getUserPrivateTokenFromSessionToken = async (connection: PoolClient, sessionToken: string): Promise<string | null> => {
    const NAMESPACE = 'GET_USER_PRIVATE_TOKEN_FUNC'

    if (!sessionToken || sessionToken === 'undefined') {
        return null
    }

    if (!connection) {
        return null
    }

    const queryString = `
        SELECT u.UserPrivateToken
        FROM account_sessions s
        INNER JOIN users u ON s.userID = u.id
        WHERE s.userSessionToken = $1
        LIMIT 1;
    `

    try {
        const result = await query(connection, queryString, [sessionToken])
        if (result.length > 0) {
            return result[0].userprivatetoken
        } else {
            return null
        }
    } catch (error: any) {
        connection?.release()
        logging.error(NAMESPACE, error.message, error)
        return null
    }
}

const getUserPublicTokenFromPrivateToken = async (connection: PoolClient, userPrivateToken: string): Promise<string | null> => {
    const NAMESPACE = 'GET_USER_PRIVATE_TOKEN_FUNC'
    const QueryString = `SELECT UserPublicToken FROM users WHERE UserPrivateToken='${userPrivateToken}';`

    try {
        if (userPrivateToken === 'undefined') {
            connection.release()

            return null
        }

        if (connection == null) {
            return null
        }

        const resp = await query(connection, QueryString)
        if (Object.keys(resp).length != 0) {
            return resp[0].userpublictoken
        } else {
            return null
        }
    } catch (error: any) {
        connection?.release()
        logging.error(NAMESPACE, error.message, error)
        return null
    }
}

const getUserPublicTokenFromSessionToken = async (connection: PoolClient, sessionToken: string): Promise<string | null> => {
    const NAMESPACE = 'GET_USER_PUBLIC_TOKEN_FUNC'

    try {
        if (!sessionToken || sessionToken === 'undefined' || !connection) {
            return null
        }

        const queryString = `
            SELECT u.UserPublicToken
            FROM account_sessions s
            INNER JOIN users u ON s.userID = u.id
            WHERE s.userSessionToken = $1
            LIMIT 1;
        `

        const resp = await query(connection, queryString, [sessionToken])

        if (resp.length > 0) {
            return resp[0].userpublictoken
        }

        return null
    } catch (error: any) {
        connection?.release()
        logging.error(NAMESPACE, error.message, error)
        return null
    }
}

export { checkForPermissions, getUserPrivateTokenFromSessionToken, getUserPublicTokenFromPrivateToken, getUserPublicTokenFromSessionToken }
