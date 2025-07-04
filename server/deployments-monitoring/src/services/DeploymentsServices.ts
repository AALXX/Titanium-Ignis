import tar from 'tar-fs'
import { Readable } from 'stream'

import { Pool, PoolClient } from 'pg'
import { Server, Socket } from 'socket.io'
import { connect, query } from '../config/postgresql'
import logging from '../config/logging'
import { checkForPermissions, execInContainer, getUserPrivateTokenFromSessionToken, getUserPublicTokenFromSessionToken, mapOsToImage, mapServiceToImage } from '../utils/utils'
import { CreateDeploymentRequest, eDeploymentStatus, IProjectConfig } from '../types/DeploymentTypes'
import Docker from 'dockerode'
import { v4 } from 'uuid'
import fs from 'fs-extra'
import path from 'path'
import getPort from 'get-port'

const getAllDeployments = async (pool: Pool, io: Server, socket: Socket, projectToken: string, userSessionToken: string) => {
    try {
        const connection = await connect(pool)
        const getDeploymentsQuery = `SELECT * FROM projects_deployments WHERE projecttoken = $1`

        const deployments = await query(connection!, getDeploymentsQuery, [projectToken])

        connection!.release()
        return socket.emit('all-deployments', { deployments: deployments })
    } catch (error: any) {
        logging.error('GET_DEPLOYMENTS', error.message)
        return socket.emit('get-deployments-error', {
            error: true,
            errmsg: 'Failed to connect to database'
        })
    }
}

const docker = new Docker()

const startDeployment = async (pool: Pool, io: Server, socket: Socket, projectToken: string, userSessionToken: string, deploymentToken: string) => {
    try {
        const connection = await connect(pool)
        const getDeploymentQuery = `SELECT ContainerID FROM projects_deployments WHERE projecttoken = $1 AND deploymenttoken = $2`

        const deployment = await query(connection!, getDeploymentQuery, [projectToken, deploymentToken])
        if (deployment.length === 0) {
            return socket.emit('start-deployment-error', {
                error: true,
                errmsg: 'Deployment not found'
            })
        }

        await docker.getContainer(deployment[0].containerid).start()

        const startDeploymentQuery = `UPDATE projects_deployments SET status = $1 WHERE projecttoken = $2 AND deploymenttoken = $3`
        await query(connection!, startDeploymentQuery, [eDeploymentStatus.DEPLOYED, projectToken, deploymentToken])
        connection!.release()
    } catch (error: any) {
        logging.error('START_DEPLOYMENT', error.message)
        return socket.emit('start-deployment-error', {
            error: true,
            errmsg: 'Failed to connect to database'
        })
    }
}

const stopDeployment = async (pool: Pool, io: Server, socket: Socket, projectToken: string, deploymentToken: string) => {
    try {
        const connection = await connect(pool)
        const getDeploymentQuery = `SELECT ContainerID FROM projects_deployments WHERE projecttoken = $1 AND deploymenttoken = $2`

        const deployment = await query(connection!, getDeploymentQuery, [projectToken, deploymentToken])
        if (deployment.length === 0) {
            return socket.emit('stop-deployment-error', {
                error: true,
                errmsg: 'Deployment not found'
            })
        }

        // we use deploying status to change the to yellow
        const pendingDeploymentQuery = `UPDATE projects_deployments SET status = $1 WHERE projecttoken = $2 AND deploymenttoken = $3`
        await query(connection!, pendingDeploymentQuery, [eDeploymentStatus.STOPPED, projectToken, deploymentToken])

        await docker.getContainer(deployment[0].containerid).stop()

        const stopDeploymentQuery = `UPDATE projects_deployments SET status = $1 WHERE projecttoken = $2 AND deploymenttoken = $3`
        await query(connection!, stopDeploymentQuery, [eDeploymentStatus.STOPPED, projectToken, deploymentToken])
        connection!.release()
    } catch (error: any) {
        logging.error('STOP_DEPLOYMENT', error.message)
        return socket.emit('stop-deployment-error', {
            error: true,
            errmsg: 'Failed to connect to database'
        })
    }
}

