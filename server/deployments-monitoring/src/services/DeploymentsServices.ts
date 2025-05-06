import { Pool, PoolClient } from 'pg'
import { Server, Socket } from 'socket.io'
import { connect, query } from '../config/postgresql'
import logging from '../config/logging'
import { checkForPermissions, execInContainer, getUserPrivateTokenFromSessionToken, getUserPublicTokenFromSessionToken, mapOsToImage } from '../utils/utils'
import { CreateDeploymentRequest, eDeploymentStatus } from '../types/DeploymentTypes'
import Docker from 'dockerode'
import { v4 } from 'uuid'

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

                // Sanitize the VM name to meet Docker's naming requirements
                let sanitizedName = formData.name
                    .replace(/[^a-zA-Z0-9_.-]/g, '') // Remove invalid characters
                    .replace(/^[^a-zA-Z0-9]/g, 'vm') // Ensure starts with alphanumeric

                if (sanitizedName.length === 0) {
                    sanitizedName = `vm-${vmToken.substring(0, 8)}` // Fallback name if all chars were stripped
                }

                const additionalData = {
                    sshName: `${sanitizedName}_machine`
                }

                // console.log(req.body.formData.dataCenterLocation.datacenterlocation);
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

                // Restart the monitoring for this project to include the new container
                try {
                    await dockerStateTracker.startProjectEventsMonitoring(projectToken)
                    logging.info('CREATE_DEPLOYMENT', `Updated container monitoring for project: ${projectToken}`)
                } catch (monitorError) {
                    logging.error('CREATE_DEPLOYMENT', `Failed to update container monitoring: ${monitorError}`)
                    // Don't fail the deployment if monitoring update fails
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
    } catch (err) {
        // console.log(`Pulling image ${imageName}...`);
        await new Promise((resolve, reject) => {
            docker.pull(imageName, (err: any, stream: any) => {
                if (err) return reject(err)
                docker.modem.followProgress(stream, resolve, reject)
            })
        })
    }

    const container = await docker.createContainer({
        Image: imageName,
        Cmd: ['/bin/bash'],
        name: formData.name,
        Tty: true,
        ExposedPorts: { '22/tcp': {} },
        HostConfig: { PublishAllPorts: true },
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

export default { getAllDeployments, createDeployment }
