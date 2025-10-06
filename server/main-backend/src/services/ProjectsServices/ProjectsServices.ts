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

export default { getAllProjects, getProjectData };