const createDeployment = async (
    pool: Pool,
    io: Server,
    socket: Socket,
    projectToken: string,
    userSessionToken: string,
    formData: CreateDeploymentRequest,
    dockerStateTracker: { startProjectEventsMonitoring: (projectToken: string) => Promise<void> }
): Promise<void> => {
    try {
        const connection = await connect(pool!)
        switch (formData.type) {
            case 'linux':
                const vmToken = v4()

                let sanitizedName = formData.name.replace(/[^a-zA-Z0-9_.-]/g, '').replace(/^[^a-zA-Z0-9]/g, 'vm')

                if (sanitizedName.length === 0) {
                    sanitizedName = `vm-${vmToken.substring(0, 8)}` // Fallback name if all chars were stripped
                }

                const additionalData = {
                    sshName: `${sanitizedName}_machine`
                }

                const addNewLinuxVm = `INSERT INTO projects_deployments (DeploymentToken, projecttoken, name, IpV4, LocalIp, type, os, DataCenterLocation, status, AdditionalInfo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10); `
                const addNewLinuxVmResult = await query(connection!, addNewLinuxVm, [
                    vmToken,
                    projectToken,
                    sanitizedName, // Use sanitized name
                    'Not Assigned Yet',
                    'Not Assigned Yet',
                    formData.type,
                    formData.os.os,
                    formData.dataCenterLocation.datacenterlocation,
                    'pending',
                    additionalData
                ])

                if (addNewLinuxVmResult.error) {
                    logging.error('CREATE_DEPLOYMENT', addNewLinuxVmResult.error)
                    socket.emit('create-deployment-error', {
                        error: true,
                        errmsg: 'Failed to connect to database'
                    })
                    return
                }

                const modifiedFormData = {
                    ...formData,
                    name: sanitizedName
                }

                socket.emit('CREATE_DEPLOYMENT', { vmToken: vmToken, formData: modifiedFormData })

                const info: { error: boolean; publicIp: string; privateIp: string; ports: Record<string, string[]>; containerID: string } = await createLinuxVm(connection!, modifiedFormData, projectToken)

                if (info.error) {
                    logging.error('CREATE_DEPLOYMENT', 'Something went wrong')
                    socket.emit('create-deployment-error', {
                        error: true,
                        errmsg: 'Something went wrong'
                    })
                    return
                }

                const changeDeploymentStatus = `UPDATE projects_deployments
SET 
    status = $1, 
    ipv4 = $2,
    localip = $3,
    Ports = $4,
    ContainerID = $5,
    deployedat = NOW()
WHERE 
    DeploymentToken = $6

RETURNING id  -- Return values to confirm update`

                const updateResult = await query(connection!, changeDeploymentStatus, ['deployed', info.publicIp, info.privateIp, info.ports, info.containerID, vmToken])
                connection?.release()

                if (updateResult.length === 0 || updateResult[0].id === undefined) {
                    logging.error('CREATE_DEPLOYMENT', 'Update returned no results')
                    socket.emit('create-deployment-error', {
                        error: true,
                        errmsg: 'Something went wrong'
                    })
                    return
                }

                try {
                    await dockerStateTracker.startProjectEventsMonitoring(projectToken)
                    logging.info('CREATE_DEPLOYMENT', `Updated container monitoring for project: ${projectToken}`)
                } catch (monitorError) {
                    logging.error('CREATE_DEPLOYMENT', `Failed to update container monitoring: ${monitorError}`)
                }

                break
            case 'service':
                const ServiceVmToken = v4()

                const additionaServicesData = {
                    sshName: `${formData.name}_machine`
                }

                const addNewServiceVm = `INSERT INTO projects_deployments (DeploymentToken, projecttoken, name, IpV4, LocalIp, type, os, DataCenterLocation, status, AdditionalInfo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10); `
                const addNewServiceVmResult = await query(connection!, addNewServiceVm, [
                    ServiceVmToken,
                    projectToken,
                    formData.name,
                    'Not Assigned Yet',
                    'Not Assigned Yet',
                    formData.type,
                    formData.os.os,
                    formData.dataCenterLocation.datacenterlocation,
                    'pending',
                    additionaServicesData
                ])

                if (addNewServiceVmResult.error) {
                    logging.error('CREATE_DEPLOYMENT', addNewLinuxVmResult.error)
                    socket.emit('create-deployment-error', {
                        error: true,
                        errmsg: 'Failed to connect to database'
                    })
                    return
                }

                const serviceInfo: { error: boolean; publicIp: string; privateIp: string; ports: Record<string, string[]>; containerID: string } = await createServiceDeployment(connection!, formData, projectToken)
                console.log(serviceInfo)
                if (serviceInfo.error) {
                    logging.error('CREATE_DEPLOYMENT', 'Something went wrong')
                    socket.emit('create-deployment-error', {
                        error: true,
                        errmsg: 'Something went wrong'
                    })
                    return
                }

                const changeDeploymentServiceStatus = `UPDATE projects_deployments
SET 
    status = $1, 
    ipv4 = $2,
    localip = $3,
    Ports = $4,
    ContainerID = $5,
    deployedat = NOW()
WHERE 
    DeploymentToken = $6

RETURNING id  -- Return values to confirm update`

                const updateServiceResult = await query(connection!, changeDeploymentServiceStatus, ['deployed', serviceInfo.publicIp, serviceInfo.privateIp, serviceInfo.ports, serviceInfo.containerID, ServiceVmToken])
                connection?.release()

                if (updateServiceResult.length === 0 || updateServiceResult[0].id === undefined) {
                    logging.error('CREATE_DEPLOYMENT', 'Update returned no results')
                    socket.emit('create-deployment-error', {
                        error: true,
                        errmsg: 'Something went wrong'
                    })
                    return
                }

                try {
                    await dockerStateTracker.startProjectEventsMonitoring(projectToken)
                    logging.info('CREATE_DEPLOYMENT', `Updated container monitoring for project: ${projectToken}`)
                } catch (monitorError) {
                    logging.error('CREATE_DEPLOYMENT', `Failed to update container monitoring: ${monitorError}`)
                }

                break

            default:
                break
        }

        socket.emit('create-deployment-success', {
            error: false,
            message: 'Deployment created successfully'
        })
        return
    } catch (error: any) {
        logging.error('CREATE_DEPLOYMENT', error.message || error)
        socket.emit('create-deployment-error', {
            error: true,
            errmsg: 'Failed to connect to database'
        })
    }
}

