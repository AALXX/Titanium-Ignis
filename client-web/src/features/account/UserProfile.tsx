'use client'

import Image from 'next/image'
import { useState } from 'react'
import React from 'react'
import PopupCanvas from '@/components/PopupCanvas'
import AccoutSettingsPopup from './util/AccoutSettingsPopup'

interface UserProfileProps {
    name: string
    email: string
    image: string
}

const UserProfile: React.FC<UserProfileProps> = props => {
    const [ToggledSettingsPopUp, setToggledSettingsPopUp] = useState<boolean>(false)

    return (
        <>
            <div className="flex h-32 w-80 flex-col self-center md:flex-row">
                <div className="relative z-10 h-24 w-40 self-center">
                    {/* <Image
                                className="m-auto flex self-center rounded-full"
                                src={`${process.env.NEXT_PUBLIC_FILE_SERVER}/${props.userpublictoken}/Main_icon.png?cache=none`}
                                width={100}
                                height={100}
                                alt="Picture of the author"
                            /> */}

                    <Image className="m-auto flex self-center rounded-full" src={props.image} width={150} height={150} alt="Picture of the author" />

                    {/* {isAccIconHovered ? (
                                <div
                                    className="absolute inset-0 m-auto flex h-24 w-24 cursor-pointer rounded-full border bg-black bg-opacity-80"
                                    onMouseEnter={() => {
                                        setIsAccIconHovered(true)
                                    }}
                                    onMouseLeave={() => {
                                        setIsAccIconHovered(false)
                                    }}
                                    onClick={() => {
                                        setToggledIconChangePopUp(!ToggledIconChangePopUp)
                                    }}
                                >
                                    <img className="m-auto h-[90%] w-[90%] rounded-full" src="/assets/AccountIcons/EditProfileIcon_Icon.svg" alt="Overlay image" />
                                </div>
                            ) : null} */}
                </div>
                <div className="ml-2 w-full self-center">
                    <div className="flex">
                        <h1 className="mb-1 text-xl font-bold text-white">{props.name}</h1>
                    </div>
                    <div className="flex">
                        <h1 className="text-sm text-white">{props.email}</h1>
                        <Image
                            className="z-10 ml-auto h-5 w-5 cursor-pointer self-center text-white"
                            src={`/AccountIcons/Settings_icon.svg`}
                            alt="Picture of the author"
                            width={50}
                            height={50}
                            onClick={() => {
                                setToggledSettingsPopUp(!ToggledSettingsPopUp)
                            }}
                        />
                    </div>
                </div>
            </div>

            {ToggledSettingsPopUp ? (
                <PopupCanvas
                    closePopup={() => {
                        setToggledSettingsPopUp(!ToggledSettingsPopUp)
                    }}
                >
                    <AccoutSettingsPopup />
                </PopupCanvas>
            ) : null}

            <div className="flex h-32 w-72 flex-col self-center rounded-xl bg-[#0000005e] sm:ml-auto">
                <div className="m-auto flex w-full flex-col"></div>
            </div>
        </>
    )
}

export default UserProfile
