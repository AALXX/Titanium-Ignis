'use client'

import type React from 'react'
import { UserMinus, UserCog, ArrowUpDown } from 'lucide-react'

interface ManagementOptionsMenuProps {
    onRemove: (e: React.MouseEvent<HTMLButtonElement>) => void
    onChangeRole: (e: React.MouseEvent<HTMLButtonElement>) => void
    onChangeDivision: (e: React.MouseEvent<HTMLButtonElement>) => void
}

const ManagementOptionsMenu: React.FC<ManagementOptionsMenuProps> = ({ onRemove, onChangeRole, onChangeDivision }) => {
    return (
        <div className="absolute top-10 right-4 z-20 w-48 rounded-md bg-zinc-800 shadow-lg ring-1 ring-zinc-700">
            <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                <button onClick={onChangeRole} className="flex w-full items-center px-4 py-2 text-left text-sm text-white hover:bg-zinc-700" role="menuitem">
                    <UserCog className="mr-3 h-4 w-4" />
                    Change Role
                </button>
                <button onClick={onChangeDivision} className="flex w-full items-center px-4 py-2 text-left text-sm text-white hover:bg-zinc-700" role="menuitem">
                    <ArrowUpDown className="mr-3 h-4 w-4" />
                    Change Division
                </button>

                <div className="my-1 h-px bg-zinc-700"></div>

                <button onClick={onRemove} className="flex w-full items-center px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-700" role="menuitem">
                    <UserMinus className="mr-3 h-4 w-4" />
                    Remove Member
                </button>
            </div>
        </div>
    )
}

export default ManagementOptionsMenu
