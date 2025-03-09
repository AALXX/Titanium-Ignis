'use client'
import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'
import { MoreVertical } from 'lucide-react'
import BannerTasksOptionsMenu from './BannerTasksOptionsMenu'
import axios from 'axios'
import { ITaskBanners } from '../../ITeamTasks'

const BannerTaskTemplate = (props: ITaskBanners & { refreshTaskBanners: () => void; userSessionToken: string | undefined }) => {
    const [showMenu, setShowMenu] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    return (
        <Link href={`/projects/${props.projecttoken}/tasks/${props.bannertoken}`}>
            <div className="flex h-[11rem] w-full rounded-xl bg-[#0000005d] p-4 transition-all hover:bg-[#0000008a]">
                <div className="flex w-full flex-col self-center">
                    <h1 className="text-3xl font-bold text-white">{props.bannername}</h1>
                    <h1 className="text-md mt-2 mb-2 text-white">Departament assigned: {props.departamentassignedto}</h1>
                    <h1 className="text-md text-white">
                        Asigned By: {props.asignername}, {props.asignerrole}
                    </h1>
                </div>
                <div className="ml-auto flex flex-col" ref={menuRef}>
                    <MoreVertical
                        className="z-10 cursor-pointer self-center text-white"
                        onClick={e => {
                            e.preventDefault()
                            e.stopPropagation()
                            setShowMenu(!showMenu)
                        }}
                    />
                    {showMenu && (
                        <BannerTasksOptionsMenu
                            onChangeDeadline={async (e: React.MouseEvent<HTMLButtonElement>) => {
                                e.preventDefault()
                                e.stopPropagation()
                                console.log('Change deadline')
                            }}
                            onChangeDivision={async (e: React.MouseEvent<HTMLButtonElement>) => {
                                e.preventDefault()
                                e.stopPropagation()
                                console.log('Change division')
                            }}
                            onRemove={async (e: React.MouseEvent<HTMLButtonElement>) => {
                                e.preventDefault()
                                e.stopPropagation()
                                const resp = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/delete-banner`, {
                                    userSessionToken: props.userSessionToken,
                                    bannerToken: props.bannertoken,
                                    projectToken: props.projecttoken
                                })

                                if (resp.status === 200) {
                                    props.refreshTaskBanners()
                                } else {
                                    window.alert('Error deleting banner')
                                }
                            }}
                        />
                    )}
                </div>
            </div>
        </Link>
    )
}

export default BannerTaskTemplate
