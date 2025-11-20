export enum eDeploymentStatus {
    DEPLOYING = 'deploying',
    DEPLOYED = 'deployed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
    STOPPED = 'stopped'
}

export interface DeploymentData {
    id: number
    projecttoken: string
    deploymenttoken: string
    serviceid: number | null
    name: string
    type: string
    domain: string | null
    ipv4: string
    ipv6: string | null
    localip: string
    ports: Record<string, string[]>
    datacenterlocation: string
    os: string
    createdat: string
    deployedat: string | null
    updatedat: string
    additionalinfo: any
    status: string
    environment: string
    isactive: boolean
    resourceallocation: any | null
    deploymentmethod: string | null
    deploymentduration: number | null
    deployedby: string | null
    lasthealthcheckat: string | null
    healthstatus: string | null
    rollbackreference: number | null
    tags: string[] | null
}

interface ResourceAllocation {
    cpu: number
    ram: number
    storage: number
}

export interface DeploymentOS {
    id: number
    os: string
}

export interface DataCenters {
    id: number
    datacenterlocation: string
}

export interface CreateDeploymentRequest {
    name: string
    type: string
    domain: string
    serviceID: number | null
    dataCenterLocation: DataCenters
    environment: string
    isActive: boolean
    resourceAllocation: ResourceAllocation
    deploymentMethod: string
    languageConfig: any
    tags: string[]
    framework: string
    version: string
    os: DeploymentOS
    databaseType: string
    volumeType: string
    backupEnabled: boolean
}

export interface IProjectConfig {
    services: Array<{
        id: number
        name: string
        dir: string
        setup?: Array<{ run: string }>
        'start-command': string
        ports?: Record<string, string[]>
    }>
    deployments: Array<{
        id: number
        name: string
        type: eDeploymentType
        server: string
        'docker-compose-file'?: string
    }>
}

export enum eDeploymentType {
    DOCKER_COMPOSE = 'docker-compose',
    DOCKER_SWARM = 'docker-swarm',
    KUBERNETES = 'kubernetes'
}

export interface ExecOptions {
    captureOutput?: boolean
    streamOutput?: boolean
    detach?: boolean
}

export interface ExecResult {
    exitCode: number
    output: string
}

export interface LogOptions {
    tail?: number
    since?: number
    timestamps?: boolean
    follow?: boolean
}

export interface CPUMetrics {
    usage: number
    cores: number
}

export interface MemoryMetrics {
    usage: number
    limit: number
    percent: number
    usageMB: number
    limitMB: number
}

export interface NetworkMetrics {
    rxBytes: number
    txBytes: number
    rxMB: number
    txMB: number
}

export interface BlockIOMetrics {
    readBytes: number
    writeBytes: number
    readMB: number
    writeMB: number
}

export interface DeploymentMetrics {
    deploymentToken: string
    containerID: string
    status: string
    running: boolean
    startedAt: string
    cpu: CPUMetrics
    memory: MemoryMetrics
    network: NetworkMetrics
    blockIO: BlockIOMetrics
    pids: number
    timestamp: string
}