const createLinuxVm = async (
    connection: PoolClient,
    formData: CreateDeploymentRequest,
    projectToken: string
): Promise<{ error: boolean; publicIp: string; privateIp: string; ports: Record<string, string[]>; containerID: string }> => {
    const getOsQuery = `SELECT os FROM deployment_os WHERE id = $1`
    const os = await query(connection!, getOsQuery, [formData.os.id])
    const imageName = mapOsToImage(os[0].os)
    const newUsername = `${formData.name}_machine`
    const userPassword = newUsername

    try {
        await docker.getImage(imageName).inspect()
        console.log(`Image ${imageName} already exists locally.`)
    } catch {
        try {
            await new Promise((resolve, reject) => {
                docker.pull(imageName, (err: any, stream: any) => {
                    if (err) {
                        logging.error('PULL_IMAGE_ERROR', err.message)
                        return reject(err)
                    }

                    docker.modem.followProgress(stream, onFinished(resolve, reject), onProgress)
                })

                function onFinished(resolve: any, reject: any) {
                    return (err: any, output: any) => {
                        if (err) {
                            logging.error('PULL_IMAGE_ERROR', err.message || JSON.stringify(err))
                            return reject(err)
                        }

                        console.log(`Image ${imageName} pulled successfully.`)
                        resolve(output)
                    }
                }

                function onProgress(event: any) {
                    if (event.status && event.id) {
                        console.log(`[PULL_PROGRESS] ${event.status} (${event.id})`)
                    } else if (event.status) {
                        console.log(`[PULL_PROGRESS] ${event.status}`)
                    }
                }
            })
        } catch (pullErr) {
            logging.error('CREATE_DEPLOYMENT', pullErr instanceof Error ? pullErr.message : JSON.stringify(pullErr))
            throw pullErr
        }
    }

    const sshPort = await getPort() // dynamically gets an available port

    const container = await docker.createContainer({
        Image: imageName,
        Cmd: ['/bin/bash'],
        name: formData.name,
        Tty: true,
        ExposedPorts: {
            '22/tcp': {}
        },
        HostConfig: {
            PortBindings: {
                '22/tcp': [
                    {
                        HostPort: sshPort.toString()
                    }
                ]
            }
        },
        Labels: {
            'com.docker.compose.project': `${projectToken}`,
            'com.docker.compose.service': `${formData.name}`
        }
    })

    await container.start()
    logging.info('CREATE_DEPLOYMENT', `Container ${container.id} created`)

    const pkgInstall = async (cmds: string[][]) => {
        for (const cmd of cmds) {
            await execInContainer(container, cmd)
        }
    }

    const distro = imageName.toLowerCase()
    logging.info('CREATE_DEPLOYMENT', `Installing SSH + user on ${distro}`)

    if (distro.includes('ubuntu') || distro.includes('debian')) {
        await pkgInstall([
            ['apt', 'update'],
            ['apt', 'install', '-y', 'sudo', 'openssh-server']
        ])
    } else if (distro.includes('centos') || distro.includes('rocky') || distro.includes('almalinux')) {
        await pkgInstall([['yum', 'install', '-y', 'sudo', 'openssh-server']])
    } else if (distro.includes('fedora')) {
        await pkgInstall([['dnf', 'install', '-y', 'sudo', 'openssh-server']])
    } else if (distro.includes('arch')) {
        await pkgInstall([['pacman', '-Sy', '--noconfirm', 'sudo', 'openssh']])
    }

    await execInContainer(container, ['useradd', '-m', '-s', '/bin/bash', newUsername])
    await execInContainer(container, ['bash', '-c', `echo "${newUsername}:${userPassword}" | chpasswd`])
    await execInContainer(container, ['usermod', '-aG', 'sudo', newUsername])

    await execInContainer(container, ['bash', '-c', `sed -i 's/^#\\?PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config`])
    await execInContainer(container, ['bash', '-c', `sed -i 's/^#\\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config`])
    await execInContainer(container, ['service', 'ssh', 'start'])

    const data = await container.inspect()
    const privateIp = data.NetworkSettings.IPAddress
    const publicIp = 'localhost' // Update in prod
    const portsObj: Record<string, string[]> = {}
    const containerID = container.id

    console.log(portsObj)

    const portsData = data.NetworkSettings.Ports
    for (const port in portsData) {
        portsObj[port] = portsData[port]?.map((p: any) => p.HostPort) || []
    }

    logging.info('CREATE_DEPLOYMENT', `SSH setup complete. User: ${newUsername}, Password: ${userPassword}`)

    return {
        error: false,
        publicIp,
        privateIp,
        ports: portsObj,
        containerID: containerID
    }
}

