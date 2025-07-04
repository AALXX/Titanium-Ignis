import type React from 'react'
import { checkAccountStatus } from '@/hooks/useAccountServerSide'
import axios from 'axios'
import DeploymentInfoClient from '@/features/deployments/components/DeploymentInfo'

interface DeploymentPageProps {
    params: Promise<{
        ProjectToken: string
        deploymentId: string
    }>
}

const DeploymentInfoPage: React.FC<DeploymentPageProps> = async ({ params }) => {
    const { ProjectToken, deploymentId } = await params
    const accountStatus = await checkAccountStatus()

    try {
        const deploymentResponse = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/get-deployment-details/${ProjectToken}/${deploymentId}/${accountStatus.accessToken}`)

        if (deploymentResponse.data.error) {
            return (
                <div className="flex h-screen items-center justify-center">
                    <div className="text-center">
                        <h1 className="mb-2 text-2xl font-bold text-white">Deployment Not Found</h1>
                        <p className="text-zinc-400">The deployment you're looking for doesn't exist or you don't have access to it.</p>
                    </div>
                </div>
            )
        }

        return <DeploymentInfoClient deployment={deploymentResponse.data.deployment[0]} project={deploymentResponse.data.project[0]} projectToken={ProjectToken} userSessionToken={accountStatus.accessToken as string} />
    } catch (error) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <h1 className="mb-2 text-2xl font-bold text-white">Error Loading Deployment</h1>
                    <p className="text-zinc-400">Something went wrong while loading the deployment details.</p>
                </div>
            </div>
        )
    }
}

export default DeploymentInfoPage
