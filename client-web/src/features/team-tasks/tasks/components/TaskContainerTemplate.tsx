'use client'
import React, { useEffect, useRef, useState } from 'react'
import { EContainerState } from '../../ITeamTasks'
import TruncatedText from '@/components/TruncateText'
import { MoreVertical } from 'lucide-react'
import TaskContainerOptionsMenu from './TaskContainerOptionsMenu'

interface ITaskContainerTemplateProps {
    title: string
    containerState: EContainerState
    onCreateTask: (taskContainerUUID: string) => Promise<void>
    onCreateTaskContainer: (newTaskContainerName: string) => Promise<boolean>
    onDeleteTaskContainer: (taskContainerUUID: string) => Promise<void>
    taskContainerUUID: string
    children: React.ReactNode
}

const TaskContainerTemplate: React.FC<ITaskContainerTemplateProps> = ({ title, containerState, onCreateTask, onCreateTaskContainer, onDeleteTaskContainer, taskContainerUUID, children }) => {
    const [ContainerState, setContainerState] = useState<EContainerState>(containerState)
    const [containerName, setContainerName] = useState<string>(title)
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

    switch (ContainerState) {
        case EContainerState.Created:
            return (
                <div className="flex h-full w-full max-w-xs min-w-[18rem] shrink-0 flex-col rounded-xl bg-[#00000058]">
                    <div className="flex h-full flex-col">
                        <div className="mb-4 flex items-center justify-between p-4">
                            <div className="grow" />
                            <TruncatedText characters={20} text={containerName} className="text-center text-xl font-bold text-white" />
                            <div className="relative flex grow justify-end" ref={menuRef}>
                                <MoreVertical
                                    className="z-10 cursor-pointer text-white"
                                    onClick={e => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        setShowMenu(!showMenu)
                                    }}
                                />
                                {showMenu && (
                                    <TaskContainerOptionsMenu
                                        onDelete={() => {
                                            onDeleteTaskContainer(taskContainerUUID)
                                            setShowMenu(false)
                                        }}
                                        onCreateTask={() => {
                                            onCreateTask(taskContainerUUID)
                                            setShowMenu(false)
                                        }}
                                        onEdit={() => {}}
                                    />
                                )}
                            </div>
                        </div>
                        <hr className="mb-4 w-full bg-white" />
                        <div className="grow overflow-y-auto p-4">
                            <div className="flex flex-col gap-2">{children}</div>
                        </div>
                    </div>
                </div>
            )
        case EContainerState.Creating:
            return (
                <div className="flex h-full w-64 shrink-0 flex-col rounded-xl bg-[#00000058]">
                    <div className="flex h-[5rem] w-full flex-col">
                        <form
                            className="flex h-full w-full flex-col"
                            onSubmit={async (e: React.FormEvent) => {
                                e.preventDefault()
                                if (await onCreateTaskContainer(containerName)) {
                                    setContainerState(EContainerState.Created)
                                }
                            }}
                        >
                            <input type="text" placeholder="Task Container Name" className="m-auto w-2/3 rounded-lg border bg-[#00000058] p-2.5 text-sm text-white" onChange={e => setContainerName(e.target.value)} />
                        </form>
                        <hr className="mt-auto w-full bg-white" />
                    </div>
                </div>
            )

        default:
            return <div className="h-full w-64"></div>
    }
}

export default TaskContainerTemplate
