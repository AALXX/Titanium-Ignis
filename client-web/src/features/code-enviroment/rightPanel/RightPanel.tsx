import React, { useState, useEffect } from 'react'
import { Socket } from 'socket.io-client'
import FloatingTerminal from '../terminal/FloatingTerminal'
import { useWindows } from '@/features/windows-system/WindowsWrapper'
import { IProjectConfig } from '../IProjectView'
import CollapsibleList from '@/components/CollapsibleList'

interface IRightPanel {
    socket: Socket
    projectConfig: IProjectConfig
    projectToken: string
    userSessionToken: string
}

const RightPanel: React.FC<IRightPanel> = ({ socket, userSessionToken, projectConfig, projectToken }) => {
    const [processId, setProcessId] = useState<string | null>(null)
    const { createWindow } = useWindows()
    const [isServiceRunning, setIsServiceRunning] = useState(false)

    useEffect(() => {
        socket.on('service-started', (data: { processId: string }) => {
            setProcessId(data.processId)
        })
        // console.log(projectConfig)
    }, [socket])

    const startService = ({ serviceID, serviceName }: { serviceID: number; serviceName: string }) => {
        createWindow(serviceName, <FloatingTerminal socket={socket} terminalName={serviceName} />)

        socket.emit('start-service', { userSessionToken: userSessionToken, projectToken: projectToken, serviceID })
        socket.on('service-started', (data: { processId: string }) => {
            setProcessId(data.processId)
            setIsServiceRunning(true)
        })
        socket.on('service-stopped', () => {
            setIsServiceRunning(false)
        })
    }

    const stopService = () => {
        if (processId) {
            socket.emit('stop-service', { processId })
            socket.on('service-stopped', () => {
                setProcessId(null)
                setIsServiceRunning(false)
            })
        }
    }

    return (
        <div className="flex h-full w-[22rem] flex-col border-l border-[#333333] bg-[#1e1e1e] p-4">
            {projectConfig.services.map((service, index) => (
                <div key={index} className="mt-4">
                    <CollapsibleList title={service.name}>
                        {service.port && <p className="text-sm text-white">port: {service.port}</p>}
                        {isServiceRunning ? (
                            <button className="mt-4 rounded-md bg-[#333333] px-4 py-2 text-white" onClick={stopService}>
                                Stop Service
                            </button>
                        ) : (
                            <button
                                className="mt-4 rounded-md bg-[#333333] px-4 py-2 text-white"
                                onClick={() => {
                                    startService({ serviceID: service.id, serviceName: service.name })
                                }}
                            >
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
