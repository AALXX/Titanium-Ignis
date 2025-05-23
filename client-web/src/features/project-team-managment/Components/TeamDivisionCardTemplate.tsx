import React from 'react'
import Link from 'next/link'
import { Users } from 'lucide-react'
import TruncatedText from '@/components/TruncateText'

interface ITeamDivisionCardTemplate {
    DivisionName: string
    NumberOfMembers: number
    ProjectToken: string
}

const TeamDivisionCardTemplate = (props: ITeamDivisionCardTemplate) => {
    return (
        <Link href={`/projects/${props.ProjectToken}/team-management/d/${props.DivisionName}`}>
            <div className="relative flex h-[15rem] w-full rounded-xl bg-[#0000004d] transition-all hover:bg-[#0000008a]">
                <div className="m-auto flex flex-col items-center">
                    <div className="mb-3 rounded-full bg-[#ffffff1a] p-3">
                        <Users className="h-6 w-6 text-white" />
                    </div>
                    <TruncatedText characters={20} text={props.DivisionName} className="text-3xl font-bold text-white" />
                    <p className="mt-2 text-sm text-gray-400">
                        {props.NumberOfMembers} {props.NumberOfMembers === 1 ? 'Member' : 'Members'}
                    </p>
                </div>
            </div>
        </Link>
    )
}

export default TeamDivisionCardTemplate
