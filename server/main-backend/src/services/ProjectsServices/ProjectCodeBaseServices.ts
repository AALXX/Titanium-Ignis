import { Response } from 'express';
import logging from '../../config/logging';
import { connect, CustomRequest, query } from '../../config/postgresql';
import utilFunctions from '../../util/utilFunctions';
import { IProjectConfig } from '../../Models/ProjectsModels';
import { Socket } from 'socket.io';
import child_process from 'child_process';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { redisClient } from '../../config/redis';
import { IProcess } from '../../Models/ProcessModels';
import { validationResult } from 'express-validator';

/**
 * Validates and cleans the CustomRequest form
 */
const CustomRequestValidationResult = validationResult.withDefaults({
    formatter: (error) => {
        return {
            errorMsg: error.msg,
        };
    },
});

const getProjectCodebaseData = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_PROJECT_CODEBASE_DATA_FUNC', error.errorMsg);
        });

        return res.status(200).json({ error: true, errors: errors.array() });
    }

    try {
        const connection = await connect(req.pool!);
        const queryString = `SELECT * FROM projects_codebase JOIN projects ON projects_codebase.ProjectToken = projects.ProjectToken WHERE projects_codebase.ProjectToken = $1`;
        const projectsResponse = await query(connection!, queryString, [req.params.projectToken]);
        connection?.release();
        return res.status(200).json({
            error: false,
            project: projectsResponse[0],
        });
    } catch (error: any) {
        logging.error('GET_PROJECT_CODEBASE_DATA_FUNC', error.message);
        return res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

const joinRepo = async (socket: Socket, pool: Pool, data: { projectToken: string; userSessionToken: string }) => {
    try {
        const connection = await connect(pool);

        //Get running services
        //check the redis chache first than the postgres db
        const redisKey = `active_services_${data.projectToken}`;
        let runningServices = await redisClient.get(redisKey);
        if (!runningServices) {
            const queryString = `SELECT * FROM active_services WHERE project_token = $1`;
            const result: IProcess[] = await query(connection!, queryString, [data.projectToken]);

            runningServices = JSON.stringify(result);
            await redisClient.set(redisKey, runningServices);
        }
    } catch (error: any) {
        logging.error('JOIN_REPO_FUNC', error);
    }
};

const startSetup = async (socket: Socket, userSessionToken: string, projectToken: string, serviceID: number) => {
    try {
        let projectConfig: IProjectConfig = {
            services: [],
            deployments: [],
        };
        try {
            projectConfig = JSON.parse(fs.readFileSync(`${process.env.PROJECTS_FOLDER_PATH}/${projectToken}/project-config.json`, 'utf8'));
        } catch (error: any) {
            logging.error('START_SETUP_READING_FILE_FUNC', error.message);
        }

        if (projectConfig.services.length < serviceID) {
            socket.emit('setup-error', { error: 'Service not found' });
            return;
        }

        const serviceSetup = projectConfig.services[serviceID - 1].setup;
        if (!serviceSetup) {
            socket.emit('setup-error', { error: 'Service does not have a setup' });
            return;
        }

        socket.emit('setup-started', { serviceID });

        for (let setupCommand of serviceSetup) {
            const commandParts = setupCommand.run.split(' ');
            const command = commandParts[0];
            const args = commandParts.slice(1);
            let workinDir = `${process.env.PROJECTS_FOLDER_PATH}/${projectToken}`;

            if (projectConfig.services[serviceID - 1].dir) {
                // here we don't have a / between the project token and the service dir because the service dir is defined as a relative path in project-config.json
                workinDir = `${process.env.PROJECTS_FOLDER_PATH}/${projectToken}${projectConfig.services[serviceID - 1].dir}`;
            }

            const serviceProcess = child_process.spawn(command, args, {
                cwd: workinDir,

                // shell: true,
            });

            serviceProcess.on('error', async (err) => {
                socket.emit('setup-error', {
                    serviceID,
                    error: err.message,
                });
            });

            serviceProcess.stdout.on('data', (data) => {
                socket.emit('setup-output', {
                    serviceID,
                    output: data.toString(),
                });
            });

            serviceProcess.on('close', async (code) => {
                socket.emit('service-stopped', {
                    serviceID,
                    code,
                });
            });
        }
    } catch (error: any) {
        logging.error('START_SETUP_FUNC', error.message);
        socket.emit('setup-error', { error: 'Service not found' });
    }
};

const activeProcesses: Map<string, child_process.ChildProcess> = new Map();
const startService = async (socket: Socket, userSessionToken: string, projectToken: string, serviceID: number) => {
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
            logging.error('STARTS_SERVICE_READING_FILE_FUNC', error.message);
        }

        if (projectConfig.services.length < serviceID) {
            return socket.emit('service-error', {
                error: true,
                errmsg: 'Invalid service ID',
            });
        }

        const startCommand = projectConfig.services[serviceID - 1]['start-command'];

        const commandParts = startCommand.split(' ');
        const command = commandParts[0];
        const args = commandParts.slice(1);
        let workinDir = `${process.env.PROJECTS_FOLDER_PATH}/${projectToken}`;

        if (projectConfig.services[serviceID - 1].dir) {
            workinDir = `${process.env.PROJECTS_FOLDER_PATH}/${projectToken}${projectConfig.services[serviceID - 1].dir}`;
        }

        const serviceProcess = child_process.spawn(command, args, {
            cwd: workinDir,

            // shell: true,
        });

        // Store the process
        activeProcesses.set(processId, serviceProcess);

        if (
            !(await utilFunctions.saveService(projectToken, {
                service_token: processId,
                service_name: projectConfig.services[serviceID - 1].name,
                service_id: serviceID,
                service_status: 'started',
            }))
        ) {
            logging.error('STARTS_SERVICE_SAVING_SERVICE_FUNC', 'Failed to save service');
        }

        // Send the process ID back to the client
        socket.emit('service-started', { processId, serviceID });

        // Error handling
        serviceProcess.on('error', async (err) => {
            if (!(await utilFunctions.removeService(projectToken, processId))) {
                logging.error('STARTS_SERVICE_REMOVING_SERVICE_FUNC', 'Failed to remove service');
            }

            activeProcesses.delete(processId);
            socket.emit('service-error', {
                processId,
                error: err.message,
            });
        });

        serviceProcess.stdout.on('data', (data) => {
            socket.emit('service-output', {
                processId,
                output: data.toString(),
            });
        });

        serviceProcess.on('close', async (code) => {
            if (!(await utilFunctions.removeService(projectToken, processId))) {
                logging.error('STARTS_SERVICE_REMOVING_SERVICE_FUNC', 'Failed to remove service');
            }
            socket.emit('service-stopped', {
                processId,
                code,
            });
            activeProcesses.delete(processId);
        });
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

export default { getProjectCodebaseData, joinRepo, startSetup, startService, stopService, cleanupSocketProcesses };
