import { FileNode } from '@/features/code-enviroment/leftPanel/ILeftPanel'
import { stripReposPath } from '@/features/code-enviroment/utils'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'

interface FileState {
    fileTree: FileNode[]
    isLoading: boolean
}

const initialState: FileState = {
    fileTree: [],
    isLoading: false
}

export const fileSlice = createSlice({
    name: 'files',
    initialState,
    reducers: {
        setFileTree: (state, action: PayloadAction<FileNode[]>) => {
            state.fileTree = action.payload
        },
        setIsLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload
        },
        createFile: (state, action: PayloadAction<{ filePath: string; fileName: string }>) => {
            const { filePath, fileName } = action.payload
            const newFile: FileNode = {
                uuid: uuidv4(),
                name: fileName,
                path: `${filePath}/${fileName}`,
                is_dir: false,
                isNew: true
            }

            const insertNewFile = (nodes: FileNode[]): boolean => {
                for (let i = 0; i < nodes.length; i++) {
                    if (nodes[i].path === filePath) {
                        if (!nodes[i].children) nodes[i].children = []
                        if (!nodes[i].children!.some(child => child.name === fileName)) {
                            nodes[i].children!.push(newFile)
                        }
                        return true
                    }
                    if (nodes[i].children && insertNewFile(nodes[i].children!)) {
                        return true
                    }
                }
                return false
            }

            insertNewFile(state.fileTree)
        },
        addFile: (state, action: PayloadAction<{ fileId: string; filename: string; userSessionToken: string; projectToken: string }>) => {
            const fileId = action.payload.fileId

            const setFileAsNotNew = (nodes: FileNode[], userSessionToken: string, projectToken: string): boolean => {
                for (let i = 0; i < nodes.length; i++) {
                    if (nodes[i].uuid === fileId) {
                        nodes[i].isNew = false
                        nodes[i].name = action.payload.filename
                        nodes[i].path = `${nodes[i].path.split('/').slice(0, -1).join('/')}/${action.payload.filename}`
                        ;(async () => {
                            const resp = await axios.post(`${process.env.NEXT_PUBLIC_PROJECTS_SERVER}/api/projects/new-file`, {
                                projectToken: projectToken,
                                userSessionToken: userSessionToken,
                                path: stripReposPath(`${nodes[i].path.split('/').slice(0, -1).join('/')}/${action.payload.filename}`)
                            })

                            if (resp.status === 200) {
                                return true
                            } else {
                                return false
                            }
                        })()

                        return true
                    }
                    if (nodes[i].children && setFileAsNotNew(nodes[i].children!, userSessionToken, projectToken)) {
                        return true
                    }
                }
                return false
            }

            setFileAsNotNew(state.fileTree, action.payload.userSessionToken, action.payload.projectToken)
        },
        deleteFile: (state, action: PayloadAction<string>) => {
            const filePath = action.payload
            const deleteFileRecursive = (nodes: FileNode[]): FileNode[] => {
                return nodes.filter(node => {
                    if (node.path === filePath) {
                        return false
                    }
                    if (node.children) {
                        node.children = deleteFileRecursive(node.children)
                    }
                    return true
                })
            }
            state.fileTree = deleteFileRecursive(state.fileTree)
        }
    }
})

export const { setFileTree, setIsLoading, createFile, deleteFile, addFile } = fileSlice.actions
export default fileSlice.reducer
