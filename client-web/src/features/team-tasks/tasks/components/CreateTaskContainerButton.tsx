'use client'
import PopupCanvas from '@/components/PopupCanvas'
import axios from 'axios'
import { Plus } from 'lucide-react'
import React, { useState } from 'react'

interface ICreateTaskContainerButtonProps {
    addTaskContainer: () => void
}

const CreateTaskContainerButton: React.FC<ICreateTaskContainerButtonProps> = ({ addTaskContainer }) => {


    return (
        <div className="flex h-full w-64 shrink-0 cursor-pointer flex-col rounded-xl bg-[#00000058] hover:bg-[#000000a8]">
            <div
                className="flex h-full w-full flex-col"
                onClick={addTaskContainer}
            >
                <Plus className="m-auto text-white" />
            </div>
        </div>
    )
}

export default CreateTaskContainerButton
