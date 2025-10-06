export interface IProjectConfig {
    services: Array<{
        id: number;
        name: string;
        dir: string;
        setup?: Array<{ run: string }>;
        'start-command': string;
        port?: number;
    }>;
    deployments: Array<{
        id: number;
        name: string;
        type: eDeploymentType;
        server: string;
        'docker-compose-file'?: string;
    }>;
}

export enum eDeploymentType {
    DOCKER_COMPOSE = 'docker-compose',
    DOCKER_SWARM = 'docker-swarm',
    KUBERNETES = 'kubernetes',
    
}

export interface IProjectsDb {
    projectname: string;
    projectdescription: string;
    projecttoken: string;
    projectownerToken: string;
    status: string;
    created_at: Date;
    team_members: number | null;
    task_count: number;
    tasks:
        | {
              taskname: string;
              taskstatus: string;
          }[]
        | null;
}

