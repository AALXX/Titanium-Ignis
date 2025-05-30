'use client'

import type React from 'react'
import { useState } from 'react'
import type { ITeamDivisions, ITeamManagementData, ITeamMember } from '../IProjectTeamManagement'
import TeamDivisionCardTemplate from './TeamDivisionCardTemplate'
import TeamMemberTemplate from './TeamMemberTemplate'
import axios from 'axios'
import { UserPlus, FolderPlus, Loader2, Search } from 'lucide-react'
import PopupCanvas from '@/components/PopupCanvas'
import { useEffect, useRef } from 'react'
import DoubleValueOptionPicker from '@/components/DoubleValueOptionPicker'

interface ITeamDataList {
    TeamData: ITeamManagementData
    ProjectToken: string
    userSessionToken: string | undefined
}

const TeamDataList: React.FC<ITeamDataList> = ({ TeamData, ProjectToken, userSessionToken }) => {
    const [divisions, setDivisions] = useState<ITeamDivisions[]>(TeamData.TeamDivisions)
    const [teamMembers, setTeamMembers] = useState<ITeamMember[]>(TeamData.TeamMembers)

    const [togglePopupCreateDivision, setTogglePopupCreateDivision] = useState(false)
    const [togglePopupAddMember, setTogglePopupAddMember] = useState(false)
    const [togglePopupEditRole, setTogglePopupEditRole] = useState(false)

    const [roles, setRoles] = useState<{ id: number; display_name: string }[]>([])

    const [divisionName, setDivisionName] = useState<string>('')
    const [newMemberEmail, setNewMemberEmail] = useState<string>('')
    const [newMemberRole, setNewMemberRole] = useState<number | null>(null)
    const [editedRole, setEditedRole] = useState<string>('')
    const [editedMemberToken, setEditedMemberToken] = useState<string>('')

    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [componentToShow, setComponentToShow] = useState<string>('TEAM_MEMBERS_PAGE')

    const [searchResults, setSearchResults] = useState<any[]>([])
    const [isSearchLoading, setIsSearchLoading] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const addTeamMember = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/add-team-member`, {
                projectToken: ProjectToken,
                email: newMemberEmail,
                role: newMemberRole,
                userSessionToken: userSessionToken
            })

            if (response.status === 200 && response.data) {
                const newTeamMember: { error: boolean; teamMember: ITeamMember } = response.data

                if (newTeamMember.error) {
                    setError("Failed to add team member")
                    return
                }
         
                console.log(newTeamMember)

                setTeamMembers(prevMembers => [...prevMembers, newTeamMember.teamMember])
                setNewMemberEmail('')
                setNewMemberRole(null)
                setTogglePopupAddMember(false)
            } else {
                throw new Error('Failed to add team member')
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                setError(error.response?.data?.message || 'An error occurred while adding the team member')
            } else {
                setError('An unexpected error occurred')
            }
            console.error('Error adding team member:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const addDivision = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/create-division`, {
                projectToken: ProjectToken,
                divisionName: divisionName,
                userSessionToken: userSessionToken
            })

            if (response.status === 200 && response.data) {
                const newDivision: ITeamDivisions = response.data
                setDivisions(prevDivisions => [...prevDivisions, newDivision])
                setDivisionName('')
                setTogglePopupCreateDivision(false)
            } else {
                window.alert('Failed to add division')
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                setError(error.response?.data?.message || 'An error occurred while adding the division')
            } else {
                setError('An unexpected error occurred')
            }
            console.error('Error adding division:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const removeMember = (memberPublicToken: string) => {
        setTeamMembers(prevMembers => prevMembers.filter(member => member.memberpublictoken !== memberPublicToken))
    }

    const changeRole = async () => {
        setIsLoading(true)
        try {
            const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/change-member-role`, {
                projectToken: ProjectToken,
                memberPublicToken: editedMemberToken,
                newRoleName: editedRole,
                userSessionToken: userSessionToken
            })

            if (response.status === 200 && response.data) {
                // // setTeamMembers(prevMembers => prevMembers.map(member => (member.memberpublictoken === editedMemberToken ? { ...member, role: editedRole } : member)))

                setTeamMembers(prevMembers => prevMembers.map(member => (member.memberpublictoken === editedMemberToken ? { ...member, role: editedRole } : member)))

                setTogglePopupEditRole(false)
            } else {
                window.alert('Failed to change role')
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                setError(error.response?.data?.message || 'An error occurred while changing the role')
            } else {
                setError('An unexpected error occurred')
            }
            console.error('Error changing role:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        const handleSearch = async () => {
            if (newMemberEmail.length > 0 && newMemberEmail != null) {
                setIsSearchLoading(true)
                setError(null)

                try {
                    const results = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/user-account-manager/search-users/${newMemberEmail}`)
                    setSearchResults(results.data.usersData || [])
                    setShowDropdown(true)
                } catch (err) {
                    setError('Failed to search for users')
                    setSearchResults([])
                } finally {
                    setIsSearchLoading(false)
                }
            } else {
                setSearchResults([])
                setShowDropdown(false)
            }
        }

        ;(async () => {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/get-team-roles`)
            console.log(response.data.roles)
            if (response.status === 200 && response.data) {
                setRoles(response.data.roles)
            }
        })()

        const timeoutId = setTimeout(handleSearch, 300)
        return () => clearTimeout(timeoutId)
    }, [newMemberEmail])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const handleSelectUser = (user: any) => {
        setSelectedUser(user)
        setNewMemberEmail(user.useremail)
        setShowDropdown(false)
    }

    const renderComponent = () => {
        switch (componentToShow) {
            case 'TEAM_MEMBERS_PAGE':
                return (
                    <div className="flex w-full flex-col space-y-4 p-4">
                        {teamMembers.length === 0 ? (
                            <div className="py-8 text-center text-gray-400">No team members found. Add your first team member to get started.</div>
                        ) : (
                            teamMembers.map((member: ITeamMember, index: number) => (
                                <TeamMemberTemplate
                                    key={index}
                                    divisionid={member.divisionid}
                                    memberemail={member.memberemail}
                                    memberpublictoken={member.memberpublictoken}
                                    membername={member.membername}
                                    role={member.role}
                                    divisionisinname={member.divisionisinname}
                                    ProjectToken={ProjectToken}
                                    userSessionToken={userSessionToken}
                                    onRemove={removeMember}
                                    onChangeRole={(memberPublicToken: string) => {
                                        setTogglePopupEditRole(true)
                                        setEditedMemberToken(memberPublicToken)
                                        // Find current role to set as default
                                        const member = teamMembers.find(m => m.memberpublictoken === memberPublicToken)
                                        if (member) setEditedRole(member.role)
                                    }}
                                    onChangeDivision={() => {}}
                                />
                            ))
                        )}
                    </div>
                )
            case 'TEAM_DIVISIONS_PAGE':
                return (
                    <div className="grid grid-cols-1 gap-6 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {divisions.length === 0 ? (
                            <div className="col-span-full py-8 text-center text-gray-400">No divisions found. Create your first division to get started.</div>
                        ) : (
                            divisions.map((division: ITeamDivisions, index: number) => (
                                <TeamDivisionCardTemplate key={index} DivisionName={division.divisionname} NumberOfMembers={division.numberofmembers} ProjectToken={ProjectToken} />
                            ))
                        )}
                    </div>
                )
            default:
                return <div>No matching component found</div>
        }
    }

    return (
        <div className="flex h-full flex-col overflow-y-auto">
            <div className="flex flex-col gap-4 p-4 sm:flex-row">
                <button className="w-full rounded-xl border border-white px-6 py-3 font-bold text-white transition-colors duration-200 hover:bg-[#ffffff1a] sm:w-auto" onClick={() => setTogglePopupCreateDivision(true)}>
                    <div className="flex items-center justify-center gap-2">
                        <FolderPlus className="h-4 w-4" />
                        Create Division
                    </div>
                </button>
                <button className="w-full rounded-xl border border-white px-6 py-3 font-bold text-white transition-colors duration-200 hover:bg-[#ffffff1a] sm:w-auto" onClick={() => setTogglePopupAddMember(true)}>
                    <div className="flex items-center justify-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Add Team Member
                    </div>
                </button>
            </div>

            <div className="mt-16 flex">
                <button
                    className={`flex h-[3rem] w-[12rem] items-center justify-center rounded-t-3xl ${componentToShow === 'TEAM_MEMBERS_PAGE' ? 'bg-[#0000004d]' : 'bg-transparent'} cursor-pointer transition-colors duration-300 hover:bg-[#2424244d]`}
                    onClick={() => setComponentToShow('TEAM_MEMBERS_PAGE')}
                >
                    <span className="text-white">Team Members</span>
                </button>
                <button
                    className={`ml-4 flex h-[3rem] w-[12rem] items-center justify-center rounded-t-3xl ${componentToShow === 'TEAM_DIVISIONS_PAGE' ? 'bg-[#0000004d]' : 'bg-transparent'} cursor-pointer transition-colors duration-300 hover:bg-[#2424244d]`}
                    onClick={() => setComponentToShow('TEAM_DIVISIONS_PAGE')}
                >
                    <span className="text-white">Team Divisions</span>
                </button>
            </div>
            <hr className="border-white" />

            {renderComponent()}

            {togglePopupCreateDivision && (
                <PopupCanvas
                    closePopup={() => {
                        setTogglePopupCreateDivision(false)
                    }}
                >
                    <div className="flex h-full w-full flex-col">
                        <h1 className="self-center text-2xl font-bold text-white">Create Division</h1>

                        <input className="mt-4 w-full rounded-xl bg-[#00000048] p-3 text-white" placeholder="Division Name" onChange={e => setDivisionName(e.target.value)} value={divisionName} />
                        <button
                            className="mt-4 w-full rounded-xl border p-4 font-bold text-white transition-colors hover:bg-white/10 disabled:opacity-50"
                            onClick={addDivision}
                            disabled={isLoading || !divisionName.trim()}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </div>
                            ) : (
                                'Create Division'
                            )}
                        </button>
                        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
                    </div>
                </PopupCanvas>
            )}

            {togglePopupEditRole && (
                <PopupCanvas
                    closePopup={() => {
                        setTogglePopupEditRole(false)
                    }}
                >
                    <div className="flex h-full w-full flex-col">
                        <h1 className="self-center text-2xl font-bold text-white">Change Role</h1>

                        {/* <select className="mt-4 w-full rounded-xl bg-[#00000048] p-3 text-white" value={editedRole} onChange={e => setEditedRole(e.target.value)} required>
                            <option value="" disabled>
                                Select a role
                            </option>
                            {Roles.map(role => (
                                <option key={role} value={role}>
                                    {role}
                                </option>
                            ))}
                        </select> */}

                        <DoubleValueOptionPicker
                            label="Role"
                            options={roles.map(role => ({ value: role.id, label: role.display_name }))}
                            onChange={value => setNewMemberRole(roles.find(role => role.display_name === value)?.id || null)}
                            value={roles.find(role => role.id === newMemberRole)?.display_name || ''}
                            className="mt-4 h-[4rem] w-full rounded-xl bg-[#00000048] indent-3 text-white"
                        />
                        <button className="mt-4 w-full rounded-xl border p-4 font-bold text-white transition-colors hover:bg-white/10 disabled:opacity-50" onClick={changeRole} disabled={isLoading || !editedRole}>
                            {isLoading ? (
                                <div className="flex items-center justify-center">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                </div>
                            ) : (
                                'Change Role'
                            )}
                        </button>
                        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
                    </div>
                </PopupCanvas>
            )}

            {togglePopupAddMember && (
                <PopupCanvas
                    closePopup={() => {
                        setTogglePopupAddMember(false)
                        setSelectedUser(null)
                        setSearchResults([])
                        setShowDropdown(false)
                        setNewMemberEmail('')
                        setNewMemberRole(null)
                    }}
                >
                    <div className="flex h-full w-full flex-col">
                        <h1 className="self-center text-2xl font-bold text-white">Add Team Member</h1>

                        <div className="relative mt-4">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                className="w-full rounded-xl bg-[#00000048] p-3 pl-10 text-white"
                                placeholder="Search by email"
                                onChange={e => setNewMemberEmail(e.target.value)}
                                value={newMemberEmail}
                                aria-label="User Email"
                                type="email"
                                required
                            />
                            {isSearchLoading && (
                                <div className="absolute top-1/2 right-3 -translate-y-1/2 transform">
                                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                </div>
                            )}

                            {showDropdown && searchResults.length > 0 && (
                                <div ref={dropdownRef} className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-600 bg-[#2a2a2a] shadow-lg">
                                    {searchResults.map(user => (
                                        <div key={user.id} className="flex cursor-pointer items-center gap-3 border-b border-gray-600 p-3 last:border-b-0 hover:bg-[#3a3a3a]" onClick={() => handleSelectUser(user)}>
                                            <img src={user.avatar || '/placeholder.svg'} alt={user.username} className="h-8 w-8 rounded-full object-cover" />
                                            <div>
                                                <p className="text-sm font-medium text-white">{user.username}</p>
                                                <p className="text-xs text-gray-400">{user.useremail}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {showDropdown && newMemberEmail && searchResults.length === 0 && !isSearchLoading && (
                                <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-600 bg-[#2a2a2a] p-3 text-center shadow-lg">
                                    <p className="text-sm text-gray-400">No users found</p>
                                </div>
                            )}
                        </div>

                        {selectedUser && (
                            <div className="mt-2 rounded-md bg-[#3a3a3a] p-2">
                                <div className="flex items-center gap-2">
                                    <img src={selectedUser.avatar || '/placeholder.svg'} alt={selectedUser.username} className="h-6 w-6 rounded-full object-cover" />
                                    <span className="text-sm text-white">{selectedUser.username}</span>
                                </div>
                            </div>
                        )}

                        <DoubleValueOptionPicker
                            label="Role"
                            options={roles.map(role => ({ value: role.id, label: role.display_name }))}
                            onChange={value => {
                                setNewMemberRole(roles.find(role => role.id === Number(value))?.id || null)
                            }}
                            value={newMemberRole || ''}
                            className="mt-4 h-[4rem] w-full rounded-xl bg-[#00000048] indent-3 text-white"
                        />
                        <button
                            className="mt-4 w-full rounded-xl border p-4 font-bold text-white transition-colors hover:bg-white/10 disabled:opacity-50"
                            onClick={addTeamMember}
                            disabled={isLoading || !newMemberEmail.trim() || !newMemberRole}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Adding...
                                </div>
                            ) : (
                                <h1 className="text-lg font-bold text-white">Add Team Member</h1>
                            )}
                        </button>
                        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
                    </div>
                </PopupCanvas>
            )}
        </div>
    )
}

export default TeamDataList
