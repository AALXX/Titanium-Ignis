'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Socket } from 'socket.io-client'

interface TerminalProps {
    socket: Socket
    windowUUID: string
}

const ServiceTerminal: React.FC<TerminalProps> = ({ socket, windowUUID }) => {
    const [history, setHistory] = useState<string[]>([])
    const terminalRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight
        }
    }, [history])

    useEffect(() => {
        if (!socket) return

        const handleOutput = (data: { processId: string; output: string }) => {
            if (data.processId === windowUUID) {
                setHistory(prev => [...prev, data.output])
            }
        }

        const handleServiceStarted = (data: { processId: string }) => {
            if (data.processId === windowUUID) {
                setHistory(prev => [...prev, `Process started with ID: ${data.processId}`])
            }
        }

        const handleServiceStopped = (data: { processId: string }) => {
            if (data.processId === windowUUID) {
                setHistory(prev => [...prev, `Process ${data.processId} stopped`])
            }
        }

        const handleError = (data: { processId?: string; error: string }) => {
            if (data.processId === windowUUID) {
                setHistory(prev => [...prev, `Error: ${data.error}`])
            }
        }

        socket.on('service-output', handleOutput)
        socket.on('service-started', handleServiceStarted)
        socket.on('service-stopped', handleServiceStopped)
        socket.on('service-error', handleError)
        socket.on('service-closed', handleServiceStopped)

        return () => {
            socket.off('service-output', handleOutput)
            socket.off('service-started', handleServiceStarted)
            socket.off('service-stopped', handleServiceStopped)
            socket.off('service-error', handleError)
            socket.off('service-closed', handleServiceStopped)
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
                <button onClick={() => setHistory([])} className="text-gray-400 hover:text-white focus:outline-hidden">
                    Clear Terminal
                </button>
            </div>
        </div>
    )
}

export default ServiceTerminal
