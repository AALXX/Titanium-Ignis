'use client'

import PopupCanvas from '@/components/PopupCanvas'
import Image from 'next/image'
import { useState } from 'react'
import type React from 'react'
import AccoutSettingsPopup from '../util/AccoutSettingsPopup'

interface UserProfileProps {
    name: string
    email: string
    image: string
}

const UserProfile: React.FC<UserProfileProps> = props => {
    const [ToggledSettingsPopUp, setToggledSettingsPopUp] = useState<boolean>(false)

    return (
        <>
            <div className="flex h-auto w-full max-w-4xl flex-col rounded-xl border border-gray-600 bg-[#3a3a3a] p-6 md:flex-row">
                <div className="flex flex-col items-center md:flex-1 md:flex-row md:items-start">
                    <div className="relative z-10 mb-4 h-24 w-24 md:mr-6 md:mb-0 md:h-32 md:w-32">
                        <Image className="rounded-full object-cover" src={props.image || '/placeholder.svg'} width={128} height={128} alt="Profile picture" />
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <div className="mb-2 flex flex-col md:flex-row md:items-center md:justify-between">
                            <h1 className="mb-1 text-2xl font-bold text-white md:mb-0">{props.name}</h1>
                            <Image
                                className="mx-auto mt-2 h-6 w-6 cursor-pointer text-white transition-opacity hover:opacity-80 md:mx-0 md:mt-0"
                                src={`/AccountIcons/Settings_icon.svg`}
                                alt="Settings"
                                width={24}
                                height={24}
                                onClick={() => {
                                    setToggledSettingsPopUp(!ToggledSettingsPopUp)
                                }}
                            />
                        </div>
                        <p className="mb-4 text-gray-300">{props.email}</p>

                    </div>
                </div>
            </div>

            {ToggledSettingsPopUp ? (
                <PopupCanvas
                    closePopup={() => {
                        setToggledSettingsPopUp(!ToggledSettingsPopUp)
                    }}
                >
                    <AccoutSettingsPopup email={props.email} name={props.name} image={props.image} />
                </PopupCanvas>
            ) : null}
        </>
    )
}

export default UserProfile
