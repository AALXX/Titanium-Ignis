import { Response } from 'express';
import logging from '../../config/logging';
import { connect, CustomRequest, query } from '../../config/postgresql';

import { validationResult } from 'express-validator';
import utilFunctions from '../../util/utilFunctions';

/**
 * Validates and cleans the CustomRequest form
 */
const CustomRequestValidationResult = validationResult.withDefaults({
    formatter: (error) => {
        return {
            errorMsg: error.msg,
        };
    },
});

const getProjectTeamData = async (req: CustomRequest, res: Response): Promise<void> => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_PROJECT_TEAM_DATA_FUNC', error.errorMsg);
        });

        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    try {
        const connection = await connect(req.pool!);
        const TeamQueryString = `SELECT DISTINCT
    roles.name AS role,
    users.UserPublicToken AS MemberPublicToken,
    users.UserEmail AS MemberEmail,
    users.UserName AS MemberName
FROM 
    projects_team_members
JOIN 
    users 
ON 
    users.UserPrivateToken = projects_team_members.UserPrivateToken
LEFT JOIN 
    roles 
ON
    roles.Id = projects_team_members.RoleId
WHERE 
    projects_team_members.ProjectToken = $1;`;
        const TeamResponse = await query(connection!, TeamQueryString, [req.params.projectToken]);
        console.log(TeamResponse);
        const DivivisionQueryString = `SELECT * FROM project_divisions WHERE ProjectToken = $1`;
        const DivivisionResponse = await query(connection!, DivivisionQueryString, [req.params.projectToken]);
        connection?.release();
        res.status(200).json({
            error: false,
            TeamDivisions: DivivisionResponse,
            TeamMembers: TeamResponse,
        });
        return;
    } catch (error: any) {
        logging.error('GET_PROJECT_TEAM_DATA_FUNC', error.message);
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
        return;
    }
};

const addTeamMember = async (req: CustomRequest, res: Response): Promise<void> => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('ADD_TEAM_MEMBER_FUNC', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    try {
        const connection = await connect(req.pool!);

        // First check if the user already exists in the project
        const checkMemberQuery = `
            SELECT COUNT(*) as count 
            FROM projects_team_members ptm
            JOIN users u ON u.UserPrivateToken = ptm.UserPrivateToken
            WHERE u.UserEmail = $1 AND ptm.ProjectToken = $2
        `;
        const memberCheckResult = await query(connection!, checkMemberQuery, [req.body.email, req.body.projectToken]);

        if (memberCheckResult[0].count !== '0') {
            connection?.release();
            res.status(200).json({
                error: true,
                errmsg: 'User is already a team member',
            });
            return;
        }

        // Insert the new team member and return the inserted data
        const insertQuery = `
            INSERT INTO projects_team_members (ProjectToken, UserPrivateToken, RoleId)
            SELECT $1, u.UserPrivateToken, r.Id
            FROM users u, roles r
            WHERE u.UserEmail = $2 AND r.name = $3
            RETURNING 
                projects_team_members.id,
                projects_team_members.ProjectToken,
                projects_team_members.UserPrivateToken,
                projects_team_members.RoleId,
                (SELECT UserEmail FROM users WHERE UserPrivateToken = projects_team_members.UserPrivateToken) as email,
                (SELECT name FROM roles WHERE Id = projects_team_members.RoleId) as role
        `;

        const response = await query(connection!, insertQuery, [req.body.projectToken, req.body.email, req.body.role]);

        if (response.length === 0) {
            connection?.release();
            res.status(200).json({
                error: true,
                errmsg: 'User or role not found',
            });
            return;
        }

        connection?.release();
        res.status(200).json({
            error: false,
            teamMember: response[0],
        });
        return;
    } catch (error: any) {
        logging.error('ADD_TEAM_MEMBER_FUNC', error.message);
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
        return;
    }
};

const removeTeamMember = async (req: CustomRequest, res: Response): Promise<void> => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('REMOVE_TEAM_MEMBER_FUNC', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    try {
        const connection = await connect(req.pool!);
        const memberPrivateToken = await utilFunctions.getUserPrivateTokenFromPublicToken(connection!, req.body.memberPublicToken);

        if (!memberPrivateToken) {
            res.status(200).json({
                error: true,
                errmsg: 'User not found',
            });
            return;
        }
        const queryString = `DELETE FROM projects_team_members WHERE ProjectToken = $1 AND UserPrivateToken = $2`;
        const response = await query(connection!, queryString, [req.body.projectToken, memberPrivateToken]);
        connection?.release();

        if (response.rowCount === 0) {
            res.status(200).json({
                error: true,
                errmsg: 'User not found in team',
            });
            return;
        }

        res.status(200).json({
            error: false,
        });
        return;
    } catch (error: any) {
        logging.error('REMOVE_TEAM_MEMBER_FUNC', error.message);
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
        return;
    }
};

const changeMemberRole = async (req: CustomRequest, res: Response): Promise<void> => {
    console.log(req.body);

    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('CHANGE_MEMBER_ROLE_FUNC', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    try {
        const connection = await connect(req.pool!);
        const memberPrivateToken = await utilFunctions.getUserPrivateTokenFromPublicToken(connection!, req.body.memberPublicToken);
        if (!memberPrivateToken) {
            res.status(200).json({
                error: true,
                errmsg: 'User not found',
            });
            return;
        }
        const queryString = `UPDATE projects_team_members SET RoleId = (SELECT id FROM roles WHERE name = $1) WHERE ProjectToken = $2 AND UserPrivateToken = $3`;
        await query(connection!, queryString, [req.body.newRoleName, req.body.projectToken, memberPrivateToken]);
        connection?.release();

        res.status(200).json({
            error: false,
        });
        return;
    } catch (error: any) {
        logging.error('CHANGE_MEMBER_ROLE_FUNC', error.message);
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
        return;
    }
};

const createDivision = async (req: CustomRequest, res: Response): Promise<void> => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('CREATE_DIVISION_FUNC', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    try {
        const connection = await connect(req.pool!);
        const queryString = `INSERT INTO project_divisions (ProjectToken, DivisionName, NumberOfMembers) VALUES ($1, $2, 0)`;

        const response = await query(connection!, queryString, [req.body.projectToken, req.body.divisionName]);
        connection?.release();

        res.status(200).json({
            error: false,
        });
        return;
    } catch (error: any) {
        logging.error('CREATE_DIVISION_FUNC', error.message);
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
        return;
    }
};

const getAllDivisions = async (req: CustomRequest, res: Response): Promise<void> => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_ALL_DIVISIONS_FUNC', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    try {
        const connection = await connect(req.pool!);
        const queryString = `SELECT * FROM project_divisions WHERE ProjectToken = $1`;

        const allDivisions = await query(connection!, queryString, [req.params.projectToken]);
        connection?.release();
        res.status(200).json({
            error: false,
            divisions: allDivisions,
        });
        return;
    } catch (error: any) {
        logging.error('GET_ALL_DIVISIONS_FUNC', error.message);
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
        return;
    }
};



export default { getProjectTeamData, addTeamMember, removeTeamMember, changeMemberRole, createDivision, getAllDivisions };
