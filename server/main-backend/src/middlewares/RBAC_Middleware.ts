import { NextFunction, Response } from 'express';
import { connect, CustomRequest, query } from '../config/postgresql';
import logging from '../config/logging';
import utilFunctions from '../util/utilFunctions';

export const rbacMiddleware = (resource: string, action: string): any => {
    return async (req: CustomRequest, res: Response, next: NextFunction) => {
        let userToken: string | null = null;
        let projectToken: string | null = null;
        const connection = await connect(req.pool!);

        try {
            // Extract tokens based on request method
            if (req.method === 'GET') {
                userToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection!, req.params.userSessionToken);
                projectToken = req.params.projectToken as string;
            } else if (req.method === 'POST') {
                userToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection!, req.body.userSessionToken);
                projectToken = req.body.projectToken;
            }

            // Validate required tokens
            if (!userToken) {
                connection?.release();
                return res.status(401).json({
                    error: true,
                    errmsg: 'Authentication required - invalid session token',
                });
            }

            if (!projectToken) {
                connection?.release();
                return res.status(401).json({
                    error: true,
                    errmsg: 'Project token required',
                });
            }

            // Updated query to match the new schema structure
            const permissionQuery = `
                WITH user_roles AS (
                    SELECT DISTINCT r.id, r.level, r.name, r.display_name
                    FROM projects_team_members ptm
                    JOIN roles r ON r.id = ptm.role_id
                    WHERE ptm.userprivatetoken = $1
                    AND ptm.projecttoken = $2
                    AND ptm.is_active = true
                    ORDER BY r.level DESC
                    LIMIT 1
                ),
                required_permission AS (
                    SELECT p.id as permission_id, p.name as permission_name
                    FROM permissions p
                    JOIN resources res ON res.id = p.resource_id
                    JOIN actions a ON a.id = p.action_id
                    WHERE res.name = $3
                    AND a.name = $4
                ),
                user_permissions AS (
                    SELECT DISTINCT p.id as permission_id, p.name as permission_name
                    FROM user_roles ur
                    JOIN role_permissions rp ON rp.role_id = ur.id
                    JOIN permissions p ON p.id = rp.permission_id
                    JOIN resources res ON res.id = p.resource_id
                    JOIN actions a ON a.id = p.action_id
                    WHERE res.name = $3
                    AND a.name = $4
                ),
                role_hierarchy_permissions AS (
                    SELECT DISTINCT p.id as permission_id, p.name as permission_name
                    FROM user_roles ur
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
                        WHEN rp.permission_id IS NOT NULL THEN true
                        WHEN up.permission_id IS NOT NULL THEN true
                        WHEN rhp.permission_id IS NOT NULL THEN true
                        ELSE false
                    END as has_permission,
                    ur.level as user_level,
                    ur.name as role_name,
                    ur.display_name as role_display_name,
                    rp.permission_name as direct_permission,
                    up.permission_name as user_permission,
                    rhp.permission_name as inherited_permission
                FROM user_roles ur
                LEFT JOIN required_permission rp ON true
                LEFT JOIN user_permissions up ON up.permission_id = rp.permission_id
                LEFT JOIN role_hierarchy_permissions rhp ON rhp.permission_id = rp.permission_id;
            `;

            const result = await query(connection!, permissionQuery, [userToken, projectToken, resource, action]);
            console.log(result);
            connection?.release();

            // Handle case where user has no role in project
            if (!result || result.length === 0) {
                return res.status(403).json({
                    error: true,
                    errmsg: 'Access denied - user not found in project',
                    details: {
                        resource,
                        action,
                        reason: 'User not assigned to project or role not found',
                    },
                });
            }

            const permissionResult = result[0];

            // Check permission
            if (permissionResult.has_permission !== true) {
                return res.status(403).json({
                    error: true,
                    errmsg: 'Insufficient permissions',
                    details: {
                        userRole: permissionResult.role_display_name || 'Unknown',
                        roleName: permissionResult.role_name || 'Unknown',
                        userLevel: permissionResult.user_level || 0,
                        resource,
                        action,
                        requiredPermission: `${resource}:${action}`,
                        reason: 'Role does not have required permission',
                    },
                });
            }

            // Add role information to request for use in route handlers
            req.userRole = {
                name: permissionResult.role_name,
                displayName: permissionResult.role_display_name,
                level: permissionResult.user_level,
            };

            // Log successful authorization for audit
            const auditQuery = `
                INSERT INTO rbac_audit_log (
                    projecttoken, 
                    userprivatetoken, 
                    action_type, 
                    reason,
                    created_at
                ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            `;

            // Don't await this - fire and forget for performance
            // await query(req.pool!, auditQuery, [projectToken, userToken, `${resource}:${action}`, `Permission check passed for ${permissionResult.role_name}`]).catch((err) => {
            //     logging.error('RBAC_AUDIT', `Failed to log audit entry: ${err.message}`);
            // });

            next();
        } catch (error: any) {
            connection?.release();
            logging.error('RBAC_MIDDLEWARE', `Error checking permissions: ${error.message}`, {
                resource,
                action,
                userToken: userToken ? '[REDACTED]' : 'null',
                projectToken: projectToken ? '[REDACTED]' : 'null',
                stack: error.stack,
            });

            res.status(500).json({
                error: true,
                errmsg: 'Internal server error while checking permissions',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    };
};

// Helper function to check if a user has a specific role
export const hasRole = (roleName: string): any => {
    return async (req: CustomRequest, res: Response, next: NextFunction) => {
        const connection = await connect(req.pool!);

        try {
            let userToken: string | null = null;
            let projectToken: string | null = null;

            if (req.method === 'GET') {
                userToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection!, req.params.userSessionToken);
                projectToken = req.params.projectToken as string;
            } else if (req.method === 'POST') {
                userToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection!, req.body.userSessionToken);
                projectToken = req.body.projectToken;
            }

            if (!userToken || !projectToken) {
                connection?.release();
                return res.status(401).json({
                    error: true,
                    errmsg: 'Authentication required',
                });
            }

            const roleQuery = `
                SELECT r.name, r.display_name, r.level
                FROM projects_team_members ptm
                JOIN roles r ON r.id = ptm.role_id
                WHERE ptm.userprivatetoken = $1
                AND ptm.projecttoken = $2
                AND ptm.is_active = true
                AND r.name = $3
            `;

            const result = await query(connection!, roleQuery, [userToken, projectToken, roleName]);
            connection?.release();

            if (!result || result.length === 0) {
                return res.status(403).json({
                    error: true,
                    errmsg: `Role '${roleName}' required`,
                });
            }

            req.userRole = {
                name: result[0].name,
                displayName: result[0].display_name,
                level: result[0].level,
            };

            next();
        } catch (error: any) {
            connection?.release();
            logging.error('RBAC_ROLE_CHECK', error.message);
            res.status(500).json({
                error: true,
                errmsg: 'Internal server error while checking role',
            });
        }
    };
};

