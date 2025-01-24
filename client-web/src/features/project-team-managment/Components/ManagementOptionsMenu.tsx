'use client'
import React from 'react'
import { UserMinus, UserCog, ArrowUpDown } from 'lucide-react'

interface ManagementOptionsMenuProps {
    onRemove: (e: React.MouseEvent<HTMLButtonElement>) => void
    onChangeRole: (e: React.MouseEvent<HTMLButtonElement>) => void
    onChangeDivision: (e: React.MouseEvent<HTMLButtonElement>) => void
}

const ManagementOptionsMenu: React.FC<ManagementOptionsMenuProps> = ({ onRemove, onChangeRole, onChangeDivision }) => {
    return (
        <div className="absolute right-0 z-20 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
            <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                <button onClick={onChangeRole} className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">
                    <UserCog className="mr-3 h-5 w-5" />
                    Change Role
                </button>
                <button onClick={onChangeDivision} className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">
                    <ArrowUpDown className="mr-3 h-5 w-5" />
                    Change Division
                </button>
                <button onClick={onRemove} className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">
                    <UserMinus className="mr-3 h-5 w-5" />
                    Remove Member
                </button>
            </div>
        </div>
    )
}

export default ManagementOptionsMenu
