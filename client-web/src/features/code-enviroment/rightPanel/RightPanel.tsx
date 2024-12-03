import React, { useState, useEffect } from 'react'
import { Socket } from 'socket.io-client'
import FloatingTerminal from '../terminal/FloatingTerminal'
import { useWindows } from '@/features/windows-system/WindowsWrapper'
import { IProjectConfig } from '../IProjectView'
import CollapsibleList from '@/components/CollapsibleList'
import Image from 'next/image'
import axios from 'axios'

interface IRightPanel {
    socket: Socket
    projectToken: string
    userSessionToken: string
}

const RightPanel: React.FC<IRightPanel> = ({ socket, userSessionToken, projectToken }) => {
    const { createWindow } = useWindows()
    const [projectConfig, setProjectConfig] = useState<IProjectConfig>({ services: [] })
    const [runningServices, setRunningServices] = useState<Record<number, string>>({})

    useEffect(() => {
        socket.on('service-started', (data: { processId: string; serviceID: number }) => {
            setRunningServices(prev => ({ ...prev, [data.serviceID]: data.processId }))
        })

        socket.on('service-stopped', (data: { processId: string; serviceID: number }) => {
            setRunningServices(prev => {
                const newState = { ...prev }
                delete newState[data.serviceID]
                return newState
            })
        })

        return () => {
            socket.off('service-started')
            socket.off('service-stopped')
        }
    }, [socket])

    const toggleService = (service: { id: number; name: string }) => {
        if (runningServices[service.id]) {
            socket.emit('stop-service', { processId: runningServices[service.id], serviceID: service.id })
            delete runningServices[service.id]
        } else {
            createWindow(service.name, <FloatingTerminal socket={socket} terminalName={service.name} />)
            socket.emit('start-service', { userSessionToken, projectToken, serviceID: service.id })
        }
    }

    const refreshServiceList = async () => {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_PROJECTS_SERVER}/api/projects/repo-file`, {
            params: { path: 'project-config.json', projectToken: projectToken, userSessionToken: userSessionToken }
        })
        setProjectConfig(response.data)
    }

    useEffect(() => {
        refreshServiceList()
    }, [])

    return (
        <div className="flex h-full w-[22rem] flex-col border-l border-[#333333] bg-[#1e1e1e] p-4">
            <div className="flex">
                <Image src="/Editor/Refresh_Icon.svg" alt="refresh" onClick={refreshServiceList} className="ml-auto cursor-pointer" width={25} height={25} />
            </div>
            {projectConfig.services.map(service => (
                <div key={service.id} className="mt-4">
                    <CollapsibleList title={service.name}>
                        {service.port && <p className="text-sm text-white">port: {service.port}</p>}
                        <button className="mt-4 rounded-md bg-[#333333] px-4 py-2 text-white" onClick={() => toggleService(service)}>
                            {runningServices[service.id] ? 'Stop Service' : 'Start Service'}
                        </button>
                    </CollapsibleList>
                </div>
            ))}
        </div>
    )
}

export default RightPanel
