'use client'
import { LoadingScreen } from '@/components/LoadingScreen'
import { Socket } from 'socket.io-client'
import React, { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import Conversation from './components/Conversation'
import List from './components/List'

const Chats: React.FC<{ userSessionToken: string }> = ({ userSessionToken }) => {
    const [socket, setSocket] = useState<Socket | null>(null)
    const [selectedChatToken, setSelectedChatToken] = useState<string | null>(null)


    useEffect(() => {
        const newSocket = io(`${process.env.NEXT_PUBLIC_MESSAGE_SERVER}`, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        })

        newSocket.on('connect', () => {
            console.log('Connected to server')
        })

        

        newSocket.on('connect_error', error => {
            console.error('Connection error:', error)
        })

        newSocket.on('disconnect', () => {
            console.log('Disconnected from server')
        })

        setSocket(newSocket)

        // Cleanup function
        return () => {
            if (newSocket) {
                newSocket.disconnect()
            }
        }
    }, [])

    if (!socket) {
        return (
            <div className="flex h-full w-full">
                <LoadingScreen />
            </div>
        )
    }

    return (
        <div className="flex h-full w-full">
            <List socket={socket} userSessionToken={userSessionToken} setSelectedChatToken={setSelectedChatToken} />
            <Conversation selectedChatToken={selectedChatToken || ''} socket={socket} userSessionToken={userSessionToken}/>
        </div>
    )
}

export default Chats
