import { Response } from 'express';
import logging from '../../config/logging';
import { connect, CustomRequest, query } from '../../config/postgresql';
import utilFunctions from '../../util/utilFunctions';
import { eDeploymentType, IProjectConfig } from '../../Models/ProjectsModels';
import { Socket } from 'socket.io';
import child_process from 'child_process';
import { Pool, Connection, PoolClient } from 'pg';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { redisClient } from '../../config/redis';
import { IProcess } from '../../Models/ProcessModels';
import { validationResult } from 'express-validator';
import { DeploymentFormData, eDeploymentStatus } from '../../types/DeploymentTypes';
import Docker, { Container } from 'dockerode';
import { v4 } from 'uuid';

const CustomRequestValidationResult = validationResult.withDefaults({
    formatter: (error) => {
        return {
            errorMsg: error.msg,
        };
    },
});

const activeProcesses: Map<string, child_process.ChildProcess> = new Map();

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
const getDeploymentsOverviewData = async (req: CustomRequest, res: Response): Promise<void> => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().forEach((error) => logging.error('GET_PROJECT_CODEBASE_DATA_FUNC', error.errorMsg));
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    try {
        const connection = await connect(req.pool!);

        const getRequestQuery = `SELECT * FROM request_logs WHERE ProjectToken = $1`;
        const requestsResult = await query(connection!, getRequestQuery, [req.params.projectToken]);

        requestsResult.sort((a: any, b: any) => b.timestamp - a.timestamp);

        const requests = requestsResult.map((request: any) => ({
            id: request.id,
            method: request.method,
            path: request.path,
            status: request.status,
            time: request.responsetime,
            timestamp: new Date(request.timestamp).toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            }),
            timestampRaw: request.timestamp,
            ip: request.requestip,
        }));

        const formatHour = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:00`;

        const formatDay = (date: Date) => `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;

        const formatMonth = (date: Date) => `${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`;

        const bucketReducer = (requests: any[], formatFn: (d: Date) => string) =>
            requests.reduce((acc: any, req: any) => {
                const date = new Date(req.timestampRaw);
                const key = formatFn(date);

                if (!acc[key]) acc[key] = { count: 1, totalTime: req.time };
                else {
                    acc[key].count++;
                    acc[key].totalTime += req.time;
                }
                return acc;
            }, {});

        const requestPerHour = bucketReducer(requests, formatHour);
        const requestPerDay = bucketReducer(requests, formatDay);
        const requestPerMonth = bucketReducer(requests, formatMonth);

        const formatData = (data: any) =>
            Object.keys(data).map((key: string) => ({
                name: key,
                requests: data[key].count,
                responseTime: (data[key].totalTime / data[key].count).toFixed(1),
            }));

        const avgResponseTime = requests.length > 0 ? requests.reduce((t: number, r: any) => t + r.time, 0) / requests.length : 0;

        const projectDeploymentsQuery = `SELECT * FROM projects_deployments WHERE projecttoken = $1`;
        const projectDeploymentsResult = await query(connection!, projectDeploymentsQuery, [req.params.projectToken]);

        const activeDeployments = projectDeploymentsResult.filter((d: any) => d.status === 'deployed');

        connection?.release();

        res.status(200).json({
            error: false,
            requests: requests,
            avgResponseTime: avgResponseTime.toFixed(1),
            totalRequests: requests.length,
            totalDeployments: projectDeploymentsResult.length,
            activeDeployments: activeDeployments.length,
            requestPerHour: formatData(requestPerHour),
            requestPerDay: formatData(requestPerDay),
            requestPerMonth: formatData(requestPerMonth),
        });
    } catch (error: any) {
        logging.error('GET_PROJECT_REQUESTS', error);
    }
};


const getDeploymentOptions = async (req: CustomRequest, res: Response): Promise<void> => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_PROJECT_CODEBASE_DATA_FUNC', error.errorMsg);
        });

        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    try {
        const connection = await connect(req.pool!);

        const [types, os, datacenters] = await Promise.all([
            query(connection!, 'SELECT * FROM deployment_types', []),
            query(connection!, 'SELECT * FROM deployment_os', []),
            query(connection!, 'SELECT * FROM deployment_data_centers', []),
        ]);

        connection?.release();

        res.status(200).json({
            error: false,
            deploymentOptions: {
                types: types,
                os: os,
                datacenters: datacenters,
            },
        });
        return;
    } catch (error: any) {
        logging.error('GET_DEPLOYMENT_OPTIONS', error);
        res.status(200).json({
            error: true,
            message: 'Something went wrong',
        });
    }
};

const getDeploymentDetails = async (req: CustomRequest, res: Response): Promise<void> => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_PROJECT_CODEBASE_DATA_FUNC', error.errorMsg);
        });

        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    try {
        const connection = await connect(req.pool!);

        const [project, deployment] = await Promise.all([
            query(connection!, 'SELECT projectname, projecttoken, created_at FROM projects WHERE projecttoken = $1', [req.params.projectToken]),
            query(
                connection!,
                'SELECT deploymenttoken, serviceid, name, type, domain, ipv4, ipv6, localip, ports, datacenterlocation, os, createdat, deployedat, updatedat, status, environment, isactive, additionalinfo, resourceallocation, deploymentmethod, deploymentduration, deployedby, lasthealthcheckat, rollbackreference, tags FROM projects_deployments WHERE deploymenttoken = $1',
                [req.params.deploymentToken],
            ),
        ]);

        connection?.release();

        res.status(200).json({
            error: false,
            project: project,
            deployment: deployment,
        });
        return;
    } catch (error: any) {
        logging.error('GET_DEPLOYMENT_DETAILS', error);
        res.status(200).json({
            error: true,
            message: 'Something went wrong',
        });
    }
};

export default { stopService, cleanupSocketProcesses, getDeploymentsOverviewData, getDeploymentOptions, getDeploymentDetails };
