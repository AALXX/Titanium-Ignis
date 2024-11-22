'use client'

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { X, Minimize2, Maximize2 } from 'lucide-react'
import { IWindow } from './IWindows-System'

// Create a context for managing windows
const WindowsContext = createContext<{
    windows: IWindow[]
    createWindow: (title: string, content: React.ReactNode) => void
    destroyWindow: (id: string) => void
    minimizeWindow: (id: string) => void
    maximizeWindow: (id: string) => void
} | null>(null)

export const useWindows = () => {
    const context = useContext(WindowsContext)
    if (!context) {
        throw new Error('useWindows must be used within a WindowsProvider')
    }
    return context
}

export const WindowsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [windows, setWindows] = useState<IWindow[]>([])
    const nextId = useRef(1)

    const createWindow = useCallback((title: string, content: React.ReactNode) => {
        const id = `window-${nextId.current++}`
        setWindows(prev => [
            ...prev,
            {
                id,
                title,
                content,
                position: { x: 20 + ((nextId.current * 20) % 100), y: 20 + ((nextId.current * 20) % 100) },
                size: { width: 400, height: 300 },
                isMinimized: false
            }
        ])
    }, [])

    const destroyWindow = useCallback((id: string) => {
        setWindows(prev => prev.filter(window => window.id !== id))
    }, [])

    const minimizeWindow = useCallback((id: string) => {
        setWindows(prev => prev.map(window => (window.id === id ? { ...window, isMinimized: true } : window)))
    }, [])

    const maximizeWindow = useCallback((id: string) => {
        setWindows(prev => prev.map(window => (window.id === id ? { ...window, isMinimized: false } : window)))
    }, [])

    return (
        <WindowsContext.Provider value={{ windows, createWindow, destroyWindow, minimizeWindow, maximizeWindow }}>
            {children}
            {windows.map(window => (
                <FloatingWindow key={window.id} window={window} />
            ))}
        </WindowsContext.Provider>
    )
}

const FloatingWindow: React.FC<{ window: IWindow }> = ({ window }) => {
    const { destroyWindow, minimizeWindow, maximizeWindow } = useWindows()
    const [isDragging, setIsDragging] = useState(false)
    const [isResizing, setIsResizing] = useState(false)
    const [position, setPosition] = useState(window.position)
    const [size, setSize] = useState(window.size)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const windowRef = useRef<HTMLDivElement>(null)
    const resizeRef = useRef<{ startX: number; startY: number; originalWidth: number; originalHeight: number }>({
        startX: 0,
        startY: 0,
        originalWidth: window.size.width,
        originalHeight: window.size.height
    })

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - offset.x,
                    y: e.clientY - offset.y
                })
            } else if (isResizing) {
                const deltaX = e.clientX - resizeRef.current.startX
                const deltaY = e.clientY - resizeRef.current.startY

                const newWidth = Math.max(200, resizeRef.current.originalWidth + deltaX)
                const newHeight = Math.max(100, resizeRef.current.originalHeight + deltaY)

                setSize({
                    width: newWidth,
                    height: newHeight
                })
            }
        }

        const handleMouseUp = () => {
            setIsDragging(false)
            setIsResizing(false)
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isDragging, isResizing, offset])

    const handleMouseDown = (e: React.MouseEvent) => {
        if (windowRef.current) {
            const rect = windowRef.current.getBoundingClientRect()
            setOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            })
        }
        setIsDragging(true)
    }

    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation()

        // Store the initial mouse position and original window size
        resizeRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            originalWidth: size.width,
            originalHeight: size.height
        }

        setIsResizing(true)
    }

    if (window.isMinimized) {
        return (
            <div className="fixed bottom-0 left-0 m-2 cursor-pointer rounded-md bg-gray-200 p-2 shadow-md" onClick={() => maximizeWindow(window.id)}>
                {window.title}
            </div>
        )
    }

    return (
        <div
            ref={windowRef}
            className={['fixed', 'overflow-hidden', 'rounded-lg', 'bg-[#000000b2]', 'shadow-lg', 'transition-shadow', isDragging && 'cursor-move shadow-xl'].filter(Boolean).join(' ')}
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${size.width}px`,
                height: `${size.height}px`,
                zIndex: isDragging ? 1001 : 1000
            }}
        >
            <div className="flex items-center justify-between bg-[#494949] px-4 py-2" onMouseDown={handleMouseDown}>
                <h2 className="text-lg font-semibold text-white">{window.title}</h2>
                <div className="flex space-x-2">
                    <button onClick={() => minimizeWindow(window.id)} className="text-white hover:text-gray-800 focus:outline-none" aria-label="Minimize window">
                        <Minimize2 size={16} />
                    </button>
                    <button onClick={() => destroyWindow(window.id)} className="text-white hover:text-gray-800 focus:outline-none" aria-label="Close window">
                        <X size={16} />
                    </button>
                </div>
            </div>
            <div className="overflow-auto p-4" style={{ height: 'calc(100% - 40px)' }}>
                {window.content}
            </div>
            <div className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize" onMouseDown={handleResizeMouseDown}>
                <Maximize2 size={16} className="text-gray-400" />
            </div>
        </div>
    )
}

export default WindowsProvider
