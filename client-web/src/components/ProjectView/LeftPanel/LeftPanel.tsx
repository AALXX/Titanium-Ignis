'use client'
import React, { useState, useEffect } from 'react'
import { ILeftPanel } from './ILeftPanel'
import axios from 'axios'

const LeftPanel: React.FC<ILeftPanel> = props => {
    const [expanded, setExpanded] = useState(false)
    const [fileTree, setFileTree] = useState([])
    const [fileContent, setFileContent] = useState('')
    
    useEffect(() => {
        ;(async () => {
            const projectTee = await axios.get(`${process.env.NEXT_PUBLIC_Projects_SERVER}/api/projects/repo-tree/${props.ProjectToken}`)
        })()
    }, [props.ProjectToken])

    return (
        <div className="flex h-full w-[10rem] flex-col bg-[#0000004d] 3xl:w-[20rem]">
            {/* <h1 className="self-center text-white">{props.ProjectName}</h1>
            <div onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
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
            {!node.is_dir && (
                <div style={{ paddingLeft: 20, cursor: 'pointer' }} onClick={() => onFileClick(node.path)}>
                    {node.name}
                </div>
            )} */}
        </div>
    )
}

export default LeftPanel
