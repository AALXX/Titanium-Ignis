import axios from 'axios'
import { checkAccountStatus } from '@/hooks/useAccountServerSide'
import ProjectList from '@/features/projects/components/ProjectList'

const ProjectsPage = async () => {
    const accountStatus = await checkAccountStatus()
    let projects = []
    if (accountStatus.accessToken) {
        const resp = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/get-projects/${accountStatus.accessToken}`)
        projects = resp.data.projects
    }

    return <ProjectList OwnerProjects={projects} />
}

export default ProjectsPage