const createServiceDeployment = async (
    connection: PoolClient,
    formData: CreateDeploymentRequest,
    projectToken: string
): Promise<{ error: boolean; publicIp: string; privateIp: string; ports: Record<string, string[]>; containerID: string }> => {
    // get projectConfig file

    let projectConfig: IProjectConfig = {
        services: [],
        deployments: []
    }

    try {
        projectConfig = JSON.parse(fs.readFileSync(`${process.env.PROJECTS_FOLDER_PATH}/${projectToken}/project-config.json`, 'utf8'))
    } catch (error: any) {
        logging.error('STARTS_DEPLOYMENT_READING_FILE_FUNC', error.message)
    }

    if (projectConfig.services.length < Number(formData.serviceID!)) {
        return { error: true, publicIp: '', privateIp: '', ports: {}, containerID: '' }
    }

    const imageName = mapServiceToImage(projectConfig.services[Number(formData.serviceID!) - 1]['start-command'])
    const newUsername = `${formData.name}_service`
    const userPassword = newUsername

    try {
        await docker.getImage(imageName).inspect()
        console.log(`Image ${imageName} already exists locally.`)
    } catch {
        try {
            await new Promise((resolve, reject) => {
                docker.pull(imageName, (err: any, stream: any) => {
                    if (err) {
                        logging.error('PULL_IMAGE_ERROR', err.message)
                        return reject(err)
                    }

                    docker.modem.followProgress(stream, onFinished(resolve, reject), onProgress)
                })

                function onFinished(resolve: any, reject: any) {
                    return (err: any, output: any) => {
                        if (err) {
                            logging.error('PULL_IMAGE_ERROR', err.message || JSON.stringify(err))
                            return reject(err)
                        }

                        console.log(`Image ${imageName} pulled successfully.`)
                        resolve(output)
                    }
                }

                function onProgress(event: any) {
                    if (event.status && event.id) {
                        console.log(`[PULL_PROGRESS] ${event.status} (${event.id})`)
                    } else if (event.status) {
                        console.log(`[PULL_PROGRESS] ${event.status}`)
                    }
                }
            })
        } catch (pullErr) {
            logging.error('CREATE_DEPLOYMENT_PULL_ERROR', pullErr instanceof Error ? pullErr.message : JSON.stringify(pullErr))
            throw pullErr
        }
    }

    const servicePorts = projectConfig.services[Number(formData.serviceID!) - 1].ports || {}

    const ExposedPorts: Record<string, {}> = {
        '22/tcp': {}
    }
    const PortBindings: Record<string, { HostPort: string }[]> = {}

    for (const [containerPort, hostPort] of Object.entries(servicePorts)) {
        const portKey = `${containerPort}/tcp`
        ExposedPorts[portKey] = {}
        PortBindings[portKey] = [{ HostPort: String(hostPort) }]
    }

    const container = await docker.createContainer({
        Image: imageName,
        name: formData.name,
        Tty: true,
        ExposedPorts,
        HostConfig: {
            PortBindings
        },
        Labels: {
            'com.docker.compose.project': `${projectToken}`,
            'com.docker.compose.service': `${formData.name}`
        }
    })

    await container.start()

    // add bash
    await execInContainer(container, ['apk', 'add', '--no-cache', 'bash'])

    const tempDir = path.join(`${process.env.TEMP_FOLDER_PATH}`, `project-deploy-${projectToken}`)
    await fs.emptyDir(tempDir)

    await fs.copy(path.join(process.env.PROJECTS_FOLDER_PATH!, projectToken), path.join(tempDir, `${projectToken}_copy`), {
        filter: src => {
            const relative = path.relative(process.env.PROJECTS_FOLDER_PATH!, src)
            return !relative.startsWith('.git') && !relative.includes('node_modules')
        }
    })

    await fs.copyFile(process.env.ANALITICS_PACKAGE_PATH!, path.join(tempDir, `${projectToken}_copy`, 'request-monitor-1.0.0.tgz'))

    const archive = tar.pack(tempDir, {
        ignore: (name: string) => {
            const relativePath = path.relative(tempDir, name)
            return relativePath.startsWith('.git') || relativePath.startsWith('node_modules') || relativePath.endsWith('.DS_Store')
        }
    }) as unknown as Readable

    await execInContainer(container, ['mkdir', '-p', '/app'])

    try {
        await container.putArchive(archive, { path: '/app' })
        logging.info('CREATE_DEPLOYMENT', 'Copied app files to /app in container')
    } catch (copyErr) {
        logging.error('CREATE_DEPLOYMENT_COPY', copyErr instanceof Error ? copyErr.message : JSON.stringify(copyErr))
        throw copyErr
    }

    if (projectConfig.services[Number(formData.serviceID!) - 1].setup !== undefined && projectConfig.services[Number(formData.serviceID!) - 1].setup!.length > 0) {
        try {
            for (const setupCommand of projectConfig.services[Number(formData.serviceID!) - 1].setup!) {
                await execInContainer(container, ['bash', '-c', `cd /app/${projectToken}_copy && ${setupCommand.run}`])
            }
        } catch (setupErr) {
            logging.error('CREATE_DEPLOYMENT_SETUP', setupErr instanceof Error ? setupErr.message : JSON.stringify(setupErr))
            throw setupErr
        }
    }

    if (projectConfig.services[Number(formData.serviceID!) - 1]['start-command'] !== undefined && projectConfig.services[Number(formData.serviceID!) - 1]['start-command']!.length > 0) {
        try {
            await execInContainer(container, ['bash', '-c', `cd /app/${projectToken}_copy && ${projectConfig.services[Number(formData.serviceID!) - 1]['start-command']}`], true)
        } catch (startErr) {
            logging.error('CREATE_DEPLOYMENT_START', startErr instanceof Error ? startErr.message : JSON.stringify(startErr))
            throw startErr
        }
    }

    const data = await container.inspect()
    const privateIp = data.NetworkSettings.IPAddress
    const publicIp = 'localhost'
    const portsObj: Record<string, string[]> = {}
    const containerID = container.id

    const portsData = data.NetworkSettings.Ports
    for (const port in portsData) {
        portsObj[port] = portsData[port]?.map((p: any) => p.HostPort) || []
    }

    await fs.remove(path.join(process.env.TEMP_FOLDER_PATH!, `project-deploy-${projectToken}`))

    return {
        error: false,
        publicIp,
        privateIp,
        ports: portsObj,
        containerID: containerID
    }
}

