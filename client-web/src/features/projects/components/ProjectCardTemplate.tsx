import TruncatedText from '@/components/TruncateText'
import Link from 'next/link'
import React from 'react'

interface ProjectCardTemplateProps {
    ProjectName: string
    ProjectToken: string
    ProjectStatus: string
}

const ProjectCardTemplate = (props: ProjectCardTemplateProps) => {
    return (
        <Link href={`/projects/${props.ProjectToken}/overview`}>
            <div className="relative flex h-[15rem] w-full rounded-xl bg-[#0000004d] transition-all hover:bg-[#0000008a]">
                <TruncatedText characters={20} text={props.ProjectName} className="m-auto text-3xl font-bold text-white" />
            </div>
        </Link>
    )
}

export default ProjectCardTemplate
