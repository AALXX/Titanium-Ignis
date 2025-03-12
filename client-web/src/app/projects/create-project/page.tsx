import CreateProjectForm from '@/features/projects/components/CreateProjectForm'
import { checkAccountStatus } from '@/hooks/useAccountServerSide'

import React from 'react'

const CreateProjectPage = async () => {
    const { isLoggedIn, accessToken } = await checkAccountStatus()

    if (!isLoggedIn) {
        return <div className="h-full self-center text-white">Please login to create a project</div>
    }

    return <CreateProjectForm userSessionToken={accessToken} />
}

export default CreateProjectPage
