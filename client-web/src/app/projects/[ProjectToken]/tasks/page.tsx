import React from 'react'
import BannerTaskList from '@/features/team-tasks/banners/components/BannerTaskList'
import { ITaskBanners, ITeamDivisions } from '@/features/team-tasks/ITeamTasks'
import { checkAccountStatus } from '@/hooks/useAccountServerSide'
import axios from 'axios'
import { revalidatePath } from 'next/cache'
import { notFound } from 'next/navigation'

const getTaskBannerData = async (ProjectToken: string, accessToken: string | undefined): Promise<{ error: boolean; allBanners: ITaskBanners[] }> => {
    try {
        const response = await axios.get<{ error: boolean; allBanners: ITaskBanners[] }>(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/get-project-task-banners/${ProjectToken}/${accessToken}`)
        console.log(response.data)
        return response.data
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            throw new Error('Access Denied')
        }
        throw error
    }
}

const getAllDivisions = async (ProjectToken: string, accessToken: string | undefined) => {
    try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/get-all-divisions/${ProjectToken}/${accessToken}`)
        console.log(response.data)
        return response.data.divisions
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            throw new Error('Access Denied')
        }
        throw error
    }
}

const TaskBanners: React.FC<{ params: Promise<{ ProjectToken: string }> }> = async ({ params }) => {
    const { ProjectToken } = await params
    const accountStatus = await checkAccountStatus()

    let taskBanners: { error: boolean; allBanners: ITaskBanners[] } = { error: false, allBanners: [] }

    if (!accountStatus.isLoggedIn) {
        return (
            <div className="flex h-screen items-center justify-center">
                <h1 className="text-white">Please login to view project overview</h1>
            </div>
        )
    }

    try {
        taskBanners = await getTaskBannerData(ProjectToken, accountStatus.accessToken)
        async function refetchTaskBanners() {
            'use server'
            const updatedTaskBanners = await getTaskBannerData(ProjectToken, accountStatus.accessToken)
            revalidatePath(`/[ProjectToken]/tasks`)
            return updatedTaskBanners
        }

        const alllDivisions: ITeamDivisions[] = await getAllDivisions(ProjectToken, accountStatus.accessToken)
        return (
            <div className="flex h-screen flex-col">
                <BannerTaskList ProjectToken={ProjectToken} userSessionToken={accountStatus.accessToken!} allDivisions={alllDivisions} taskBanners={taskBanners.allBanners} fetchTaskBanners={refetchTaskBanners} />
            </div>
        )
    } catch (error) {
        console.log(error)
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

export default TaskBanners
