import axios from 'axios'

const IsModuleInitialized = async (ProjectToken: string, moduleName: string, accessToken: string): Promise<boolean> => {
    try {
        const response = await axios.get<{ error: boolean; is_module_initialized: boolean }>(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/is-module-initialized/${ProjectToken}/${moduleName}/${accessToken}`)
        // console.log(response.data)
        if (response.data.error) {
            return false
        }

        return response.data.is_module_initialized
    } catch (error) {
        return false
    }
}

export { IsModuleInitialized }
