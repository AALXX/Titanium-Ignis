'use client'

import React, { useState, useEffect } from 'react'
import LeftPanel from './LeftPanel/LeftPanel'
import CodeEditor from './CodeEditor/CodeEditor'
import RightPanel from './RightPanel/RightPanel'
import { io } from 'socket.io-client'

interface ProjectViewWrapperProps {
    ProjectName: string
    ProjectToken: string
    RepoUrl: string
    CheckedOutBy: string
    Status: string
    Type: string
}

const ProjectViewWrapper: React.FC<ProjectViewWrapperProps> = ({ ProjectName, ProjectToken, RepoUrl, CheckedOutBy, Status, Type }) => {
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)

    const socket = io(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}`)
    const handleFileSelect = (filePath: string) => {
        setSelectedFilePath(filePath)
    }

    useEffect(() => {
        socket.on('connect', () => {
            console.log('Connected to server')
        })
        socket.on('disconnect', () => {
            console.log('Disconnected from server')
        })
        return () => {
            socket.disconnect()
        }
    }, [])

    return (
        <div className="flex h-full w-full">
            <LeftPanel ProjectName={ProjectName} ProjectToken={ProjectToken} RepoUrl={RepoUrl} CheckedOutBy={CheckedOutBy} Status={Status} Type={Type} onFileSelect={handleFileSelect} />
            <CodeEditor filePath={selectedFilePath} />
            <RightPanel socket={socket} />
        </div>
    )
}

export default ProjectViewWrapper
