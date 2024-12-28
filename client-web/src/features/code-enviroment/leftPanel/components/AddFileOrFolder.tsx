'use client'

import React, { useState, useRef, useEffect } from 'react'
import { FolderPlus, FilePlus } from 'lucide-react'

interface AddFileOrFolderProps {
    isRoot: boolean
    onCreateFile: (event: React.MouseEvent) => void
    onCreateFolder: (event: React.MouseEvent) => void
    onCreateRootFile: (event: React.MouseEvent) => void
    onCreateRootFolder: (event: React.MouseEvent) => void
}

const AddFileOrFolder: React.FC<AddFileOrFolderProps> = ({ isRoot, onCreateFile, onCreateFolder, onCreateRootFile, onCreateRootFolder }) => {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const handleAddFile = (event: React.MouseEvent) => {
        event.stopPropagation()
        if (isRoot) {
            onCreateRootFile(event)
        } else {
            onCreateFile(event)
        }
        setIsOpen(false)
    }

    const handleAddFolder = (event: React.MouseEvent) => {
        event.stopPropagation()

        if (isRoot) {
            onCreateRootFolder(event)
        } else {
            onCreateFolder(event)
        }
        setIsOpen(false)
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                className="flex h-8 w-8 items-center justify-center "
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <img src="/Editor/Add_icon.svg" alt="Add File or Folder" className="h-5 w-5" />
            </button>
            {isOpen && (
                <div className="absolute z-10 mt-2 w-56  transform rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        <button className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" onClick={handleAddFile} role="menuitem">
                            <FilePlus className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                            Add File
                        </button>
                        <button className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" onClick={handleAddFolder} role="menuitem">
                            <FolderPlus className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                            Add Folder
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AddFileOrFolder
