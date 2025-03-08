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
    TaskImportance: string
    TaskDueDate: Date
}

export interface ITaskData {
    assignedmemberusername: string | null
    containeruuid: string
    createdbyusername: string
    id: number
    taskactualhours: number | null
    taskattachmentscount: number
    taskcommentscount: number
    taskcompleteddate: string | null
    taskcreateddate: string
    taskcustomfields: any[]
    taskdependencies: any | null
    taskdescription: string
    taskduedate: string
    taskestimatedhours: number | null
    taskimportance: 'Low' | 'Medium' | 'High' | string
    taskisarchived: boolean
    tasklabels: string[]
    tasklastupdated: string
    tasklastupdatedby: string
    taskname: string
    taskreminderdate: string | null
    taskstatus: 'To Do' | 'In Progress' | 'Done' | string
    taskuuid: string
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
