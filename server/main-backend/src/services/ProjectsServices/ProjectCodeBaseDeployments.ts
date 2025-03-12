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

const activeProcesses: Map<string, child_process.ChildProcess> = new Map();
const startDeploymentProcedure = async (socket: Socket, userSessionToken: string, projectToken: string, deploymentID: number) => {

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
                DeploayWithDockerCompose(socket, projectConfig, deploymentID, projectToken);
                break;

            default:
                break;
        }
    } catch (error: any) {
        logging.error('START_SERVICE', error);
        socket.emit('service-error', {
            error: 'Failed to start service',
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

const DeploayWithDockerCompose = async (socket: Socket, projectConfig: IProjectConfig, deploymentID: number, projectToken: string) => {
    try {
        if (projectConfig.deployments[deploymentID - 1].server === 'localhost') {
            if (!fs.existsSync(`${process.env.PROJECT_DEPLOYMENT_FOLDER_PATH}/${projectToken}`)) {
                fs.mkdirSync(`${process.env.PROJECT_DEPLOYMENT_FOLDER_PATH}/${projectToken}`);
            } else {
                fs.rmSync(`${process.env.PROJECT_DEPLOYMENT_FOLDER_PATH}/${projectToken}`, { recursive: true });
                fs.mkdirSync(`${process.env.PROJECT_DEPLOYMENT_FOLDER_PATH}/${projectToken}`);
            }

            const deploymentProcess: child_process.ChildProcess = child_process.spawn(`git clone ${process.env.GIT_REPOSITORY}/${projectToken}.git `, {
                cwd: `${process.env.PROJECT_DEPLOYMENT_FOLDER_PATH}/`,
                shell: true,
            });

            deploymentProcess.on('exit', (code) => {
                if (code === 0) {
                    logging.info('START_DEPLOYMENT', 'project cloned successfully');
                    socket.emit('deployment-success', {
                        deploymentID,
                        deploymentName: projectConfig.deployments[deploymentID - 1].name,
                    });

                    if (projectConfig.deployments[deploymentID - 1]['docker-compose-file']) {
                        const dockerComposeProcess: child_process.ChildProcess = child_process.spawn('docker-compose.exe', ['up', '-d'], {
                            cwd: `${process.env.PROJECT_DEPLOYMENT_FOLDER_PATH}/${projectToken}`,
                        });

                        dockerComposeProcess.on('exit', (code) => {
                            if (code === 0) {
                                logging.info('START_DEPLOYMENT', 'Docker compose up success');
                                socket.emit('deployment-success', {
                                    deploymentID,
                                    deploymentName: projectConfig.deployments[deploymentID - 1].name,
                                });
                            } else {
                                logging.error('START_DEPLOYMENT', 'Docker compose up failed');
                                socket.emit('deployment-error', {
                                    error: true,
                                    errmsg: 'Docker compose up failed',
                                });
                            }
                        });
                    }
                } else {
                    logging.error('START_DEPLOYMENT', 'Deployment failed');
                    socket.emit('deployment-error', {
                        error: true,
                        errmsg: 'Deployment failed',
                    });
                }
            });
        } else {
            logging.error('START_DEPLOYMENT', 'Deployment server not supported');
        }
    } catch (error: any) {
        logging.error('START_DEPLOYMENT', error);
        return socket.emit('service-error', {
            error: 'Failed to start service',
        });
    }
};

export default { startDeploymentProcedure, stopService, cleanupSocketProcesses };
