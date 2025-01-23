'use client'

import React, { useState } from 'react'
import { ITeamDivisions, ITeamManagementData, ITeamMember } from '../IProjectTeamManagement'
import TeamDivisionCardTemplate from './TeamDivisionCardTemplate'
import PopupCanvas from '@/components/PopupCanvas'
import TeamMemberTemplate from './TeamMemberTemplate'
import OptionPicker from '@/components/OptionPicker'
import { Roles } from '@/features/projects/utils/Roels'
import axios from 'axios'
import SelectableCards from '@/components/SelectableCards'

interface ITeamDataList {
    TeamData: ITeamManagementData
    ProjectToken: string
    userSessionToken: string | undefined
}

const TeamDataList: React.FC<ITeamDataList> = ({ TeamData, ProjectToken, userSessionToken }) => {
    const [divisions, setDivisions] = useState<ITeamDivisions[]>(TeamData.TeamDivisions)
    const [togglePopupCreateDivision, setTogglePopupCreateDivision] = useState(false)
    const [togglePopupAddMember, setTogglePopupAddMember] = useState(false)

    const [divisionName, setDivisionName] = useState<string>('')

    const [newMemberEmail, setNewMemberEmail] = useState<string>('')
    const [newMemberRole, setNewMemberRole] = useState<string>('')

    const [teamMembers, setTeamMembers] = useState<ITeamMember[]>(TeamData.TeamMembers)
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const [componentToShow, setComponentToShow] = useState<string>('TEAM_MEMBERS_PAGE')

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
                console.log(response.data.teamMember)
                const newTeamMember: ITeamMember = response.data
                setTeamMembers(prevMembers => [...prevMembers, newTeamMember])
                setNewMemberEmail('')
                setNewMemberRole('')
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
                setError(error.response?.data?.message || 'An error occurred while adding the team member')
            } else {
                setError('An unexpected error occurred')
            }
            console.error('Error adding team member:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const removeMember = (memberPublicToken: string) => {
        setTeamMembers(prevMembers => prevMembers.filter(member => member.memberpublictoken !== memberPublicToken))
    }

    const renderComponent = () => {
        switch (componentToShow) {
            case 'TEAM_MEMBERS_PAGE':
                return (
                    <div className="flex w-full flex-col space-y-4 p-4">
                        {teamMembers.map((member: ITeamMember, index: number) => (
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
                                onChangeDivision={() => {}}
                                onChangeRole={() => {}}
                            />
                        ))}
                    </div>
                )
            case 'TEAM_DIVISIONS_PAGE':
                return (
                    <div className="grid grid-cols-1 gap-6 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {divisions.map((division: ITeamDivisions, index: number) => (
                            <TeamDivisionCardTemplate key={index} DivisionName={division.divisionname} NumberOfMembers={division.numberofmembers} ProjectToken={ProjectToken} />
                        ))}
                    </div>
                )

            default:
                return <div>No matching component found</div>
        }
    }

    return (
        <div className="flex h-full flex-col overflow-y-auto">
            <div className="flex flex-col gap-4 p-4 sm:flex-row">
                <button
                    className="border-primary text-primary hover:bg-primary/10 w-full rounded-xl border px-6 py-3 font-bold text-white transition-colors duration-200 hover:bg-white/10 sm:w-auto"
                    onClick={() => setTogglePopupCreateDivision(true)}
                >
                    Create Division
                </button>
                <button
                    className="border-primary text-primary hover:bg-primary/10 w-full rounded-xl border px-6 py-3 font-bold text-white transition-colors duration-200 hover:bg-white/10 sm:w-auto"
                    onClick={() => setTogglePopupAddMember(true)}
                >
                    Add Team Member
                </button>
            </div>
            <div className="mt-16 flex">
                <SelectableCards
                    TabName="TEAM_MEMBERS_PAGE"
                    Title="Team Members"
                    activeTab={componentToShow}
                    setComponentToShow={() => {
                        setComponentToShow('TEAM_MEMBERS_PAGE')
                    }}
                    className="flex h-[3rem] w-[12rem] items-center rounded-t-3xl"
                />
                <SelectableCards
                    TabName="TEAM_DIVISIONS_PAGE"
                    Title="Team Divisions"
                    activeTab={componentToShow}
                    setComponentToShow={() => {
                        setComponentToShow('TEAM_DIVISIONS_PAGE')
                    }}
                    className="ml-4 flex h-[3rem] w-[12rem] items-center rounded-t-3xl"
                />
            </div>
            <hr className="" />

            {togglePopupCreateDivision && (
                <PopupCanvas
                    closePopup={() => {
                        setTogglePopupCreateDivision(false)
                    }}
                >
                    <div className="flex h-full w-full flex-col">
                        <input className="mt-4 w-full rounded-xl bg-[#00000048] p-3 text-white" placeholder="Division Name" onChange={e => setDivisionName(e.target.value)} value={divisionName} />
                        <button className="mt-4 w-full rounded-xl border p-4 font-bold text-white transition-colors hover:bg-white/10" onClick={addDivision}>
                            Create Division
                        </button>
                    </div>
                </PopupCanvas>
            )}
            {renderComponent()}
            {togglePopupAddMember && (
                <PopupCanvas
                    closePopup={() => {
                        setTogglePopupAddMember(false)
                    }}
                >
                    <div className="flex h-full w-full flex-col">
                        <input className="mt-4 w-full rounded-xl bg-[#00000048] p-3 text-white" placeholder="User Email" onChange={e => setNewMemberEmail(e.target.value)} value={newMemberEmail} aria-label="User Email" />
                        <OptionPicker label="Role" options={Roles} className="mt-2 h-[3rem] w-full rounded-xl bg-[#00000048] text-white" onChange={setNewMemberRole} value={newMemberRole} />
                        <button className="mt-4 w-full rounded-xl border p-4 font-bold text-white transition-colors hover:bg-white/10 disabled:opacity-50" onClick={addTeamMember} disabled={isLoading}>
                            {isLoading ? 'Adding...' : 'Add Team Member'}
                        </button>
                        {error && <p className="mt-2 text-red-500">{error}</p>}
                    </div>
                </PopupCanvas>
            )}
        </div>
    )
}

export default TeamDataList
