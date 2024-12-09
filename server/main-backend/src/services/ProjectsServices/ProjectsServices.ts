import { Response } from 'express';
import { validationResult } from 'express-validator';
import logging from '../../config/logging';
import { connect, CustomRequest, query } from '../../config/postgresql';
import utilFunctions from '../../util/utilFunctions';
import { IProjectsDb, IProjectsResponse, IProjectResponse, IProjectConfig } from '../../Models/ProjectsModels';
import { Socket } from 'socket.io';
import { ChildProcess, spawn } from 'child_process';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { redisClient } from '../../config/redis';

const NAMESPACE = 'PaymentServiceManager';

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

const getAllProjects = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_PROJECTS_FUNC', error.errorMsg);
        });

        return res.status(200).json({ error: true, errors: errors.array() });
    }

    const connection = await connect(req.pool!);

    try {
        const userPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection!, req.params.userSessionToken);

        const queryString = `SELECT * FROM projects WHERE checked_out_by = $1`;
        const result: IProjectsDb[] = await query(connection!, queryString, [userPrivateToken]);
        // Map the result to new variable names
        const projectsResponse: IProjectsResponse[] = result.map(({ project_name: ProjectName, project_token: ProjectToken, repo_url: RepoUrl, checked_out_by: CheckedOutBy, status: Status, type: Type }) => ({
            ProjectName,
            ProjectToken,
            RepoUrl,
            CheckedOutBy,
            Status,
            Type,
        }));

        connection?.release();

        return res.status(200).json({
            error: false,
            projects: projectsResponse,
        });
    } catch (error: any) {
        logging.error('GET_PROJECTS_FUNC', error.message);
        connection?.release();
        return res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

const getProjectData = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_PROJECT_DATA_FUNC', error.errorMsg);
        });

        return res.status(200).json({ error: true, errors: errors.array() });
    }

    const connection = await connect(req.pool!);

    try {
        const queryString = `SELECT * FROM projects WHERE project_token = $1`;
        const result: IProjectsDb[] = await query(connection!, queryString, [req.params.projectToken]);

        // Map the result to new variable names
        const projectsResponse: IProjectResponse = {
            ProjectName: result[0].project_name,
            RepoUrl: result[0].repo_url,
            CheckedOutBy: result[0].checked_out_by,
            Status: result[0].status,
            Type: result[0].type,
        };

        connection?.release();

        return res.status(200).json({
            error: false,
            project: projectsResponse,
        });
    } catch (error: any) {
        logging.error('GET_PROJECT_DATA_FUNC', error.message);
        connection?.release();
        return res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

const joinRepo = async (socket: Socket, pool: Pool, data: { projectToken: string; userSessionToken: string }) => {
    // try {
    //     const connection = await connect(pool);
    // } catch (error: any) {
    //     logging.error('JOIN_REPO_FUNC', error);
    // }
};

const activeProcesses: Map<string, ChildProcess> = new Map();
const startService = async (socket: Socket, userSessionToken: string, projectToken: string, serviceID: number) => {
    try {
        // Generate a unique process ID
        const processId = randomUUID();

        let projectConfig: IProjectConfig = {
            services: [],
        };

        try {
            projectConfig = JSON.parse(fs.readFileSync(`${process.env.REPOSITORIES_FOLDER_PATH}/${projectToken}/project-config.json`, 'utf8'));
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
        let workinDir = `${process.env.REPOSITORIES_FOLDER_PATH}/${projectToken}`;

        if (projectConfig.services[serviceID - 1].dir) {
            workinDir = `${process.env.REPOSITORIES_FOLDER_PATH}/${projectToken}${projectConfig.services[serviceID - 1].dir}`;
        }

        const serviceProcess = spawn(command, args, {
            cwd: workinDir,
            // shell: true,
        });

        // Store the process
        activeProcesses.set(processId, serviceProcess);

        try {
            redisClient.set(
                `active_services:${processId}`,
                JSON.stringify({
                    service_name: projectConfig.services[serviceID - 1].name,
                    service_id: serviceID,
                    service_status: 'active',
                    service_token: processId,
                    timestamp: Date.now() / 1000,
                }),
            );
        } catch (error: any) {
            logging.error('START_SERVICE', error);
        }

        // Send the process ID back to the client
        socket.emit('service-started', { processId, serviceID });

        // Error handling
        serviceProcess.on('error', (err) => {
            redisClient.del(`active_services:${processId}`);
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

        // don't know if this is needed
        // serviceProcess.stderr.on('data', (data) => {
        //     redisClient.del(`active_services:${processId}`);
        //     activeProcesses.delete(processId);
        //     console.log(data);

        //     socket.emit('service-error', {
        //         processId,
        //         error: data.toString(),
        //     });
        // });

        serviceProcess.on('close', (code) => {
            redisClient.del(`active_services:${processId}`);

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

const stopService = async (socket: Socket, data: { processId: string }) => {
    try {
        const { processId } = data;
        const process = activeProcesses.get(processId);

        if (!process) {
            logging.error('STOP_SERVICE', `Process ${processId} not found`);
        }

        // Kill the process
        process!.kill();
        redisClient.del(`active_services:${processId}`);
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
export default { getAllProjects, getProjectData, joinRepo, startService, stopService, cleanupSocketProcesses };
