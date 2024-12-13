// Define the type for the node
export interface FileNode {
    uuid: string
    name: string
    path: string
    is_dir: boolean
    isNew: boolean
    children?: FileNode[] 
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
