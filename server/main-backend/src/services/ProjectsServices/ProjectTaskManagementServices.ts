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

const createTaskBanner = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('CREATE_TASK_BANNER_FUNC', error.errorMsg);
        });
        return res.status(200).json({ error: true, errors: errors.array() });
    }

    try {
        const connection = await connect(req.pool!);
        const bannerToken = utilFunctions.CreateToken();

        const assignerPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection!, req.body.userSessionToken);

        const queryString = `INSERT INTO projects_task_banners (ProjectToken, BannerToken, BannerName, DepartamentAssignedTo, AssigneePrivateToken) VALUES ($1, $2, $3, $4, $5)`;

        await query(connection!, queryString, [req.body.projectToken, bannerToken, req.body.taskBannerName, req.body.departmentAssignmentToId, assignerPrivateToken]);
        connection?.release();
        return res.status(200).json({
            error: false,
        });
    } catch (error: any) {
        logging.error('GET_ALL_DIVISIONS_FUNC', error.message);
        return res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

const getAllTaskBanners = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_ALL_TASK_BANNERS_FUNC', error.errorMsg);
        });
        return res.status(200).json({ error: true, errors: errors.array() });
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

    JOIN roles ON roles.Id = projects_team_members.RoleId

    JOIN project_divisions ON projects_task_banners.DepartamentAssignedTo = project_divisions.Id

    WHERE projects_task_banners.ProjectToken = $1`;

        const allBanners = await query(connection!, queryString, [req.params.projectToken]);
        connection?.release();
        return res.status(200).json({
            error: false,
            allBanners: allBanners,
        });
    } catch (error: any) {
        logging.error('GET_ALL_DIVISIONS_FUNC', error.message);
        return res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

const deleteBanner = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('DELETE_BANNER_FUNC', error.errorMsg);
        });
        return res.status(200).json({ error: true, errors: errors.array() });
    }
    try {
        const connection = await connect(req.pool!);
        const queryString = `DELETE FROM projects_task_banners WHERE BannerToken = $1`;
        await query(connection!, queryString, [req.body.bannerToken]);
        connection?.release();
        return res.status(200).json({
            error: false,
        });
    } catch (error: any) {
        logging.error('DELETE_BANNER_FUNC', error.message);
        return res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

const getProjectTasks = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_PROJECT_TASKS_CONTAINERS_FUNC', error.errorMsg);
        });
        return res.status(200).json({ error: true, errors: errors.array() });
    }

    try {
        const connection = await connect(req.pool!);
        const queryString = `
        SELECT 
            banner_tasks_containers.ContainerName,  
            banner_tasks_containers.ContainerUUID,
            banner_tasks.TaskUUID,
            banner_tasks.TaskName,
            banner_tasks.TaskDescription,
            banner_tasks.TaskStatus,
            banner_tasks.TaskImportance
        FROM banner_tasks_containers 
        LEFT JOIN banner_tasks ON banner_tasks.ContainerUUID = banner_tasks_containers.ContainerUUID
        WHERE banner_tasks_containers.BannerToken = $1;
        `;

        const rawResults = await query(connection!, queryString, [req.params.bannerToken]);
        connection?.release();
        //* Process data into separate arrays
        const containersMap = new Map();
        const tasks: ITasks[] = [];

        rawResults.forEach((row: any) => {
            if (!containersMap.has(row.containeruuid)) {
                containersMap.set(row.containeruuid, {
                    containeruuid: row.containeruuid,
                    containername: row.containername,
                    state: ContainerState.Created,
                });
            }

            if (row.taskuuid) {
                tasks.push({
                    TaskUUID: row.taskuuid as string,
                    TaskName: row.taskname as string,
                    TaskDescription: row.taskdescription as string,
                    TaskStatus: row.taskstatus as string,
                    TaskImportance: row.taskimportance as string,
                    ContainerUUID: row.containeruuid as string,
                    State: TaskState.Created,
                });
            }
        });


        return res.status(200).json({
            error: false,
            containers: Array.from(containersMap.values()),
            tasks: tasks,
        });
    } catch (error: any) {
        logging.error('GET_PROJECT_TASKS_CONTAINERS_FUNC', error.message);
        return res.status(500).json({
            error: true,
            errmsg: error.message,
        });
    }
};

const createTaskContainer = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('CREATE_TASK_CONTAINER_FUNC', error.errorMsg);
        });
        return res.status(200).json({ error: true, errors: errors.array() });
    }

    try {
        const connection = await connect(req.pool!);
        const queryString = `INSERT INTO banner_tasks_containers (BannerToken, ContainerName, ContainerUUID) VALUES ($1, $2, $3)`;

        let ContainerUUID = req.body.containerUUID;
        if (!req.body.containerUUID) {
            ContainerUUID = uuidv4();
        }

        await query(connection!, queryString, [req.body.bannerToken, req.body.taskContainerName, ContainerUUID]);
        connection?.release();
        return res.status(200).json({
            error: false,
        });
    } catch (error: any) {
        logging.error('CREATE_TASK_CONTAINER_FUNC', error.message);
        return res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

const createTask = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('CREATE_TASK_FUNC', error.errorMsg);
        });
        return res.status(200).json({ error: true, errors: errors.array() });
    }

    try {
        const connection = await connect(req.pool!);
        let memberPrivateToken = await utilFunctions.getUserPrivateTokenFromPublicToken(connection!, req.body.taskAssigneePublicToken);

        if (!memberPrivateToken) {
            memberPrivateToken = '';
        }

        const queryString = `INSERT INTO banner_tasks (TaskUUID, ContainerUUID, TaskName, TaskDescription, AssignedMemberPrivateToken, TaskStatus, TaskDueDate, TaskImportance) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;

        const TaskUUID = uuidv4();

        const test = await query(connection!, queryString, [
            TaskUUID,
            req.body.taskContainerUUID,
            req.body.taskName,
            req.body.taskDescription,
            memberPrivateToken,
            req.body.taskStatus,
            req.body.taskDueDate,
            req.body.taskImportance,
        ]);
        connection?.release();

        return res.status(200).json({
            error: false,
        });
    } catch (error: any) {
        logging.error('CREATE_TASK_FUNC', error.message);
        return res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

const deleteTaskContainer = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('DELETE_TASK_CONTAINER_FUNC', error.errorMsg);
        });
        return res.status(200).json({ error: true, errors: errors.array() });
    }
    try {
        const connection = await connect(req.pool!);

        const deleteContainerQueryString = `DELETE FROM banner_tasks_containers WHERE BannerToken = $1 AND ContainerUUID = $2`;
        await query(connection!, deleteContainerQueryString, [req.body.bannerToken, req.body.taskContainerUUID]);

        const deleteTasksQueryString = `DELETE FROM banner_tasks WHERE ContainerUUID = $1`;
        await query(connection!, deleteTasksQueryString, [req.body.taskContainerUUID]);

        connection?.release();
        return res.status(200).json({
            error: false,
        });
    } catch (error: any) {
        logging.error('DELETE_TASK_CONTAINER_FUNC', error.message);
        return res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

export default { createTaskBanner, getAllTaskBanners, deleteBanner, getProjectTasks, createTaskContainer, createTask, deleteTaskContainer };
