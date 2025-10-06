import type React from 'react'
import { checkAccountStatus } from '@/hooks/useAccountServerSide'
import axios from 'axios'
import { notFound } from 'next/navigation'
import { ProjectNav } from '@/components/ProjectNav'
import { BarChart3, CheckCircle2 } from 'lucide-react'

interface ProjectData {
    projectname: string
    projectdescription: string
    projecttoken: string
    projectownerToken: string
    status: string
    created_at: Date 
    team_members: number | null
    task_count: number
    tasks:
        | {
              taskname: string
              taskstatus: string
          }[]
        | null
}

const getProjectData = async (ProjectToken: string, accessToken: string | undefined): Promise<ProjectData> => {
    try {
        const response = await axios.get<{ project: ProjectData }>(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/get-project-data/${ProjectToken}/${accessToken}`)
        return response.data.project
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            throw new Error('Access Denied')
        }
        throw error
    }
}

const ProjectOverview: React.FC<{ params: Promise<{ ProjectToken: string }> }> = async ({ params }) => {
    const { ProjectToken } = await params
    const accountStatus = await checkAccountStatus()

    if (!accountStatus.isLoggedIn) {
        return (
            <div className="flex h-screen items-center justify-center bg-black/90">
                <div className="rounded-lg border bg-black/50 p-8">
                    <h1 className="text-xl font-medium text-white">Please login to view project overview</h1>
                </div>
            </div>
        )
    }

    try {
        const projectData = await getProjectData(ProjectToken, accountStatus.accessToken)
        console.log(projectData)
        return (
            <div className="flex h-screen flex-col">
                <div className="flex h-[60vh] flex-col overflow-hidden md:h-3/5">
                    <div className="h-full overflow-y-auto p-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
                            <div className="h-64 rounded-lg bg-[#0000003d] p-4">
                                <h3 className="mb-2 flex items-center gap-2 text-lg font-medium text-white">
                                    <BarChart3 className="h-5 w-5 text-gray-400" />
                                    {projectData.projectname} Overview
                                </h3>
                                <div className="h-[calc(100%-3rem)] rounded-md bg-black/20 p-3">
                                    <p className="text-sm text-gray-300">{projectData.projectdescription || 'No description available for this project.'}</p>
                                </div>
                            </div>

                            <div className="h-64 rounded-lg bg-[#0000003d] p-4">
                                <h3 className="mb-2 flex items-center gap-2 text-lg font-medium text-white">
                                    <CheckCircle2 className="h-5 w-5 text-gray-400" />
                                    Project Stats
                                </h3>
                                <div className="h-[calc(100%-3rem)] rounded-md bg-black/20 p-3">
                                    <div className="grid h-full grid-cols-2 gap-2">
                                        <div className="flex flex-col items-center justify-center rounded-md bg-black/30 p-2">
                                            <span className="text-xs text-gray-400">Tasks</span>
                                            <span className="text-xl font-bold text-white">{projectData.task_count}</span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center rounded-md bg-black/30 p-2">
                                            <span className="text-xs text-gray-400">Members</span>
                                            <span className="text-xl font-bold text-white">{projectData.team_members}</span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center rounded-md bg-black/30 p-2">
                                            <span className="text-xs text-gray-400">Deployments</span>
                                            <span className="text-xl font-bold text-white">3</span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center rounded-md bg-black/30 p-2">
                                            <span className="text-xs text-gray-400">Commits</span>
                                            <span className="text-xl font-bold text-white">47</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <ProjectNav projectToken={ProjectToken} />

                <div className="flex h-[40vh] flex-col overflow-hidden md:h-2/5">
                    <div className="h-full overflow-y-auto p-4">
                        <div className="h-full rounded-lg bg-[#0000003d] p-4">
                            <h3 className="mb-2 flex items-center gap-2 text-lg font-medium text-white">
                                <CheckCircle2 className="h-5 w-5 text-gray-400" />
                                Recent Tasks
                            </h3>
                            <div className="h-[calc(100%-3rem)] overflow-y-auto rounded-md bg-black/20 p-3">
                                <div className="space-y-2">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="flex items-center justify-between gap-2 border-b pb-2 text-sm text-gray-300">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                                <p>Task {i}: Implement feature</p>
                                            </div>
                                            <span className="text-xs text-gray-400">2d ago</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    } catch (error) {
        if (error instanceof Error && error.message === 'Access Denied') {
            return (
                <div className="flex h-screen items-center justify-center bg-black/90">
                    <div className="rounded-lg border bg-black/50 p-8">
                        <h1 className="text-xl font-medium text-white">You do not have access to this page</h1>
                    </div>
                </div>
            )
        }

        notFound()
    }
}

export default ProjectOverview
