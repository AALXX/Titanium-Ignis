'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Socket } from 'socket.io-client'
import ServiceTerminal from '../terminal/ServiceTerminal'
import { useWindows } from '@/features/windows-system/WindowsWrapper'
import { IProjectConfig } from '../IProjectView'
import CollapsibleList from '@/components/CollapsibleList'
import Image from 'next/image'
import axios from 'axios'
import ServicesetupTerminal from '../terminal/ServiceSetupTerminal'

interface IRightPanel {
    socket: Socket
    projectToken: string
    userSessionToken: string
}

interface RunningService {
    serviceID: number
    processId: string
}

const RightPanel: React.FC<IRightPanel> = ({ socket, userSessionToken, projectToken }) => {
    const { createWindow } = useWindows()
    const [projectConfig, setProjectConfig] = useState<IProjectConfig>({ services: [] })
    const [runningServices, setRunningServices] = useState<{
        byServiceID: Record<number, string>
        byProcessId: Record<string, number>
    }>({
        byServiceID: {},
        byProcessId: {}
    })

    const addRunningService = useCallback((serviceID: number, processId: string) => {
        setRunningServices(prev => ({
            byServiceID: { ...prev.byServiceID, [serviceID]: processId },
            byProcessId: { ...prev.byProcessId, [processId]: serviceID }
        }))
    }, [])

    const removeRunningService = useCallback((processId: string) => {
        setRunningServices(prev => {
            const serviceID = prev.byProcessId[processId]
            const newByServiceID = { ...prev.byServiceID }
            const newByProcessId = { ...prev.byProcessId }
            delete newByServiceID[serviceID]
            delete newByProcessId[processId]
            return { byServiceID: newByServiceID, byProcessId: newByProcessId }
        })
    }, [])

    useEffect(() => {
        const handleSetupStarted = (data: { serviceID: number }) => {

            const service = projectConfig.services.find(s => s.id === data.serviceID)
            if (service) {
                createWindow(service.name, <ServicesetupTerminal socket={socket} ServiceID={service.id} />, String(data.serviceID))
            }
        }

        const handleServiceStarted = (data: { processId: string; serviceID: number }) => {
            addRunningService(data.serviceID, data.processId)
            const service = projectConfig.services.find(s => s.id === data.serviceID)
            if (service) {
                createWindow(service.name, <ServiceTerminal socket={socket} windowUUID={data.processId} />, data.processId)
            }
        }

        const handleServiceStopped = (data: { processId: string }) => {
            removeRunningService(data.processId)
        }

        socket.on('setup-started', handleSetupStarted)

        socket.on('service-started', handleServiceStarted)
        socket.on('service-stopped', handleServiceStopped)

        return () => {
            socket.off('setup-started', handleSetupStarted)
            socket.off('service-started', handleServiceStarted)
            socket.off('service-stopped', handleServiceStopped)
        }
    }, [socket, createWindow, projectConfig, addRunningService])

    const toggleService = (service: { id: number; name: string }) => {
        if (runningServices.byServiceID[service.id]) {
            socket.emit('stop-service', {
                processId: runningServices.byServiceID[service.id],
                projectToken: projectToken
            })
        } else {
            socket.emit('start-service', {
                userSessionToken,
                projectToken,
                serviceID: service.id
            })
        }
    }

    const startSetup = (service: { id: number; name: string }) => {
        socket.emit('start-setup', {
            userSessionToken,
            projectToken,
            serviceID: service.id
        })
    }

    const refreshServiceList = useCallback(async () => {
        try {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_PROJECTS_SERVER}/api/projects/repo-file`, {
                params: {
                    path: 'project-config.json',
                    projectToken,
                    userSessionToken
                }
            })

            //! fix here when json is not right it crashes

            setProjectConfig(response.data)
        } catch (error) {
            console.error('Failed to refresh service list:', error)
        }
    }, [projectToken, userSessionToken])

    useEffect(() => {
        refreshServiceList()
    }, [refreshServiceList])

    return (
        <div className="flex h-full w-[22rem] flex-col border-l border-[#333333] bg-[#1e1e1e] p-4">
            <div className="flex">
                <Image src="/Editor/Refresh_Icon.svg" alt="refresh" onClick={refreshServiceList} className="ml-auto cursor-pointer" width={25} height={25} />
            </div>

            {Object.values(projectConfig).length === 0 ? (
                <div className="mt-4 text-white">No services are currently defined.</div>
            ) : (
                <>
                    {projectConfig.services.map((service, index) => (
                        <React.Fragment key={`service-${index}`}>
                            {service.id === undefined || service.name === undefined ? (
                                <div className="mt-4">
                                    <CollapsibleList title="Error">
                                        <p className="text-white">Error: Invalid service configuration (id or name is undefined).</p>
                                    </CollapsibleList>
                                </div>
                            ) : (
                                <div key={service.id} className="mt-4">
                                    <CollapsibleList title={service.name}>
                                        {service.port && <p className="text-sm text-white">port: {service.port}</p>}
                                        {service.setup && (
                                            <button className="mt-4 rounded-md bg-[#333333] px-4 py-2 text-white" onClick={() => startSetup(service)}>
                                                Setup Service
                                            </button>
                                        )}
                                        <button className="mt-4 rounded-md bg-[#333333] px-4 py-2 text-white" onClick={() => toggleService(service)}>
                                            {runningServices.byServiceID[service.id] ? 'Stop Service' : 'Start Service'}
                                        </button>
                                    </CollapsibleList>
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </>
            )}
        </div>
    )
}

export default RightPanel
