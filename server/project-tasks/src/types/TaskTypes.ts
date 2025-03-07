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
    TaskUUID: string;
    TaskName: string;
    TaskDescription: string;
    TaskStatus: string;
    TaskImportance: string;
    ContainerUUID: string;
    State: TaskState;
}

export enum ContainerState {
    Creating,
    Created,
    Editing,
}

export enum TaskState {
    Creating,
    Created,
    Editing,
}
