'use client'
import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Editor } from '@monaco-editor/react'
import { stripReposPath, getLanguageFromFilePath } from './utils'

const FileEditor = ({ filePath, projectToken, userSessionToken }: any) => {
    const [fileContent, setFileContent] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [fileSaved, setFileSaved] = useState(true)

    useEffect(() => {
        const getFileData = async () => {
            if (filePath === null) {
                setFileContent('')
                return
            }

            setIsLoading(true)
            setError(null)

            try {
                const response = await axios.get(`${process.env.NEXT_PUBLIC_PROJECTS_SERVER}/api/projects/repo-file`, {
                    params: { path: filePath }
                })

                if (getLanguageFromFilePath(filePath) === 'json') {
                    setFileContent(JSON.stringify(response.data, null, '\t'))
                } else {
                    setFileContent(response.data)
                }

                setFileSaved(true)
            } catch (err) {
                console.error('Error fetching file content', err)
                setError('Failed to load file content')
            } finally {
                setIsLoading(false)
            }
        }

        getFileData()
    }, [filePath])

    // Update the useEffect to use the memoized handleKeyDown

    const handleSaveFile = async () => {
        if (filePath === null) {
            console.error('No file path provided')
            return
        }

        try {
            await axios.post(`${process.env.NEXT_PUBLIC_PROJECTS_SERVER}/api/projects/save-file`, {
                path: stripReposPath(filePath),
                projectToken: projectToken,
                userSessionToken: userSessionToken,
                content: fileContent
            })
            setFileSaved(true)
        } catch (error) {
            console.error('Error saving file:', error)
        }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 's' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            handleSaveFile()
        }
    }

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [fileContent])

    return (
        <div className="flex h-full w-full flex-col bg-[#1e1e1e] text-white">
            <div className="flex flex-shrink-0 border-b border-[#333333] p-4">
                <h2 className="text-lg font-semibold">
                    {filePath ? (
                        <>
                            {fileSaved ? (
                                <>{filePath.split('/').pop()}</>
                            ) : (
                                <>
                                    {filePath.split('/').pop()}
                                    <span className="text-red-400">*</span>
                                </>
                            )}
                            <span className="ml-2 text-sm text-gray-400">({getLanguageFromFilePath(filePath)})</span>
                        </>
                    ) : (
                        'No file selected'
                    )}
                </h2>
                <button className="ml-auto rounded-xl bg-[#333333] px-4 py-2 text-white" onClick={handleSaveFile}>
                    Save
                </button>
            </div>
            <div className="relative h-[38rem] flex-grow-0 overflow-hidden 3xl:h-full">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
                    </div>
                ) : error ? (
                    <div className="flex h-full items-center justify-center text-red-400">{error}</div>
                ) : !filePath ? (
                    <div className="flex h-full items-center justify-center text-gray-400">Select a file to view its contents</div>
                ) : (
                    <Editor
                        className="h-full w-full"
                        language={getLanguageFromFilePath(filePath)}
                        onChange={value => {
                            setFileContent(value as string)
                            setFileSaved(false)
                        }}
                        options={{
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            fontSize: 14
                        }}
                        theme="vs-dark"
                        value={fileContent}
                    />
                )}
            </div>
        </div>
    )
}

export default FileEditor
