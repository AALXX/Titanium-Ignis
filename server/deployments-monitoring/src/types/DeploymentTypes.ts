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
    dataCenterLocation: DataCenters
    environment: string
    isActive: boolean
    resourceAllocation: ResourceAllocation
    deploymentMethod: string
    tags: string[]
    framework: string
    version: string
    os: DeploymentOS
    databaseType: string
    volumeType: string
    backupEnabled: boolean
}