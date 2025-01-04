export interface IProjectConfig {
    services: Array<{
        id: number
        name: string
        dir: string
        setup?: Array<{ run: string }>
        'start-command': string
        port?: number
    }>
}

export interface IProjectCodebaseWrapper {
    ProjectName: string
    ProjectToken: string
    RepoUrl: string
    Status: string
    Type: string

    UserSessionToken: string
}
