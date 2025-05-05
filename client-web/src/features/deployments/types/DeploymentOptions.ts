export interface DeploymentType {
    id: number
    types: string
    name: string
}

export interface DeploymentOS {
    id: number
    os: string
}

export interface DataCenters {
    id: number
    datacenterlocation: string
}

export interface DeploymentOptions {
    types: DeploymentType[]
    os: DeploymentOS[]
    datacenters: DataCenters[]
}

export interface ServiceCardPropsRequest {
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
