export interface IProjectConfig {
    services: Array<{
        id: number
        name: string,
        dir: string;
        'custom-commands': {
            [key: string]: string
        }
        "start-command": string
        port: number
    }>
}

export interface IProjectViewWrapperProps {
    ProjectName: string
    ProjectToken: string
    RepoUrl: string
    CheckedOutBy: string
    Status: string
    Type: string
    ProjectConfig: IProjectConfig
    UserSessionToken: string
}
