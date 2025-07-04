import { Server } from 'socket.io'
import http from 'http'
import config from './config/config'
import logging from './config/logging'
import DeploymentsServices from './services/DeploymentsServices'
import DockerStateTracker from './services/DockerStateTracker'
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
    socket.on('join-project', (data: { projectToken: string }) => {
        socket.join(data.projectToken)
    })

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
    
    socket.on('disconnect', () => {})
})

httpServer.listen(config.server.port, async () => {
    logging.info(NAMESPACE, `Api is running on: ${config.server.hostname}:${config.server.port}`)

    await initializeProjectEventsMonitoring()
})

export default io
