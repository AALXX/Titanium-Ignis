// What the client sends (no sender token or timestamp)
export interface MessageReq {
    content: string
    attachments?: {
        type: 'image' | 'file'
        url: string
        name: string
        size?: number
    }[]
}

export interface Message {
    content: string
    senderpublictoken: string
    attachments?: {
        type: string
        url: string
        name: string
        size?: string // Converted to string before storing in Cassandra
    }[]
    timesent: Date
}

export interface ITasks {
    TaskUUID: string
    TaskName: string
    TaskDescription: string
    TaskStatus: string
    TaskImportance: string
    ContainerUUID: string
    TaskDueDate: Date
}

export enum ContainerState {
    Creating,
    Created,
    Editing,
}
