import { IAllTasksResp } from '@/features/team-tasks/ITeamTasks'
import ProjectTasks from '@/features/team-tasks/tasks/ProjectTasks'
import { checkAccountStatus } from '@/hooks/useAccountServerSide'
import axios from 'axios'

import { notFound } from 'next/navigation'

const getAllTasks = async (ProjectToken: string, bannerToken: string | undefined): Promise<IAllTasksResp> => {
    try {
        const response = await axios.get<IAllTasksResp>(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/get-project-tasks/${bannerToken}`)
        return response.data
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            throw new Error('Access Denied')
        }
        throw error
    }
}

const Tasks: React.FC<{ params: { ProjectToken: string; TaskBannerToken: string } }> = async ({ params }) => {
    const { ProjectToken, TaskBannerToken } = await params
    const accountStatus = await checkAccountStatus()

    let tasks: IAllTasksResp = { error: false, containers: [], tasks: [] }

    if (!accountStatus.isLoggedIn) {
        return (
            <div className="flex h-screen items-center justify-center">
                <h1 className="text-white">Please login to view project overview</h1>
            </div>
        )
    }

    try {
        tasks = await getAllTasks(ProjectToken, TaskBannerToken)
        return (
            <div className="h-full overflow-hidden">
                <ProjectTasks tasks={tasks.tasks} taskContainers={tasks.containers} userSessionToken={accountStatus.accessToken} TaskBannerToken={TaskBannerToken} projectToken={ProjectToken} />
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

        notFound()
    }
}

export default Tasks
