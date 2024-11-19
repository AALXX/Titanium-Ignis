'use client'

import React, { useState, useEffect, useRef } from 'react'

const FloatingWindow: React.FC<{ title?: string; children: React.ReactNode }> = ({ title = 'Floating Window', children }) => {
    const [isDragging, setIsDragging] = useState(false)
    const [isResizing, setIsResizing] = useState(false)
    const [position, setPosition] = useState({ x: 20, y: 20 })
    const [size, setSize] = useState({ width: 300, height: 200 })
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const windowRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - offset.x,
                    y: e.clientY - offset.y
                })
            } else if (isResizing) {
                setSize({
                    width: e.clientX - position.x,
                    height: e.clientY - position.y
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
    }, [isDragging, isResizing, offset, position])

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
        setIsResizing(true)
    }

    return (
        <div
            ref={windowRef}
            className="fixed overflow-hidden rounded-lg bg-white shadow-lg"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${size.width}px`,
                height: `${size.height}px`,
                minWidth: '200px',
                minHeight: '100px',
                zIndex: 1000
            }}
        >
            <div className="flex cursor-move items-center justify-between bg-gray-200 px-4 py-2" onMouseDown={handleMouseDown}>
                <h2 className="text-lg font-semibold">{title}</h2>
                <button onClick={() => windowRef.current?.remove()} className="text-gray-600 hover:text-gray-800 focus:outline-none">
                    x
                </button>
            </div>
            <div className="overflow-auto p-4" style={{ height: 'calc(100% - 40px)' }}>
                {children}
            </div>
            <div className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize" onMouseDown={handleResizeMouseDown}>
                <svg className="h-full w-full text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 18 18 12 18 12 22" />
                    <polyline points="18 22 22 18 22 22" />
                </svg>
            </div>
        </div>
    )
}

export default FloatingWindow
