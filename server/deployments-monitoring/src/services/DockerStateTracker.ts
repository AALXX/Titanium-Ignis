import { Server } from 'socket.io'
import { Pool } from 'pg'
import Docker from 'dockerode'
import { Readable } from 'stream'
import { connect, query } from '../config/postgresql'
import { eDeploymentStatus } from '../types/DeploymentTypes'
import logging from '../config/logging'

interface ContainerEvent {
    type: 'status-change' | 'error'
    containerId: string
    containerName: string
    previousState?: string
    currentState: string
    timestamp: number
    reason?: string
}

const createDockerStateTracker = (io: Server, pool: Pool) => {
    const docker = new Docker()
    const eventStreams: Map<string, Readable> = new Map()
    const containerStates: Map<string, string> = new Map()

    const getProjectContainers = async (projectToken: string): Promise<Array<{ containerId: string; serviceid: number }>> => {
        try {
            const connection = await connect(pool)

            const getDeploymentsDataQuery = `
            SELECT containerID, DeploymentToken FROM projects_deployments
            WHERE ProjectToken = $1 AND containerID IS NOT NULL
        `
            const deploymentsData = await query(connection!, getDeploymentsDataQuery, [projectToken])

            const containers = deploymentsData.map((deployment: { containerid: string; deploymenttoken: string }) => {
                return {
                    containerId: deployment.containerid,
                    serviceid: deployment.deploymenttoken
                }
            })
            connection!.release()

            logging.info('DockerStateTracker', `Found ${containers.length} containers for project ${projectToken}`)
            return containers
        } catch (error: any) {
            console.error('Error fetching project containers:', error)
            return []
        }
    }

    const updateDbData = async (projectToken: string): Promise<void> => {
        try {
            const connection = await connect(pool)

            const getDeploymentsDataQuery = `
                SELECT containerID, DeploymentToken FROM projects_deployments
                WHERE ProjectToken = $1 AND containerID IS NOT NULL
            `
            const deploymentsData = await query(connection!, getDeploymentsDataQuery, [projectToken])

            const containers = deploymentsData.map((deployment: { containerid: string; deploymenttoken: string }) => {
                return {
                    containerId: deployment.containerid,
                    serviceid: deployment.deploymenttoken
                }
            })

            for (const container of containers) {
                const containerInfo = await docker.getContainer(container.containerId).inspect()
                let currentState = containerInfo.State.Status
                console.log(container.containerId, currentState)

                switch (currentState) {
                    case 'running':
                        currentState = eDeploymentStatus.DEPLOYED
                        break
                    case 'exited':
                    default:
                        currentState = eDeploymentStatus.STOPPED
                        break
                }

                const updateQuery = `
                    UPDATE projects_deployments
                    SET status = $1
                    WHERE containerid = $2
                `
                await query(connection!, updateQuery, [currentState, container.containerId])
            }

            connection!.release()
        } catch (error: any) {
            console.error('Error updating DB data:', error)
        }
    }

    const broadcastError = (projectToken: string, context: string, error: any): void => {
        const errorEvent: ContainerEvent = {
            type: 'error',
            containerId: 'unknown',
            containerName: 'unknown',
            currentState: 'error',
            timestamp: Date.now(),
            reason: `${context}: ${error.toString()}`
        }
        logging.error('DockerStateTracker', `Error in ${context}: ${error.toString()}`)
        io.to(projectToken).emit('deployment-event', errorEvent)
    }

    const handleContainerEvent = async (projectToken: string, event: any, containerStates: Map<string, string>, containerID: string): Promise<void> => {
        try {
            const containerId = event.id
            const containerName = event.Actor?.Attributes?.name || containerId
            const container = docker.getContainer(containerId)
            const containerInfo = await container.inspect()
            const currentState = containerInfo.State.Status

            const previousState = containerStates.get(containerId)
            containerStates.set(containerId, currentState)

            const containerEvent: ContainerEvent = {
                type: 'status-change',
                containerId,
                containerName,
                previousState,
                currentState,
                timestamp: Date.now(),
                reason: event.Action
            }

            const connection = await connect(pool)
            const updateDeploymentStatusQuery = `
                UPDATE projects_deployments
                SET status = $1
                WHERE containerid = $2
                RETURNING DeploymentToken
            `
            let statusValue
            switch (currentState) {
                case 'running':
                    statusValue = eDeploymentStatus.DEPLOYED
                    break
                case 'exited':
                default:
                    statusValue = eDeploymentStatus.STOPPED
                    break
            }

            const result = await query(connection!, updateDeploymentStatusQuery, [statusValue, containerId])

            connection!.release()

            logging.info('DockerStateTracker', `Container ${containerName} (${containerId}) state changed to ${currentState}`)
            io.to(projectToken).emit('deployment-event', { deploymentToken: result[0].deploymenttoken, currentState: statusValue })
        } catch (error: any) {
            broadcastError(projectToken, 'Error handling container event', error)
        }
    }

    const startProjectEventsMonitoring = async (projectToken: string): Promise<void> => {
        stopProjectEventsMonitoring(projectToken)

        const containers = await getProjectContainers(projectToken)

        if (containers.length === 0) {
            logging.info('DockerStateTracker', `No containers found for project ${projectToken}, skipping events monitoring`)
            return Promise.resolve()
        }

        const containerIds = containers.map(container => container.containerId)
        updateDbData(projectToken)
        return new Promise((resolve, reject) => {
            try {
                docker.getEvents(
                    {
                        filters: {
                            container: containerIds,
                            event: ['start', 'stop', 'restart', 'die', 'kill', 'destroy', 'pause', 'unpause']
                        }
                    },
                    (err, stream) => {
                        if (err) {
                            broadcastError(projectToken, 'Event stream creation error', err)
                            reject(err)
                            return
                        }

                        const readableStream =
                            stream instanceof Readable
                                ? stream
                                : new Readable({
                                      read() {
                                          this.push(stream)
                                          this.push(null)
                                      }
                                  })

                        readableStream.on('data', async event => {
                            try {
                                const parsedEvent = JSON.parse(event.toString())
                                const container = containers.find(container => container.containerId === parsedEvent.id)

                                if (container) {
                                    await handleContainerEvent(projectToken, parsedEvent, containerStates, container.containerId)
                                }
                            } catch (parseErr) {
                                broadcastError(projectToken, 'Event parsing error', parseErr)
                            }
                        })

                        readableStream.on('error', streamErr => {
                            broadcastError(projectToken, 'Event stream error', streamErr)
                            reject(streamErr)
                        })

                        readableStream.on('end', () => {
                            eventStreams.delete(projectToken)
                        })

                        eventStreams.set(projectToken, readableStream)
                        logging.info('DockerStateTracker', `Event monitoring started for project ${projectToken} with ${containerIds.length} containers`)

                        resolve()
                    }
                )
            } catch (error) {
                broadcastError(projectToken, 'Monitoring start error', error)
                reject(error)
            }
        })
    }

    const stopProjectEventsMonitoring = (projectToken: string): void => {
        const eventStream = eventStreams.get(projectToken)
        if (eventStream) {
            eventStream.destroy()
            eventStreams.delete(projectToken)
            logging.info('DockerStateTracker', `Stopped event monitoring for project ${projectToken}`)
        }
    }

    return {
        startProjectEventsMonitoring,
        stopProjectEventsMonitoring
    }
}

export default { createDockerStateTracker }
