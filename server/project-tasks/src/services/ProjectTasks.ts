import { Pool } from 'pg'
import { Server, Socket } from 'socket.io'
import { connect, query } from '../config/postgresql'
import { ContainerState, ITasks } from '../types/TaskTypes'
import logging from '../config/logging'
import { v4 as uuidv4 } from 'uuid'
import { checkForPermissions, getUserPrivateTokenFromSessionToken, getUserPublicTokenFromSessionToken } from '../utils/utils'

const getProjectBannerTasks = async (pool: Pool, io: Server, socket: Socket, bannerToken: string) => {
    try {
        const connection = await connect(pool!)
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
        `

        const rawResults = await query(connection!, queryString, [bannerToken])
        connection?.release()
        //* Process data into separate arrays
        const containersMap = new Map()
        const tasks: ITasks[] = []

        rawResults.forEach((row: any) => {
            if (!containersMap.has(row.containeruuid)) {
                containersMap.set(row.containeruuid, {
                    containeruuid: row.containeruuid,
                    containername: row.containername,
                    state: ContainerState.Created,
                    order: row.containerorder
                })
            }

            if (row.taskuuid) {
                tasks.push({
                    TaskUUID: row.taskuuid as string,
                    TaskName: row.taskname as string,
                    TaskDescription: row.taskdescription as string,
                    TaskStatus: row.taskstatus as string,
                    TaskImportance: row.taskimportance as string,
                    ContainerUUID: row.containeruuid as string,
                    TaskDueDate: row.taskduedate
                })
            }
        })

        socket.emit('PROJECT_TASKS', {
            containers: Array.from(containersMap.values()),
            tasks: tasks
        })
    } catch (error: any) {
        logging.error('PROJECT_TASKS', error.message)
        socket.emit('PROJECT_TASKS', {
            error: true,
            message: 'Error getting project tasks containers'
        })
    }
}

const createTaskContainer = async (pool: Pool, io: Server, socket: Socket, userSessionToken: string, projectToken: string, containerUUID: string, bannerToken: string, taskContainerName: string) => {
    try {
        const connection = await connect(pool)
        if ((await checkForPermissions(connection!, projectToken, userSessionToken, 'task', 'create')) === false) {
            return socket.emit('CREATED_TASK_CONTAINER', {
                error: true,
                message: 'You do not have permission to create a task container'
            })
        }

        if (!containerUUID) {
            containerUUID = uuidv4()
        }

        const getMaxOrderQuery = `
            SELECT COALESCE(MAX(ContainerOrder), 0) as maxOrder
            FROM banner_tasks_containers
            WHERE BannerToken = $1
        `
        const maxOrderResult = await query(connection!, getMaxOrderQuery, [bannerToken])
        const newOrder = maxOrderResult[0].maxorder + 1

        const queryString = `
            INSERT INTO banner_tasks_containers (
                BannerToken, 
                ContainerName, 
                ContainerUUID, 
                ContainerOrder
            ) VALUES ($1, $2, $3, $4)
        `

        await query(connection!, queryString, [bannerToken, taskContainerName, containerUUID, newOrder])

        io.to(bannerToken).emit('CREATED_TASK_CONTAINER', {
            error: false,
            containerUUID: containerUUID,
            containerOrder: newOrder
        })

        connection?.release()
    } catch (error: any) {
        logging.error('CREATED_TASK_CONTAINER', error.message)
        socket.emit('CREATED_TASK_CONTAINER', {
            error: true,
            message: 'Error creating task container'
        })
    }
}

const reorderTaskContainers = async (pool: Pool, socket: Socket, io: Server, userSessionToken: string, projectToken: string, bannerToken: string, newOrder: { containerUUID: string; order: number }[]) => {
    try {
        const connection = await connect(pool)

        if ((await checkForPermissions(connection!, projectToken, userSessionToken, 'task', 'manage')) === false) {
            connection?.release()
            return socket.emit('REORDERED_TASK_CONTAINERS', {
                error: true,
                message: 'You do not have permission to reorder task containers'
            })
        }

        await query(connection!, 'BEGIN')

        for (const item of newOrder) {
            const queryString = `
                UPDATE banner_tasks_containers 
                SET ContainerOrder = $1 
                WHERE ContainerUUID = $2 AND BannerToken = $3
            `
            await query(connection!, queryString, [item.order, item.containerUUID, bannerToken])
        }

        await query(connection!, 'COMMIT')

        io.to(bannerToken).emit('REORDERED_TASK_CONTAINERS', {
            error: false,
            message: 'Task containers reordered successfully'
        })

        connection?.release()
    } catch (error: any) {
        const connection = await connect(pool)
        await query(connection!, 'ROLLBACK')
        connection?.release()

        logging.error('REORDERED_TASK_CONTAINERS', error.message)
        socket.emit('REORDERED_TASK_CONTAINERS', {
            error: true,
            message: 'Error reordering task containers'
        })
    }
}

const deleteTaskContainer = async (pool: Pool, socket: Socket, io: Server, projectToken: string, userSessionToken: string, bannerToken: string, taskContainerUUID: string) => {
    try {
        const connection = await connect(pool)

        if ((await checkForPermissions(connection!, projectToken, userSessionToken, 'task', 'create')) === false) {
            return socket.emit('DELETED_TASK_CONTAINER', {
                error: true,
                message: 'You do not have permission to delete a task container'
            })
        }

        const deleteContainerQueryString = `DELETE FROM banner_tasks_containers WHERE BannerToken = $1 AND ContainerUUID = $2`
        await query(connection!, deleteContainerQueryString, [bannerToken, taskContainerUUID])

        const deleteTasksQueryString = `DELETE FROM banner_tasks WHERE ContainerUUID = $1`
        await query(connection!, deleteTasksQueryString, [taskContainerUUID])

        connection?.release()
        io.to(bannerToken).emit('DELETED_TASK_CONTAINER', {
            containerUUID: taskContainerUUID,
            error: false
        })
    } catch (error: any) {
        logging.error('DELETED_TASK_CONTAINER', error.message)
        socket.emit('DELETED_TASK_CONTAINER', {
            error: true,
            message: 'Error deleting task container'
        })
    }
}

const createTask = async (
    pool: Pool,
    socket: Socket,
    io: Server,
    userSessionToken: string,
    projectToken: string,
    bannerToken: string,
    taskContainerUUID: string,
    taskName: string,
    taskDescription: string,
    taskStatus: string,
    taskDueDate: string,
    taskImportance: string,
    taskEstimatedHours?: number,
    taskLabels?: string[],
    taskReminderDate?: string,
    taskDependencies?: string[],
    taskCustomFields?: Record<string, any>
) => {
    try {
        const connection = await connect(pool)

        console.log(projectToken, userSessionToken)

        if ((await checkForPermissions(connection!, projectToken, userSessionToken, 'task', 'create')) === false) {
            logging.error('CREATED_TASK', 'User does not have permission to create a task')
            return socket.emit('CREATED_TASK', {
                error: true,
                message: 'You do not have permission to delete a task container'
            })
        }

        const userPrivateToken = await getUserPrivateTokenFromSessionToken(connection!, userSessionToken)

        if (!userPrivateToken) {
            return socket.emit('CREATED_TASK', {
                error: true,
                message: 'User not found'
            })
        }

        const TaskUUID = uuidv4()

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
        `

        const formattedLabels = taskLabels ? taskLabels : null
        const formattedDependencies = taskDependencies ? taskDependencies : null

        const formattedCustomFields = taskCustomFields ? JSON.stringify(taskCustomFields) : null

        await query(connection!, queryString, [
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
        ])

        connection?.release()

        io.to(bannerToken).emit('CREATED_TASK', {
            error: false,
            containerUUID: taskContainerUUID,
            taskUUID: TaskUUID,
            taskName: taskName,
            taskImportance: taskImportance,
            taskDueDate: taskDueDate
        })
    } catch (error: any) {
        logging.error('CREATE_TASK_FUNC', error.message)
        socket.emit('CREATED_TASK', {
            error: true,
            message: 'Error creating task'
        })
    }
}

