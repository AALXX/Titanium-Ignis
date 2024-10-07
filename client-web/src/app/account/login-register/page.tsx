'use client'
import React, { useState } from 'react'
import { signIn } from 'next-auth/react'
import Image from 'next/image'

/**
 * Login-Register-Screen
 * @return {jsx}
 */
export default function LoginRegisterScreen() {
    const [registerForm, setRegisterForm] = useState(false)

    const handleGoogleAuth = () => {
        signIn('google')
    }

    const handleGithubAuth = () => {
        signIn('github')
    }

    return (
        <div className="flex h-full flex-col justify-center">
            {!registerForm ? (
                <div className="flex h-[60vh] w-[90%] flex-col self-center rounded-3xl bg-[#0000004d] p-4 shadow-xl md:h-[80vh] md:w-[60%] xl:w-[40%]">
                    <h1 className="self-center text-2xl font-bold text-white">Sign In The account</h1>
                    <button
                        onClick={handleGoogleAuth}
                        className="focus:shadow-outline mt-52 flex h-14 w-full items-center justify-center rounded-lg border-2 bg-white px-6 text-xl font-semibold text-black transition-colors duration-300 hover:bg-slate-200"
                    >
                        <Image src={`/AccountIcons/google.png`} alt="Google Logo" width={20} height={20} />
                        <span className="ml-4">Continue with Google</span>
                    </button>

                    <button
                        onClick={handleGithubAuth}
                        className="focus:shadow-outline mt-4 flex h-14 w-full items-center justify-center rounded-lg border-2 bg-white px-6 text-xl font-semibold text-black transition-colors duration-300 hover:bg-slate-200"
                    >
                        <Image src={`/AccountIcons/github.png`} alt="Github Logo" width={20} height={20} />
                        <span className="ml-4">Continue with Github</span>
                    </button>
                </div>
            ) : (
                <div className="flex h-[60vh] w-[90%] flex-col self-center overflow-y-scroll rounded-3xl bg-[#0000004d] shadow-xl md:h-[80vh] md:w-[60%] xl:w-[40%]"></div>
            )}
        </div>
    )
}