// Helper function to check minimum role level
export const hasMinimumLevel = (minimumLevel: number): any => {
    return async (req: CustomRequest, res: Response, next: NextFunction) => {
        const connection = await connect(req.pool!);

        try {
            let userToken: string | null = null;
            let projectToken: string | null = null;

            if (req.method === 'GET') {
                userToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection!, req.params.userSessionToken);
                projectToken = req.params.projectToken as string;
            } else if (req.method === 'POST') {
                userToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection!, req.body.userSessionToken);
                projectToken = req.body.projectToken;
            }

            if (!userToken || !projectToken) {
                connection?.release();
                return res.status(401).json({
                    error: true,
                    errmsg: 'Authentication required',
                });
            }

            const levelQuery = `
                SELECT r.name, r.display_name, r.level
                FROM projects_team_members ptm
                JOIN roles r ON r.id = ptm.role_id
                WHERE ptm.userprivatetoken = $1
                AND ptm.projecttoken = $2
                AND ptm.is_active = true
                ORDER BY r.level DESC
                LIMIT 1
            `;

            const result = await query(connection!, levelQuery, [userToken, projectToken]);
            connection?.release();

            if (!result || result.length === 0) {
                return res.status(403).json({
                    error: true,
                    errmsg: 'No role found for user in project',
                });
            }

            const userLevel = result[0].level;
            if (userLevel < minimumLevel) {
                return res.status(403).json({
                    error: true,
                    errmsg: `Minimum level ${minimumLevel} required`,
                    details: {
                        userLevel,
                        requiredLevel: minimumLevel,
                        userRole: result[0].display_name,
                    },
                });
            }

            req.userRole = {
                name: result[0].name,
                displayName: result[0].display_name,
                level: result[0].level,
            };

            next();
        } catch (error: any) {
            connection?.release();
            logging.error('RBAC_LEVEL_CHECK', error.message);
            res.status(500).json({
                error: true,
                errmsg: 'Internal server error while checking level',
            });
        }
    };
};
