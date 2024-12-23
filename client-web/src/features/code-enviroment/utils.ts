
const stripReposPath = (fullPath: string): string => {
    const match = fullPath.match(/\.\.\/projects\/[^/]+\/(.+)$/)
    return match ? match[1] : fullPath
}

const getLanguageFromFilePath = (path: string): string => {
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
        htm: 'xml',
        json: 'json',
        md: 'markdown',
        sh: 'shellscript',
        yml: 'yaml',
        yaml: 'yaml',
        txt: 'plaintext',
        java: 'java',
        c: 'c',
        cpp: 'cpp',
        cs: 'csharp',
        svg: 'svg',
        
    }

    return languageMap[extension || ''] || 'plaintext'
}

export { stripReposPath, getLanguageFromFilePath }
