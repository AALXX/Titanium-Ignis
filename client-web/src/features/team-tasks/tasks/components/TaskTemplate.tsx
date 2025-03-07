'use client'
import React, { useEffect, useRef, useState } from 'react'
import { ETaskState } from '../../ITeamTasks'
import TruncatedText from '@/components/TruncateText'
import { MoreVertical } from 'lucide-react'

interface ITaskContainerTemplateProps {
    title: string
    onDeleteTask: (TaskUUID: string) => Promise<void>
    TaskUUID: string
    taskContainerUUID: string
}

const TaskTemplate: React.FC<ITaskContainerTemplateProps> = ({ title, onDeleteTask, taskContainerUUID }) => {
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

    return (
        <div className="flex h-[4rem] w-full shrink-0 flex-col rounded-xl bg-[#4e4e4e85]">
            <TruncatedText characters={20} text={taskName} className="text-xl font-bold text-white m-auto" />
        </div>
    )
}

export default TaskTemplate
