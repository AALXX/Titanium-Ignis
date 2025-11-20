import tar from 'tar-fs'
import { PassThrough, Readable } from 'stream'

import { Pool, PoolClient } from 'pg'
import { Server, Socket } from 'socket.io'
import { connect, query } from '../config/postgresql'
import logging from '../config/logging'
import { checkForPermissions, execInContainer, getUserPrivateTokenFromSessionToken, getUserPublicTokenFromSessionToken, mapOsToImage, mapServiceToImage } from '../utils/utils'
import { CreateDeploymentRequest, eDeploymentStatus, IProjectConfig, LogOptions } from '../types/DeploymentTypes'
import Docker, { Container } from 'dockerode'
import { v4 } from 'uuid'
import fs from 'fs-extra'
import path from 'path'
import getPort from 'get-port'
import axios from 'axios'
import { createRequestProxy } from './RequestTrackigService'

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
                await handleLinuxDeployment(connection!, pool, io, socket, projectToken, formData, dockerStateTracker)
                break

            case 'service':
                await handleServiceDeployment(connection!, pool, io, socket, projectToken, formData, dockerStateTracker)
                break

            case 'database':
                await handleDatabaseDeployment(connection!, pool, io, socket, projectToken, formData, dockerStateTracker)
                break

            case 'volume':
                await handleVolumeDeployment(connection!, socket, projectToken, formData, dockerStateTracker)
                break

            case 'app':
                await handleAppDeployment(connection!, pool, io, socket, projectToken, formData, dockerStateTracker)
                break

            case 'static':
                await handleStaticDeployment(connection!, pool, io, socket, projectToken, formData, dockerStateTracker)
                break

            case 'serverless':
                await handleServerlessDeployment(connection!, pool, io, socket, projectToken, formData, dockerStateTracker)
                break

            default:
                socket.emit('create-deployment-error', {
                    error: true,
                    errmsg: 'Unsupported deployment type'
                })
                return
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
            errmsg: 'Failed to create deployment'
        })
    }
}

