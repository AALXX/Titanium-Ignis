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
        createFolder: (state, action: PayloadAction<{ filePath: string; folderName: string }>) => {
            const { filePath, folderName } = action.payload
            const newFolder: FileNode = {
                uuid: uuidv4(),
                name: folderName,
                path: filePath ? `${filePath}/${folderName}` : folderName,
                is_dir: true,
                isNew: true
            }

            if (!filePath) {
                state.fileTree.push(newFolder)
            } else {
                const insertNewFolder = (nodes: FileNode[]): boolean => {
                    for (let i = 0; i < nodes.length; i++) {
                        if (nodes[i].path === filePath) {
                            if (!nodes[i].children) nodes[i].children = []
                            if (!nodes[i].children!.some(child => child.name === folderName)) {
                                nodes[i].children!.push(newFolder)
                            }
                            return true
                        }
                        if (nodes[i].children && insertNewFolder(nodes[i].children!)) {
                            return true
                        }
                    }
                    return false
                }

                insertNewFolder(state.fileTree)
            }
        },
        addFolder: (state, action: PayloadAction<{ fileId: string; folderName: string; userSessionToken: string; projectToken: string }>) => {
            const { fileId, folderName } = action.payload
            const setFolderAsNotNew = (nodes: FileNode[], userSessionToken: string, projectToken: string): boolean => {
                for (let i = 0; i < nodes.length; i++) {
                    if (nodes[i].uuid === fileId) {
                        nodes[i].isNew = false
                        nodes[i].name = action.payload.folderName
                        nodes[i].path = nodes[i].path.includes('/') ? `${nodes[i].path.split('/').slice(0, -1).join('/')}/${action.payload.folderName}` : action.payload.folderName
                        ;(async () => {
                            const resp = await axios.post(`${process.env.NEXT_PUBLIC_PROJECTS_SERVER}/api/projects/new-folder`, {
                                projectToken: projectToken,
                                userSessionToken: userSessionToken,
                                path: stripReposPath(nodes[i].path)
                            })
                            console.log(resp)
                            if (resp.status === 200) {
                                return true
                            } else {
                                return false
                            }
                        })()

                        return true
                    }
                    if (nodes[i].children && setFolderAsNotNew(nodes[i].children!, userSessionToken, projectToken)) {
                        return true
                    }
                }
                return false
            }
            if (!setFolderAsNotNew(state.fileTree, action.payload.userSessionToken, action.payload.projectToken)) {
                // If the file wasn't found in the tree, it might be a root file
                const rootFile = state.fileTree.find(node => node.uuid === fileId)
                if (rootFile) {
                    rootFile.isNew = false
                    rootFile.name = action.payload.folderName
                    rootFile.path = action.payload.folderName
                }
            }
        },
        createFile: (state, action: PayloadAction<{ filePath: string; fileName: string }>) => {
            const { filePath, fileName } = action.payload
            const newFile: FileNode = {
                uuid: uuidv4(),
                name: fileName,
                path: filePath ? `${filePath}/${fileName}` : fileName,
                is_dir: false,
                isNew: true
            }

            if (!filePath) {
                state.fileTree.push(newFile)
            } else {
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
            }
        },
        addFile: (state, action: PayloadAction<{ fileId: string; filename: string; userSessionToken: string; projectToken: string }>) => {
            const fileId = action.payload.fileId

            const setFileAsNotNew = (nodes: FileNode[], userSessionToken: string, projectToken: string): boolean => {
                for (let i = 0; i < nodes.length; i++) {
                    if (nodes[i].uuid === fileId) {
                        nodes[i].isNew = false
                        nodes[i].name = action.payload.filename
                        nodes[i].path = nodes[i].path.includes('/') ? `${nodes[i].path.split('/').slice(0, -1).join('/')}/${action.payload.filename}` : action.payload.filename
                        ;(async () => {
                            const resp = await axios.post(`${process.env.NEXT_PUBLIC_PROJECTS_SERVER}/api/projects/new-file`, {
                                projectToken: projectToken,
                                userSessionToken: userSessionToken,
                                path: stripReposPath(nodes[i].path)
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

            if (!setFileAsNotNew(state.fileTree, action.payload.userSessionToken, action.payload.projectToken)) {
                // If the file wasn't found in the tree, it might be a root file
                const rootFile = state.fileTree.find(node => node.uuid === fileId)
                if (rootFile) {
                    rootFile.isNew = false
                    rootFile.name = action.payload.filename
                    rootFile.path = action.payload.filename
                }
            }
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

export const { setFileTree, setIsLoading, createFolder, addFolder, createFile, deleteFile, addFile } = fileSlice.actions
export default fileSlice.reducer
