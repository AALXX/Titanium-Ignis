import { Response } from 'express';
import { validationResult } from 'express-validator';
import logging from '../../config/logging';
import { connect, CustomRequest, query } from '../../config/postgresql';
import utilFunctions from '../../util/utilFunctions';
import { IProjectsDb } from '../../Models/ProjectsModels';

const NAMESPACE = 'PaymentServiceManager';

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

export const createNewProject = async (req: CustomRequest, res: Response): Promise<void> => {
    console.log('Incoming request body:', req.body);

    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().forEach((error) => {
            logging.error('CREATE_NEW_PROJECT_FUNC', error.errorMsg);
        });

        res.status(400).json({ error: true, errors: errors.array() });
        return;
    }

    const connection = await connect(req.pool!);

    try {
        const { ProjectName = '', ProjectDescription = '', EnabledModules = [], TeamMembers = [], UserSessionToken = '' } = req.body || {};

        if (!ProjectName || !ProjectDescription || !UserSessionToken) {
            res.status(400).json({ error: true, errmsg: 'Missing required fields' });
            connection?.release();
            return;
        }

        const ownerPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection!, UserSessionToken);

        const projectToken = utilFunctions.CreateToken();

        await query(connection!, 'BEGIN');

        const insertProjectQuery = `
            INSERT INTO projects (ProjectName, ProjectDescription, ProjectToken, ProjectOwnerToken)
            VALUES ($1, $2, $3, $4)
        `;
        await query(connection!, insertProjectQuery, [ProjectName, ProjectDescription, projectToken, ownerPrivateToken]);

        const formattedModules = Array.isArray(EnabledModules) ? EnabledModules.filter((m: any) => typeof m === 'string').map((m: string) => m.trim().toLowerCase()) : [];
        console.log(formattedModules);
        if (formattedModules.length > 0) {
            const insertModulesQuery = `
                INSERT INTO project_module_links (ProjectToken, ModuleID)
                SELECT $1, pam.id
                FROM project_avalible_modules pam
                WHERE LOWER(pam.ModuleName) IN (${formattedModules.map((_, i) => `$${i + 2}`).join(', ')})
                ON CONFLICT (ProjectToken, ModuleID) DO NOTHING
            `;
            await query(connection!, insertModulesQuery, [projectToken, ...formattedModules]);
        }

        if (Array.isArray(TeamMembers) && TeamMembers.length > 0) {
            for (const member of TeamMembers) {
                if (!member || !member.email || !member.role) continue; // skip invalid member

                const { email, role } = member;

                const userResult = await query(
                    connection!,
                    `
                    SELECT UserPrivateToken FROM users WHERE LOWER(UserEmail) = LOWER($1)
                `,
                    [email],
                );
                console.log(userResult);
                if (!userResult[0]) {
                    logging.warn('CREATE_NEW_PROJECT_FUNC', `User with email ${email} not found. Skipping.`);
                    continue;
                }

                const userPrivateToken = userResult[0].userprivatetoken;

                const roleResult = await query(
                    connection!,
                    `
                    SELECT id FROM roles WHERE LOWER(name) = LOWER($1)
                `,
                    [role],
                );

                if (!roleResult[0]) {
                    logging.warn('CREATE_NEW_PROJECT_FUNC', `Role "${role}" not found. Skipping user ${email}.`);
                    continue;
                }
                const roleId = roleResult[0].id;

                const insertMemberQuery = `
                    INSERT INTO projects_team_members (projecttoken, userprivatetoken, role_id, assigned_by)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (projecttoken, userprivatetoken) DO NOTHING
                `;
                await query(connection!, insertMemberQuery, [projectToken, userPrivateToken, roleId, ownerPrivateToken]);
            }
        }
        

        await query(connection!, 'COMMIT');
        connection?.release();

        res.status(200).json({
            error: false,
            ProjectToken: projectToken,
            message: 'Project created successfully with modules and team members.',
        });
    } catch (error: any) {
        logging.error('CREATE_NEW_PROJECT_FUNC', error.message);
        await query(connection!, 'ROLLBACK'); // rollback if anything fails
        connection?.release();
        res.status(500).json({
            error: true,
            errmsg: error.message,
        });
    }
};

const getAllProjects = async (req: CustomRequest, res: Response): Promise<void> => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_PROJECTS_FUNC', error.errorMsg);
        });

        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    const connection = await connect(req.pool!);

    try {
        const userPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection!, req.params.userSessionToken);

        const queryString = `SELECT * FROM projects WHERE ProjectOwnerToken = $1`;
        const projectsResponse: IProjectsDb[] = await query(connection!, queryString, [userPrivateToken]);
        connection?.release();

        res.status(200).json({
            error: false,
            projects: projectsResponse,
        });
        return;
    } catch (error: any) {
        logging.error('GET_PROJECTS_FUNC', error.message);
        connection?.release();
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
        return;
    }
};

const getProjectData = async (req: CustomRequest, res: Response): Promise<void> => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_PROJECT_DATA_FUNC', error.errorMsg);
        });

        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    const connection = await connect(req.pool!);

    try {
        const queryString = `WITH team_member_count AS (
    SELECT
        projecttoken,
        COUNT(*) AS team_members
    FROM projects_team_members
    WHERE is_active = true
    GROUP BY projecttoken
),
project_tasks AS (
    SELECT
        ptb.projecttoken,
        bt.taskname,
        bt.taskstatus
    FROM projects_task_banners ptb
    JOIN banner_tasks_containers btc ON ptb.bannertoken = btc.bannertoken
    JOIN banner_tasks bt ON btc.containeruuid = bt.containeruuid
)
SELECT 
    p.projectname,
    p.projectdescription,
    p.projecttoken,
    p.projectownertoken,
    p.status,
    p.created_at,
    tm.team_members,
    COUNT(t.taskname) AS task_count,
    json_agg(
        json_build_object(
            'taskname', t.taskname,
            'taskstatus', t.taskstatus
        )
    ) FILTER (WHERE t.taskname IS NOT NULL) AS tasks
FROM projects p
LEFT JOIN team_member_count tm ON p.projecttoken = tm.projecttoken
LEFT JOIN project_tasks t ON p.projecttoken = t.projecttoken
WHERE p.projecttoken = $1
GROUP BY 
    p.projectname,
    p.projectdescription,
    p.projecttoken,
    p.projectownertoken,
    p.status,
    p.created_at,
    tm.team_members;
`;
        const result = await query(connection!, queryString, [req.params.projectToken]);
        const projectsResponse: IProjectsDb = result[0];

        connection?.release();
        res.status(200).json({
            error: false,
            project: projectsResponse,
        });
        return;
    } catch (error: any) {
        logging.error('GET_PROJECT_DATA_FUNC', error.message);
        connection?.release();
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
        return;
    }
};

export default { getAllProjects, getProjectData, createNewProject };
