'use client'

import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import Link from 'next/link'
import { IProjects } from '../IProjects'
import ProjectCardTemplate from './ProjectCardTemplate'

interface ProjectListProps {
    initialProjects: IProjects[]
}

const ProjectList: React.FC<ProjectListProps> = ({ initialProjects }) => {
    const router = useRouter()
    const [projects, setProjects] = useState<IProjects[]>(initialProjects)

    return (
        <div className="flex h-full flex-col overflow-y-auto">
            <Link href="/projects/create">
                <button className="ml-4 mr-auto mt-10 rounded-xl border p-4 font-bold text-white hover:bg-white/10" onClick={() => router.push('/projects/create')}>
                    Add projects
                </button>
            </Link>

            <div className="grid grid-cols-1 gap-6 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {projects.map((project: IProjects, index: number) => (
                    <ProjectCardTemplate
                        key={project.ProjectToken || index}
                        ProjectName={project.ProjectName}
                        ProjectToken={project.ProjectToken}
                        RepoUrl={project.RepoUrl}
                        ProjectStatus={project.Status}
                        RepoType={project.Type}
                    />
                ))}
            </div>
        </div>
    )
}

export default ProjectList
