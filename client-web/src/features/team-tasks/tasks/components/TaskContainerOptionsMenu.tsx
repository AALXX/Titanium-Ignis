'use client'
import React from 'react'
import { Edit, PlusSquare, Trash } from 'lucide-react'

interface TaskContainerOptionsMenuProps {
    onCreateTask: (e: React.MouseEvent<HTMLButtonElement>) => void
    onDelete: (e: React.MouseEvent<HTMLButtonElement>) => void
    onEdit: (e: React.MouseEvent<HTMLButtonElement>) => void
}

const TaskContainerOptionsMenu: React.FC<TaskContainerOptionsMenuProps> = ({ onCreateTask, onDelete, onEdit }) => {
    return (
        <div className="ring-opacity-5 absolute z-20 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black">
            <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                <button onClick={onCreateTask} className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">
                    <PlusSquare className="mr-3 h-5 w-5" />
                    Create Task
                </button>
                <button onClick={onEdit} className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">
                    <Edit className="mr-3 h-5 w-5" />
                    Edit Container
                </button>
                <button onClick={onDelete} className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">
                    <Trash className="mr-3 h-5 w-5" />
                    Delete
                </button>
            </div>
        </div>
    )
}

export default TaskContainerOptionsMenu
