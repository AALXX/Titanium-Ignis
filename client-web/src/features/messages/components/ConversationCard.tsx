'use client'
import type React from 'react'
import { User } from 'lucide-react'

interface ConversationCardProps {
    otherPersonName: string
    isOnline?: boolean
    avatarUrl?: string
    onClick: () => void
}

const ConversationCard: React.FC<ConversationCardProps> = ({ otherPersonName, isOnline = false, avatarUrl, onClick }) => {
    return (
        <div className="mb-2 flex cursor-pointer items-center rounded-md p-3 transition-colors hover:bg-[#ffffff1a]" onClick={onClick}>
            <div className="relative">
                {avatarUrl ? (
                    <img src={avatarUrl || '/placeholder.svg'} alt={otherPersonName} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffffff1a]">
                        <User className="h-6 w-6 text-white" />
                    </div>
                )}
                <div className={`absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-[#0000004d] ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></div>
            </div>

            <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-white">{otherPersonName}</h3>
                <p className="truncate text-xs text-gray-400">{isOnline ? 'Online' : 'Offline'}</p>
            </div>
        </div>
    )
}

export default ConversationCard
