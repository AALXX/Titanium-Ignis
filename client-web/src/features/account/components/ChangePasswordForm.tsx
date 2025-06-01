'use client'

import type React from 'react'

import { useState } from 'react'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface ChangePasswordFormProps {
    token: string
    userSessionToken: string
}

export function ChangePasswordForm({ token, userSessionToken }: ChangePasswordFormProps) {
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match')
            setIsLoading(false)
            return
        }


        try {
            const resp = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/user-account-manager/change-password`, {
                token: token,
                userSessionToken: userSessionToken,
                newPassword: newPassword
            })

            if (resp.data.error) {
                setError('Failed to change password')
                return
            }

            setSuccess(true)
            setTimeout(() => {
                router.push('/account/login-register')
            }, 2000)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    if (success) {
        return (
            <div className="flex items-start space-x-3 rounded-md border border-green-800 bg-green-950 p-4">
                <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
                <p className="text-sm text-green-300">Password changed successfully! Redirecting to dashboard...</p>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <label htmlFor="new-password" className="block text-sm font-medium text-zinc-300">
                    New Password
                </label>
                <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    className="w-full rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
            </div>

            <div className="space-y-2">
                <label htmlFor="confirm-password" className="block text-sm font-medium text-zinc-300">
                    Confirm New Password
                </label>
                <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password "
                    required
                    className="w-full rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
            </div>

            {error && (
                <div className="flex it s-start space-x-3 rounded-md border border-red-800 bg-red-950 p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                    <p className="text-sm text-red-300">{error}</p>
                </div>
            )}

            <button
                type="submit"
                disabled={isLoading || !newPassword || !confirmPassword}
                className="flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-600"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating Password...
                    </>
                ) : (
                    'Update Password'
                )}
            </button>
        </form>
    )
}
