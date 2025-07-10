import React from 'react'
import AddProjectForm from '@/features/projects/components/AddProjectForm'
import { checkAccountStatus } from '@/hooks/useAccountServerSide'

const CreateProjectPage = async () => {
    const { isLoggedIn, accessToken } = await checkAccountStatus()

    if (!isLoggedIn) {
        return <div className="h-full self-center text-white">Please login to create a project</div>
    }

    return <AddProjectForm userSessionToken={accessToken} />
}

export default CreateProjectPage
