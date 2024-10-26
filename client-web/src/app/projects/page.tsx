import axios from 'axios'
import ProjectList from '@/components/Projects/ProjectList'
import { checkAccountStatus } from '@/hooks/useAccountServerside'

const ProjectsPage = async () => {

    const accountStatus = await checkAccountStatus()
    let projects = []
    if (accountStatus.accessToken) {
        const resp = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/get-projects/${accountStatus.accessToken}`)
        projects = resp.data.projects
    }

    return <ProjectList initialProjects={projects} />
}

export default ProjectsPage
