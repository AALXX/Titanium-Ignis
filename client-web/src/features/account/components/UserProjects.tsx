import type React from 'react'
import { Users, Calendar } from 'lucide-react'
import Link from 'next/link'

interface Project {
    projectname: string
    role: string
    projecttoken: string
    status: 'Started' | 'Completed' | 'Planning'
    budget: {
        allocated: number
        spent: number
        currency: string
    }
    created_at: string
    member_count: number
    technology: string[]
}

interface UserProjectsProps {
    projects: Project[]
}

const UserProjects: React.FC<UserProjectsProps> = ({ projects }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Started':
                return 'text-green-400 bg-green-400/10'
            case 'Completed':
                return 'text-blue-400 bg-blue-400/10'
            case 'Planning':
                return 'text-yellow-400 bg-yellow-400/10'
            default:
                return 'text-gray-400 bg-gray-400/10'
        }
    }

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    return (
        <div className="w-full">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Your Projects</h2>
                <span className="text-sm text-gray-400">{projects.length} projects</span>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {projects.map((project, index) => (
                    <Link href={`/projects/${project.projecttoken}/overview`} key={index}>
                        <div key={index} className="rounded-lg border border-gray-600 bg-[#3a3a3a] p-5 transition-colors hover:border-gray-500">
                            <div className="mb-3 flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="mb-1 text-lg font-semibold text-white">{project.projectname}</h3>
                                    <p className="text-sm text-gray-400">{project.role}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(project.status)}`}>{project.status}</span>
                                </div>
                            </div>

                            <div className="mb-4">
                                <div className="mb-1 flex justify-between text-sm">
                                    <span className="text-gray-400">Budget</span>
                                    <span className="text-white">
                                        {formatCurrency(project.budget.spent, project.budget.currency)} / {formatCurrency(project.budget.allocated, project.budget.currency)}
                                    </span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-gray-600">
                                    <div className="h-2 rounded-full bg-blue-500 transition-all duration-300" style={{ width: `${Math.min((project.budget.spent / project.budget.allocated) * 100, 100)}%` }}></div>
                                </div>
                            </div>

                            <div className="mb-3 grid grid-cols-3 gap-4">
                                <div className="flex items-center space-x-2">
                                    <Users className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm text-gray-300">{project.member_count}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm text-gray-300">{formatDate(project.created_at)}</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-1">
                                {project.technology.slice(0, 3).map((tech, index) => (
                                    <span key={index} className="rounded-md bg-gray-600 px-2 py-1 text-xs text-gray-300">
                                        {tech}
                                    </span>
                                ))}
                                {project.technology.length > 3 && <span className="rounded-md bg-gray-600 px-2 py-1 text-xs text-gray-300">+{project.technology.length - 3}</span>}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}

export default UserProjects
