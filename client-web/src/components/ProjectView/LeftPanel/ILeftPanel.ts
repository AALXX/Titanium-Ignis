// Define the type for the node
export interface FileNode {
    name: string
    path: string
    is_dir: boolean
    children?: FileNode[] // Optional because files don't have children
}


export interface ILeftPanel {
    ProjectName: string
    ProjectToken: string
    RepoUrl: string
    CheckedOutBy: string
    Status: string
    Type: string
    onFileSelect: (filePath: string) => void    
}
