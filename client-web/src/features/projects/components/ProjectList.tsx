'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { IProjects } from '../IProjects'
import ProjectCardTemplate from './ProjectCardTemplate'

interface ProjectListProps {
    OwnerProjects: IProjects[]
}

const ProjectList: React.FC<ProjectListProps> = ({ OwnerProjects }) => {
    const [projects, setProjects] = useState<IProjects[]>(OwnerProjects)
    return (
        <div className="flex h-full flex-col overflow-y-auto">
            <div className="flex flex-row">
                <Link href="/projects/create-project">
                    <button className="ml-4 mr-auto mt-10 rounded-xl border p-4 font-bold text-white hover:bg-white/10">Create projects</button>
                </Link>
                <Link href="/projects/add-project">
                    <button className="ml-4 mr-auto mt-10 rounded-xl border p-4 font-bold text-white hover:bg-white/10">Add projects</button>
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {projects.map((project: IProjects, index: number) => (
                    <ProjectCardTemplate key={project.projecttoken || index} ProjectName={project.projectname} ProjectToken={project.projecttoken} ProjectStatus={project.status} />
                ))}
            </div>
        </div>
    )
}

export default ProjectList
