import React from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/features/auth/auth'
import UserProfile from '@/features/account/components/UserProfile'
import UserProjects from '@/features/account/components/UserProjects'
import axios from 'axios'

const Account = async () => {
    const session = await auth()

    if (!session || !session.user) {
        redirect('/account/login-register')
    }

    const projectsResponse = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/user-account-manager/get-all-user-projects/${session.accessToken}`)

    const userData = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/user-account-manager/get-account-data/${session.accessToken}`)
    if (projectsResponse.data.error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <h1 className="text-2xl font-bold mb-4">Error</h1>
                <p className="text-lg">{projectsResponse.data.error}</p>
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col overflow-y-auto">
            <div className="flex h-auto w-full flex-col p-6">
                <div className="flex w-full flex-col space-y-6">
                    <div className="flex w-full justify-center">
                        <UserProfile name={userData.data.username} email={userData.data.userEmail} image={session.user.image as string} userSessionToken={session.accessToken as string} />
                    </div>

                    <UserProjects projects={projectsResponse.data.projects} />
                </div>
            </div>
        </div>
    )
}

export default Account
