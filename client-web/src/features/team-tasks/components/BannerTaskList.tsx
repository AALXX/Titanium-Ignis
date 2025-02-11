'use client'

import React, { useState } from 'react'
import axios from 'axios'
import PopupCanvas from '@/components/PopupCanvas'
import { ITaskBanners, ITeamDivisions } from '../ITeamTasks'
import DoubleValueOptionPicker from '@/components/DoubleValueOptionPicker'
import BannerTaskTemplate from './BannerTemplate'

interface ITeamDataList {
    ProjectToken: string
    userSessionToken: string | undefined
    allDivisions: ITeamDivisions[]
    taskBanners: ITaskBanners[]
    fetchTaskBanners: () => void
}

const BannerTaskList: React.FC<ITeamDataList> = ({ ProjectToken, userSessionToken, allDivisions, taskBanners, fetchTaskBanners }) => {
    const [togglePopupCreateTask, setTogglePopupCreateTask] = useState<boolean>(false)
    const [bannerName, setBannerName] = useState<string>('')
    const [departmentAssignmentToId, setDepartmentAssignmentToId] = useState<number>(0)

    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [error, setError] = useState<string>('')

    const createTaskBanner = async () => {
        try {
            const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/create-task-banner`, {
                projectToken: ProjectToken,
                taskBannerName: bannerName,
                departmentAssignmentToId: departmentAssignmentToId,
                userSessionToken: userSessionToken
            })
            if (response.data.error === false) {
                setTogglePopupCreateTask(false)
                setBannerName('')
                fetchTaskBanners()
            } else {
                setError('Error creating task banner')
            }
        } catch (error) {
            setError('Error creating task banner')
        }
    }

    if (isLoading) {
        return <div>Loading...</div>
    }

    if (error) {
        return <div>{error}</div>
    }

    return (
        <div className="flex h-full flex-col overflow-y-scroll">
            <div className="flex flex-col gap-4 p-4 sm:flex-row">
                <button
                    className="border-primary text-primary hover:bg-primary/10 w-full rounded-xl border px-6 py-3 font-bold text-white transition-colors duration-200 hover:bg-white/10 sm:w-auto"
                    onClick={() => setTogglePopupCreateTask(true)}
                >
                    Create Task Banner
                </button>
            </div>

            <div className="flex flex-col gap-4 p-4 md:h-[70vh] lg:h-[75vh] 3xl:h-[85vh]">
                {taskBanners.map((banner: ITaskBanners, index: number) => (
                    <BannerTaskTemplate key={index} {...banner} refreshTaskBanners={fetchTaskBanners} userSessionToken={userSessionToken} />
                ))}
            </div>

            {togglePopupCreateTask && (
                <PopupCanvas
                    closePopup={() => {
                        setTogglePopupCreateTask(false)
                    }}
                >
                    <div className="flex h-full w-full flex-col">
                        <h1 className="self-center text-2xl font-bold text-white">Create Task Banner</h1>
                        <input type="text" placeholder="Banner Name" className="mt-4 h-[4rem] w-full rounded-xl bg-[#00000048] indent-3 text-white" value={bannerName} onChange={e => setBannerName(e.target.value)} />
                        <DoubleValueOptionPicker
                            label="Assign To"
                            options={allDivisions.map(div => ({ label: div.divisionname, value: div.id }))}
                            value={departmentAssignmentToId}
                            onChange={value => setDepartmentAssignmentToId(Number(value))}
                            className="mt-4 h-[4rem] w-full rounded-xl bg-[#00000048] indent-3 text-white"
                        />
                        <button className="mt-4 w-full rounded-xl border p-4 font-bold text-white transition-colors hover:bg-white/10 disabled:opacity-50" onClick={createTaskBanner} disabled={isLoading}>
                            {isLoading ? 'Adding...' : 'Create Banner'}
                        </button>
                        {error && <p className="mt-2 text-red-500">{error}</p>}
                    </div>
                </PopupCanvas>
            )}
        </div>
    )
}

export default BannerTaskList
