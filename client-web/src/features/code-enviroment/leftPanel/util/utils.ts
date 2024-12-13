import { FileNode } from '../ILeftPanel'

const generateUniqueFileName = (fileTree: FileNode[], dirPath: string, baseName: string): string => {
    const findNode = (nodes: FileNode[], path: string): FileNode | undefined => {
        for (const node of nodes) {
            if (node.path === path) return node
            if (node.children) {
                const found = findNode(node.children, path)
                if (found) return found
            }
        }
    }

    const dirNode = findNode(fileTree, dirPath)
    if (!dirNode || !dirNode.children) return baseName

    let counter = 1
    let newName = baseName
    while (dirNode.children.some(child => child.name === newName)) {
        newName = `${baseName} (${counter})`
        counter++
    }
    return newName
}

export { generateUniqueFileName }
