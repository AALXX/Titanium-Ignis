import { Pool } from 'pg'
import { Server, Socket } from 'socket.io'
import { connect, query } from '../config/postgresql'
import logging from '../config/logging'
import { checkForPermissions, getUserPrivateTokenFromSessionToken, getUserPublicTokenFromSessionToken } from '../utils/utils'
import { eDeploymentStatus } from '../types/DeploymentTypes'
import Docker from 'dockerode'

const getAllDeployments = async (pool: Pool, io: Server, socket: Socket, projectToken: string, userSessionToken: string) => {
    try {
        const connection = await connect(pool)

        const getDeploymentsDataQuery = `
            SELECT * FROM projects_deployments WHERE projecttoken = $1
        `
        const deploymentsData = await query(connection!, getDeploymentsDataQuery, [projectToken])

        const mappedDeployments = deploymentsData.map((deployment: any) => ({
            id: deployment.deploymentid,
            name: deployment.name,
            status: deployment.status as eDeploymentStatus,
            environment: 'production',
            timestamp: deployment.deployedat
        }))

        connection!.release()
        return socket.emit('all-deployments', { deployments: mappedDeployments })
    } catch (error: any) {
        logging.error('GET_ALL_DEPLOYMENTS', error.message)
        socket.emit('GET_ALL_DEPLOYMENTS', {
            error: true,
            message: 'An error occurred while fetching deployments.'
        })
    }
}

export default { getAllDeployments }
