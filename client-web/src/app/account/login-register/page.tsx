'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Login-Register-Screen
 * @return {jsx}
 */
export default function LoginRegisterScreen() {
    const [registerForm, setRegisterForm] = useState(false)

    return (
        <div className="flex h-full flex-col justify-center">
            {!registerForm ? (
                <div className="flex h-[60vh] w-[90%] flex-col self-center rounded-3xl bg-[#0000004d] shadow-xl md:h-[80vh] md:w-[60%] xl:w-[40%]"></div>
            ) : (
                <div className="flex h-[60vh] w-[90%] flex-col self-center overflow-y-scroll rounded-3xl bg-[#0000004d] shadow-xl md:h-[80vh] md:w-[60%] xl:w-[40%]"></div>
            )}
        </div>
    )
}
