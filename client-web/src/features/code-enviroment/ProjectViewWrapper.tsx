'use client'

import React, { useState, useEffect } from 'react'
import LeftPanel from './leftPanel/LeftPanel'
import CodeEditor from './middlePanel/CodeEditor'
import RightPanel from './rightPanel/RightPanel'
import { io, Socket } from 'socket.io-client'
import WindowsProvider from '../windows-system/WindowsWrapper'
import { IProjectViewWrapperProps } from './IProjectView'

const ProjectViewWrapper: React.FC<IProjectViewWrapperProps> = ({ ProjectName, ProjectToken, RepoUrl, CheckedOutBy, Status, Type }) => {
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
    const [socket, setSocket] = useState<Socket | null>(null)

    const handleFileSelect = (filePath: string) => {
        setSelectedFilePath(filePath)
    }

    useEffect(() => {
        // Initialize socket connection
        const newSocket = io(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}`, {
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
        return <div>Connecting...</div>
    }

    return (
        <div className="flex h-full w-full">
            <WindowsProvider>
                <LeftPanel ProjectName={ProjectName} ProjectToken={ProjectToken} RepoUrl={RepoUrl} CheckedOutBy={CheckedOutBy} Status={Status} Type={Type} onFileSelect={handleFileSelect} />
                <CodeEditor filePath={selectedFilePath} />
                <RightPanel socket={socket} />
            </WindowsProvider>
        </div>
    )
}

export default ProjectViewWrapper
