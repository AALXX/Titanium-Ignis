export interface IProjectConfig {
    services: Array<{
        id: number;
        name: string;
        dir: string;
        setup?: Array<{ run: string }>;
        'start-command': string;
        port?: number;
    }>;
}

export interface IProjectsDb {
    ProjectName: string;
    ProjectToken: string;
    ProjectOwnerToken: string;
    Status: string;
}
