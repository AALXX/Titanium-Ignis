import Link from 'next/link'
import React from 'react'

interface ProjectCardTemplateProps {
    ProjectName: string
    ProjectToken: string
    RepoUrl: string
    ProjectStatus: string
    RepoType: string
}

const ProjectCardTemplate = (props: ProjectCardTemplateProps) => {
    return (
        <Link href={`/projects/view/${props.ProjectToken}`}>
            <div className="flex h-[15rem] w-full rounded-xl bg-[#0000004d] hover:bg-[#0000008a] transition-all">
                <h1 className="m-auto text-3xl font-bold text-white">{props.ProjectName}</h1>
            </div>
        </Link>
    )
}

export default ProjectCardTemplate
