'use client'
import React from 'react'
import { signOut } from 'next-auth/react'

const AccountSettingsPopup = () => {
    const handleSignOut = async () => {
        try {
            await signOut({ callbackUrl: '/account/login-register' })
        } catch (error) {
            console.error('Error during sign out:', error)
        }
    }

    return (
        <div>
            <button onClick={handleSignOut} className="self-center text-white">
                Sign out
            </button>
            <br />
        </div>
    )
}

export default AccountSettingsPopup
