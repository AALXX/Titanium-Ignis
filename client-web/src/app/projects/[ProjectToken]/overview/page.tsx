import LinkCards from '@/components/LinkCard'
import axios from 'axios'
import React from 'react'

const ProjectOverview: React.FC<{ params: { ProjectToken: string } }> = async ({ params }) => {
    const { ProjectToken } = await params
    const ProjectData = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/get-project-data/${ProjectToken}`)

    return (
        <div className="flex h-screen flex-col">
            <div className="flex h-[60vh] flex-row overflow-y-auto md:h-3/5"></div>
            <div className="flex w-full flex-row">
                <LinkCards Title="TEAM MANAGEMENT" linkRef={`/projects/${ProjectToken}/team-management`} className="ml-2 h-[3rem] w-[14rem] cursor-pointer justify-center rounded-t-xl bg-[#0000003d]" />
                <LinkCards Title="TASK LIST" linkRef={`/projects/${ProjectToken}/tasks`} className="ml-2 h-[3rem] w-[10rem] cursor-pointer justify-center rounded-t-xl bg-[#0000003d]" />
                <LinkCards Title="CODE" linkRef={`/projects/${ProjectToken}/code`} className="ml-2 h-[3rem] w-[10rem] cursor-pointer justify-center rounded-t-xl bg-[#0000003d]" />
            </div>
            <hr className="h-px w-full border-0 bg-gray-200" />
            <div className="flex h-[40vh] flex-row overflow-y-auto md:h-2/5"></div>
        </div>
    )
}

export default ProjectOverview
