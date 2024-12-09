import React from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/features/auth/auth'
import UserProfile from '@/features/account/components/UserProfile'

const Account = async () => {
    const session = await auth()

    if (!session || !session.user) {
        // redirect('/api/auth/signin')
        redirect('/account/login-register')
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex h-[30vh] w-full flex-grow-0 flex-col">
                <div className="flex h-full w-[90%] flex-col self-center sm:flex-row lg:flex-row">
                    <UserProfile name={session.user.name as string} email={session.user.email as string} image={session.user.image as string} />
                </div>
                <div className=""></div>
            </div>
        </div>
    )
}

export default Account
