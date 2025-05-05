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
        const queryString = `SELECT * FROM projects WHERE ProjectToken = $1`;
        const projectsResponse: IProjectsDb = await query(connection!, queryString, [req.params.projectToken]);
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
