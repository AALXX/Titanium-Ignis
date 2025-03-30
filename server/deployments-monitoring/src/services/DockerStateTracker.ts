import { Server } from 'socket.io'
import { Pool } from 'pg'
import Docker from 'dockerode'
import { Readable } from 'stream'
import { connect, query } from '../config/postgresql'
import { eDeploymentStatus } from '../types/DeploymentTypes'

interface ContainerEvent {
    type: 'status-change' | 'error'
    containerId: string
    deploymentId: number
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

    const getProjectContainers = async (projectToken: string): Promise<Array<{ containerId: string; deploymentId: number }>> => {
        try {
            const connection = await connect(pool)

            const getDeploymentsDataQuery = `
            SELECT DeploymentID, AdditinalData FROM projects_deployments
            WHERE ProjectToken = $1
        `
            const deploymentsData = await query(connection!, getDeploymentsDataQuery, [projectToken])

            const contaienrs = deploymentsData.map((deployment: { deploymentid: number; additinaldata: { containerId: string } }) => {
                return {
                    containerId: deployment.additinaldata.containerId,
                    deploymentId: deployment.deploymentid
                }
            })
            connection!.release()
            return contaienrs
        } catch (error: any) {
            console.error('Error fetching project containers:', error)
            return []
        }
    }

    const broadcastError = (projectToken: string, context: string, error: any): void => {
        const errorEvent: ContainerEvent = {
            type: 'error',
            containerId: 'unknown',
            deploymentId: 0,
            containerName: 'unknown',
            currentState: 'error',
            timestamp: Date.now(),
            reason: `${context}: ${error.toString()}`
        }

        io.to(projectToken).emit('deployment-event', errorEvent)
    }

    const handleContainerEvent = async (projectToken: string, event: any, containerStates: Map<string, string>, deploymentId: number): Promise<void> => {
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
                deploymentId,
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
                WHERE deploymentid = $2
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

            await query(connection!, updateDeploymentStatusQuery, [statusValue, deploymentId])
            connection!.release()

            io.to(projectToken).emit('deployment-event', containerEvent)
        } catch (error: any) {
            broadcastError(projectToken, 'Error handling container event', error)
        }
    }

    const startProjectEventsMonitoring = async (projectToken: string): Promise<void> => {
        stopProjectEventsMonitoring(projectToken)

        const containers = await getProjectContainers(projectToken)
        return new Promise((resolve, reject) => {
            try {
                docker.getEvents(
                    {
                        filters: {
                            container: containers.map(container => container.containerId),
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
                                // slice the  because the id gets saved into db as a 12 char id for some reason
                                await handleContainerEvent(projectToken, parsedEvent, containerStates, containers.filter(container => container.containerId === parsedEvent.id.slice(0, 12))[0].deploymentId)
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
        }
    }

    return {
        startProjectEventsMonitoring,
        stopProjectEventsMonitoring
    }
}

export default { createDockerStateTracker }
