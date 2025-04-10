import DeploymentsOverView from '@/features/deployments/components/OverviewDashBoard'
import React from 'react'
import { checkAccountStatus } from '@/hooks/useAccountServerSide'

const Deployments: React.FC<{ params: Promise<{ ProjectToken: string }> }> = async ({ params }) => {
    const { ProjectToken } = await params
    const accountStatus = await checkAccountStatus()
    return (
        <div className="flex h-screen">
            <DeploymentsOverView projectToken={ProjectToken} userSessionToken={accountStatus.accessToken as string} />
        </div>
    )
}

export default Deployments
