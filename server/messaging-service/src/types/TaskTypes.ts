export interface IAllTasksResp {
    error: boolean;
    containers: Array<ITaskContainers>;
    tasks: Array<ITasks>;
}

export interface ITaskContainers {
    containeruuid: string;
    containername: string;
    state: ContainerState;
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
