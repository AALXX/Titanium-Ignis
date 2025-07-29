"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const postgresql_1 = require("../config/postgresql");
const TaskTypes_1 = require("../types/TaskTypes");
const logging_1 = __importDefault(require("../config/logging"));
const uuid_1 = require("uuid");
const utils_1 = require("../utils/utils");
const getProjectBannerTasks = async (pool, io, socket, bannerToken) => {
    try {
        const connection = await (0, postgresql_1.connect)(pool);
        const queryString = `
        SELECT 
    banner_tasks_containers.ContainerName,  
    banner_tasks_containers.ContainerUUID,
    banner_tasks_containers.ContainerOrder,
    banner_tasks.TaskUUID,
    banner_tasks.TaskName,
    banner_tasks.TaskDescription,
    banner_tasks.AssignedMemberPrivateToken,
    banner_tasks.CreatedByUserPrivateToken,
    banner_tasks.TaskStatus,
    banner_tasks.TaskImportance,
    banner_tasks.TaskCreatedDate,
    banner_tasks.TaskDueDate,
    banner_tasks.TaskCompletedDate,
    banner_tasks.TaskEstimatedHours,
    banner_tasks.TaskActualHours,
    banner_tasks.TaskLabels,
    banner_tasks.TaskAttachmentsCount,
    banner_tasks.TaskCommentsCount,
    banner_tasks.TaskReminderDate,
    banner_tasks.TaskIsArchived,
    banner_tasks.TaskLastUpdated,
    banner_tasks.TaskLastUpdatedBy,
    banner_tasks.TaskDependencies,
    banner_tasks.TaskCustomFields
FROM banner_tasks_containers 
LEFT JOIN banner_tasks ON banner_tasks.ContainerUUID = banner_tasks_containers.ContainerUUID
WHERE banner_tasks_containers.BannerToken = $1
ORDER BY banner_tasks_containers.ContainerOrder;
        `;
        const rawResults = await (0, postgresql_1.query)(connection, queryString, [bannerToken]);
        connection?.release();
        //* Process data into separate arrays
        const containersMap = new Map();
        const tasks = [];
        rawResults.forEach((row) => {
            if (!containersMap.has(row.containeruuid)) {
                containersMap.set(row.containeruuid, {
                    containeruuid: row.containeruuid,
                    containername: row.containername,
                    state: TaskTypes_1.ContainerState.Created,
                    order: row.containerorder
                });
            }
            if (row.taskuuid) {
                tasks.push({
                    TaskUUID: row.taskuuid,
                    TaskName: row.taskname,
                    TaskDescription: row.taskdescription,
                    TaskStatus: row.taskstatus,
                    TaskImportance: row.taskimportance,
                    ContainerUUID: row.containeruuid,
                    TaskDueDate: row.taskduedate
                });
            }
        });
        socket.emit('PROJECT_TASKS', {
            containers: Array.from(containersMap.values()),
            tasks: tasks
        });
    }
    catch (error) {
        logging_1.default.error('PROJECT_TASKS', error.message);
        socket.emit('PROJECT_TASKS', {
            error: true,
            message: 'Error getting project tasks containers'
        });
    }
};
const createTaskContainer = async (pool, io, socket, userSessionToken, projectToken, containerUUID, bannerToken, taskContainerName) => {
    try {
        const connection = await (0, postgresql_1.connect)(pool);
        // if ((await checkForPermissions(connection!, projectToken, userSessionToken, 'task', 'create')) === false) {
        //     return socket.emit('CREATED_TASK_CONTAINER', {
        //         error: true,
        //         message: 'You do not have permission to create a task container'
        //     })
        // }
        if (!containerUUID) {
            containerUUID = (0, uuid_1.v4)();
        }
        const getMaxOrderQuery = `
            SELECT COALESCE(MAX(ContainerOrder), 0) as maxOrder
            FROM banner_tasks_containers
            WHERE BannerToken = $1
        `;
        const maxOrderResult = await (0, postgresql_1.query)(connection, getMaxOrderQuery, [bannerToken]);
        const newOrder = maxOrderResult[0].maxorder + 1;
        const queryString = `
            INSERT INTO banner_tasks_containers (
                BannerToken, 
                ContainerName, 
                ContainerUUID, 
                ContainerOrder
            ) VALUES ($1, $2, $3, $4)
        `;
        await (0, postgresql_1.query)(connection, queryString, [bannerToken, taskContainerName, containerUUID, newOrder]);
        io.to(bannerToken).emit('CREATED_TASK_CONTAINER', {
            error: false,
            containerUUID: containerUUID,
            containerOrder: newOrder
        });
        connection?.release();
    }
    catch (error) {
        logging_1.default.error('CREATED_TASK_CONTAINER', error.message);
        socket.emit('CREATED_TASK_CONTAINER', {
            error: true,
            message: 'Error creating task container'
        });
    }
};
const reorderTaskContainers = async (pool, socket, io, userSessionToken, projectToken, bannerToken, newOrder) => {
    try {
        const connection = await (0, postgresql_1.connect)(pool);
        if ((await (0, utils_1.checkForPermissions)(connection, projectToken, userSessionToken, 'task', 'manage')) === false) {
            connection?.release();
            return socket.emit('REORDERED_TASK_CONTAINERS', {
                error: true,
                message: 'You do not have permission to reorder task containers'
            });
        }
        await (0, postgresql_1.query)(connection, 'BEGIN');
        for (const item of newOrder) {
            const queryString = `
                UPDATE banner_tasks_containers 
                SET ContainerOrder = $1 
                WHERE ContainerUUID = $2 AND BannerToken = $3
            `;
            await (0, postgresql_1.query)(connection, queryString, [item.order, item.containerUUID, bannerToken]);
        }
        await (0, postgresql_1.query)(connection, 'COMMIT');
        io.to(bannerToken).emit('REORDERED_TASK_CONTAINERS', {
            error: false,
            message: 'Task containers reordered successfully'
        });
        connection?.release();
    }
    catch (error) {
        const connection = await (0, postgresql_1.connect)(pool);
        await (0, postgresql_1.query)(connection, 'ROLLBACK');
        connection?.release();
        logging_1.default.error('REORDERED_TASK_CONTAINERS', error.message);
        socket.emit('REORDERED_TASK_CONTAINERS', {
            error: true,
            message: 'Error reordering task containers'
        });
    }
};
const deleteTaskContainer = async (pool, socket, io, projectToken, userSessionToken, bannerToken, taskContainerUUID) => {
    try {
        const connection = await (0, postgresql_1.connect)(pool);
        if ((await (0, utils_1.checkForPermissions)(connection, projectToken, userSessionToken, 'task', 'create')) === false) {
            return socket.emit('DELETED_TASK_CONTAINER', {
                error: true,
                message: 'You do not have permission to delete a task container'
            });
        }
        const deleteContainerQueryString = `DELETE FROM banner_tasks_containers WHERE BannerToken = $1 AND ContainerUUID = $2`;
        await (0, postgresql_1.query)(connection, deleteContainerQueryString, [bannerToken, taskContainerUUID]);
        const deleteTasksQueryString = `DELETE FROM banner_tasks WHERE ContainerUUID = $1`;
        await (0, postgresql_1.query)(connection, deleteTasksQueryString, [taskContainerUUID]);
        connection?.release();
        io.to(bannerToken).emit('DELETED_TASK_CONTAINER', {
            containerUUID: taskContainerUUID,
            error: false
        });
    }
    catch (error) {
        logging_1.default.error('DELETED_TASK_CONTAINER', error.message);
        socket.emit('DELETED_TASK_CONTAINER', {
            error: true,
            message: 'Error deleting task container'
        });
    }
};
const createTask = async (pool, socket, io, userSessionToken, projectToken, bannerToken, taskContainerUUID, taskName, taskDescription, taskStatus, taskDueDate, taskImportance, taskEstimatedHours, taskLabels, taskReminderDate, taskDependencies, taskCustomFields) => {
    try {
        const connection = await (0, postgresql_1.connect)(pool);
        // if ((await checkForPermissions(connection!, projectToken, userSessionToken, 'task', 'create')) === false) {
        //     logging.error('CREATED_TASK', 'User does not have permission to create a task')
        //     return socket.emit('CREATED_TASK', {
        //         error: true,
        //         message: 'You do not have permission to delete a task container'
        //     })
        // }
        const userPrivateToken = await (0, utils_1.getUserPrivateTokenFromSessionToken)(connection, userSessionToken);
        if (!userPrivateToken) {
            return socket.emit('CREATED_TASK', {
                error: true,
                message: 'User not found'
            });
        }
        const TaskUUID = (0, uuid_1.v4)();
        const queryString = `
        INSERT INTO banner_tasks (
            TaskUUID, 
            ContainerUUID, 
            TaskName, 
            TaskDescription, 
            AssignedMemberPrivateToken, 
            CreatedByUserPrivateToken,
            TaskStatus, 
            TaskImportance, 
            TaskDueDate,
            TaskEstimatedHours,
            TaskLabels,
            TaskReminderDate,
            TaskDependencies,
            TaskCustomFields,
            TaskLastUpdatedBy
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        )
        `;
        const formattedLabels = taskLabels ? taskLabels : null;
        const formattedDependencies = taskDependencies ? taskDependencies : null;
        const formattedCustomFields = taskCustomFields ? JSON.stringify(taskCustomFields) : null;
        await (0, postgresql_1.query)(connection, queryString, [
            TaskUUID,
            taskContainerUUID,
            taskName,
            taskDescription,
            null, //assignedMemberPrivateToken,
            userPrivateToken,
            taskStatus,
            taskImportance,
            taskDueDate,
            taskEstimatedHours || null,
            formattedLabels,
            taskReminderDate || null,
            formattedDependencies,
            formattedCustomFields,
            userPrivateToken
        ]);
        connection?.release();
        io.to(bannerToken).emit('CREATED_TASK', {
            error: false,
            containerUUID: taskContainerUUID,
            taskUUID: TaskUUID,
            taskName: taskName,
            taskImportance: taskImportance,
            taskDueDate: taskDueDate
        });
    }
    catch (error) {
        logging_1.default.error('CREATE_TASK_FUNC', error.message);
        socket.emit('CREATED_TASK', {
            error: true,
            message: 'Error creating task'
        });
    }
};
const reorderTasks = async (pool, socket, io, userSessionToken, projectToken, bannerToken, taskContainerUUID, taskUUID) => {
    try {
        const connection = await (0, postgresql_1.connect)(pool);
        if ((await (0, utils_1.checkForPermissions)(connection, projectToken, userSessionToken, 'task', 'manage')) === false) {
            logging_1.default.error('REORDER_TASKS', 'User does not have permission to reorder tasks');
            return socket.emit('REORDERED_TASKS', {
                error: true,
                message: 'You do not have permission to reorder tasks'
            });
        }
        const queryString = `
        UPDATE banner_tasks SET ContainerUUID = $1 WHERE TaskUUID = $2 RETURNING *`;
        const result = await (0, postgresql_1.query)(connection, queryString, [taskContainerUUID, taskUUID]);
        if (result.length === 0) {
            logging_1.default.error('REORDER_TASKS', 'Task not found or not updated');
            return socket.emit('REORDERED_TASKS', {
                error: true,
                message: 'Task not found or not updated'
            });
        }
        connection?.release();
        io.to(bannerToken).emit('REORDERED_TASKS', {
            error: false,
            containerUUID: taskContainerUUID,
            taskUUID: taskUUID,
            task: result[0]
        });
    }
    catch (error) {
        logging_1.default.error('REORDER_TASKS', error.message);
        socket.emit('REORDERED_TASKS', {
            error: true,
            message: 'Error reordering tasks: ' + error.message
        });
    }
};
const getTaskData = async (pool, socket, io, userSessionToken, projectToken, taskUUID) => {
    try {
        const connection = await (0, postgresql_1.connect)(pool);
        // if ((await checkForPermissions(connection!, projectToken, userSessionToken, 'task', 'read')) === false) {
        //     logging.error('REORDER_TASKS', 'User does not have permission to reorder tasks')
        //     return socket.emit('REORDERED_TASKS', {
        //         error: true,
        //         message: 'You do not have permission to reorder tasks'
        //     })
        // }
        const queryString = `SELECT 
    bt.TaskUUID,
    bt.ContainerUUID,
    bt.TaskName,
    bt.TaskDescription,
    bt.TaskStatus,
    bt.TaskImportance,
    bt.TaskCreatedDate,
    bt.TaskDueDate,
    bt.TaskCompletedDate,
    bt.TaskEstimatedHours,
    bt.TaskActualHours,
    bt.TaskLabels,
    bt.TaskAttachmentsCount,
    bt.TaskCommentsCount,
    bt.TaskReminderDate,
    bt.TaskIsArchived,
    bt.TaskLastUpdated,
    bt.TaskLastUpdatedBy,
    bt.TaskDependencies,
    bt.TaskCustomFields, 
    u1.UserName AS CreatedByUserName, 
    u2.UserName AS AssignedMemberUserName
FROM banner_tasks bt
LEFT JOIN users u1 ON u1.UserPrivateToken = bt.CreatedByUserPrivateToken
LEFT JOIN users u2 ON u2.UserPrivateToken = bt.AssignedMemberPrivateToken
WHERE bt.TaskUUID = $1;`;
        const result = await (0, postgresql_1.query)(connection, queryString, [taskUUID]);
        connection?.release();
        if (result.length === 0) {
            logging_1.default.error('GET_TASKS', 'Task not found or not updated');
            return socket.emit('TASKS_DATA', {
                error: true,
                message: 'Task not found or not updated'
            });
        }
        return socket.emit('TASKS_DATA', {
            error: false,
            task: result[0]
        });
    }
    catch (error) {
        logging_1.default.error('GET_TASKS', error.message);
        socket.emit('TASKS_DATA', {
            error: true,
            message: 'Error reordering tasks: ' + error.message
        });
    }
};
exports.default = { getProjectBannerTasks, createTaskContainer, createTask, reorderTaskContainers, reorderTasks, deleteTaskContainer, getTaskData };
