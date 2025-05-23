'use client'

import type React from 'react'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import type { ITeamMemberTemplate } from '../IProjectTeamManagement'
import { MoreVertical } from 'lucide-react'
import axios from 'axios'

const TeamMemberTemplate = (props: ITeamMemberTemplate) => {
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

    const handleRemoveMember = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()

        try {
            const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/remove-member`, {
                projectToken: props.ProjectToken,
                memberPublicToken: props.memberpublictoken,
                userSessionToken: props.userSessionToken
            })

            if (response.status === 200 && response.data.error === false) {
                props.onRemove(props.memberpublictoken)
            } else {
                window.alert('Failed to remove member')
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                window.alert(error.response?.data?.message || 'An error occurred while removing the team member')
            } else {
                window.alert('An unexpected error occurred')
            }
            console.error('Error removing team member:', error)
        } finally {
            setShowMenu(false)
        }
    }

    const handleChangeRole = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        props.onChangeRole(props.memberpublictoken)
        setShowMenu(false)
    }

    const handleChangeDivision = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        props.onChangeDivision(props.memberpublictoken)
        setShowMenu(false)
    }

    // Get initials for avatar fallback
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .substring(0, 2)
    }

    return (
        <div className="relative">
            <Link href={`/user/${props.memberpublictoken}`}>
                <div className="flex w-full flex-row rounded-lg bg-[#00000056] p-4 shadow-xs transition-all hover:bg-[#0000008a]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffffff1a] font-medium text-white">{getInitials(props.membername)}</div>
                    <div className="ml-4 flex flex-col self-center">
                        <p className="truncate text-sm font-medium text-white">{props.membername}</p>
                        <p className="truncate text-sm text-gray-400">{props.memberemail}</p>
                    </div>
                    <p className="mr-4 ml-auto self-center truncate text-sm text-white">{props.role}</p>
                    <div className="relative flex" ref={menuRef}>
                        <MoreVertical
                            className="z-10 cursor-pointer self-center text-white"
                            onClick={e => {
                                e.preventDefault()
                                e.stopPropagation()
                                setShowMenu(!showMenu)
                            }}
                        />
                        {showMenu && (
                            <div className="ring-opacity-5 absolute top-full right-0 z-10 mt-2 w-48 rounded-md bg-[#1a1a1a] py-1 shadow-lg ring-1 ring-black">
                                <button className="block w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-[#ffffff1a]" onClick={handleChangeRole}>
                                    Change Role
                                </button>
                                <button className="block w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-[#ffffff1a]" onClick={handleChangeDivision}>
                                    Change Division
                                </button>
                                <div className="border-t border-[#333333]"></div>
                                <button className="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-[#ffffff1a]" onClick={handleRemoveMember}>
                                    Remove Member
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </Link>
        </div>
    )
}

export default TeamMemberTemplate
