import TruncatedText from '@/components/TruncateText'
import Link from 'next/link'
import React, { useState } from 'react'

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
        const rect = e.currentTarget.getBoundingClientRect()

        setTooltipPosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        })
    }

    return (
        <Link href={`/projects/view/${props.ProjectToken}`}>
            <div className="relative flex h-[15rem] w-full rounded-xl bg-[#0000004d] transition-all hover:bg-[#0000008a]" onMouseMove={handleMouseMove} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                <TruncatedText characters={20} text={props.ProjectName} className="m-auto text-3xl font-bold text-white" />
                {showTooltip && (
                    <div
                        className="absolute z-10 rounded bg-black px-2 py-1 text-sm text-white shadow-lg"
                        style={{
                            left: `${tooltipPosition.x + 60}px`,
                            top: `${tooltipPosition.y + 60}px`
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
