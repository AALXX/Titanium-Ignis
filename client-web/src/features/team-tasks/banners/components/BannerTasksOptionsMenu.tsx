'use client'
import React from 'react'
import { ArrowUpDown, DiamondMinus, Calendar } from 'lucide-react'

interface ManagementOptionsMenuProps {
    onRemove: (e: React.MouseEvent<HTMLButtonElement>) => void
    onChangeDivision: (e: React.MouseEvent<HTMLButtonElement>) => void
    onChangeDeadline: (e: React.MouseEvent<HTMLButtonElement>) => void
}

const BannerTasksOptionsMenu: React.FC<ManagementOptionsMenuProps> = ({ onRemove, onChangeDeadline, onChangeDivision }) => {
    return (
        <div className="right-0 z-20 mt-2 w-48 rounded-md bg-zinc-800 shadow-lg ring-1 ring-zinc-700">
            <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                <button onClick={onChangeDeadline} className="flex w-full items-center px-4 py-2 text-left text-sm text-white hover:bg-zinc-700" role="menuitem">
                    <Calendar className="mr-3 h-4 w-4" />
                    Change Deadline
                </button>
                <button onClick={onChangeDivision} className="flex w-full items-center px-4 py-2 text-left text-sm text-white hover:bg-zinc-700" role="menuitem">
                    <ArrowUpDown className="mr-3 h-4 w-4" />
                    Change Division
                </button>

                <div className="my-1 h-px bg-zinc-700"></div>

                <button onClick={onRemove} className="flex w-full items-center px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-700" role="menuitem">
                    <DiamondMinus className="mr-3 h-4 w-4" />
                    Remove Task Banner
                </button>
            </div>
        </div>
    )
}

export default BannerTasksOptionsMenu
