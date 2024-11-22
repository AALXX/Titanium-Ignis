import Link from 'next/link'
import React, { useState } from 'react'
import TruncatedText from '@/components/TruncateText'

interface ProjectCardTemplateProps {
    ProjectName: string
    ProjectToken: string
    RepoUrl: string
    ProjectStatus: string
    RepoType: string
}

const ProjectCardTemplate = (props: ProjectCardTemplateProps) => {
    const [showTooltip, setShowTooltip] = useState(false)
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

    const handleMouseEnter = () => setShowTooltip(true)
    const handleMouseLeave = () => setShowTooltip(false)
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        setTooltipPosition({ x: e.clientX, y: e.clientY })
    }

    return (
        <Link href={`/projects/view/${props.ProjectToken}`}>
            <div className="relative flex h-[15rem] w-full rounded-xl bg-[#0000004d] transition-all hover:bg-[#0000008a]" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onMouseMove={handleMouseMove}>
                <TruncatedText characters={20} text={props.ProjectName} className="m-auto text-3xl font-bold text-white" />
                {showTooltip && (
                    <div
                        className="absolute z-10 rounded bg-black px-2 py-1 text-sm text-white shadow-lg"
                        style={{
                            left: `${tooltipPosition.x - 60}px`,
                            top: `${tooltipPosition.y - 60}px`
                        }}
                    >
                        {props.ProjectName}
                    </div>
                )}
            </div>
        </Link>
    )
}

export default ProjectCardTemplate
