'use client'
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { FileNode, ILeftPanel } from './ILeftPanel'
import DirectoryTree from './DirectoryTree'

const LeftPanel: React.FC<ILeftPanel> = props => {
    const [fileTree, setFileTree] = useState<FileNode[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [expanded, setExpanded] = useState(false)

    useEffect(() => {
        const fetchFileTree = async () => {
            setIsLoading(true)
            try {
                const response = await axios.get(`${process.env.NEXT_PUBLIC_PROJECTS_SERVER}/api/projects/repo-tree`, {
                    params: { projectToken: props.ProjectToken }
                })
                setFileTree(response.data)
            } catch (error) {
                console.error('Error fetching file tree:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchFileTree()
    }, [props.ProjectToken])

    const handleFileClick = async (filePath: string) => {
        props.onFileSelect(filePath)
    }

    return (
        <div className="flex h-full w-full flex-col overflow-hidden border-r border-[#333333] bg-[#1e1e1e]  md:w-80 lg:w-[30rem]">

            <div className="flex-shrink-0 p-4">
                <h2 className="text-xl font-semibold text-white">File Tree</h2>
            </div>
            <div className="h-[38rem] flex-grow-0 overflow-auto p-4 3xl:h-[52rem]">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-white">Loading...</div>
                    </div>
                ) : fileTree.length > 0 ? (
                    fileTree.map((node: FileNode) => <DirectoryTree key={node.path} node={node} onFileClick={handleFileClick} />)
                ) : (
                    <div className="text-white">No files found</div>
                )}
            </div>
        </div>
    )
}

export default LeftPanel
