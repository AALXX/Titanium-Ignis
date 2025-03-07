import LinkCards from '@/components/LinkCard'
import { checkAccountStatus } from '@/hooks/useAccountServerSide'
import axios from 'axios'
import { notFound } from 'next/navigation'

interface ProjectData {}

const getProjectData = async (ProjectToken: string, accessToken: string | undefined): Promise<ProjectData> => {
    try {
        const response = await axios.get<ProjectData>(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/get-project-data/${ProjectToken}/${accessToken}`)
        return response.data
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            throw new Error('Access Denied')
        }
        throw error
    }
}

const ProjectOverview: React.FC<{ params: Promise<{ ProjectToken: string }> }> = async ({ params }) => {
    const { ProjectToken } = await params
    const accountStatus = await checkAccountStatus()

    if (!accountStatus.isLoggedIn) {
        return (
            <div className="flex h-screen items-center justify-center">
                <h1 className="text-white">Please login to view project overview</h1>
            </div>
        )
    }

    try {
        const projectData = await getProjectData(ProjectToken, accountStatus.accessToken)

        return (
            <div className="flex h-screen flex-col">
                <div className="flex h-[60vh] flex-row overflow-y-auto md:h-3/5">{/* Content for top section */}</div>
                <div className="flex w-full flex-row">
                    <LinkCards Title="TEAM MANAGEMENT" linkRef={`/projects/${ProjectToken}/team-management`} className="ml-2 h-[3rem] w-[14rem] cursor-pointer justify-center rounded-t-xl bg-[#0000003d]" />
                    <LinkCards Title="TASK LIST" linkRef={`/projects/${ProjectToken}/tasks`} className="ml-2 h-[3rem] w-[10rem] cursor-pointer justify-center rounded-t-xl bg-[#0000003d]" />
                    <LinkCards Title="CODE" linkRef={`/projects/${ProjectToken}/code`} className="ml-2 h-[3rem] w-[10rem] cursor-pointer justify-center rounded-t-xl bg-[#0000003d]" />
                </div>
                <hr className="h-px w-full border-0 bg-gray-200" />
                <div className="flex h-[40vh] flex-row overflow-y-auto md:h-2/5">{/* Content for bottom section */}</div>
            </div>
        )
    } catch (error) {
        if (error instanceof Error && error.message === 'Access Denied') {
            return (
                <div className="flex h-screen items-center justify-center">
                    <h1 className="text-white">You do not have access to this page</h1>
                </div>
            )
        }

        notFound()
    }
}

export default ProjectOverview
