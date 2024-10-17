import React from 'react';

const ProjectsView = async ({ params }: { params: { ProjectToken: string } }) => {
    return <div className='w-full h-full flex'>{params.ProjectToken}</div>
}

export default ProjectsView
