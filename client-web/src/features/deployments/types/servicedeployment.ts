type ServiceSetup = {
    run: string
}

export type ProjectService = {
    id: number
    name: string
    dir: string
    setup?: ServiceSetup[] // Optional because some services may not have setup
    'start-command': string
}

export type ProjectServicesResponse = {
    error: boolean
    services: ProjectService[]
}