const reorderTasks = async (pool: Pool, socket: Socket, io: Server, userSessionToken: string, projectToken: string, bannerToken: string, taskContainerUUID: string, taskUUID: string) => {
    try {
        const connection = await connect(pool)

        if ((await checkForPermissions(connection!, projectToken, userSessionToken, 'task', 'manage')) === false) {
            logging.error('REORDER_TASKS', 'User does not have permission to reorder tasks')
            return socket.emit('REORDERED_TASKS', {
                error: true,
                message: 'You do not have permission to reorder tasks'
            })
        }

        console.log('Reordering task:', taskUUID, 'to container:', taskContainerUUID)

        const queryString = `
        UPDATE banner_tasks SET ContainerUUID = $1 WHERE TaskUUID = $2 RETURNING *`
        const result = await query(connection!, queryString, [taskContainerUUID, taskUUID])

        if (result.length === 0) {
            logging.error('REORDER_TASKS', 'Task not found or not updated')
            return socket.emit('REORDERED_TASKS', {
                error: true,
                message: 'Task not found or not updated'
            })
        }

        connection?.release()

        io.to(bannerToken).emit('REORDERED_TASKS', {
            error: false,
            containerUUID: taskContainerUUID,
            taskUUID: taskUUID,
            task: result[0]
        })
    } catch (error: any) {
        logging.error('REORDER_TASKS', error.message)
        socket.emit('REORDERED_TASKS', {
            error: true,
            message: 'Error reordering tasks: ' + error.message
        })
    }
}

export default { getProjectBannerTasks, createTaskContainer, createTask, reorderTaskContainers, reorderTasks, deleteTaskContainer }
