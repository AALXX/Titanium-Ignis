import ProjectViewWrapper from '@/components/ProjectView/ProjectViewWrapper'
import axios from 'axios'
import React from 'react'

const ProjectsView = async ({ params }: { params: { ProjectToken: string } }) => {
    const { ProjectToken } = await params

    try {
        const ProjectData = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/get-project-data/${ProjectToken}`)
        return (
            <div className="flex h-full w-full">
                <ProjectViewWrapper
                    ProjectName={ProjectData.data.ProjectName}
                    ProjectToken={ProjectToken}
                    RepoUrl={ProjectData.data.RepoUrl}
                    CheckedOutBy={ProjectData.data.CheckedOutBy}
                    Status={ProjectData.data.Status}
                    Type={ProjectData.data.Type}
                />
            </div>
        )
    } catch (error) {
        return (
            <div className="h-full self-center">
                <h1 className='text-white'>Error fetching project data</h1>
            </div>
        )
    }
}

export default ProjectsView
