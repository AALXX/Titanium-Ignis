'use client'

import React, { useState, useEffect, useCallback } from 'react'
import type { Socket } from 'socket.io-client'
import ServiceTerminal from '../terminal/ServiceTerminal'
import { useWindows } from '@/features/windows-system/WindowsWrapper'
import type { IProjectConfig } from '../IProjectView'
import CollapsibleList from '@/components/CollapsibleList'
import axios from 'axios'
import ServicesetupTerminal from '../terminal/ServiceSetupTerminal'
import { RefreshCw, Server, Globe, Play, Square, Settings, Clock, ChevronRight } from 'lucide-react'
import PopupCanvas from '@/components/PopupCanvas'
import CreateDeployment from './components/CreateDeployment'

interface IRightPanel {
    socket: Socket
    projectToken: string
    userSessionToken: string
}

interface Deployment {
    id: string
    name: string
    status: 'running' | 'stopped' | 'failed' | 'building'
    environment: string
    timestamp: string
}

const RightPanel: React.FC<IRightPanel> = ({ socket, userSessionToken, projectToken }) => {
    const { createWindow } = useWindows()
    const [projectConfig, setProjectConfig] = useState<IProjectConfig>({ services: [], deployments: [] })
    const [runningServices, setRunningServices] = useState<{
        byServiceID: Record<number, string>
        byProcessId: Record<string, number>
    }>({
        byServiceID: {},
        byProcessId: {}
    })

    const [deployPopup, setDeployPopup] = useState(false)

    const [deployments, setDeployments] = useState<Deployment[]>([
        {
            id: 'dep-1',
            name: 'Production',
            status: 'building',
            environment: 'production',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'dep-3',
            name: 'Staging',
            status: 'stopped',
            environment: 'staging',
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        }
    ])

    const [isRefreshing, setIsRefreshing] = useState(false)

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
    }, [socket, createWindow, projectConfig, addRunningService, removeRunningService])

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
            setIsRefreshing(true)
            const response = await axios.get(`${process.env.NEXT_PUBLIC_PROJECTS_SERVER}/api/projects/repo-file`, {
                params: {
                    path: 'project-config.json',
                    projectToken,
                    userSessionToken
                }
            })

            setProjectConfig(response.data)
        } catch (error) {
            console.error('Failed to refresh service list:', error)
        } finally {
            setIsRefreshing(false)
        }
    }, [projectToken, userSessionToken])

    useEffect(() => {
        refreshServiceList()
    }, [refreshServiceList])

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'running':
                return 'bg-green-500'
            case 'stopped':
                return 'bg-gray-500'
            case 'failed':
                return 'bg-red-500'
            case 'building':
                return 'bg-yellow-500'
            default:
                return 'bg-gray-500'
        }
    }

    return (
        <div className="flex h-full w-[26rem] flex-col border-l border-[#333333] bg-[#1e1e1e]">
            <div className="flex h-1/2 flex-col overflow-hidden">
                <div className="flex items-center border-b border-[#333333] p-4">
                    <div className="flex items-center gap-2">
                        <Server size={18} className="text-white" />
                        <h2 className="text-lg font-semibold text-white">Services</h2>
                    </div>
                    <button onClick={refreshServiceList} className="ml-auto flex cursor-pointer items-center justify-center rounded-md p-1 hover:bg-[#333333]" disabled={isRefreshing}>
                        <RefreshCw size={18} className={`text-white ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {projectConfig.services.length === 0 ? (
                        <div className="mt-4 text-white">No services are currently defined.</div>
                    ) : (
                        <>
                            {projectConfig.services.map((service, index) => (
                                <React.Fragment key={`service-${index}`}>
                                    {service.id === undefined || service.name === undefined ? (
                                        <div className="mt-2">
                                            <CollapsibleList title="Error">
                                                <p className="text-white">Error: Invalid service configuration (id or name is undefined).</p>
                                            </CollapsibleList>
                                        </div>
                                    ) : (
                                        <div key={service.id} className="mt-2">
                                            <CollapsibleList
                                                title={
                                                    <div className="flex items-center">
                                                        <span>{service.name}</span>
                                                        {runningServices.byServiceID[service.id] && <div className="ml-2 h-2 w-2 rounded-full bg-green-500"></div>}
                                                    </div>
                                                }
                                            >
                                                {service.port && (
                                                    <div className="mb-2 flex items-center text-sm text-white">
                                                        <Globe size={14} className="mr-1" />
                                                        Port: {service.port}
                                                    </div>
                                                )}
                                                <div className="flex gap-2">
                                                    {service.setup && (
                                                        <button
                                                            className="flex cursor-pointer items-center gap-1 rounded-md bg-[#333333] px-3 py-1.5 text-sm text-white hover:bg-[#444444]"
                                                            onClick={() => startSetup(service)}
                                                        >
                                                            <Settings size={14} />
                                                            Setup
                                                        </button>
                                                    )}
                                                    <button
                                                        className={`flex cursor-pointer items-center gap-1 rounded-md px-3 py-1.5 text-sm text-white ${
                                                            runningServices.byServiceID[service.id] ? 'bg-red-700 hover:bg-red-800' : 'bg-green-700 hover:bg-green-800'
                                                        }`}
                                                        onClick={() => toggleService(service)}
                                                    >
                                                        {runningServices.byServiceID[service.id] ? (
                                                            <>
                                                                <Square size={14} />
                                                                Stop
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Play size={14} />
                                                                Start
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </CollapsibleList>
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </>
                    )}
                </div>
            </div>
            {deployPopup ? (
                <PopupCanvas closePopup={() => setDeployPopup(false)}>
                    <CreateDeployment
                        sokcetRef={socket}
                        projectToken={projectToken}
                        userSessionToken={userSessionToken}
                        deployments={projectConfig.deployments.map(deployment => ({
                            deployName: deployment.name,
                            deployID: deployment.id
                        }))}
                    />
                </PopupCanvas>
            ) : null}

            <div className="flex h-1/2 flex-col overflow-hidden border-t border-[#333333]">
                <div className="flex flex-col items-center border-b border-[#333333] p-4">
                    <div className="flex items-center gap-2">
                        <Globe size={18} className="text-white" />
                        <h2 className="text-lg font-semibold text-white">Deployments</h2>
                    </div>
                    <button className="mt-2 cursor-pointer rounded-md bg-[#2a2a2a] px-3 py-1.5 text-sm text-white hover:bg-[#333333]" onClick={() => setDeployPopup(true)}>
                        Create New Deploy
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {deployments.length === 0 ? (
                        <div className="mt-4 text-white">No deployments found.</div>
                    ) : (
                        <div className="space-y-3">
                            {deployments.map(deployment => (
                                <div key={deployment.id} className="flex flex-col rounded-md border border-[#333333] bg-[#252525] p-3 hover:bg-[#2a2a2a]">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`h-2.5 w-2.5 rounded-full ${getStatusColor(deployment.status)}`}></div>
                                            <span className="font-medium text-white">{deployment.name}</span>
                                            <span className="rounded-md bg-[#333333] px-2 py-0.5 text-xs text-white">{deployment.environment}</span>
                                        </div>
                                    </div>

                                    <div className="mt-2 flex items-center text-xs text-gray-400">
                                        <Clock size={12} className="mr-1" />
                                        Deployed on {formatDate(deployment.timestamp)}
                                    </div>

                                    <div className="mt-3 flex justify-end">
                                        <button className="flex cursor-pointer items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                                            View details <ChevronRight size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default RightPanel
