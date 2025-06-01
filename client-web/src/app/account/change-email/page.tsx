import React from 'react'
import { auth } from '@/features/auth/auth'
import { redirect } from 'next/navigation'
import { AlertCircle } from 'lucide-react'

interface ChangeEmailPageProps {
    searchParams: Promise<{ token?: string }>
}

const ChangeEmailPage = async ({ searchParams }: ChangeEmailPageProps) => {
    const { token } = await searchParams

    const session = await auth()
    if (!session || !session.user) {
        redirect('/account/login-register')
    }

    if (!token) {
        return (
            <div className="flex h-full items-center justify-center p-4">
                <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-800 shadow-lg">
                    <div className="p-6 pb-4">
                        <h2 className="mb-2 text-xl font-semibold text-white">Invalid Request</h2>
                        <p className="text-sm text-zinc-400">No verification token provided</p>
                    </div>
                    <div className="px-6 pb-6">
                        <div className="flex items-start space-x-3 rounded-md border border-red-800 bg-red-950 p-4">
                            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                            <p className="text-sm text-red-300">This link appears to be invalid or incomplete. Please check your email for the correct link.</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-full items-center justify-center  p-4">
            <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-800 shadow-lg">
                <div className="p-6 pb-4">
                    <h2 className="mb-2 text-xl font-semibold text-white">Change Email Address</h2>
                    <p className="text-sm text-zinc-400">Enter your new email address below</p>
                </div>
                <div className="px-6 pb-6">
                    {/* <ChangeEmailForm token={token} currentEmail={session.user.email || ''} /> */}
                </div>
            </div>
        </div>
    )
}

export default ChangeEmailPage
