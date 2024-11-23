interface IProjectConfig {
    services: {
        id: number
        name: string
        'custom-commands': {
            [key: string]: string
        }
        "start-command": string
        port: number
    }
}

export interface IProjectViewWrapperProps {
    ProjectName: string
    ProjectToken: string
    RepoUrl: string
    CheckedOutBy: string
    Status: string
    Type: string
    ProjectConfig?: IProjectConfig
}
