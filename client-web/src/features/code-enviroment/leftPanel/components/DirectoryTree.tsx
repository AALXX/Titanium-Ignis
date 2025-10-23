import React, { useState } from 'react'
import { FileNode } from '../ILeftPanel'
import { stripReposPath } from '../../utils'
import AddFileOrFolder from './AddFileOrFolder'
import { File, Folder, FolderOpen } from 'lucide-react'

interface DirectoryTreeProps {
    node: FileNode
    onFolderCreate: (path: string) => void
    onFolderAdd: (fileId: string, folderName: string) => void
    onFileClick: (path: string) => void
    onFileCreate: (path: string) => void
    onFileAdd: (fileId: string, filename: string) => void
    onFileDelete: (path: string) => void
}

const DirectoryTree = ({ node, onFolderCreate, onFolderAdd, onFileClick, onFileAdd, onFileDelete, onFileCreate }: DirectoryTreeProps) => {
    const [expanded, setExpanded] = useState<boolean>(false)
    const [isCreating, setIsCreating] = useState<boolean>(node.isNew || false)
    const [isEditingName, setIsEditingName] = useState<boolean>(false)
    const [name, setName] = useState<string>(node.name)

    const handleClick = () => {
        if (node.is_dir) {
            setExpanded(!expanded)
        } else {
            onFileClick(stripReposPath(node.path))
        }
    }

    const handleCreateNewFile = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (node.is_dir) {
            setExpanded(true)
            onFileCreate(node.path)
        } else {
            onFileCreate(node.path)
        }
    }

    const handleCreateNewFolder = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (node.is_dir) {
            setExpanded(true)
            onFolderCreate(node.path)
        } else {
            onFolderCreate(node.path)
        }
    }

    if (isCreating) {
        return (
            <div className="flex items-center space-x-2 border">
                <input
                    type="text"
                    className="w-24 bg-transparent text-white outline-hidden"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onBlur={() => {
                        setIsCreating(false)
                        if (node.is_dir) {
                            onFolderAdd(node.uuid, name)
                        } else {
                            onFileAdd(node.uuid, name)
                        }
                    }}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            setIsCreating(false)

                            if (node.is_dir) {
                                onFolderAdd(node.uuid, name)
                            } else {
                                onFileAdd(node.uuid, name)
                            }
                        }
                    }}
                    autoFocus
                />
            </div>
        )
    }

    return (
        <div className="pl-5">
            <div onClick={handleClick} className={`z-10 flex cursor-pointer items-center rounded-sm px-2 py-1 text-white hover:bg-[#ffffff1a] ${!node.is_dir ? 'hover:text-blue-400' : ''}`}>
                {node.is_dir ? expanded ? <FolderOpen className="mr-1 h-4 w-4" /> : <Folder className="mr-1 h-4 w-4" /> : <File className="mr-1 h-4 w-4" />}

                {isEditingName ? (
                    <input
                        type="text"
                        className="w-24 bg-transparent text-white outline-hidden"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onBlur={() => setIsEditingName(false)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                setIsEditingName(false)
                            }
                        }}
                    />
                ) : (
                    <>{name}</>
                )}
                {node.is_dir && (
                    <div className="ml-1 self-center">
                        <AddFileOrFolder isRoot={false} onCreateFile={handleCreateNewFile} onCreateFolder={handleCreateNewFolder} onCreateRootFile={() => {}} onCreateRootFolder={() => {}} />
                    </div>
                )}
            </div>
            {expanded && node.children && (
                <div>
                    {node.children.map(child => (
                        <DirectoryTree
                            key={child.path}
                            node={child}
                            onFileClick={onFileClick}
                            onFileCreate={onFileCreate}
                            onFileAdd={onFileAdd}
                            onFileDelete={onFileDelete}
                            onFolderCreate={onFolderCreate}
                            onFolderAdd={onFolderAdd}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
export default DirectoryTree
