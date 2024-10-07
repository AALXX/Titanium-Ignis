'use client'
import React from 'react'
import { signOut} from 'next-auth/react'

const AccoutSettingsPopup = () => {
    return <div>
        <button onClick={() => signOut()} className='text-white self-center'>Sign out</button>
    </div>
}

export default AccoutSettingsPopup
