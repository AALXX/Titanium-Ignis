import { NextFunction, Response } from 'express';
import { connect, CustomRequest, query } from '../config/postgresql';
import logging from '../config/logging';
import utilFunctions from '../util/utilFunctions';

export const rbacMiddleware = (resource: string, action: string) => {
    return async (req: CustomRequest, res: Response, next: NextFunction) => {
        let userToken;
        let projectToken;
        const connection = await connect(req.pool!);

        if (req.method === 'GET') {
            userToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection!, req.params.userSessionToken);

            if (!userToken) {

                return res.status(401).json({
                    error: true,
                    errmsg: 'Authentication required',
                });
            }
            projectToken = req.params.projectToken as string;
        } else if (req.method === 'POST') {
            userToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection!, req.body.userSessionToken);

            if (!userToken) {
                return res.status(401).json({
                    error: true,
                    errmsg: 'Authentication required',
                });
            }
            projectToken = req.body.projectToken;
        }

        if (!userToken || !projectToken) {

            connection?.release();
            return res.status(401).json({
                error: true,
                errmsg: 'Authentication required',
            });
        }

        try {
            const permissionQuery = `
                WITH user_roles AS (
                    SELECT DISTINCT r.id, r.level, r.name
                    FROM projects_team_members ptm
                    JOIN roles r ON r.id = ptm.roleid
                    WHERE ptm.userprivatetoken = $1
                    AND ptm.projecttoken = $2
                    ORDER BY r.level DESC
                    LIMIT 1
                ),
                required_permission AS (
                    SELECT MIN(r.level) as min_required_level
                    FROM roles r
                    JOIN role_permissions rp ON rp.roleid = r.id
                    JOIN permissions p ON p.id = rp.permissionid
                    JOIN resources res ON res.id = p.resourceid
                    JOIN actions a ON a.id = p.actionid
                    WHERE res.name = $3
                    AND a.name = $4
                )
                SELECT 
                    CASE 
                        WHEN ur.level >= COALESCE(rp.min_required_level, 0) THEN true
                        WHEN ur.name = 'PROJECT_OWNER' THEN true
                        ELSE false
                    END as has_permission,
                    ur.level as user_level,
                    rp.min_required_level,
                    ur.name as role_name
                FROM user_roles ur
                CROSS JOIN required_permission rp;
            `;

            const result = await query(connection!, permissionQuery, [userToken, projectToken, resource, action]);
            connection?.release();
            if (!result || result.has_permission === false) {
                return res.status(403).json({
                    error: true,
                    errmsg: 'Insufficient permissions',
                    details: {
                        userRole: result?.role_name || 'No role',
                        userLevel: result?.user_level || 0,
                        requiredLevel: result?.min_required_level || 'Unknown',
                    },
                });
            }

            // Add role information to the request for use in route handlers
            // req.userRole = {
            //     name: result.role_name,
            //     level: result.user_level,
            // };

            next();
        } catch (error: any) {
            connection?.release();
            logging.error('RBAC_MIDDLEWARE', error.message);
            res.status(500).json({
                error: true,
                errmsg: error.message,
            });
        }
    };
};
