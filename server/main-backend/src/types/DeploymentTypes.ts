export enum eDeploymentStatus {
    DEPLOYING = 'deploying',
    DEPLOYED = 'deployed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
    STOPPED = 'stopped',
}

export interface DeploymentType {
    id: number;
    types: string;
    name: string;
}

export interface DeploymentOS {
    id: number;
    os: string;
}

export interface DataCenters {
    id: number;
    datacenterlocation: string;
}

export interface DeploymentOptions {
    types: DeploymentType[];
    os: DeploymentOS[];
    datacenters: DataCenters[];
}

export interface ResourceAllocation {
    cpu: number;
    ram: number;
    storage: number;
}


export interface DeploymentFormData {
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