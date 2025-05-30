import { Response } from 'express';
import logging from '../../config/logging';
import { connect, CustomRequest, query } from '../../config/postgresql';

import { validationResult } from 'express-validator';
import utilFunctions from '../../util/utilFunctions';
import { v4 as uuidv4 } from 'uuid';
import { ContainerState, ITasks, TaskState } from '../../types/TaskTypes';

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

const createTaskBanner = async (req: CustomRequest, res: Response): Promise<void> => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('CREATE_TASK_BANNER_FUNC', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    try {
        const connection = await connect(req.pool!);
        const bannerToken = utilFunctions.CreateToken();

        const assignerPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection!, req.body.userSessionToken);

        const queryString = `INSERT INTO projects_task_banners (ProjectToken, BannerToken, BannerName, DepartamentAssignedTo, AssigneePrivateToken) VALUES ($1, $2, $3, $4, $5)`;

        await query(connection!, queryString, [req.body.projectToken, bannerToken, req.body.taskBannerName, req.body.departmentAssignmentToId, assignerPrivateToken]);
        connection?.release();
        res.status(200).json({
            error: false,
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

const getAllTaskBanners = async (req: CustomRequest, res: Response): Promise<void> => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_ALL_TASK_BANNERS_FUNC', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    try {
        const connection = await connect(req.pool!);
        const queryString = `
    SELECT 
    
    projects_task_banners.ProjectToken as ProjectToken,
    projects_task_banners.BannerToken as BannerToken, 
    projects_task_banners.BannerName as BannerName, 
    project_divisions.DivisionName as DepartamentAssignedTo, 
    users.UserEmail AS AsignerEmail,
    users.UserName AS AsignerName,
    roles.Name AS AsignerRole
    
    FROM projects_task_banners JOIN users ON users.UserPrivateToken = projects_task_banners.AssigneePrivateToken 
    
    JOIN projects_team_members ON projects_team_members.UserPrivateToken = projects_task_banners.AssigneePrivateToken

    JOIN roles ON roles.Id = projects_team_members.role_id

    JOIN project_divisions ON projects_task_banners.DepartamentAssignedTo = project_divisions.Id

    WHERE projects_task_banners.ProjectToken = $1`;

        const allBanners = await query(connection!, queryString, [req.params.projectToken]);
        connection?.release();

        res.status(200).json({
            error: false,
            allBanners: allBanners,
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

const deleteBanner = async (req: CustomRequest, res: Response): Promise<void> => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('DELETE_BANNER_FUNC', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }
    try {
        const connection = await connect(req.pool!);
        const queryString = `DELETE FROM projects_task_banners WHERE BannerToken = $1`;
        await query(connection!, queryString, [req.body.bannerToken]);
        connection?.release();
        res.status(200).json({
            error: false,
        });
        return;
    } catch (error: any) {
        logging.error('DELETE_BANNER_FUNC', error.message);
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
        return;
    }
};

export default { createTaskBanner, getAllTaskBanners, deleteBanner };
