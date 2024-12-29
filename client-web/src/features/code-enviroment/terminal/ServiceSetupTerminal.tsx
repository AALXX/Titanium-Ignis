'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Socket } from 'socket.io-client'

interface TerminalProps {
    socket: Socket
    ServiceID: number
}

const ServicesetupTerminal: React.FC<TerminalProps> = ({ socket, ServiceID }) => {
    const [history, setHistory] = useState<string[]>([])
    const terminalRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight
        }
    }, [history])

    useEffect(() => {
        if (!socket) return

        const handleOutput = (data: { serviceID: number; output: string }) => {
            if (data.serviceID === ServiceID) {
                setHistory(prev => [...prev, data.output])
            }
        }

        const handleSetupStarted = (data: { serviceID: number }) => {
            if (data.serviceID === ServiceID) {
                setHistory(prev => [...prev, `Process started with ID: ${data.serviceID}`])
            }
        }

        const handleServiceStopped = (data: { serviceID: number }) => {
            if (data.serviceID === ServiceID) {
                setHistory(prev => [...prev, `Process ${data.serviceID} stopped`])
            }
        }

        const handleError = (data: { serviceID?: number; error: string }) => {
            if (data.serviceID === ServiceID) {
                setHistory(prev => [...prev, `Error: ${data.error}`])
            }
        }

        socket.on('setup-output', handleOutput)
        socket.on('setup-started', handleSetupStarted)
        socket.on('setup-stopped', handleServiceStopped)
        socket.on('setup-error', handleError)

        return () => {
            socket.off('setup-output', handleOutput)
            socket.off('setup-started', handleSetupStarted)
            socket.off('setup-stopped', handleServiceStopped)
            socket.off('setup-error', handleError)
        }
    }, [socket])

    return (
        <div className="h-full w-full">
            <div ref={terminalRef} className="h-[calc(100%-40px)] overflow-auto bg-black p-4 font-mono text-green-400">
                {history.map((line, index) => (
                    <pre key={index} className="whitespace-pre-wrap break-all">
                        {line}
                    </pre>
                ))}
            </div>
            <div className="flex justify-between bg-gray-800 p-2">
                <button onClick={() => setHistory([])} className="text-gray-400 hover:text-white focus:outline-none">
                    Clear Terminal
                </button>
            </div>
        </div>
    )
}

export default ServicesetupTerminal
