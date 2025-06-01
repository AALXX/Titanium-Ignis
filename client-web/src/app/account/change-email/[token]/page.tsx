import React from 'react'
import { auth } from '@/features/auth/auth'
import { redirect } from 'next/navigation'
import { ChangeEmailForm } from '@/features/account/components/ChangeEmailForm'
import { AlertCircle, Clock, Shield } from 'lucide-react'
import jwt from 'jsonwebtoken'

interface TokenPayload {
    type: string
    iat: number
    exp: number
}

interface ChangeEmailPageProps {
    params: Promise<{ token: string }>
}

const ChangeEmailPage = async ({ params }: ChangeEmailPageProps) => {
    const { token } = await params

    const session = await auth()
    if (!session || !session.user) {
        redirect('/account/login-register')
    }

    let tokenPayload: TokenPayload | null = null
    let tokenError: string | null = null

    try {
        tokenPayload = jwt.verify(token, process.env.CHANGE_GMAIL_SECRET as string) as TokenPayload

        if (tokenPayload.type !== 'CHANGE_EMAIL') {
            tokenError = 'This link is not valid for changing email addresses.'
        }
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            tokenError = 'This link has expired. Please request a new email change link.'
        } else if (error instanceof jwt.JsonWebTokenError) {
            tokenError = 'This link is invalid or corrupted. Please request a new email change link.'
        } else {
            tokenError = 'Unable to verify the link. Please try again.'
        }
    }

    if (tokenError) {
        return (
            <div className="flex h-full items-center justify-center  p-4">
                <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-800 shadow-lg">
                    <div className="p-6 pb-4">
                        <h2 className="mb-2 text-xl font-semibold text-white">Invalid Link</h2>
                        <p className="text-sm text-zinc-400">This email change link cannot be used</p>
                    </div>
                    <div className="px-6 pb-6">
                        <div className="flex items-start space-x-3 rounded-md border border-red-800 bg-red-950 p-4">
                            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                            <div>
                                <p className="mb-2 text-sm text-red-300">{tokenError}</p>
                                <p className="text-xs text-red-400">Go to your account settings to request a new email change link.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const expirationTime = new Date(tokenPayload!.exp * 1000)
    const timeRemaining = expirationTime.getTime() - Date.now()
    const minutesRemaining = Math.floor(timeRemaining / (1000 * 60))

    return (
        <div className="flex h-full items-center justify-center p-4">
            <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-800 shadow-lg">
                <div className="p-6 pb-4">
                    <h2 className="mb-2 text-xl font-semibold text-white">Change Email Address</h2>
                    <p className="text-sm text-zinc-400">Enter your new email address below</p>

                    <div className="mt-4 flex items-center space-x-2 rounded-md border border-green-800 bg-green-950 p-3">
                        <Shield className="h-4 w-4 flex-shrink-0 text-green-400" />
                        <div className="text-xs">
                            <p className="text-green-300">Link verified successfully</p>
                            <div className="mt-1 flex items-center space-x-1 text-green-400">
                                <Clock className="h-3 w-3" />
                                <span>Expires in {minutesRemaining} minutes</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="px-6 pb-6">
                    <ChangeEmailForm token={token} currentEmail={session.user.email || ''} userSessionToken={session.accessToken!} />
                </div>
            </div>
        </div>
    )
}

export default ChangeEmailPage
