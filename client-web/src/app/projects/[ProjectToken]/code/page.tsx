import CreateCodebase from '@/features/code-enviroment/components/createCodebase'
import ProjectCodebaseWrapper from '@/features/code-enviroment/ProjectCodebaseWrapper'
import { checkAccountStatus } from '@/hooks/useAccountServerSide'
import axios from 'axios'
import React from 'react'

interface ProjectCodebaseData {
    project: {
        projecttoken: string
        repositoryurl: string
        status: string
        projecttype: string
    }
}

async function getProjectCodebaseData(ProjectToken: string, accessToken: string | undefined): Promise<ProjectCodebaseData> {
    try {
        const response = await axios.get<ProjectCodebaseData>(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/get-project-codebase-data/${ProjectToken}/${accessToken}`)

        return response.data
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            throw new Error('Access Denied')
        }
        throw error
    }
}

const ProjectsView = async ({ params }: { params: Promise<{ ProjectToken: string }> }) => {
    const { ProjectToken } = await params
    const accountStatus = await checkAccountStatus()

    if (!accountStatus.isLoggedIn) {
        return (
            <div className="flex h-screen items-center justify-center">
                <h1 className="text-white">Please login to view your projects</h1>
            </div>
        )
    }

    try {
        const projectData = await getProjectCodebaseData(ProjectToken, accountStatus.accessToken)
        return (
            <div className="flex h-screen items-center justify-center">
                {Object.keys(projectData.project).length === 0 ? (
                    <div className="flex items-center justify-center w-[60rem] h-[30rem]">
                        <CreateCodebase projectToken={ProjectToken} userSessionToken={accountStatus.accessToken!} />
                    </div>
                ) : (
                    <ProjectCodebaseWrapper ProjectName={projectData.project.projecttoken} ProjectToken={ProjectToken} RepoUrl={projectData.project.repositoryurl} Status={projectData.project.status} Type={projectData.project.projecttype} UserSessionToken={accountStatus.accessToken!} />
                )}
            </div>
        )
    } catch (error) {
        if (error instanceof Error && error.message === 'Access Denied') {
            return (
                <div className="flex h-screen items-center justify-center">
                    <h1 className="text-white">You do not have access to this page</h1>
                </div>
            )
        } else if (error instanceof Error) {
            return (
                <div className="flex h-screen items-center justify-center">
                    <h1 className="text-white">An error occurred while fetching data</h1>
                </div>
            )
        }

        // notFound()
    }
}

export default ProjectsView
