'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { Socket } from 'socket.io-client'
import 'xterm/css/xterm.css'
import FloatingWindow from '@/components/CommonUI/FloatingWindow'

interface TerminalProps {
    socket: Socket
    processId?: string
}

const FloatingTerminal: React.FC<TerminalProps> = ({ socket, processId }) => {
    const terminalRef = useRef<HTMLDivElement>(null)
    const xtermRef = useRef<Terminal | null>(null)
    const fitAddonRef = useRef<FitAddon | null>(null)
    const [isTerminalReady, setIsTerminalReady] = useState(false)

    useEffect(() => {
        let term: Terminal | null = null
        let fitAddon: FitAddon | null = null

        const initializeTerminal = async () => {
            if (terminalRef.current && !xtermRef.current) {
                term = new Terminal({
                    cursorBlink: true,
                    fontSize: 14,
                    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                    theme: {
                        background: '#1e1e1e',
                        foreground: '#ffffff'
                    }
                })

                fitAddon = new FitAddon()
                term.loadAddon(fitAddon)

                term.open(terminalRef.current)

                // Use async/await for the delayed fit operation
                await new Promise(resolve => setTimeout(resolve, 0))
                fitAddon.fit()

                xtermRef.current = term
                fitAddonRef.current = fitAddon
                setIsTerminalReady(true)
            }
        }

        // Use an IIFE to allow async/await in useEffect
        ;(async () => {
            await initializeTerminal()
        })()

        const handleResize = () => {
            if (fitAddonRef.current) {
                fitAddonRef.current.fit()
            }
        }

        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            if (term) {
                term.dispose()
            }
        }
    }, [])

    useEffect(() => {
        if (!isTerminalReady || !socket) return

        const term = xtermRef.current!

        const handleOutput = async (data: { processId: string; output: string }) => {
            console.log('data', data.output)
            await term.write(data.output)
        }

        const handleServiceStarted = async (data: { processId: string }) => {
            await term.clear()
            await term.write(`Process started with ID: ${data.processId}\r\n`)
        }

        const handleServiceStopped = async (data: { processId: string }) => {
            await term.write(`\r\nProcess ${data.processId} stopped\r\n`)
        }

        const handleError = async (data: { processId?: string; error: string }) => {
            await term.write(`\r\nError: ${data.error}\r\n`)
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
    }, [isTerminalReady, socket])

    return (
        <FloatingWindow title="Terminal">
            <div className="h-full min-h-[10vh] w-full min-w-[30vw]">
                <div ref={terminalRef} className="h-full w-full" />
            </div>
        </FloatingWindow>
    )
}

export default FloatingTerminal
