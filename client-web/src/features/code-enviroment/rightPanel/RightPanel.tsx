import React, { useState, useEffect, use } from 'react'
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
    const [runningServices, setRunningServices] = useState<{ [serviceId: number]: string | null }>({})

    useEffect(() => {
        socket.on('service-started', (data: { processId: string; serviceId: number }) => {
            console.log('Service started:', data.processId, 'for service ID:', data.serviceId)
            setRunningServices(prev => ({ ...prev, [data.serviceId]: data.processId }))
        })

        socket.on('service-stopped', (data: { serviceId: number }) => {
            console.log('Service stopped for service ID:', data.serviceId)
            setRunningServices(prev => {
                const updated = { ...prev }
                delete updated[data.serviceId]
                return updated
            })
        })

        return () => {
            socket.off('service-started')
            socket.off('service-stopped')
        }
    }, [socket])

    const startService = ({ serviceID, serviceName }: { serviceID: number; serviceName: string }) => {
        createWindow(serviceName, <FloatingTerminal socket={socket} terminalName={serviceName} />)
        socket.emit('start-service', { userSessionToken, projectToken, serviceID })
    }

    const stopService = (serviceId: number) => {
        if (runningServices[serviceId]) {
            socket.emit('stop-service', { processId: runningServices[serviceId] })
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
            {projectConfig.services.map((service, index) => (
                <div key={index} className="mt-4">
                    <CollapsibleList title={service.name}>
                        {service.port && <p className="text-sm text-white">port: {service.port}</p>}
                        {runningServices[service.id] ? (
                            <button className="mt-4 rounded-md bg-[#333333] px-4 py-2 text-white" onClick={() => stopService(service.id)}>
                                Stop Service
                            </button>
                        ) : (
                            <button className="mt-4 rounded-md bg-[#333333] px-4 py-2 text-white" onClick={() => startService({ serviceID: service.id, serviceName: service.name })}>
                                Start Service
                            </button>
                        )}
                    </CollapsibleList>
                </div>
            ))}
        </div>
    )
}

export default RightPanel
