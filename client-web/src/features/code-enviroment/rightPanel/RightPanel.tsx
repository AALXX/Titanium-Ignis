import React, { useState, useEffect } from 'react'
import { Socket } from 'socket.io-client'
import FloatingTerminal from '../terminal/FloatingTerminal'
import { useWindows } from '@/features/windows-system/WindowsWrapper'

interface IRightPanel {
    socket: Socket
}

const RightPanel: React.FC<IRightPanel> = ({ socket }) => {
    const [processId, setProcessId] = useState<string | null>(null)
    const { createWindow } = useWindows()

    useEffect(() => {
        socket.on('service-started', (data: { processId: string }) => {
            setProcessId(data.processId)
        })
    }, [socket])

    const startService = () => {
        createWindow('Demo Terminal', <FloatingTerminal socket={socket} terminalName="Demo Terminal" />)

        socket.emit('start-service')
    }

    const stopService = () => {
        if (processId) {
            socket.emit('stop-service', { processId })
        }
    }

    return (
        <div className="flex h-full w-[22rem] flex-col border-l border-[#333333] bg-[#1e1e1e] p-4">
            <button className="mb-4 rounded-md bg-[#333333] px-4 py-2 text-white" onClick={startService}>
                Start Process
            </button>
            <button className="mb-4 rounded-md bg-[#333333] px-4 py-2 text-white" onClick={stopService}>
                Stop Process
            </button>
        </div>
    )
}

export default RightPanel
