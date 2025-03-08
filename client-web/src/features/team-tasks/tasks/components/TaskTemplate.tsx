'use client'
import type React from 'react'
import TruncatedText from '@/components/TruncateText'
import { Calendar, Flag } from 'lucide-react'

interface ITaskContainerTemplateProps {
    title: string
    TaskUUID: string
    taskContainerUUID: string
    onOpenTask: (taskUUID: string) => void
    importance?: string
    deadline?: Date | string
}

const TaskTemplate: React.FC<ITaskContainerTemplateProps> = ({ title, TaskUUID, onOpenTask, importance = 'low', deadline }) => {
    const getImportanceColor = () => {
        switch (importance) {
            case 'High':
                return 'bg-red-500'
            case 'Medium':
                return 'bg-amber-500'
            case 'Low':
                return 'bg-green-500'
            default:
                return 'bg-amber-500'
        }
    }

    const formatDeadline = () => {
        if (!deadline) return null

        const date = deadline instanceof Date ? deadline : new Date(deadline)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    return (
        <div className="flex h-[7rem] w-full shrink-0 flex-col rounded-xl bg-[#4e4e4e85] p-3 transition-colors hover:bg-[#5a5a5a85]" onClick={() => onOpenTask(TaskUUID)}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <TruncatedText characters={20} text={title} className="w-full text-lg font-bold text-white" />
                </div>
            </div>

            <div className="mt-auto flex items-center gap-3 text-xs text-white/80">
                <div className="flex items-center gap-1">
                    <Flag size={14} className="text-white" />
                    <span className="capitalize">
                        Importance: <span className={`rounded px-1.5 py-0.5 text-white ${getImportanceColor()}`}>{importance}</span>
                    </span>
                </div>

                {deadline && (
                    <div className="flex items-center gap-1">
                        <Calendar size={14} className="text-white" />
                        <span>Deadline: {formatDeadline()}</span>
                    </div>
                )}
            </div>
        </div>
    )
}

export default TaskTemplate
