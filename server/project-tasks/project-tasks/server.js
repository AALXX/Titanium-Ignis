"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
const config_1 = __importDefault(require("./config/config"));
const logging_1 = __importDefault(require("./config/logging"));
const ProjectTasks_1 = __importDefault(require("./services/ProjectTasks"));
const postgresql_1 = require("./config/postgresql");
const httpServer = http_1.default.createServer();
const NAMESPACE = 'ProjectTasks_API';
const pool = (0, postgresql_1.createPool)();
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: ['http://localhost:3000']
    }
});
io.on('connection', socket => {
    socket.on('join', ({ BannerToken }) => {
        socket.join(BannerToken);
    });
    socket.on('get-project-tasks', async ({ BannerToken }) => {
        return ProjectTasks_1.default.getProjectBannerTasks(pool, io, socket, BannerToken);
    });
    socket.on('create-task-container', async ({ userSessionToken, projectToken, bannerToken, taskContainerName, containerUUID }) => {
        return ProjectTasks_1.default.createTaskContainer(pool, io, socket, userSessionToken, projectToken, containerUUID, bannerToken, taskContainerName);
    });
    socket.on('reorder-task-containers', async ({ userSessionToken, projectToken, bannerToken, newOrder }) => {
        if (!Array.isArray(newOrder) || newOrder.length === 0) {
            return socket.emit('REORDERED_TASK_CONTAINERS', {
                error: true,
                message: 'Invalid order data. Expected array of container UUIDs and orders.'
            });
        }
        return ProjectTasks_1.default.reorderTaskContainers(pool, socket, io, userSessionToken, projectToken, bannerToken, newOrder);
    });
    socket.on('delete-task-container', async ({ userSessionToken, projectToken, bannerToken, containerUUID }) => {
        return ProjectTasks_1.default.deleteTaskContainer(pool, socket, io, projectToken, userSessionToken, bannerToken, containerUUID);
    });
    socket.on('create-task', async ({ userSessionToken, projectToken, bannerToken, taskContainerUUID, taskName, taskDescription = '', taskStatus = 'Todo', taskDueDate, taskImportance = 'Medium', taskEstimatedHours, // Optional
    taskLabels = [], // Optional
    taskRecurringPattern, // Optional
    taskReminderDate, // Optional
    taskDependencies = [] // Optional
     }) => {
        if (!taskName || !taskContainerUUID || !taskDueDate) {
            logging_1.default.error(NAMESPACE, 'Missing required fields: taskName, taskContainerUUID, taskDueDate, and createdByUserPublicToken are required');
            return socket.emit('CREATE_TASK', {
                error: true,
                message: 'Missing required fields: taskName, taskContainerUUID, taskDueDate, and createdByUserPublicToken are required'
            });
        }
        if (isNaN(Date.parse(taskDueDate))) {
            logging_1.default.error(NAMESPACE, 'Invalid taskDueDate format. Please provide a valid date string.');
            return socket.emit('CREATE_TASK', {
                error: true,
                message: 'Invalid taskDueDate format. Please provide a valid date string.'
            });
        }
        if (taskEstimatedHours !== undefined && (isNaN(taskEstimatedHours) || taskEstimatedHours < 0)) {
            logging_1.default.error(NAMESPACE, 'Invalid taskEstimatedHours. Please provide a positive number.');
            return socket.emit('CREATE_TASK', {
                error: true,
                message: 'Invalid taskEstimatedHours. Please provide a positive number.'
            });
        }
        return ProjectTasks_1.default.createTask(pool, socket, io, userSessionToken, projectToken, bannerToken, taskContainerUUID, taskName, taskDescription, taskStatus, taskDueDate, taskImportance, taskEstimatedHours, taskLabels, taskRecurringPattern, taskReminderDate, taskDependencies);
    });
    socket.on('reorder-task', async ({ userSessionToken, projectToken, bannerToken, taskContainerUUID, taskUUID }) => {
        return ProjectTasks_1.default.reorderTasks(pool, socket, io, userSessionToken, projectToken, bannerToken, taskContainerUUID, taskUUID);
    });
    socket.on('get-task-data', async ({ userSessionToken, projectToken, taskUUID }) => {
        return ProjectTasks_1.default.getTaskData(pool, socket, io, userSessionToken, projectToken, taskUUID);
    });
    socket.on('disconnect', () => { });
});
//* Create The Api
httpServer.listen(config_1.default.server.port, () => {
    logging_1.default.info(NAMESPACE, `Api is runing on: ${config_1.default.server.hostname}:${config_1.default.server.port}`);
});
