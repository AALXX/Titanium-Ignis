import React from 'react'
import Chats from '@/features/messages/Chats'
import { checkAccountStatus } from '@/hooks/useAccountServerSide'

const Messageshub = async() => {
    const accountStatus = await checkAccountStatus()

    if (!accountStatus.isLoggedIn) {
        return (
            <div className="flex h-screen items-center justify-center">
                <h1 className="text-white">Please login to view your projects</h1>
            </div>
        )
    }
    return (
        <div className="flex h-screen">
            <Chats userSessionToken={accountStatus.accessToken!}/>
        </div>
    )
}

export default Messageshub
