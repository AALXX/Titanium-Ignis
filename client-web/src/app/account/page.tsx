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
    console.log(projectsResponse.data)

    if (projectsResponse.data.error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <h1 className="text-2xl font-bold mb-4">Error</h1>
                <p className="text-lg">{projectsResponse.data.error}</p>
            </div>
        )
    }

    const sampleProjects = [
        {
            id: 1,
            name: 'E-commerce Platform',
            role: 'Lead Developer',
            status: 'Active' as const,
            budget: {
                allocated: 50000,
                spent: 32000,
                currency: 'USD'
            },
            deadline: '2024-03-15',
            lastActivity: '2024-01-15',
            members: 8,
            priority: 'High' as const,
            technology: ['React', 'Node.js', 'PostgreSQL', 'AWS']
        },
        {
            id: 2,
            name: 'Mobile Banking App',
            role: 'Frontend Developer',
            status: 'Planning' as const,
            budget: {
                allocated: 75000,
                spent: 15000,
                currency: 'USD'
            },
            deadline: '2024-06-30',
            lastActivity: '2024-01-10',
            members: 12,
            priority: 'Medium' as const,
            technology: ['React Native', 'Firebase', 'TypeScript']
        },
        {
            id: 3,
            name: 'Analytics Dashboard',
            role: 'Full Stack Developer',
            status: 'Completed' as const,
            budget: {
                allocated: 25000,
                spent: 24500,
                currency: 'USD'
            },
            deadline: '2024-01-31',
            lastActivity: '2024-01-05',
            members: 4,
            priority: 'Low' as const,
            technology: ['Vue.js', 'Python', 'MongoDB', 'Docker']
        },
        {
            id: 4,
            name: 'AI Chatbot Integration',
            role: 'Backend Developer',
            status: 'Active' as const,
            budget: {
                allocated: 40000,
                spent: 28000,
                currency: 'USD'
            },
            deadline: '2024-04-20',
            lastActivity: '2024-01-12',
            members: 6,
            priority: 'High' as const,
            technology: ['Python', 'TensorFlow', 'FastAPI', 'Redis', 'Kubernetes']
        }
    ]

    return (
        <div className="flex h-full flex-col overflow-y-auto">
            <div className="flex h-auto w-full flex-col p-6">
                <div className="flex w-full flex-col space-y-6">
                    <div className="flex w-full justify-center">
                        <UserProfile name={session.user.name as string} email={session.user.email as string} image={session.user.image as string} />
                    </div>

                    <UserProjects projects={projectsResponse.data.projects} />
                </div>
            </div>
        </div>
    )
}

export default Account
