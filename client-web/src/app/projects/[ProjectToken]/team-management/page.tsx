import React from 'react'

const TeamManagementPage: React.FC<{ params: { ProjectToken: string } }> = async ({ params }) => {
    const { ProjectToken } = await params

    return <div className="flex h-screen flex-col"></div>
}

export default TeamManagementPage
