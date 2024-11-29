const stripReposPath = (fullPath: string): string => {
    const match = fullPath.match(/\.\.\/repos\/[^/]+\/(.+)$/)
    return match ? match[1] : fullPath
}


export { stripReposPath }