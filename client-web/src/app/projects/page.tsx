import { cookies } from 'next/headers'
import axios from 'axios'
import ProjectList from '@/components/Projects/ProjectList'

export default async function ProjectsPage() {
    const cookieStore = cookies()
    const userPrivateToken = cookieStore.get('userPrivateToken')?.value

    let projects = []
    if (userPrivateToken) {
        const resp = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/get-projects/${userPrivateToken}`)
        projects = await resp.data.projects
    }

    return <ProjectList initialProjects={projects} />
}
