import React from 'react'
import axios from 'axios'
import { checkAccountStatus } from '@/hooks/useAccountServerSide'
import ProjectList from '@/features/projects/components/ProjectList'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import UserProjects from '@/features/account/components/UserProjects'

const ProjectsPage = async () => {
    const accountStatus = await checkAccountStatus()
    let projects = []
    if (accountStatus.accessToken) {
        const projectsResponse = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/user-account-manager/get-all-user-projects/${accountStatus.accessToken}`)

        projects = projectsResponse.data.projects
    }

    if (!accountStatus.isLoggedIn) {
        return (
            <div className="flex h-screen items-center justify-center p-4">
                <div className="w-full max-w-md rounded-lg border border-[#4a4a4a] bg-[#3a3a3a] shadow-2xl">
                    <div className="space-y-6 p-8 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#5a5a5a] bg-[#4a4a4a]">
                            <Lock className="h-8 w-8 text-[#e0e0e0]" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-medium text-[#f0f0f0]">Authentication Required</h1>
                            <p className="text-sm leading-relaxed text-[#b0b0b0]">Please sign in to access your projects </p>
                        </div>
                    </div>

                    <div className="space-y-6 px-8 pb-8">
                        <Link
                            href="/account/login-register"
                            className="flex w-full items-center justify-center rounded-md border border-[#5a5a5a] bg-[#4a4a4a] px-4 py-3 text-sm font-medium text-[#f0f0f0] transition-all duration-200 hover:border-[#6a6a6a] hover:bg-[#5a5a5a]"
                        >
                            Sign In to Continue
                        </Link>

                        <p className="text-center text-xs text-[#888888]">
                            {"Don't have an account? "}
                            <Link href="/account/login-register" className="text-[#b0b0b0] underline underline-offset-2 hover:text-[#d0d0d0]">
                                Sign up here
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col overflow-y-auto">
            <div className="flex flex-row">
                <Link href="/projects/create-project">
                    <button className="mt-10 mr-auto ml-4 rounded-xl border p-4 font-bold text-white hover:bg-white/10">Create projects</button>
                </Link>
                <Link href="/projects/add-project">
                    <button className="mt-10 mr-auto ml-4 rounded-xl border p-4 font-bold text-white hover:bg-white/10">Add projects</button>
                </Link>
            </div>

            <div className=" p-4">
                <UserProjects projects={projects} />
            </div>
        </div>
    )
}

export default ProjectsPage
