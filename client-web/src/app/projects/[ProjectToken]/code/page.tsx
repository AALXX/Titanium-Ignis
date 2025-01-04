import ProjectCodebaseWrapper from '@/features/code-enviroment/ProjectCodebaseWrapper'
import { checkAccountStatus } from '@/hooks/useAccountServerSide'
import axios from 'axios'
import React from 'react'

const ProjectsView = async ({ params }: { params: { ProjectToken: string } }) => {
    const { ProjectToken } = await params

    const accountStatus = await checkAccountStatus()


    if (!accountStatus.isLoggedIn) {
        return (
            <div className="h-full self-center">
                <h1 className="text-white">Please login to view your projects</h1>
            </div>
        )
    }

    try {
        const ProjectData = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/get-project-codebase-data/${ProjectToken}/${accountStatus.accessToken}`)
        return (
            <div className="flex h-full w-full">
                <ProjectCodebaseWrapper
                    ProjectName={ProjectData.data.project.projecttoken}
                    ProjectToken={ProjectToken}
                    RepoUrl={ProjectData.data.project.repositoryurl}
                    Status={ProjectData.data.project.status}
                    Type={ProjectData.data.project.projecttype}
                    UserSessionToken={accountStatus.accessToken!}
                />
            </div>
        )
    } catch (error) {
        return ( 
            <div className="h-full self-center">
                <h1 className="text-white">Error fetching project data</h1>
            </div>
        )
    }

}

export default ProjectsView
