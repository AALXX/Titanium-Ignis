'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

interface AccountStatus {
    isLoggedIn: boolean
    user?: any 
    accessToken?: string
    error?: string
}

export const useAccountStatus = () => {
    const { data: session, status } = useSession()
    const [accountStatus, setAccountStatus] = useState<AccountStatus>({
        isLoggedIn: false
    })

    useEffect(() => {
        if (status === 'authenticated' && session) {
            setAccountStatus({
                isLoggedIn: true,
                user: session.user,
                accessToken: session.accessToken as string
            })
        } else if (status === 'unauthenticated') {
            setAccountStatus({ isLoggedIn: false })
        } else if (status === 'loading') {
            setAccountStatus({ isLoggedIn: false })
        }
    }, [session, status])

    return accountStatus
}
