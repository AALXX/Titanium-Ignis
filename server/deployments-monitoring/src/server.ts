import { Server } from 'socket.io'
import http from 'http'
import config from './config/config'
import logging from './config/logging'
import DeploymentsServices from './services/DeploymentsServices'
import DockerStateTracker from './services/DockerStateTracker'
import RequestTrackingServices from './services/RequestTrackigService'
import { connect, createPool, query } from './config/postgresql'
import { Pool } from 'pg'

const httpServer = http.createServer()
const NAMESPACE = 'DeploymentsMonitoring_API'

const pool = createPool()

const io = new Server(httpServer, {
    cors: {
        origin: ['http://localhost:3000']
    }
})

let update = true

const dockerStateTracker = DockerStateTracker.createDockerStateTracker(io, pool)
const { startProjectEventsMonitoring, stopProjectEventsMonitoring } = dockerStateTracker

// Export the dockerStateTracker for use in other modules
export { dockerStateTracker }

const getAllProjectTokens = async (pool: Pool): Promise<string[]> => {
    try {
        const connection = await connect(pool)

        const getDeploymentsDataQuery = `
            SELECT DISTINCT projecttoken FROM projects_deployments
        `
        const deploymentsData = await query(connection!, getDeploymentsDataQuery)

        const projectTokens = deploymentsData.map((data: { projecttoken: string }) => data.projecttoken)
        connection!.release()
        return projectTokens
    } catch (error: any) {
        console.error('Error fetching project tokens:', error)
        return []
    }
}

const initializeProjectEventsMonitoring = async () => {
    try {
        const projectTokens = await getAllProjectTokens(pool)

        logging.info(NAMESPACE, `Starting events monitoring for ${projectTokens.length} projects`)
        for (const projectToken of projectTokens) {
            try {
                await startProjectEventsMonitoring(projectToken)
                logging.info(NAMESPACE, `Started events monitoring for project: ${projectToken}`)
            } catch (error) {
                logging.error(NAMESPACE, `Failed to start events monitoring for project: ${projectToken}`, error)
            }
        }
    } catch (error) {
        logging.error(NAMESPACE, 'Error initializing project events monitoring', error)
    }
}

io.on('connection', socket => {
    logging.info(NAMESPACE, `Client connected: ${socket.id}`)

    socket.on('join-project', (data: { projectToken: string }) => {
        socket.join(data.projectToken)
        logging.info(NAMESPACE, `Socket ${socket.id} joined project: ${data.projectToken}`)
    })

    // ============= Request Tracking Management =============
    socket.on('enable-request-tracking', async ({ projectToken, deploymentToken }) => {
        return RequestTrackingServices.enableRequestTracking(pool, io, socket, projectToken, deploymentToken)
    })

    socket.on('disable-request-tracking', async ({ projectToken, deploymentToken }) => {
        return RequestTrackingServices.disableRequestTracking(pool, io, socket, projectToken, deploymentToken)
    })

    socket.on('get-request-logs', async ({ projectToken, deploymentToken, limit }) => {
        return RequestTrackingServices.getRequestLogs(pool, socket, projectToken, deploymentToken, limit || 50)
    })

    socket.on('clear-request-logs', async ({ projectToken, deploymentToken }) => {
        return RequestTrackingServices.clearRequestLogs(pool, socket, projectToken, deploymentToken)
    })

    // ============= Deployment Management =============
    socket.on('get-deployments', async ({ projectToken, userSessionToken }) => {
        return DeploymentsServices.getAllDeployments(pool, io, socket, projectToken, userSessionToken)
    })

    socket.on('create-deployment', async ({ projectToken, userSessionToken, formData }) => {
        return DeploymentsServices.createDeployment(pool, io, socket, projectToken, userSessionToken, formData, dockerStateTracker)
    })

    socket.on('start-deployment', async ({ projectToken, userSessionToken, deploymentToken }) => {
        return DeploymentsServices.startDeployment(pool, io, socket, projectToken, userSessionToken, deploymentToken)
    })

    socket.on('stop-deployment', async ({ projectToken, deploymentToken }) => {
        return DeploymentsServices.stopDeployment(pool, io, socket, projectToken, deploymentToken)
    })

    socket.on('delete-deployment', async ({ projectToken, deploymentToken }) => {
        return DeploymentsServices.deleteDeployment(pool, io, socket, projectToken, deploymentToken)
    })

    // ============= Logs Management =============
    socket.on('get-deployment-logs', async ({ projectToken, deploymentToken, options }) => {
        return DeploymentsServices.getDeploymentLogs(pool, io, socket, projectToken, deploymentToken, options)
    })

    socket.on('stream-deployment-logs', async ({ projectToken, deploymentToken, options }) => {
        return DeploymentsServices.getDeploymentLogs(pool, io, socket, projectToken, deploymentToken, {
            ...options,
            follow: true
        })
    })

    socket.on('stop-logs-stream', () => {
        return DeploymentsServices.stopStreaming(socket, 'logs')
    })

    // ============= Metrics Management =============
    socket.on('get-deployment-metrics', async ({ projectToken, deploymentToken }) => {
        return DeploymentsServices.getDeploymentLogs(pool, io, socket, projectToken, deploymentToken)
    })

    socket.on('stream-deployment-metrics', async ({ projectToken, deploymentToken, interval }) => {
        return DeploymentsServices.streamDeploymentMetrics(pool, io, socket, projectToken, deploymentToken, interval)
    })

    socket.on('stop-metrics-stream', () => {
        return DeploymentsServices.stopStreaming(socket, 'metrics')
    })

    // ============= Disconnect Handling =============
    socket.on('disconnect', () => {
        logging.info(NAMESPACE, `Client disconnected: ${socket.id}`)

        // Clean up any active streams
        if (socket.data.logStream) {
            try {
                socket.data.logStream.destroy()
            } catch (error) {
                logging.error(NAMESPACE, 'Error destroying log stream on disconnect', error)
            }
        }

        if (socket.data.metricsStream) {
            try {
                socket.data.metricsStream.destroy()
            } catch (error) {
                logging.error(NAMESPACE, 'Error destroying metrics stream on disconnect', error)
            }
        }
    })
})

httpServer.listen(config.server.port, async () => {
    logging.info(NAMESPACE, `Api is running on: ${config.server.hostname}:${config.server.port}`)

    await initializeProjectEventsMonitoring()
})

export default io
