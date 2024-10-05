import React from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../api/auth/[...nextauth]/route'



const Account = async () => {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
        redirect('/api/auth/signin')
        // redirect('/account/login-register')
    
    }

    

    return (
        <div className="flex h-full flex-col">
            <div className='w-full h-[30vh] border'>
                
            </div>
            <div></div>
        </div>
    )
}

export default Account
