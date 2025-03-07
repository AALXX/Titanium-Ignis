export interface ITaskBanners {
    projecttoken: string
    bannertoken: string
    bannername: string
    departamentassignedto: number
    asigneremail: string
    asignername: string
    asignerrole: string
}

export interface IAllTasksResp {
    error: boolean
    containers: Array<ITaskContainers>
    tasks: Array<ITasks>
}

export interface ITaskContainers {
    containeruuid: string
    containername: string
    containerorder: number
    state: EContainerState  
}

export interface ITasks {
    TaskUUID: string
    TaskName: string
    ContainerUUID: string
}

export interface ITeamDivisions {
    id: number
    divisionname: string
}

export enum EContainerState {
    Creating,
    Created,
    Editing
}

export enum ETaskState {
    Creating,
    Created,
    Editing
}
