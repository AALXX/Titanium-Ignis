'use client'
import PopupCanvas from '@/components/PopupCanvas'
import { PlusSquare } from 'lucide-react'
import type React from 'react'
import { useEffect, useState } from 'react'
import ConversationCreatorPopUp from './ConversationCreatorPopUp'
import type { Socket } from 'socket.io-client'
import ConversationCard from './ConversationCard'

const List: React.FC<{
    socket: Socket
    userSessionToken: string
    setSelectedChatToken: React.Dispatch<React.SetStateAction<string | null>>
    setOtherPersonName: React.Dispatch<React.SetStateAction<string | null>>
    setIsOnline: React.Dispatch<React.SetStateAction<boolean>>
}> = ({ socket, userSessionToken, setOtherPersonName, setSelectedChatToken, setIsOnline }) => {
    const [addConvPopup, setAddConvPopup] = useState<boolean>(false)
    const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
    const [conversations, setConversations] = useState<
        Array<{
            id: string
            chatToken: string
            otherPersonName: string
            otherPersonPublicToken: string
            isOnline?: boolean
            avatarUrl?: string
        }>
    >([])

    useEffect(() => {
        socket.on('ALL_CONVERSATIONS', ({ conversations }) => {
            setConversations(conversations)
        })

        socket.emit('get-all-conversations', {
            userSessionToken: userSessionToken
        })

        return () => {
            socket.off('ALL_CONVERSATIONS')
        }
    }, [socket, userSessionToken])

    const handleConversationClick = (id: string, chatToken: string) => {
        setSelectedConversation(id)
        setSelectedChatToken(chatToken)
        setOtherPersonName(conversations.find(conversation => conversation.id === id)?.otherPersonName || '')
        setIsOnline(conversations.find(conversation => conversation.id === id)?.isOnline || false)
    }

    return (
        <div className="w-full max-w-[1rem] bg-[#0000004d] p-2 sm:max-w-md sm:p-3 md:max-w-[20rem] md:p-4">
            <div className="flex h-auto min-h-[2rem] w-full flex-row items-center sm:min-h-[3rem]">
                <button className="flex h-auto cursor-pointer items-center rounded-md px-2 py-1 transition-colors hover:bg-[#ffffff1a] sm:h-[2rem]" onClick={() => setAddConvPopup(true)}>
                    <PlusSquare className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                    <h3 className="ml-2 text-sm text-white sm:text-base">Add</h3>
                </button>
            </div>
            <div className="mt-4">
                {Array.isArray(conversations) && conversations.length > 0 ? (
                    conversations.map(conversation => (
                        <ConversationCard
                            key={conversation.id}
                            otherPersonName={conversation.otherPersonName}
                            isOnline={conversation.isOnline}
                            avatarUrl={conversation.avatarUrl}
                            onClick={() => handleConversationClick(conversation.id, conversation.chatToken)}
                        />
                    ))
                ) : (
                    <p className="py-4 text-center text-sm text-gray-400">No conversations yet</p>
                )}
            </div>
            {addConvPopup && (
                <PopupCanvas closePopup={() => setAddConvPopup(false)}>
                    <div className="flex h-full w-full">
                        <ConversationCreatorPopUp onClose={() => setAddConvPopup(false)} socket={socket} userSessionToken={userSessionToken} />
                    </div>
                </PopupCanvas>
            )}
        </div>
    )
}

export default List
