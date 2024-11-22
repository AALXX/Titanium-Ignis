export interface IWindow {
    id: string
    title: string
    content: React.ReactNode
    position: { x: number; y: number }
    size: { width: number; height: number }
    isMinimized: boolean
}
