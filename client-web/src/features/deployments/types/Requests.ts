export interface RecentRequestsProps {
    id: string
    method: string
    path: string
    status: number
    time: string
    timestamp: string
    ip: string
}


export interface RequestTrackingState {
    [deploymentToken: string]: {
        enabled: boolean
        proxyPort: number | null
        logs: RecentRequestsProps[]
    }
}
