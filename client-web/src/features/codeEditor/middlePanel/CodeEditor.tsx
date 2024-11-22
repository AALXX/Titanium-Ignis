'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import axios from 'axios'
import hljs from 'highlight.js/lib/core'
import typescript from 'highlight.js/lib/languages/typescript'
import go from 'highlight.js/lib/languages/go'
import javascript from 'highlight.js/lib/languages/javascript'
import python from 'highlight.js/lib/languages/python'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import 'highlight.js/styles/github-dark.css'

// Register all languages
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('go', go)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('css', css)
hljs.registerLanguage('xml', xml)

interface ICodeEditor {
    filePath: string | null
}

const CodeEditor: React.FC<ICodeEditor> = ({ filePath }) => {
    const [fileContent, setFileContent] = useState<string>('')
    const [highlightedContent, setHighlightedContent] = useState<string>('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const preRef = useRef<HTMLPreElement>(null)

    // Function to determine language from file extension
    const getLanguageFromFilePath = useCallback((path: string): string => {
        const extension = path.split('.').pop()?.toLowerCase()

        const languageMap: { [key: string]: string } = {
            ts: 'typescript',
            tsx: 'typescript',
            js: 'javascript',
            jsx: 'javascript',
            go: 'go',
            py: 'python',
            css: 'css',
            html: 'xml',
            xml: 'xml',
            htm: 'xml'
        }

        return languageMap[extension || ''] || 'typescript' // Default to typescript if extension not found
    }, [])

    const highlightCode = useCallback((code: string, language: string) => {
        try {
            return hljs.highlight(code, { language }).value
        } catch (error) {
            console.warn(`Failed to highlight for language ${language}, falling back to auto`, error)
            return hljs.highlightAuto(code).value
        }
    }, [])

    useEffect(() => {
        const getFileData = async () => {
            if (filePath === null) {
                setFileContent('')
                setHighlightedContent('')
                return
            }

            setIsLoading(true)
            setError(null)

            try {
                const response = await axios.get(`${process.env.NEXT_PUBLIC_PROJECTS_SERVER}/api/projects/repo-file`, {
                    params: { path: filePath }
                })
                const language = getLanguageFromFilePath(filePath)
                setFileContent(response.data)
                setHighlightedContent(highlightCode(response.data, language))
            } catch (err) {
                console.error('Error fetching file content', err)
                setError('Failed to load file content')
            } finally {
                setIsLoading(false)
            }
        }

        getFileData()
    }, [filePath, highlightCode, getLanguageFromFilePath])

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value
        const language = filePath ? getLanguageFromFilePath(filePath) : 'typescript'
        setFileContent(newContent)
        setHighlightedContent(highlightCode(newContent, language))
    }

    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (preRef.current && textareaRef.current) {
            preRef.current.scrollTop = textareaRef.current.scrollTop
            preRef.current.scrollLeft = textareaRef.current.scrollLeft
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab') {
            e.preventDefault()
            const start = e.currentTarget.selectionStart
            const end = e.currentTarget.selectionEnd

            setFileContent(prevContent => {
                const newContent = prevContent.substring(0, start) + '\t' + prevContent.substring(end)
                const language = filePath ? getLanguageFromFilePath(filePath) : 'typescript'
                setHighlightedContent(highlightCode(newContent, language))
                return newContent
            })

            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1
                }
            }, 0)
        }
    }

    return (
        <div className="flex h-fit w-full flex-col bg-[#1e1e1e] text-white">
            <div className="flex-shrink-0 border-b border-[#333333] p-4">
                <h2 className="text-lg font-semibold">
                    {filePath ? (
                        <>
                            {filePath.split('/').pop()}
                            <span className="ml-2 text-sm text-gray-400">({getLanguageFromFilePath(filePath)})</span>
                        </>
                    ) : (
                        'No file selected'
                    )}
                </h2>
            </div>
            <div className="relative h-[38rem] flex-grow-0 overflow-hidden 3xl:h-[53rem]">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
                    </div>
                ) : error ? (
                    <div className="flex h-full items-center justify-center text-red-400">{error}</div>
                ) : !filePath ? (
                    <div className="flex h-full items-center justify-center text-gray-400">Select a file to view its contents</div>
                ) : (
                    <div className="relative h-full w-full font-mono text-sm">
                        <pre ref={preRef} className="pointer-events-none absolute inset-0 h-full w-full overflow-auto whitespace-pre p-4 " aria-hidden="true" dangerouslySetInnerHTML={{ __html: highlightedContent }} />
                        <textarea
                            ref={textareaRef}
                            className="absolute inset-0 h-full w-full resize-none overflow-auto bg-transparent p-4 text-transparent caret-white outline-none "
                            value={fileContent}
                            onChange={handleInput}
                            onScroll={handleScroll}
                            onKeyDown={handleKeyDown}
                            spellCheck={false}
                            aria-label="Code editor"
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

export default CodeEditor
