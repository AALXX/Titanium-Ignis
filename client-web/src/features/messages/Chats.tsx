'use client'
import { LoadingScreen } from '@/components/LoadingScreen'
import type { Socket } from 'socket.io-client'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import Conversation from './components/Conversation'
import List from './components/List'

const Chats: React.FC<{ userSessionToken: string }> = ({ userSessionToken }) => {
    const [socket, setSocket] = useState<Socket | null>(null)
    const [selectedChatToken, setSelectedChatToken] = useState<string | null>(null)
    const socketRef = useRef<Socket | null>(null)

    const [onlineUsers, setOnlineUsers] = useState<string[]>([])

    useEffect(() => {
        if (!socketRef.current) {
            console.log('Initializing socket connection')

            const messagingSocket = io(`${process.env.NEXT_PUBLIC_MESSAGE_SERVER}`, {
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000
            })
            messagingSocket.emit('user-connected', { userSessionToken: userSessionToken })

            messagingSocket.on('USER_ONLINE', data => {
                setOnlineUsers(data.onlineUsers)
            })

            messagingSocket.on('connect', () => {
                console.log('Connected to server')
            })

            messagingSocket.on('connect_error', error => {
                console.error('Connection error:', error)
            })

            messagingSocket.on('disconnect', () => {
                console.log('Disconnected from server')
            })

            socketRef.current = messagingSocket
            setSocket(messagingSocket)
        }

        const handleBeforeUnload = () => {
            if (socketRef.current?.connected) {
                socketRef.current.emit('user-disconnected', { userSessionToken: userSessionToken })
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)

            if (socketRef.current?.connected) {
                socketRef.current.emit('user-disconnected', { userSessionToken: userSessionToken })
                socketRef.current.disconnect()
                socketRef.current = null
            }
        }
    }, [userSessionToken])

    if (!socket) {
        return (
            <div className="flex h-full w-full">
                <LoadingScreen />
            </div>
        )
    }

    return (
        <div className="flex h-full w-full">
            <List socket={socket} userSessionToken={userSessionToken} setSelectedChatToken={setSelectedChatToken} onlineUsers={onlineUsers} />
            {selectedChatToken && socket && userSessionToken && <Conversation selectedChatToken={selectedChatToken || ''} socket={socket} userSessionToken={userSessionToken} />}
        </div>
    )
}

export default Chats
