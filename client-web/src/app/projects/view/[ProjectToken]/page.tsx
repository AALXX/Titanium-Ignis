import LeftPanel from '@/components/ProjectView/LeftPanel/LeftPanel'
import axios from 'axios'
import React from 'react'

const ProjectsView = async ({ params }: { params: { ProjectToken: string } }) => {
    const ProjectData = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/get-project-data/${params.ProjectToken}`)
    return (
        <div className="flex h-full w-full">
            <LeftPanel
                ProjectName={ProjectData.data.project.ProjectName}
                ProjectToken={params.ProjectToken}
                RepoUrl={ProjectData.data.project.RepoUrl}
                CheckedOutBy={ProjectData.data.project.CheckedOutBy}
                Status={ProjectData.data.project.Status}
                Type={ProjectData.data.project.Type}
            />
        </div>
    )
}

export default ProjectsView