const createDBDeployment = async (
    connection: PoolClient,
    formData: CreateDeploymentRequest,
    projectToken: string
): Promise<{ error: boolean; publicIp: string; privateIp: string; ports: Record<string, string[]>; containerID: string }> => {
    return {
        error: false,
        publicIp: 'localhost',
        privateIp: 'localhost',
        ports: {},
        containerID: ''
    }
}

const deleteDeployment = async (pool: Pool, io: Server, socket: Socket, projectToken: string, deploymentToken: string) => {
    try {
        const connection = await connect(pool)
        await stopDeployment(pool, io, socket, projectToken, deploymentToken)
        const deleteDeploymentQuery = `
            DELETE FROM projects_deployments
            WHERE ProjectToken = $1 AND DeploymentToken = $2
        `
        const getDeploymentQuery = `SELECT ContainerID FROM projects_deployments WHERE projecttoken = $1 AND deploymenttoken = $2`

        const deployment = await query(connection!, getDeploymentQuery, [projectToken, deploymentToken])
        if (deployment.length === 0) {
            return socket.emit('stop-deployment-error', {
                error: true,
                errmsg: 'Deployment not found'
            })
        }

        try {
            await docker.getContainer(deployment[0].containerid).remove()
        } catch (error: any) {
            logging.error('DELETE_DEPLOYMENT', error.message)
            return socket.emit('delete-deployment-error', {
                error: true,
                errmsg: 'Failed to connect to database'
            })
        }
            await query(connection!, deleteDeploymentQuery, [projectToken, deploymentToken])

        connection!.release()
        return socket.emit('DELETED_DEPLOYMENT', {
            projectToken: projectToken,
            deploymentToken: deploymentToken
        })
    } catch (error: any) {
        logging.error('DELETE_DEPLOYMENT', error.message)
        return socket.emit('delete-deployment-error', {
            error: true,
            errmsg: 'Failed to connect to database'
        })
    }
}

export default { getAllDeployments, createDeployment, startDeployment, stopDeployment, deleteDeployment }
