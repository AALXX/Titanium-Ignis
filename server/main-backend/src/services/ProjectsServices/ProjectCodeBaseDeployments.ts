import { Response } from 'express';
import logging from '../../config/logging';
import { connect, CustomRequest, query } from '../../config/postgresql';
import utilFunctions from '../../util/utilFunctions';
import { eDeploymentType, IProjectConfig } from '../../Models/ProjectsModels';
import { Socket } from 'socket.io';
import child_process from 'child_process';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { redisClient } from '../../config/redis';
import { IProcess } from '../../Models/ProcessModels';
import { validationResult } from 'express-validator';
import { eDeploymentStatus } from '../../types/DeploymentTypes';

const activeProcesses: Map<string, child_process.ChildProcess> = new Map();
const startDeploymentProcedure = async (
    socket: Socket,
    pool: Pool,
    userSessionToken: string,
    name: string,
    projectToken: string,
    deploymentID: number,
    branch: string,
    version: string,
    server: string,
    domain: string,
    description?: string,
) => {
    try {
        // Generate a unique process ID
        const processId = randomUUID();

        let projectConfig: IProjectConfig = {
            services: [],
            deployments: [],
        };

        try {
            projectConfig = JSON.parse(fs.readFileSync(`${process.env.PROJECTS_FOLDER_PATH}/${projectToken}/project-config.json`, 'utf8'));
        } catch (error: any) {
            logging.error('STARTS_DEPLOYMENT_READING_FILE_FUNC', error.message);
        }

        if (projectConfig.services.length < deploymentID) {
            return socket.emit('deployment-error', {
                error: true,
                errmsg: 'Invalid service ID',
            });
        }

        switch (projectConfig.deployments[deploymentID - 1].type) {
            case eDeploymentType.DOCKER_COMPOSE:
                const connection = await connect(pool);

                const checkQuery = `SELECT id, Status FROM projects_deployments WHERE ProjectToken = $1 AND DeploymentID = $2`;
                const existingDeployment = await connection!.query(checkQuery, [projectToken, deploymentID]);

                if (existingDeployment.rows.length > 0) {
                    const updateQuery = `UPDATE projects_deployments SET Status = $1 WHERE ProjectToken = $2 AND DeploymentID = $3`;
                    await connection!.query(updateQuery, [eDeploymentStatus.STOPPED, projectToken, deploymentID]);

                    logging.info('START_DEPLOYMENT', `Found existing deployment with ID ${deploymentID}. Setting status to STOPPED.`);
                }

                const insertQuery = `INSERT INTO projects_deployments (ProjectToken, DeploymentID, Name, type, Branch, Version, DeploymentUrl, Server, Status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
                await connection!.query(insertQuery, [projectToken, deploymentID, name, projectConfig.deployments[deploymentID - 1].type, branch, version, domain, server, eDeploymentStatus.DEPLOYING]);

                socket.emit('deployment-started', {
                    deploymentID,
                    deploymentName: name,
                    status: eDeploymentStatus.DEPLOYING,
                    environment: 'production',
                    timestamp: new Date(Date.now()).toISOString(),
                });

                const deploymentResult = await DeployWithDockerCompose(socket, pool, projectConfig, deploymentID, projectToken);

                if (deploymentResult.success) {
                    const updateQuery = `UPDATE projects_deployments SET Status = $1, additinaldata = $2 WHERE ProjectToken = $3 AND DeploymentID = $4`;
                    await connection!.query(updateQuery, [
                        eDeploymentStatus.DEPLOYED,
                        JSON.stringify({ containerId: deploymentResult.containerId, containerName: deploymentResult.containerName }),
                        projectToken,
                        deploymentID,
                    ]);
                    connection!.release();
                    socket.emit('deployment-update', {
                        deploymentID,
                        status: eDeploymentStatus.DEPLOYED,
                    });
                } else {
                    connection!.release();
                    return socket.emit('deployment-update', {
                        deploymentID,
                        status: eDeploymentStatus.FAILED,
                    });
                }
                break;

            default:
                connection!.release();

                break;
        }
    } catch (error: any) {
        logging.error('START_DEPLOYMENT', error);
        return socket.emit('deployment-update', {
            deploymentID,
            status: eDeploymentStatus.FAILED,
        });
    }
};

const getDeployments = async (socket: Socket, pool: Pool, userSessionToken: string, projectToken: string) => {
    try {
        const connection = await connect(pool);
        const getQuery = `SELECT * FROM projects_deployments WHERE ProjectToken = $1`;
        const deployments = await query(connection!, getQuery, [projectToken]);

        // Map the deployments to the desired format
        const mappedDeployments = deployments.map((deployment: any) => ({
            id: deployment.deploymentid,
            name: deployment.name,
            status: deployment.status as eDeploymentStatus,
            environment: 'production',
            timestamp: deployment.deployedat,
        }));

        connection!.release();
        return socket.emit('all-deployments', { deployments: mappedDeployments });
    } catch (error: any) {
        logging.error('GET_DEPLOYMENTS', error.message);
        return socket.emit('get-deployments-error', {
            error: true,
            errmsg: 'Failed to connect to database',
        });
    }
};
const stopService = async (socket: Socket, data: { projectToken: string; processId: string }) => {
    try {
        const { processId, projectToken } = data;
        const process = activeProcesses.get(processId);

        if (!process) {
            logging.error('STOP_SERVICE', `Process ${processId} not found`);
        }

        try {
            process!.kill();
            // // Wait for a short time to see if the process exits on its own
            // await new Promise((resolve) => setTimeout(resolve, 2000));

            // // Check if the process is still running
            // if (process!.killed === false) {
            //     console.log(`Process ${process!.pid} did not exit gracefully. Forcing termination.`);
            // }

            if (!(await utilFunctions.removeService(projectToken, processId))) {
                logging.error('STARTS_SERVICE_REMOVING_SERVICE_FUNC', 'Failed to remove service');
            }

            activeProcesses.delete(processId);
            socket.emit('service-stopped', { processId });
            logging.info('STOP_SERVICE', `Stopped process ${processId}`);
        } catch (error: any) {
            logging.error('STOP_SERVICE', error);
            socket.emit('service-error', {
                processId: data.processId,
                error: 'Failed to stop service',
            });
        }
    } catch (error: any) {
        logging.error('STOP_SERVICE', error);
        socket.emit('service-error', {
            processId: data.processId,
            error: 'Failed to stop service',
        });
    }
};

const cleanupSocketProcesses = (socket: Socket) => {
    for (const [processId, process] of activeProcesses.entries()) {
        try {
            process.kill();
            redisClient.del(`active_services:${processId}`);
            activeProcesses.delete(processId);
            logging.info('CLEANUP', `Cleaned up process ${processId}`);
        } catch (error) {
            logging.error('CLEANUP', `Failed to clean up process ${processId}`);
        }
    }
};

const DeployWithDockerCompose = async (
    socket: Socket,
    pool: Pool,
    projectConfig: IProjectConfig,
    deploymentID: number,
    projectToken: string,
): Promise<{ success: boolean; containerId?: string; containerName?: string }> => {
    try {
        if (projectConfig.deployments[deploymentID - 1].server === 'localhost') {
            const deploymentPath = `${process.env.PROJECT_DEPLOYMENT_FOLDER_PATH}/${projectToken}`;

            if (fs.existsSync(deploymentPath)) {
                fs.rmSync(deploymentPath, { recursive: true });
            }
            fs.mkdirSync(deploymentPath);

            return new Promise<{ success: boolean; containerId?: string; containerName?: string }>((resolve, reject) => {
                const deploymentProcess: child_process.ChildProcess = child_process.spawn('git', ['clone', `${process.env.GIT_REPOSITORY}/${projectToken}.git`, deploymentPath], {
                    cwd: process.env.PROJECT_DEPLOYMENT_FOLDER_PATH,
                    shell: true,
                });

                deploymentProcess.on('error', (error) => {
                    logging.error('START_DEPLOYMENT', `Git clone error: ${error.message}`);
                    resolve({ success: false });
                });

                deploymentProcess.on('exit', async (code) => {
                    if (code === 0) {
                        logging.info('START_DEPLOYMENT', 'Project cloned successfully');

                        if (projectConfig.deployments[deploymentID - 1]['docker-compose-file']) {
                            const dockerComposeProcess: child_process.ChildProcess = child_process.spawn('docker-compose', ['up', '-d'], {
                                cwd: deploymentPath,
                            });

                            dockerComposeProcess.on('error', (error) => {
                                logging.error('START_DEPLOYMENT', `Docker compose error: ${error.message}`);
                                resolve({ success: false });
                            });

                            dockerComposeProcess.on('exit', (dockerCode) => {
                                if (dockerCode === 0) {
                                    logging.info('START_DEPLOYMENT', 'Docker compose up success');

                                    const getContainerInfoProcess = child_process.spawn('docker-compose', ['ps', '--format', '{{.ID}}:{{.Names}}'], {
                                        cwd: deploymentPath,
                                    });

                                    let containerData = '';
                                    getContainerInfoProcess.stdout.on('data', (data) => {
                                        containerData += data.toString();
                                    });

                                    getContainerInfoProcess.on('error', (error) => {
                                        logging.error('START_DEPLOYMENT', `Failed to get container info: ${error.message}`);
                                        resolve({ success: true });
                                    });

                                    getContainerInfoProcess.on('exit', (infoCode) => {
                                        if (infoCode === 0 && containerData) {
                                            const containerInfo = containerData.trim().split('\n')[0];
                                            const [containerId, containerName] = containerInfo.split(':');

                                            logging.info('START_DEPLOYMENT', `Container ID: ${containerId}, Name: ${containerName}`);
                                            resolve({
                                                success: true,
                                                containerId: containerId,
                                                containerName: containerName,
                                            });
                                        } else {
                                            // If we can't get container info, still consider deployment successful
                                            resolve({ success: true });
                                        }
                                    });
                                } else {
                                    logging.error('START_DEPLOYMENT', 'Docker compose up failed');
                                    resolve({ success: false });
                                }
                            });
                        } else {
                            logging.error('START_DEPLOYMENT', 'Docker compose file not found');
                            resolve({ success: false });
                        }
                    } else {
                        logging.error('START_DEPLOYMENT', 'Git clone failed');
                        resolve({ success: false });
                    }
                });
            });
        } else {
            logging.error('START_DEPLOYMENT', 'Deployment server not supported');
            return { success: false };
        }
    } catch (error: any) {
        logging.error('START_DEPLOYMENT', error);
        return { success: false };
    }
};

const getDeploymentsOverviewData = async (req: CustomRequest, res: Response) => {
    try {
        const connection = await connect(req.pool!);

        const getRequestQuery = `SELECT * FROM request_logs WHERE ProjectToken = $1`;
        const requestsResult = await query(connection!, getRequestQuery, [req.params.projectToken]);

        requestsResult.sort((a: any, b: any) => b.timestamp - a.timestamp);
        const requests = requestsResult.map((request: any) => {
            return {
                id: request.id,
                method: request.method,
                path: request.path,
                status: request.status,
                time: request.responsetime,
                timestamp: new Date(request.timestamp).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                }),
                ip: request.requestip,
            };
        });

        // nub of request per hour and average response time as array
        const requestPerHour = requests.reduce((acc: any, request: any) => {
            const hour = new Date(request.timestamp).getHours();
            if (!acc[hour]) {
                acc[hour] = {
                    count: 1,
                    totalTime: request.time,
                };
            } else {
                acc[hour].count++;
                acc[hour].totalTime += request.time;
            }
            return acc;
        }, {});

        const reequestPerHour = Object.keys(requestPerHour).map((hour: any) => {
            return {
                name: `${hour.toString().padStart(2, '0')}:00`, //we use hour as name because we want to display it as x-axis in the chart
                requests: requestPerHour[hour].count,
                responseTime: (requestPerHour[hour].totalTime / requestPerHour[hour].count).toFixed(1),
            };
        });


        const avgResponseTime = requests.reduce((total: any, request: any) => total + request.time, 0) / requests.length;

        const projectDeploymentsQuery = `SELECT * FROM projects_deployments WHERE projecttoken = $1`;
        const projectDeploymentsResult = await query(connection!, projectDeploymentsQuery, [req.params.projectToken]);

        const activeDeployments = projectDeploymentsResult.filter((deployment: any) => deployment.status === 'deployed');

        connection?.release();
        return res.status(200).json({
            error: false,
            requests: requests,
            avgResponseTime: avgResponseTime.toFixed(1),
            totalRequests: requests.length,
            totalDeployments: projectDeploymentsResult.length,
            activeDeployments: activeDeployments.length,
            requestPerHour: reequestPerHour,
        });
    } catch (error: any) {
        logging.error('GET_PROJECT_REQUESTS', error);
    }
};

export default { startDeploymentProcedure, getDeployments, stopService, cleanupSocketProcesses, getDeploymentsOverviewData };
