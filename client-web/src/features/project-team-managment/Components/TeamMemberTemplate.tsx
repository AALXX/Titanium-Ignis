import Link from 'next/link'
import React, { useState, useRef, useEffect } from 'react'
import { ITeamMemberTemplate } from '../IProjectTeamManagement'
import { MoreVertical } from 'lucide-react'
import ManagementOptionsMenu from './ManagementOptionsMenu'
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
        try {
            const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/remove-member`, {
                projectToken: props.ProjectToken,
                memberPublicToken: props.memberpublictoken,
                userSessionToken: props.userSessionToken
            })

            if (response.status === 200 && response.data.error === false   ) {
                props.onRemove(props.memberpublictoken)
            } else {
                window.alert('Failed to remove member')
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                window.alert(error.response?.data?.message || 'An error occurred while adding the team member')
            } else {
                window.alert('An unexpected error occurred')
            }
            console.error('Error adding team member:', error)
        } finally {
            setShowMenu(false)
        }
    }

    const handleChangeRole = () => {
        // Implement change role logic
        console.log('Change role')
        setShowMenu(false)
    }

    const handleChangeDivision = () => {
        // Implement change division logic
        console.log('Change division')
        setShowMenu(false)
    }

    return (
        <div className="relative">
            <Link href={`/user/${props.memberpublictoken}`}>
                <div className="flex w-full flex-row rounded-lg bg-[#00000056] p-4 shadow-sm transition-all hover:bg-[#0000008a]">
                    <img
                        className="h-12 w-12 self-center rounded-full"
                        // src={props.AvatarUrl || `/placeholder.svg?height=48&width=48`}
                        // src={`${process.env.NEXT_PUBLIC_FILE_SERVER}/${getCookie('userPublicToken')}/Main_icon.png?cache=none`}
                        alt={props.membername}
                    />
                    <div className="ml-4 flex flex-col self-center">
                        <p className="truncate text-sm font-medium text-white">{props.membername}</p>
                        <p className="truncate text-sm text-white">{props.memberemail}</p>
                    </div>
                    <p className="ml-auto mr-4 self-center truncate text-sm text-white">{props.role}</p>
                    <div className="relative flex" ref={menuRef}>
                        <MoreVertical
                            className="z-10 cursor-pointer self-center text-white"
                            onClick={e => {
                                e.preventDefault()
                                e.stopPropagation()
                                setShowMenu(!showMenu)
                            }}
                        />
                        {showMenu && <ManagementOptionsMenu onRemove={handleRemoveMember} onChangeRole={handleChangeRole} onChangeDivision={handleChangeDivision} />}
                    </div>
                </div>
            </Link>
        </div>
    )
}

export default TeamMemberTemplate
