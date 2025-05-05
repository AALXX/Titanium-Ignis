import DeploymentsOverView from '@/features/deployments/components/OverviewDashBoard'
import React from 'react'
import { checkAccountStatus } from '@/hooks/useAccountServerSide'
import axios from 'axios'
import { DeploymentOptions } from '../../../../features/deployments/types/DeploymentOptions'

const Deployments: React.FC<{ params: Promise<{ ProjectToken: string }> }> = async ({ params }) => {
    const { ProjectToken } = await params
    const accountStatus = await checkAccountStatus()

    const getDeploymentOptions: { data: { error: boolean; deploymentOptions: DeploymentOptions } } = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/get-deployment-options/${ProjectToken}/${accountStatus.accessToken}`
    )

    if (getDeploymentOptions.data.error) {
        return (
            <div className="flex h-screen items-center justify-center">
                <h1 className="text-white">Something went wrong</h1>
            </div>
        )
    }

    return (
        <div className="flex h-screen overflow-y-scroll">
            <DeploymentsOverView projectToken={ProjectToken} userSessionToken={accountStatus.accessToken as string} deploymentOptions={getDeploymentOptions.data.deploymentOptions} />
        </div>
    )
}

export default Deployments
