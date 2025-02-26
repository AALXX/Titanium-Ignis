'use client'
import React, { useEffect, useRef, useState } from 'react'
import { ETaskState } from '../../ITeamTasks'
import TruncatedText from '@/components/TruncateText'
import { MoreVertical } from 'lucide-react'
import TaskContainerOptionsMenu from './TaskContainerOptionsMenu'

interface ITaskContainerTemplateProps {
    title: string
    taskState: ETaskState
    onCreateTask: (newTasktaskName: string) => Promise<boolean>
    onDeleteTask: (TaskUUID: string) => Promise<void>
    TaskUUID: string
    taskContainerUUID: string
}

const TaskTemplate: React.FC<ITaskContainerTemplateProps> = ({ title, taskState, onCreateTask, onDeleteTask, taskContainerUUID }) => {
    const [TaskState, setTaskState] = useState<ETaskState>(taskState)
    const [taskName, setTaskName] = useState<string>(title)
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

    switch (taskState) {
        case ETaskState.Created:
            return (
                <div className="flex h-[4rem] w-full flex-shrink-0 flex-col rounded-xl bg-[#4e4e4e85]">
                    {/* <TruncatedText characters={20} text={taskName} className="text-xl font-bold text-white" /> */}
                    <h1 className="text-xl font-bold text-white">{taskName}</h1>
                </div>
            )
        case ETaskState.Creating:
            return (
                <div className="flex h-full w-64 flex-shrink-0 flex-col rounded-xl bg-[#00000058]">
                    <div className="flex h-[5rem] w-full flex-col">
                        <form
                            className="flex h-full w-full flex-col"
                            onSubmit={async (e: React.FormEvent) => {
                                e.preventDefault()
                                if (await onCreateTask(taskName)) {
                                    setTaskState(ETaskState.Created)
                                }
                            }}
                        >
                            <input type="text" placeholder="Task Container Name" className="m-auto w-2/3 rounded-lg border bg-[#00000058] p-2.5 text-sm text-white" onChange={e => setTaskName(e.target.value)} />
                        </form>
                        <hr className="mt-auto w-full bg-white" />
                    </div>
                </div>
            )

        default:
            return <div className="h-full w-64"></div>
    }
}

export default TaskTemplate
