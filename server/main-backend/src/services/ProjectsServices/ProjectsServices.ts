import { Response } from 'express';
import { validationResult } from 'express-validator';
import logging from '../../config/logging';
import { connect, CustomRequest, query } from '../../config/postgresql';
import utilFunctions from '../../util/utilFunctions';
import { IProjectsDb, IProjectsMapped } from '../../Models/ProjectsModels';

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

const getAllProjects = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_PROJECTS_FUNC', error.errorMsg);
        });

        return res.status(200).json({ error: true, errors: errors.array() });
    }

    const connection = await connect(req.pool!);

    try {
        const queryString = `SELECT * FROM projects WHERE checked_out_by = $1`;
        const result: IProjectsDb[] = await query(connection!, queryString, [req.params.userPrivateToken]);

        // Map the result to new variable names
        const mappedProjects: IProjectsMapped[] = result.map(({ project_name: ProjectName, project_token: ProjectToken, repo_url: RepoUrl, checked_out_by: CheckedOutBy, status: Status, type: Type }) => ({
            ProjectName,
            ProjectToken,
            RepoUrl,
            CheckedOutBy,
            Status,
            Type,
        }));

        connection?.release();

        return res.status(200).json({
            error: false,
            projects: mappedProjects,
        });
    } catch (error: any) {
        logging.error('GET_PROJECTS_FUNC', error.message);
        connection?.release();
        return res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

export default { getAllProjects };
