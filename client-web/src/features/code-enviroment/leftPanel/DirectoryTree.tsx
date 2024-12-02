import { useState } from 'react'
import { FileNode } from './ILeftPanel'
import { stripReposPath } from '../utils'

interface DirectoryTreeProps {
    node: FileNode
    onFileClick: (path: string) => void
}

const DirectoryTree = ({ node, onFileClick }: DirectoryTreeProps) => {
    const [expanded, setExpanded] = useState(false)

    const handleClick = () => {
        if (node.is_dir) {
            setExpanded(!expanded)
        } else {
            onFileClick(stripReposPath(node.path))
        }
    }

    return (
        <div className="pl-5">
            <div onClick={handleClick} className={`cursor-pointer rounded px-2 py-1 text-white hover:bg-[#ffffff1a] ${!node.is_dir ? 'hover:text-blue-400' : ''}`}>
                {node.is_dir ? (expanded ? '📂 ' : '📁 ') : '📄 '}
                {node.name}
            </div>
            {expanded && node.children && (
                <div>
                    {node.children.map(child => (
                        <DirectoryTree key={child.path} node={child} onFileClick={onFileClick} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default DirectoryTree