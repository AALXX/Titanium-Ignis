import { useState } from 'react'
import { FileNode } from '../ILeftPanel'
import { stripReposPath } from '../../utils'
import Image from 'next/image'

interface DirectoryTreeProps {
    node: FileNode
    onFileClick: (path: string) => void
    onFileCreate: (path: string) => void
    onFileAdd: (fileId: string, filename: string) => void
    onFileDelete: (path: string) => void
}

const DirectoryTree = ({ node, onFileClick, onFileAdd, onFileDelete, onFileCreate }: DirectoryTreeProps) => {
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
        }
    }

    if (isCreating) {
        return (
            <div className="flex items-center space-x-2 border">
                <input
                    type="text"
                    className="w-24 bg-transparent text-white outline-none"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onBlur={() => {
                        setIsCreating(false)
                        onFileAdd(node.uuid, name)
                        // onFileAdd(node.path.replace(node.name, name))
                    }}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            setIsCreating(false)
                            onFileAdd(node.uuid, name)
                        }
                    }}
                    autoFocus
                />
            </div>
        )
    }

    return (
        <div className="pl-5">
            <div onClick={handleClick} className={`z-10 flex cursor-pointer rounded px-2 py-1 text-white hover:bg-[#ffffff1a] ${!node.is_dir ? 'hover:text-blue-400' : ''}`}>
                {node.is_dir ? (expanded ? '📂 ' : '📁 ') : '📄 '}

                {isEditingName ? (
                    <input
                        type="text"
                        className="w-24 bg-transparent text-white outline-none"
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
                {node.is_dir && <Image src="/Editor/Add_Icon.svg" alt="add" width={20} height={20} className="z-20 ml-auto cursor-pointer" onClick={handleCreateNewFile} />}
            </div>
            {expanded && node.children && (
                <div>
                    {node.children.map(child => (
                        <DirectoryTree key={child.path} node={child} onFileClick={onFileClick} onFileCreate={onFileCreate} onFileAdd={onFileAdd} onFileDelete={onFileDelete} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default DirectoryTree
