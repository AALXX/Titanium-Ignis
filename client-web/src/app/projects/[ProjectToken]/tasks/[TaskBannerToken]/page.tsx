import React from 'react'
import ProjectTasks from '@/features/team-tasks/tasks/ProjectTasks'
import { checkAccountStatus } from '@/hooks/useAccountServerSide'

import { notFound } from 'next/navigation'
const Tasks: React.FC<{ params: Promise<{ ProjectToken: string; TaskBannerToken: string }> }> = async ({ params }) => {
    const { ProjectToken, TaskBannerToken } = await params
    const accountStatus = await checkAccountStatus()


    if (!accountStatus.isLoggedIn) {
        return (
            <div className="flex h-screen items-center justify-center">
                <h1 className="text-white">Please login to view project overview</h1>
            </div>
        )
    }

    try {
        return (
            <div className="h-full overflow-y-auto">
                <ProjectTasks userSessionToken={accountStatus.accessToken} TaskBannerToken={TaskBannerToken} projectToken={ProjectToken} />
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
