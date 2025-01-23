import TruncatedText from '@/components/TruncateText'
import Link from 'next/link'
import React, { useState } from 'react'

interface ITeamDivisionCardTemplate {
    DivisionName: string
    NumberOfMembers: number
    ProjectToken: string
}

const TeamDivisionCardTemplate = (props: ITeamDivisionCardTemplate) => {
    return (
        <Link href={`/projects/${props.ProjectToken}/team-management/d/${props.DivisionName}`}>
            <div className="relative flex h-[15rem] w-full rounded-xl bg-[#0000004d] transition-all hover:bg-[#0000008a]">
                <TruncatedText characters={20} text={props.DivisionName} className="m-auto text-3xl font-bold text-white" />
            </div>
        </Link>
    )
}

export default TeamDivisionCardTemplate
