export enum eDeploymentStatus {
    DEPLOYING = 'deploying',
    DEPLOYED = 'deployed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
    STOPPED = 'stopped'
}

export type ContainerEvent = {
    type: string,
    containerId:  number,
    deploymentId: number,
    currentState: string,
    reason: string
}