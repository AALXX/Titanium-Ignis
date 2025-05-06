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
        res.status(200).json({
            error: false,
            requests: requests,
            avgResponseTime: avgResponseTime.toFixed(1),
            totalRequests: requests.length,
            totalDeployments: projectDeploymentsResult.length,
            activeDeployments: activeDeployments.length,
            requestPerHour: reequestPerHour,
        });
        return;
    } catch (error: any) {
        logging.error('GET_PROJECT_REQUESTS', error);
    }
};

const getDeploymentOptions = async (req: CustomRequest, res: Response): Promise<void> => {
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



// const docker = new Docker();

// const createDeployment = async (req: CustomRequest, res: Response): Promise<void> => {
//     try {
//         const connection = await connect(req.pool!);
//         switch (req.body.formData.type) {
//             case 'linux':
//                 const vmToken = v4();

//                 // Sanitize the VM name to meet Docker's naming requirements
//                 let sanitizedName = req.body.formData.name
//                     .replace(/[^a-zA-Z0-9_.-]/g, '') // Remove invalid characters
//                     .replace(/^[^a-zA-Z0-9]/g, 'vm'); // Ensure starts with alphanumeric

//                 if (sanitizedName.length === 0) {
//                     sanitizedName = `vm-${vmToken.substring(0, 8)}`; // Fallback name if all chars were stripped
//                 }

//                 const additionalData = {
//                     sshName: `${sanitizedName}_machine`,
//                 };

//                 // console.log(req.body.formData.dataCenterLocation.datacenterlocation);
//                 const addNewLinuxVm = `INSERT INTO projects_deployments (DeploymentToken, projecttoken, name, IpV4, LocalIp, type, os, DataCenterLocation, status, AdditionalInfo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10); `;
//                 const addNewLinuxVmResult = await query(connection!, addNewLinuxVm, [
//                     vmToken,
//                     req.body.projectToken,
//                     sanitizedName, // Use sanitized name
//                     'Not Assigned Yet',
//                     'Not Assigned Yet',
//                     req.body.formData.type,
//                     req.body.formData.os.os,
//                     req.body.formData.dataCenterLocation.datacenterlocation,
//                     'pending',
//                     additionalData,
//                 ]);

//                 if (addNewLinuxVmResult.error) {
//                     logging.error('CREATE_DEPLOYMENT', addNewLinuxVmResult.error);
//                     res.status(200).json({
//                         error: true,
//                         message: 'Something went wrong',
//                     });
//                     return;
//                 }

//                 // Pass sanitized name to the VM creation function
//                 const modifiedFormData = {
//                     ...req.body.formData,
//                     name: sanitizedName,
//                 };

//                 const info: { error: boolean; publicIp: string; privateIp: string; ports: Record<string, string[]> } = await createLinuxVm(connection!, modifiedFormData, req.body.projectToken);

//                 if (info.error) {
//                     logging.error('CREATE_DEPLOYMENT', 'Something went wrong');
//                     res.status(200).json({
//                         error: true,
//                         message: 'Something went wrong',
//                     });
//                     return;
//                 }

//                 const changeDeploymentStatus = `UPDATE projects_deployments
// SET 
//     status = $1, 
//     ipv4 = $2,
//     localip = $3,
//     Ports = $4,
//     deployedat = NOW()
// WHERE 
//     DeploymentToken = $5

// RETURNING id  -- Return values to confirm update`;

//                 const updateResult = await query(connection!, changeDeploymentStatus, ['deployed', info.publicIp, info.privateIp, info.ports, vmToken]);
//                 connection?.release();

//                 if (updateResult.length === 0 || updateResult[0].id === undefined) {
//                     logging.error('CREATE_DEPLOYMENT', 'Update returned no results');
//                     res.status(200).json({
//                         error: true,
//                         message: 'Something went wrong',
//                     });
//                     return;
//                 }

//                 break;

//             default:
//                 break;
//         }

//         res.status(200).json({
//             error: false,
//             message: 'Deployment created',
//         });
//         return;
//     } catch (error: any) {
//         logging.error('CREATE_DEPLOYMENT', error.message || error);
//         res.status(200).json({
//             error: true,
//             message: 'Something went wrong',
//         });
//     }
// };

// const createLinuxVm = async (connection: PoolClient, formData: DeploymentFormData, projectToken: string): Promise<{ error: boolean; publicIp: string; privateIp: string; ports: Record<string, string[]> }> => {
//     const getOsQuery = `SELECT os FROM deployment_os WHERE id = $1`;
//     const os = await query(connection!, getOsQuery, [formData.os.id]);
//     const imageName = utilFunctions.mapOsToImage(os[0].os);
//     const newUsername = `${formData.name}_machine`;
//     const userPassword = newUsername;

//     try {
//         await docker.getImage(imageName).inspect();
//         console.log(`Image ${imageName} already exists locally.`);
//     } catch (err) {
//         // console.log(`Pulling image ${imageName}...`);
//         await new Promise((resolve, reject) => {
//             docker.pull(imageName, (err: any, stream: any) => {
//                 if (err) return reject(err);
//                 docker.modem.followProgress(stream, resolve, reject);
//             });
//         });
//     }

//     const container = await docker.createContainer({
//         Image: imageName,
//         Cmd: ['/bin/bash'],
//         name: formData.name,
//         Tty: true,
//         ExposedPorts: { '22/tcp': {} },
//         HostConfig: { PublishAllPorts: true },
//         Labels: {
//             'com.docker.compose.project': `${projectToken}`,
//             'com.docker.compose.service': `${formData.name}`,
//         },
//     });

//     await container.start();
//     logging.info('CREATE_DEPLOYMENT', `Container ${container.id} created`);

//     const pkgInstall = async (cmds: string[][]) => {
//         for (const cmd of cmds) {
//             await utilFunctions.execInContainer(container, cmd);
//         }
//     };

//     const distro = imageName.toLowerCase();
//     logging.info('CREATE_DEPLOYMENT', `Installing SSH + user on ${distro}`);

//     if (distro.includes('ubuntu') || distro.includes('debian')) {
//         await pkgInstall([
//             ['apt', 'update'],
//             ['apt', 'install', '-y', 'sudo', 'openssh-server'],
//         ]);
//     } else if (distro.includes('centos') || distro.includes('rocky') || distro.includes('almalinux')) {
//         await pkgInstall([['yum', 'install', '-y', 'sudo', 'openssh-server']]);
//     } else if (distro.includes('fedora')) {
//         await pkgInstall([['dnf', 'install', '-y', 'sudo', 'openssh-server']]);
//     } else if (distro.includes('arch')) {
//         await pkgInstall([['pacman', '-Sy', '--noconfirm', 'sudo', 'openssh']]);
//     }

//     await utilFunctions.execInContainer(container, ['useradd', '-m', '-s', '/bin/bash', newUsername]);
//     await utilFunctions.execInContainer(container, ['bash', '-c', `echo "${newUsername}:${userPassword}" | chpasswd`]);
//     await utilFunctions.execInContainer(container, ['usermod', '-aG', 'sudo', newUsername]);

//     await utilFunctions.execInContainer(container, ['bash', '-c', `sed -i 's/^#\\?PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config`]);
//     await utilFunctions.execInContainer(container, ['bash', '-c', `sed -i 's/^#\\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config`]);
//     await utilFunctions.execInContainer(container, ['service', 'ssh', 'start']);

//     const data = await container.inspect();
//     const privateIp = data.NetworkSettings.IPAddress;
//     const publicIp = 'localhost'; // Update in prod
//     const portsObj: Record<string, string[]> = {};

//     const portsData = data.NetworkSettings.Ports;
//     for (const port in portsData) {
//         portsObj[port] = portsData[port]?.map((p: any) => p.HostPort) || [];
//     }

//     logging.info('CREATE_DEPLOYMENT', `SSH setup complete. User: ${newUsername}, Password: ${userPassword}`);

//     return {
//         error: false,
//         publicIp,
//         privateIp,
//         ports: portsObj,
//     };
// };

export default { startDeploymentProcedure, stopService, cleanupSocketProcesses, getDeploymentsOverviewData, getDeploymentOptions};
