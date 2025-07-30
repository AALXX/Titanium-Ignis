import { Server } from 'socket.io'
import http from 'http'
import config from './config/config'
import logging from './config/logging'
import TasksService from './services/ProjectTasks'
import { createPool } from './config/postgresql'

const httpServer = http.createServer()
const NAMESPACE = 'ProjectTasks_API'

const pool = createPool()

const io = new Server(httpServer, {
    cors: {
        origin: ['http://localhost:3000', process.env.FRONTEND_URL as string]
    }
})

io.on('connection', socket => {
    socket.on('join', ({ BannerToken }) => {
        socket.join(BannerToken)
    })

    socket.on('get-project-tasks', async ({ BannerToken }) => {
        return TasksService.getProjectBannerTasks(pool, io, socket, BannerToken)
    })

    socket.on('create-task-container', async ({ userSessionToken, projectToken, bannerToken, taskContainerName, containerUUID }) => {
        return TasksService.createTaskContainer(pool, io, socket, userSessionToken, projectToken, containerUUID, bannerToken, taskContainerName)
    })

    socket.on('reorder-task-containers', async ({ userSessionToken, projectToken, bannerToken, newOrder }) => {
        if (!Array.isArray(newOrder) || newOrder.length === 0) {
            return socket.emit('REORDERED_TASK_CONTAINERS', {
                error: true,
                message: 'Invalid order data. Expected array of container UUIDs and orders.'
            })
        }

        return TasksService.reorderTaskContainers(pool, socket, io, userSessionToken, projectToken, bannerToken, newOrder)
    })

    socket.on('delete-task-container', async ({ userSessionToken, projectToken, bannerToken, containerUUID }) => {
        return TasksService.deleteTaskContainer(pool, socket, io, projectToken, userSessionToken, bannerToken, containerUUID)
    })

    socket.on(
        'create-task',
        async ({
            userSessionToken,
            projectToken,
            bannerToken,
            taskContainerUUID,
            taskName,
            taskDescription = '',
            taskStatus = 'Todo',
            taskDueDate,
            taskImportance = 'Medium',
            taskEstimatedHours, // Optional
            taskLabels = [], // Optional
            taskRecurringPattern, // Optional
            taskReminderDate, // Optional
            taskDependencies = [] // Optional
        }) => {
            if (!taskName || !taskContainerUUID || !taskDueDate) {
                logging.error(NAMESPACE, 'Missing required fields: taskName, taskContainerUUID, taskDueDate, and createdByUserPublicToken are required')
                return socket.emit('CREATE_TASK', {
                    error: true,
                    message: 'Missing required fields: taskName, taskContainerUUID, taskDueDate, and createdByUserPublicToken are required'
                })
            }

            if (isNaN(Date.parse(taskDueDate))) {
                logging.error(NAMESPACE, 'Invalid taskDueDate format. Please provide a valid date string.')
                return socket.emit('CREATE_TASK', {
                    error: true,
                    message: 'Invalid taskDueDate format. Please provide a valid date string.'
                })
            }

            if (taskEstimatedHours !== undefined && (isNaN(taskEstimatedHours) || taskEstimatedHours < 0)) {
                logging.error(NAMESPACE, 'Invalid taskEstimatedHours. Please provide a positive number.')
                return socket.emit('CREATE_TASK', {
                    error: true,
                    message: 'Invalid taskEstimatedHours. Please provide a positive number.'
                })
            }

            return TasksService.createTask(
                pool,
                socket,
                io,
                userSessionToken,
                projectToken,
                bannerToken,
                taskContainerUUID,
                taskName,
                taskDescription,
                taskStatus,
                taskDueDate,
                taskImportance,
                taskEstimatedHours,
                taskLabels,
                taskRecurringPattern,
                taskReminderDate,
                taskDependencies
            )
        }
    )

    socket.on('reorder-task', async ({ userSessionToken, projectToken, bannerToken, taskContainerUUID, taskUUID }) => {
        return TasksService.reorderTasks(pool, socket, io, userSessionToken, projectToken, bannerToken, taskContainerUUID, taskUUID)
    })

    socket.on('get-task-data', async ({ userSessionToken, projectToken,  taskUUID }) => {
        return TasksService.getTaskData(pool, socket, io, userSessionToken, projectToken,  taskUUID)
    })

    socket.on('disconnect', () => {})
})

//* Create The Api
httpServer.listen(config.server.port, () => {
    logging.info(NAMESPACE, `Api is runing on: ${config.server.hostname}:${config.server.port}`)
})