const handleLinuxDeployment = async (
    connection: PoolClient,
    pool: Pool,
    io: Server,
    socket: Socket,
    projectToken: string,
    formData: CreateDeploymentRequest,
    dockerStateTracker: { startProjectEventsMonitoring: (projectToken: string) => Promise<void> }
) => {
    const vmToken = v4()
    let sanitizedName = formData.name.replace(/[^a-zA-Z0-9_.-]/g, '').replace(/^[^a-zA-Z0-9]/g, 'vm')

    if (sanitizedName.length === 0) {
        sanitizedName = `vm-${vmToken.substring(0, 8)}`
    }

    const additionalData = {
        sshName: `${sanitizedName}_machine`
    }

    const addNewLinuxVm = `INSERT INTO projects_deployments (DeploymentToken, projecttoken, name, IpV4, LocalIp, type, os, DataCenterLocation, status, AdditionalInfo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
    await query(connection!, addNewLinuxVm, [
        vmToken,
        projectToken,
        sanitizedName,
        'Not Assigned Yet',
        'Not Assigned Yet',
        formData.type,
        formData.os.os,
        formData.dataCenterLocation.datacenterlocation,
        'pending',
        additionalData
    ])

    socket.emit('CREATE_DEPLOYMENT', { vmToken: vmToken, formData: { ...formData, name: sanitizedName } })

    const info = await createLinuxVm(connection!, pool, io, { ...formData, name: sanitizedName }, projectToken, vmToken)

    if (info.error) {
        throw new Error('Failed to create Linux VM')
    }

    const changeDeploymentStatus = `UPDATE projects_deployments SET status = $1, ipv4 = $2, localip = $3, Ports = $4, ContainerID = $5, deployedat = NOW() WHERE DeploymentToken = $6 RETURNING id`
    await query(connection!, changeDeploymentStatus, ['deployed', info.publicIp, info.privateIp, info.ports, info.containerID, vmToken])

    connection?.release()

    await dockerStateTracker.startProjectEventsMonitoring(projectToken)
}

const handleServiceDeployment = async (
    connection: PoolClient,
    pool: Pool,
    io: Server,
    socket: Socket,
    projectToken: string,
    formData: CreateDeploymentRequest,
    dockerStateTracker: { startProjectEventsMonitoring: (projectToken: string) => Promise<void> }
) => {
    const serviceVmToken = v4()

    const additionalServicesData = {
        sshName: `${formData.name}_machine`,
        languageConfig: formData.languageConfig
    }

    const addNewServiceVm = `INSERT INTO projects_deployments (DeploymentToken, projecttoken, name, IpV4, LocalIp, type, os, DataCenterLocation, status, AdditionalInfo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
    await query(connection!, addNewServiceVm, [
        serviceVmToken,
        projectToken,
        formData.name,
        'Not Assigned Yet',
        'Not Assigned Yet',
        formData.type,
        formData.os.os,
        formData.dataCenterLocation.datacenterlocation,
        'pending',
        additionalServicesData
    ])

    const serviceInfo = await createServiceDeployment(connection!, pool, io, formData, projectToken, serviceVmToken)

    if (serviceInfo.error) {
        throw new Error('Failed to create service deployment')
    }

    const changeDeploymentServiceStatus = `UPDATE projects_deployments SET status = $1, ipv4 = $2, localip = $3, Ports = $4, ContainerID = $5, deployedat = NOW() WHERE DeploymentToken = $6 RETURNING id`
    await query(connection!, changeDeploymentServiceStatus, ['deployed', serviceInfo.publicIp, serviceInfo.privateIp, serviceInfo.ports, serviceInfo.containerID, serviceVmToken])

    connection?.release()

    await dockerStateTracker.startProjectEventsMonitoring(projectToken)
}

const handleDatabaseDeployment = async (
    connection: PoolClient,
    pool: Pool,
    io: Server,
    socket: Socket,
    projectToken: string,
    formData: CreateDeploymentRequest,
    dockerStateTracker: { startProjectEventsMonitoring: (projectToken: string) => Promise<void> }
) => {
    const dbToken = v4()

    const additionalDbData = {
        databaseType: formData.databaseType,
        version: formData.version,
        backupEnabled: formData.backupEnabled
    }

    const addNewDb = `INSERT INTO projects_deployments (DeploymentToken, projecttoken, name, IpV4, LocalIp, type, os, DataCenterLocation, status, AdditionalInfo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
    await query(connection!, addNewDb, [
        dbToken,
        projectToken,
        formData.name,
        'Not Assigned Yet',
        'Not Assigned Yet',
        formData.type,
        formData.databaseType,
        formData.dataCenterLocation.datacenterlocation,
        'pending',
        additionalDbData
    ])

    const dbInfo = await createDBDeployment(connection!, pool, io, formData, projectToken, dbToken)

    if (dbInfo.error) {
        throw new Error('Failed to create database deployment')
    }

    const updateDbStatus = `UPDATE projects_deployments SET status = $1, ipv4 = $2, localip = $3, Ports = $4, ContainerID = $5, deployedat = NOW() WHERE DeploymentToken = $6 RETURNING id`
    await query(connection!, updateDbStatus, ['deployed', dbInfo.publicIp, dbInfo.privateIp, dbInfo.ports, dbInfo.containerID, dbToken])

    connection?.release()

    await dockerStateTracker.startProjectEventsMonitoring(projectToken)
}

const handleVolumeDeployment = async (
    connection: PoolClient,
    socket: Socket,
    projectToken: string,
    formData: CreateDeploymentRequest,
    dockerStateTracker: { startProjectEventsMonitoring: (projectToken: string) => Promise<void> }
) => {
    const volumeToken = v4()

    const additionalVolumeData = {
        volumeType: formData.volumeType,
        storage: formData.resourceAllocation.storage,
        backupEnabled: formData.backupEnabled
    }

    const addNewVolume = `INSERT INTO projects_deployments (DeploymentToken, projecttoken, name, IpV4, LocalIp, type, os, DataCenterLocation, status, AdditionalInfo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
    await query(connection!, addNewVolume, [volumeToken, projectToken, formData.name, 'N/A', 'N/A', formData.type, formData.volumeType, formData.dataCenterLocation.datacenterlocation, 'deployed', additionalVolumeData])

    const volumeName = `${projectToken}_${formData.name}_${volumeToken.substring(0, 8)}`
    await docker.createVolume({
        Name: volumeName,
        Labels: {
            'com.docker.compose.project': projectToken,
            'com.docker.compose.volume': formData.name,
            'volume.type': formData.volumeType
        }
    })

    logging.info('CREATE_VOLUME', `Volume ${volumeName} created successfully`)

    const updateVolumeStatus = `UPDATE projects_deployments SET ContainerID = $1 WHERE DeploymentToken = $2`
    await query(connection!, updateVolumeStatus, [volumeName, volumeToken])

    connection?.release()
}

const handleAppDeployment = async (
    connection: PoolClient,
    pool: Pool,
    io: Server,
    socket: Socket,
    projectToken: string,
    formData: CreateDeploymentRequest,
    dockerStateTracker: { startProjectEventsMonitoring: (projectToken: string) => Promise<void> }
) => {
    const appToken = v4()

    const additionalAppData = {
        domain: formData.domain,
        framework: formData.framework,
        deploymentMethod: formData.deploymentMethod
    }

    const addNewApp = `INSERT INTO projects_deployments (DeploymentToken, projecttoken, name, IpV4, LocalIp, type, os, DataCenterLocation, status, AdditionalInfo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
    await query(connection!, addNewApp, [
        appToken,
        projectToken,
        formData.name,
        'Not Assigned Yet',
        'Not Assigned Yet',
        formData.type,
        formData.framework,
        formData.dataCenterLocation.datacenterlocation,
        'pending',
        additionalAppData
    ])

    const appInfo = await createAppDeployment(connection!, pool, io, formData, projectToken, appToken)

    if (appInfo.error) {
        throw new Error('Failed to create app deployment')
    }

    const updateAppStatus = `UPDATE projects_deployments SET status = $1, ipv4 = $2, localip = $3, Ports = $4, ContainerID = $5, deployedat = NOW() WHERE DeploymentToken = $6 RETURNING id`
    await query(connection!, updateAppStatus, ['deployed', appInfo.publicIp, appInfo.privateIp, appInfo.ports, appInfo.containerID, appToken])

    connection?.release()

    await dockerStateTracker.startProjectEventsMonitoring(projectToken)
}

const handleStaticDeployment = async (
    connection: PoolClient,
    pool: Pool,
    io: Server,
    socket: Socket,
    projectToken: string,
    formData: CreateDeploymentRequest,
    dockerStateTracker: { startProjectEventsMonitoring: (projectToken: string) => Promise<void> }
) => {
    const staticToken = v4()

    const additionalStaticData = {
        domain: formData.domain
    }

    const addNewStatic = `INSERT INTO projects_deployments (DeploymentToken, projecttoken, name, IpV4, LocalIp, type, os, DataCenterLocation, status, AdditionalInfo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
    await query(connection!, addNewStatic, [
        staticToken,
        projectToken,
        formData.name,
        'Not Assigned Yet',
        'Not Assigned Yet',
        formData.type,
        'nginx',
        formData.dataCenterLocation.datacenterlocation,
        'pending',
        additionalStaticData
    ])

    const staticInfo = await createStaticDeployment(connection!, pool, io, formData, projectToken, staticToken)

    if (staticInfo.error) {
        throw new Error('Failed to create static site deployment')
    }

    const updateStaticStatus = `UPDATE projects_deployments SET status = $1, ipv4 = $2, localip = $3, Ports = $4, ContainerID = $5, deployedat = NOW() WHERE DeploymentToken = $6 RETURNING id`
    await query(connection!, updateStaticStatus, ['deployed', staticInfo.publicIp, staticInfo.privateIp, staticInfo.ports, staticInfo.containerID, staticToken])

    connection?.release()

    await dockerStateTracker.startProjectEventsMonitoring(projectToken)
}

const handleServerlessDeployment = async (
    connection: PoolClient,
    pool: Pool,
    io: Server,
    socket: Socket,
    projectToken: string,
    formData: CreateDeploymentRequest,
    dockerStateTracker: { startProjectEventsMonitoring: (projectToken: string) => Promise<void> }
) => {
    const serverlessToken = v4()

    const additionalServerlessData = {
        framework: formData.framework,
        runtime: formData.languageConfig?.runtime
    }

    const addNewServerless = `INSERT INTO projects_deployments (DeploymentToken, projecttoken, name, IpV4, LocalIp, type, os, DataCenterLocation, status, AdditionalInfo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
    await query(connection!, addNewServerless, [
        serverlessToken,
        projectToken,
        formData.name,
        'Not Assigned Yet',
        'Not Assigned Yet',
        formData.type,
        formData.framework,
        formData.dataCenterLocation.datacenterlocation,
        'pending',
        additionalServerlessData
    ])

    const serverlessInfo = await createServerlessDeployment(connection!, pool, io, formData, projectToken, serverlessToken)

    if (serverlessInfo.error) {
        throw new Error('Failed to create serverless deployment')
    }

    const updateServerlessStatus = `UPDATE projects_deployments SET status = $1, ipv4 = $2, localip = $3, Ports = $4, ContainerID = $5, deployedat = NOW() WHERE DeploymentToken = $6 RETURNING id`
    await query(connection!, updateServerlessStatus, ['deployed', serverlessInfo.publicIp, serverlessInfo.privateIp, serverlessInfo.ports, serverlessInfo.containerID, serverlessToken])

    connection?.release()

    await dockerStateTracker.startProjectEventsMonitoring(projectToken)
}

const createLinuxVm = async (
    connection: PoolClient,
    pool: Pool,
    io: Server,
    formData: CreateDeploymentRequest,
    projectToken: string,
    deploymentToken: string
): Promise<{ error: boolean; publicIp: string; privateIp: string; ports: Record<string, string[]>; containerID: string }> => {
    const getOsQuery = `SELECT os FROM deployment_os WHERE id = $1`
    const os = await query(connection!, getOsQuery, [formData.os.id])
    const imageName = mapOsToImage(os[0].os)
    const newUsername = `${formData.name}_machine`
    const userPassword = newUsername

    try {
        await docker.getImage(imageName).inspect()
    } catch {
        await new Promise((resolve, reject) => {
            docker.pull(imageName, (err: any, stream: any) => {
                if (err) return reject(err)
                docker.modem.followProgress(
                    stream,
                    (err: any) => (err ? reject(err) : resolve(null)),
                    (event: any) => {
                        if (event.status) console.log(`[PULL_PROGRESS] ${event.status}`)
                    }
                )
            })
        })
    }

    const containerInternalPort = await getPort()
    const proxyPublicPort = await getPort()

    const container = await docker.createContainer({
        Image: imageName,
        Cmd: ['/bin/bash'],
        name: formData.name,
        Tty: true,
        ExposedPorts: { '22/tcp': {} },
        HostConfig: {
            PortBindings: {
                '22/tcp': [{ HostPort: containerInternalPort.toString() }]
            }
        },
        Labels: {
            'com.docker.compose.project': projectToken,
            'com.docker.compose.service': formData.name
        }
    })

    await container.start()

    const distro = imageName.toLowerCase()
    if (distro.includes('ubuntu') || distro.includes('debian')) {
        await execInContainer(container, ['apt', 'update'])
        await execInContainer(container, ['apt', 'install', '-y', 'sudo', 'openssh-server'])
    } else if (distro.includes('centos') || distro.includes('rocky') || distro.includes('almalinux')) {
        await execInContainer(container, ['yum', 'install', '-y', 'sudo', 'openssh-server'])
    } else if (distro.includes('fedora')) {
        await execInContainer(container, ['dnf', 'install', '-y', 'sudo', 'openssh-server'])
    } else if (distro.includes('arch')) {
        await execInContainer(container, ['pacman', '-Sy', '--noconfirm', 'sudo', 'openssh'])
    }

    await execInContainer(container, ['useradd', '-m', '-s', '/bin/bash', newUsername])
    await execInContainer(container, ['bash', '-c', `echo "${newUsername}:${userPassword}" | chpasswd`])
    await execInContainer(container, ['usermod', '-aG', 'sudo', newUsername])
    await execInContainer(container, ['bash', '-c', `sed -i 's/^#\\?PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config`])
    await execInContainer(container, ['bash', '-c', `sed -i 's/^#\\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config`])
    await execInContainer(container, ['service', 'ssh', 'start'])

    // Create proxy for SSH port
    // createRequestProxy(pool, io, projectToken, deploymentToken, container.id, containerInternalPort, proxyPublicPort)

    const data = await container.inspect()

    return {
        error: false,
        publicIp: 'localhost',
        privateIp: data.NetworkSettings.IPAddress,
        ports: { '22/tcp': [proxyPublicPort.toString()] },
        containerID: container.id
    }
}

const createServiceDeployment = async (
    connection: PoolClient,
    pool: Pool,
    io: Server,
    formData: CreateDeploymentRequest,
    projectToken: string,
    deploymentToken: string
): Promise<{ error: boolean; publicIp: string; privateIp: string; ports: Record<string, string[]>; containerID: string }> => {
    let projectConfig: IProjectConfig = { services: [], deployments: [] }

    try {
        const file = await axios.get(`${process.env.PROJECTS_SERVER}/api/projects/repo-file?projectToken=${projectToken}&path=project-config.json&branch=main`)
        projectConfig = file.data
    } catch (error: any) {
        logging.error('READING_PROJECT_CONFIG', error.message)
        return { error: true, publicIp: '', privateIp: '', ports: {}, containerID: '' }
    }

    if (projectConfig.services.length < Number(formData.serviceID!)) {
        return { error: true, publicIp: '', privateIp: '', ports: {}, containerID: '' }
    }

    const imageName = mapServiceToImage(projectConfig.services[Number(formData.serviceID!) - 1]['start-command'])

    try {
        await docker.getImage(imageName).inspect()
    } catch {
        await new Promise((resolve, reject) => {
            docker.pull(imageName, (err: any, stream: any) => {
                if (err) return reject(err)
                docker.modem.followProgress(
                    stream,
                    (err: any) => (err ? reject(err) : resolve(null)),
                    (event: any) => {
                        if (event.status) console.log(`[PULL_PROGRESS] ${event.status}`)
                    }
                )
            })
        })
    }

    const servicePorts = projectConfig.services[Number(formData.serviceID!) - 1].ports || {}
    const ExposedPorts: Record<string, {}> = { '22/tcp': {} }
    const PortBindings: Record<string, { HostPort: string }[]> = {}
    const publicPorts: Record<string, string[]> = {}

    for (const [containerPort, _] of Object.entries(servicePorts)) {
        const portKey = `${containerPort}/tcp`
        const containerInternalPort = await getPort()
        const proxyPublicPort = await getPort()

        ExposedPorts[portKey] = {}
        PortBindings[portKey] = [{ HostPort: containerInternalPort.toString() }]

        publicPorts[portKey] = [proxyPublicPort.toString(), containerInternalPort.toString()]
    }

    const container = await docker.createContainer({
        Image: imageName,
        name: formData.name,
        Tty: true,
        ExposedPorts,
        HostConfig: { PortBindings },
        Labels: {
            'com.docker.compose.project': projectToken,
            'com.docker.compose.service': formData.name
        }
    })

    await container.start()
    await execInContainer(container, ['apk', 'add', '--no-cache', 'git'])
    await execInContainer(container, ['mkdir', '-p', '/app'])
    await execInContainer(container, ['git', 'clone', '--depth=1', `${process.env.GIT_REPOSITORY}/${projectToken}.git`, '/app'])

    if (projectConfig.services[Number(formData.serviceID!) - 1].setup?.length) {
        for (const setupCommand of projectConfig.services[Number(formData.serviceID!) - 1].setup!) {
            await execInContainer(container, ['sh', '-c', `cd /app && ${setupCommand.run}`])
        }
    }

    if (projectConfig.services[Number(formData.serviceID!) - 1]['start-command']) {
        const startCmd = projectConfig.services[Number(formData.serviceID!) - 1]['start-command']

        const startupScript = `#!/bin/sh
cd /app
exec ${startCmd} 2>&1 | tee /var/log/app.log
`

        await execInContainer(container, [
            'sh',
            '-c',
            `cat > /app/start.sh << 'EOF'
${startupScript}
EOF`
        ])

        await execInContainer(container, ['chmod', '+x', '/app/start.sh'])
        await execInContainer(container, ['sh', '-c', 'setsid /app/start.sh > /dev/null 2>&1 &'])
        await new Promise(resolve => setTimeout(resolve, 3000))

        try {
            const logResult = await execInContainer(container, ['sh', '-c', 'cat /var/log/app.log'], { streamOutput: false })
            logging.info('SERVICE_LOGS', logResult.output)
        } catch {}
    }

    const data = await container.inspect()
    const portsObj: Record<string, string[]> = {}

    for (const [portKey, [proxyPort, containerPort]] of Object.entries(publicPorts)) {
        createRequestProxy(pool, io, projectToken, deploymentToken, container.id, parseInt(containerPort), parseInt(proxyPort))

        portsObj[portKey] = [proxyPort]
    }

    return {
        error: false,
        publicIp: 'localhost',
        privateIp: data.NetworkSettings.IPAddress,
        ports: portsObj,
        containerID: container.id
    }
}

const createDBDeployment = async (
    connection: PoolClient,
    pool: Pool,
    io: Server,
    formData: CreateDeploymentRequest,
    projectToken: string,
    deploymentToken: string
): Promise<{ error: boolean; publicIp: string; privateIp: string; ports: Record<string, string[]>; containerID: string }> => {
    const dbType = formData.databaseType?.toLowerCase()
    let imageName = ''
    let defaultPort = ''
    let envVars: string[] = []

    switch (dbType) {
        case 'postgresql':
        case 'postgres':
            imageName = `postgres:${formData.version || '16'}`
            defaultPort = '5432'
            envVars = ['POSTGRES_USER=admin', 'POSTGRES_PASSWORD=admin123', 'POSTGRES_DB=defaultdb']
            break
        case 'mysql':
            imageName = `mysql:${formData.version || '8.0'}`
            defaultPort = '3306'
            envVars = ['MYSQL_ROOT_PASSWORD=root123', 'MYSQL_DATABASE=defaultdb', 'MYSQL_USER=admin', 'MYSQL_PASSWORD=admin123']
            break
        case 'mongodb':
        case 'mongo':
            imageName = `mongo:${formData.version || '7'}`
            defaultPort = '27017'
            envVars = ['MONGO_INITDB_ROOT_USERNAME=admin', 'MONGO_INITDB_ROOT_PASSWORD=admin123']
            break
        case 'redis':
            imageName = `redis:${formData.version || '7-alpine'}`
            defaultPort = '6379'
            envVars = []
            break
        case 'mariadb':
            imageName = `mariadb:${formData.version || '11'}`
            defaultPort = '3306'
            envVars = ['MARIADB_ROOT_PASSWORD=root123', 'MARIADB_DATABASE=defaultdb', 'MARIADB_USER=admin', 'MARIADB_PASSWORD=admin123']
            break
        default:
            return { error: true, publicIp: '', privateIp: '', ports: {}, containerID: '' }
    }

    try {
        await docker.getImage(imageName).inspect()
    } catch {
        await new Promise((resolve, reject) => {
            docker.pull(imageName, (err: any, stream: any) => {
                if (err) return reject(err)
                docker.modem.followProgress(
                    stream,
                    (err: any) => (err ? reject(err) : resolve(null)),
                    (event: any) => {
                        if (event.status) console.log(`[PULL_PROGRESS] ${event.status}`)
                    }
                )
            })
        })
    }

    const containerInternalPort = await getPort()
    const proxyPublicPort = await getPort()
    const volumeName = `${projectToken}_${formData.name}_data`

    await docker.createVolume({
        Name: volumeName,
        Labels: {
            'com.docker.compose.project': projectToken,
            'com.docker.compose.service': formData.name
        }
    })

    const container = await docker.createContainer({
        Image: imageName,
        name: formData.name,
        Env: envVars,
        ExposedPorts: { [`${defaultPort}/tcp`]: {} },
        HostConfig: {
            PortBindings: {
                [`${defaultPort}/tcp`]: [{ HostPort: containerInternalPort.toString() }]
            },
            Binds: [`${volumeName}:/var/lib/${dbType === 'mongodb' || dbType === 'mongo' ? 'mongodb' : dbType}`]
        },
        Labels: {
            'com.docker.compose.project': projectToken,
            'com.docker.compose.service': formData.name,
            'database.type': dbType
        }
    })

    await container.start()

    createRequestProxy(pool, io, projectToken, deploymentToken, container.id, containerInternalPort, proxyPublicPort)

    logging.info('CREATE_DB', `Database ${dbType} started. Access via proxy on port ${proxyPublicPort}`)

    const data = await container.inspect()

    return {
        error: false,
        publicIp: 'localhost',
        privateIp: data.NetworkSettings.IPAddress,
        ports: { [`${defaultPort}/tcp`]: [proxyPublicPort.toString()] },
        containerID: container.id
    }
}

const createAppDeployment = async (
    connection: PoolClient,
    pool: Pool,
    io: Server,
    formData: CreateDeploymentRequest,
    projectToken: string,
    deploymentToken: string
): Promise<{ error: boolean; publicIp: string; privateIp: string; ports: Record<string, string[]>; containerID: string }> => {
    let imageName = ''

    switch (formData.framework?.toLowerCase()) {
        case 'nextjs':
        case 'react':
        case 'vue':
        case 'angular':
            imageName = 'node:22-alpine'
            break
        case 'express':
        case 'nestjs':
            imageName = 'node:22-alpine'
            break
        case 'django':
        case 'flask':
        case 'fastapi':
            imageName = 'python:3.11-alpine'
            break
        case 'laravel':
            imageName = 'php:8.2-fpm-alpine'
            break
        case 'rails':
            imageName = 'ruby:3.2-alpine'
            break
        default:
            imageName = 'node:22-alpine'
    }

    try {
        await docker.getImage(imageName).inspect()
    } catch {
        await new Promise((resolve, reject) => {
            docker.pull(imageName, (err: any, stream: any) => {
                if (err) return reject(err)
                docker.modem.followProgress(
                    stream,
                    (err: any) => (err ? reject(err) : resolve(null)),
                    (event: any) => {
                        if (event.status) console.log(`[PULL_PROGRESS] ${event.status}`)
                    }
                )
            })
        })
    }

    const containerInternalPort = await getPort()
    const proxyPublicPort = await getPort()

    const container = await docker.createContainer({
        Image: imageName,
        name: formData.name,
        Tty: true,
        ExposedPorts: { '3000/tcp': {} },
        HostConfig: {
            PortBindings: {
                '3000/tcp': [{ HostPort: containerInternalPort.toString() }]
            }
        },
        Labels: {
            'com.docker.compose.project': projectToken,
            'com.docker.compose.service': formData.name,
            'app.framework': formData.framework || 'unknown'
        }
    })

    await container.start()

    if (imageName.includes('alpine')) {
        await execInContainer(container, ['apk', 'add', '--no-cache', 'git'])
    }

    await execInContainer(container, ['mkdir', '-p', '/app'])
    await execInContainer(container, ['git', 'clone', '--depth=1', `${process.env.GIT_REPOSITORY}/${projectToken}.git`, '/app'])

    if (['nextjs', 'react', 'vue', 'angular', 'express', 'nestjs'].includes(formData.framework?.toLowerCase() || '')) {
        await execInContainer(container, ['sh', '-c', 'cd /app && npm install'])
        await execInContainer(container, ['sh', '-c', 'cd /app && nohup npm start > /var/log/app.log 2>&1 &'])
    } else if (['django', 'flask', 'fastapi'].includes(formData.framework?.toLowerCase() || '')) {
        await execInContainer(container, ['sh', '-c', 'cd /app && pip install -r requirements.txt'])
        await execInContainer(container, ['sh', '-c', 'cd /app && nohup python app.py > /var/log/app.log 2>&1 &'])
    }

    await new Promise(resolve => setTimeout(resolve, 2000))

    // Create proxy for app port
    createRequestProxy(pool, io, projectToken, deploymentToken, container.id, containerInternalPort, proxyPublicPort)

    const data = await container.inspect()

    return {
        error: false,
        publicIp: 'localhost',
        privateIp: data.NetworkSettings.IPAddress,
        ports: { '3000/tcp': [proxyPublicPort.toString()] },
        containerID: container.id
    }
}

const createStaticDeployment = async (
    connection: PoolClient,
    pool: Pool,
    io: Server,
    formData: CreateDeploymentRequest,
    projectToken: string,
    deploymentToken: string
): Promise<{ error: boolean; publicIp: string; privateIp: string; ports: Record<string, string[]>; containerID: string }> => {
    const imageName = 'nginx:alpine'

    try {
        await docker.getImage(imageName).inspect()
    } catch {
        await new Promise((resolve, reject) => {
            docker.pull(imageName, (err: any, stream: any) => {
                if (err) return reject(err)
                docker.modem.followProgress(
                    stream,
                    (err: any) => (err ? reject(err) : resolve(null)),
                    (event: any) => {
                        if (event.status) console.log(`[PULL_PROGRESS] ${event.status}`)
                    }
                )
            })
        })
    }

    const containerInternalPort = await getPort()
    const proxyPublicPort = await getPort()

    const container = await docker.createContainer({
        Image: imageName,
        name: formData.name,
        ExposedPorts: { '80/tcp': {} },
        HostConfig: {
            PortBindings: {
                '80/tcp': [{ HostPort: containerInternalPort.toString() }]
            }
        },
        Labels: {
            'com.docker.compose.project': projectToken,
            'com.docker.compose.service': formData.name
        }
    })

    await container.start()

    await execInContainer(container, ['apk', 'add', '--no-cache', 'git'])
    await execInContainer(container, ['git', 'clone', '--depth=1', `${process.env.GIT_REPOSITORY}/${projectToken}.git`, '/tmp/repo'])
    await execInContainer(container, ['sh', '-c', 'cp -r /tmp/repo/* /usr/share/nginx/html/'])
    await execInContainer(container, ['nginx', '-s', 'reload'])

    // Create proxy for static site
    createRequestProxy(pool, io, projectToken, deploymentToken, container.id, containerInternalPort, proxyPublicPort)

    logging.info('CREATE_STATIC', `Static site deployed. Access via proxy on port ${proxyPublicPort}`)

    const data = await container.inspect()

    return {
        error: false,
        publicIp: 'localhost',
        privateIp: data.NetworkSettings.IPAddress,
        ports: { '80/tcp': [proxyPublicPort.toString()] },
        containerID: container.id
    }
}

const createServerlessDeployment = async (
    connection: PoolClient,
    pool: Pool,
    io: Server,
    formData: CreateDeploymentRequest,
    projectToken: string,
    deploymentToken: string
): Promise<{ error: boolean; publicIp: string; privateIp: string; ports: Record<string, string[]>; containerID: string }> => {
    const runtime = formData.languageConfig?.runtime || 'node'
    let imageName = ''

    switch (runtime.toLowerCase()) {
        case 'node':
        case 'nodejs':
            imageName = 'node:22-alpine'
            break
        case 'python':
        case 'python3':
            imageName = 'python:3.11-alpine'
            break
        case 'go':
            imageName = 'golang:1.21-alpine'
            break
        default:
            imageName = 'node:22-alpine'
    }

    try {
        await docker.getImage(imageName).inspect()
    } catch {
        await new Promise((resolve, reject) => {
            docker.pull(imageName, (err: any, stream: any) => {
                if (err) return reject(err)
                docker.modem.followProgress(
                    stream,
                    (err: any) => (err ? reject(err) : resolve(null)),
                    (event: any) => {
                        if (event.status) console.log(`[PULL_PROGRESS] ${event.status}`)
                    }
                )
            })
        })
    }

    const containerInternalPort = await getPort()
    const proxyPublicPort = await getPort()

    const container = await docker.createContainer({
        Image: imageName,
        name: formData.name,
        Tty: true,
        ExposedPorts: { '8080/tcp': {} },
        HostConfig: {
            PortBindings: {
                '8080/tcp': [{ HostPort: containerInternalPort.toString() }]
            }
        },
        Labels: {
            'com.docker.compose.project': projectToken,
            'com.docker.compose.service': formData.name,
            'function.runtime': runtime
        }
    })

    await container.start()

    if (imageName.includes('alpine')) {
        await execInContainer(container, ['apk', 'add', '--no-cache', 'git'])
    }

    await execInContainer(container, ['mkdir', '-p', '/function'])
    await execInContainer(container, ['git', 'clone', '--depth=1', `${process.env.GIT_REPOSITORY}/${projectToken}.git`, '/function'])

    if (runtime.toLowerCase().includes('node')) {
        await execInContainer(container, ['sh', '-c', 'cd /function && npm install'])
        await execInContainer(container, ['sh', '-c', 'cd /function && nohup node index.js > /var/log/function.log 2>&1 &'])
    } else if (runtime.toLowerCase().includes('python')) {
        await execInContainer(container, ['sh', '-c', 'cd /function && pip install -r requirements.txt'])
        await execInContainer(container, ['sh', '-c', 'cd /function && nohup python main.py > /var/log/function.log 2>&1 &'])
    }

    // Create proxy for serverless function
    createRequestProxy(pool, io, projectToken, deploymentToken, container.id, containerInternalPort, proxyPublicPort)

    logging.info('CREATE_SERVERLESS', `Serverless function deployed. Access via proxy on port ${proxyPublicPort}`)

    const data = await container.inspect()

    return {
        error: false,
        publicIp: 'localhost',
        privateIp: data.NetworkSettings.IPAddress,
        ports: { '8080/tcp': [proxyPublicPort.toString()] },
        containerID: container.id
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

const getDeploymentLogs = async (pool: Pool, io: Server, socket: Socket, projectToken: string, deploymentToken: string, options?: LogOptions) => {
    let connection: PoolClient | null = null

    try {
        connection = await connect(pool)
        const getDeploymentQuery: string = `
            SELECT ContainerID, name, type, status
            FROM projects_deployments
            WHERE projecttoken = $1 AND deploymenttoken = $2
        `
        const deployment = await query(connection!, getDeploymentQuery, [projectToken, deploymentToken])

        if (deployment.length === 0) {
            connection!.release()
            return socket.emit('get-logs-error', {
                error: true,
                errmsg: 'Deployment not found'
            })
        }

        const containerID: string = deployment[0].containerid
        const deploymentType: string = deployment[0].type

        if (!containerID) {
            connection!.release()
            return socket.emit('get-logs-error', {
                error: true,
                errmsg: 'Container ID not found for this deployment'
            })
        }

        if (deploymentType === 'volume') {
            connection!.release()
            return socket.emit('deployment-logs', {
                deploymentToken,
                logs: 'Volumes do not produce logs',
                containerID,
                timestamp: new Date().toISOString()
            })
        }

        const container = docker.getContainer(containerID)

        try {
            const containerInfo = await container.inspect()

            if (deploymentType === 'service') {
                if (options?.follow) {
                    const tailProcess = await container.exec({
                        Cmd: ['sh', '-c', 'tail -f /var/log/app.log 2>&1 || echo "Log file not found"'],
                        AttachStdout: true,
                        AttachStderr: true
                    })

                    tailProcess.start({ Detach: false, Tty: false }, (err, stream) => {
                        if (err) {
                            logging.error('START_TAIL_PROCESS', err.message)
                            return socket.emit('get-logs-error', {
                                error: true,
                                errmsg: 'Error streaming service logs'
                            })
                        }

                        if (stream) {
                            const stdout = new PassThrough()
                            const stderr = new PassThrough()

                            docker.modem.demuxStream(stream, stdout, stderr)

                            stdout.on('data', (chunk: Buffer) => {
                                const logLines = chunk.toString('utf8').split('\n')
                                logLines.forEach(line => {
                                    const trimmedLine = line.trim()
                                    if (trimmedLine) {
                                        socket.emit('deployment-logs-stream', {
                                            deploymentToken,
                                            log: trimmedLine,
                                            timestamp: new Date().toISOString()
                                        })
                                    }
                                })
                            })

                            stderr.on('data', (chunk: Buffer) => {
                                const logLines = chunk.toString('utf8').split('\n')
                                logLines.forEach(line => {
                                    const trimmedLine = line.trim()
                                    if (trimmedLine) {
                                        socket.emit('deployment-logs-stream', {
                                            deploymentToken,
                                            log: trimmedLine,
                                            timestamp: new Date().toISOString()
                                        })
                                    }
                                })
                            })

                            stream.on('end', () => {
                                stdout.end()
                                stderr.end()
                                socket.emit('deployment-logs-stream-end', {
                                    deploymentToken
                                })
                            })

                            stream.on('error', (error: Error) => {
                                logging.error('STREAM_SERVICE_LOGS', error.message)
                                socket.emit('get-logs-error', {
                                    error: true,
                                    errmsg: 'Error streaming logs'
                                })
                            })

                            socket.data.logStream = stream
                        }
                    })
                } else {
                    try {
                        const execResult = await container.exec({
                            Cmd: ['sh', '-c', `tail -n ${options?.tail || 100} /var/log/app.log 2>&1 || echo "Log file not found or empty"`],
                            AttachStdout: true,
                            AttachStderr: true
                        })

                        const logStream = await execResult.start({ Detach: false, Tty: false })

                        const stdout = new PassThrough()
                        const stderr = new PassThrough()

                        docker.modem.demuxStream(logStream, stdout, stderr)

                        let output = ''

                        stdout.on('data', (chunk: Buffer) => {
                            output += chunk.toString('utf8')
                        })

                        stderr.on('data', (chunk: Buffer) => {
                            output += chunk.toString('utf8')
                        })

                        await new Promise<void>((resolve, reject) => {
                            logStream.on('end', () => resolve())
                            logStream.on('error', reject)
                        })

                        connection!.release()
                        connection = null

                        return socket.emit('deployment-logs', {
                            deploymentToken,
                            logs: output || 'No logs available yet',
                            containerID,
                            containerStatus: containerInfo.State.Status,
                            timestamp: new Date().toISOString()
                        })
                    } catch (execError: any) {
                        logging.error('READ_SERVICE_LOGS', execError.message)

                        if (connection) {
                            connection.release()
                            connection = null
                        }

                        return socket.emit('deployment-logs', {
                            deploymentToken,
                            logs: 'Unable to read service logs',
                            containerID,
                            containerStatus: containerInfo.State.Status,
                            timestamp: new Date().toISOString()
                        })
                    }
                }
            } else {
                if (options?.follow) {
                    const logOptions = {
                        stdout: true,
                        stderr: true,
                        tail: options.tail || 100,
                        timestamps: options.timestamps !== false,
                        follow: true as const,
                        ...(options.since && { since: options.since })
                    }

                    const stream = (await container.logs(logOptions)) as NodeJS.ReadableStream

                    const stdout = new PassThrough()
                    const stderr = new PassThrough()

                    docker.modem.demuxStream(stream, stdout, stderr)

                    stdout.on('data', (chunk: Buffer) => {
                        const logLines = chunk.toString('utf8').split('\n')
                        logLines.forEach(line => {
                            const trimmedLine = line.trim()
                            if (trimmedLine) {
                                socket.emit('deployment-logs-stream', {
                                    deploymentToken,
                                    log: trimmedLine,
                                    timestamp: new Date().toISOString()
                                })
                            }
                        })
                    })

                    stderr.on('data', (chunk: Buffer) => {
                        const logLines = chunk.toString('utf8').split('\n')
                        logLines.forEach(line => {
                            const trimmedLine = line.trim()
                            if (trimmedLine) {
                                socket.emit('deployment-logs-stream', {
                                    deploymentToken,
                                    log: trimmedLine,
                                    timestamp: new Date().toISOString()
                                })
                            }
                        })
                    })

                    stream.on('end', () => {
                        stdout.end()
                        stderr.end()
                        socket.emit('deployment-logs-stream-end', {
                            deploymentToken
                        })
                    })

                    stream.on('error', (error: Error) => {
                        logging.error('STREAM_LOGS', error.message)
                        socket.emit('get-logs-error', {
                            error: true,
                            errmsg: 'Error streaming logs'
                        })
                    })

                    socket.data.logStream = stream
                } else {
                    const logOptions = {
                        stdout: true,
                        stderr: true,
                        tail: options?.tail || 100,
                        timestamps: options?.timestamps !== false,
                        follow: false as const,
                        ...(options?.since && { since: options.since })
                    }

                    const logs = await container.logs(logOptions)

                    const { Readable } = require('stream')
                    const bufferStream = Readable.from([logs])

                    const stdout = new PassThrough()
                    const stderr = new PassThrough()

                    docker.modem.demuxStream(bufferStream, stdout, stderr)

                    let output = ''

                    stdout.on('data', (chunk: Buffer) => {
                        output += chunk.toString('utf8')
                    })

                    stderr.on('data', (chunk: Buffer) => {
                        output += chunk.toString('utf8')
                    })

                    await new Promise<void>((resolve, reject) => {
                        bufferStream.on('end', () => {
                            stdout.end()
                            stderr.end()
                            resolve()
                        })
                        bufferStream.on('error', reject)
                    })

                    connection!.release()
                    connection = null

                    return socket.emit('deployment-logs', {
                        deploymentToken,
                        logs: output,
                        containerID,
                        containerStatus: containerInfo.State.Status,
                        timestamp: new Date().toISOString()
                    })
                }
            }
        } catch (error: any) {
            if (connection) {
                connection.release()
                connection = null
            }

            if (error.statusCode === 404) {
                return socket.emit('get-logs-error', {
                    error: true,
                    errmsg: 'Container not found. It may have been removed.'
                })
            }

            logging.error('GET_LOGS', error.message)
            return socket.emit('get-logs-error', {
                error: true,
                errmsg: 'Failed to retrieve logs'
            })
        }

        if (connection && !options?.follow) {
            connection.release()
        }
    } catch (error: any) {
        if (connection) {
            connection.release()
        }

        logging.error('GET_DEPLOYMENT_LOGS', error.message)
        return socket.emit('get-logs-error', {
            error: true,
            errmsg: 'Failed to fetch deployment logs'
        })
    }
}

const streamDeploymentMetrics = async (pool: Pool, io: Server, socket: Socket, projectToken: string, deploymentToken: string, interval: number = 2000) => {
    try {
        const connection = await connect(pool)

        const getDeploymentQuery: string = `
            SELECT ContainerID, name, type, status 
            FROM projects_deployments 
            WHERE projecttoken = $1 AND deploymenttoken = $2
        `
        const deployment = await query(connection!, getDeploymentQuery, [projectToken, deploymentToken])

        if (deployment.length === 0) {
            connection!.release()
            return socket.emit('stream-metrics-error', {
                error: true,
                errmsg: 'Deployment not found'
            })
        }

        const containerID: string = deployment[0].containerid
        const deploymentType: string = deployment[0].type

        if (deploymentType === 'volume') {
            connection!.release()
            return socket.emit('stream-metrics-error', {
                error: true,
                errmsg: 'Volumes do not have metrics to stream'
            })
        }

        const container = docker.getContainer(containerID)

        const stream = (await container.stats({ stream: true })) as NodeJS.ReadableStream

        stream.on('data', (chunk: Buffer) => {
            try {
                const stats: any = JSON.parse(chunk.toString('utf8'))

                const cpuDelta: number = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage
                const systemDelta: number = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage
                const cpuPercent: number = (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100

                const memoryUsage: number = stats.memory_stats.usage || 0
                const memoryLimit: number = stats.memory_stats.limit || 0
                const memoryPercent: number = (memoryUsage / memoryLimit) * 100

                let networkRx: number = 0
                let networkTx: number = 0
                if (stats.networks) {
                    Object.values(stats.networks).forEach((network: any) => {
                        networkRx += network.rx_bytes || 0
                        networkTx += network.tx_bytes || 0
                    })
                }

                socket.emit('deployment-metrics-stream', {
                    deploymentToken,
                    cpu: parseFloat(cpuPercent.toFixed(2)),
                    memory: parseFloat(memoryPercent.toFixed(2)),
                    memoryMB: parseFloat((memoryUsage / 1024 / 1024).toFixed(2)),
                    networkRxMB: parseFloat((networkRx / 1024 / 1024).toFixed(2)),
                    networkTxMB: parseFloat((networkTx / 1024 / 1024).toFixed(2)),
                    timestamp: new Date().toISOString()
                })
            } catch (parseError: any) {
                logging.error('PARSE_METRICS_STREAM', parseError.message)
            }
        })

        stream.on('error', (error: Error) => {
            logging.error('METRICS_STREAM', error.message)
            socket.emit('stream-metrics-error', {
                error: true,
                errmsg: 'Error streaming metrics'
            })
        })

        socket.data.metricsStream = stream

        connection!.release()
    } catch (error: any) {
        logging.error('STREAM_DEPLOYMENT_METRICS', error.message)
        return socket.emit('stream-metrics-error', {
            error: true,
            errmsg: 'Failed to stream deployment metrics'
        })
    }
}

const stopStreaming = (socket: Socket, type: 'logs' | 'metrics'): void => {
    try {
        if (type === 'logs' && socket.data.logStream) {
            socket.data.logStream.destroy()
            delete socket.data.logStream
            socket.emit('logs-stream-stopped', { success: true })
        } else if (type === 'metrics' && socket.data.metricsStream) {
            socket.data.metricsStream.destroy()
            delete socket.data.metricsStream
            socket.emit('metrics-stream-stopped', { success: true })
        }
    } catch (error: any) {
        logging.error('STOP_STREAMING', error.message)
    }
}

export default { getAllDeployments, createDeployment, startDeployment, stopDeployment, deleteDeployment, getDeploymentLogs, streamDeploymentMetrics, stopStreaming }
