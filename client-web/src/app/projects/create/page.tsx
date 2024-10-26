import CreateProjectForm from '@/components/Projects/CreateProjectForm'
import { checkAccountStatus } from '@/hooks/useAccountServerside'

const CreateProjectPage = async () => {
    const { isLoggedIn, accessToken } = await checkAccountStatus()

    // console.log(userPublicToken2)

    if (!isLoggedIn) {
        return <div className="h-full self-center text-white">Please login to create a project</div>
    }

    return <CreateProjectForm userSessionToken={accessToken} />
}

export default CreateProjectPage
