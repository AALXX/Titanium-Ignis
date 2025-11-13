'use client'

import type React from 'react'
import { useState, useEffect } from 'react'
import LeftPanel from './leftPanel/LeftPanel'
import CodeEditor from './middlePanel/CodeEditor'
import RightPanel from './rightPanel/RightPanel'
import { io, type Socket } from 'socket.io-client'
import WindowsProvider from '../windows-system/WindowsWrapper'
import type { IProjectCodebaseWrapper } from './IProjectView'
import { LoadingScreen } from '@/components/LoadingScreen'
import { StoreProvider } from './StoreProvider'

const ProjectCodebaseWrapper: React.FC<IProjectCodebaseWrapper> = ({ ProjectName, ProjectToken, RepoUrl, Status, Type, UserSessionToken }) => {
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
    const [mainServerSocket, setMainServerSocket] = useState<Socket | null>(null)
    const [deploymentsSocket, setDeploymentsSocket] = useState<Socket | null>(null)

    const handleFileSelect = (filePath: string) => {
        setSelectedFilePath(filePath)
    }

    useEffect(() => {
        const mainSocket = io(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}`, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        })

        const deploymentsSocket = io(`${process.env.NEXT_PUBLIC_DEPLOYMENTS_SERVER}`, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        })

        deploymentsSocket.on('connect', () => {
            console.log('Connected to deployments server')
        })

        mainSocket.on('connect', () => {
            console.log('Connected to server')
        })

        mainSocket.on('connect_error', error => {
            console.error('Connection error:', error)
        })

        mainSocket.on('disconnect', () => {
            console.log('Disconnected from server')
        })

        setMainServerSocket(mainSocket)
        setDeploymentsSocket(deploymentsSocket)

        // Cleanup function
        return () => {
            if (mainSocket) {
                mainSocket.disconnect()
            }
            if (deploymentsSocket) {
                deploymentsSocket.disconnect()
            }
        }
    }, [])

    if (!mainServerSocket || !deploymentsSocket) {
        return (
            <div className="flex h-full w-full">
                <LoadingScreen />
            </div>
        )
    }

    return (
        <div className="flex h-full w-full">
            <StoreProvider>
                <WindowsProvider>
                    <LeftPanel ProjectName={ProjectName} ProjectToken={ProjectToken} RepoUrl={RepoUrl} Status={Status} Type={Type} onFileSelect={handleFileSelect} />
                    <CodeEditor filePath={selectedFilePath} projectToken={ProjectToken} userSessionToken={UserSessionToken} repoUrl={RepoUrl} />
                    <RightPanel main_socket={mainServerSocket} deployments_socket={deploymentsSocket} projectToken={ProjectToken} userSessionToken={UserSessionToken} />
                </WindowsProvider>
            </StoreProvider>
        </div>
    )
}

export default ProjectCodebaseWrapper
