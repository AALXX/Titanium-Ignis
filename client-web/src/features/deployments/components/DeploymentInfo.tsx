'use client'
import type React from 'react'
import { useEffect, useState, useRef } from 'react'
import { ArrowLeft, Play, Square, RotateCcw, Trash2, ExternalLink, Copy, CheckCircle, XCircle, Clock, AlertCircle, Activity, Server, Globe, Settings, Terminal, BarChart3, Eye, EyeOff, Database, HardDrive, Zap, Code, Monitor, Pause, RefreshCw, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { io, type Socket } from 'socket.io-client'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from 'recharts'
import axios from 'axios'
import { eDeploymentStatus } from '@/features/code-enviroment/rightPanel/types/RightPanelTypes'
import { Network, TrendingUp } from 'lucide-react'

interface DeploymentDetails {
    id: string
    name: string
    status: eDeploymentStatus
    url?: string
    domain?: string
    type: 'app' | 'linux' | 'database' | 'volume' | 'static' | 'serverless' | 'service'
    createdat: string
    updatedAt: string
    buildTime?: number
    lastDeployment?: string
    framework?: string
    datacenterlocation: string
    deploymenttoken: string
    cpu: number
    memory: number
    storage: number
    environmentVariables: { key: string; value: string; hidden?: boolean }[]
    buildLogs: { timestamp: string; message: string; level: 'info' | 'error' | 'warning' }[]
    runtimeLogs: { timestamp: string; message: string; level: 'info' | 'error' | 'warning' }[]
    metrics: {
        cpu: { timestamp: string; value: number }[]
        memory: { timestamp: string; value: number }[]
        requests: { timestamp: string; value: number }[]
        responseTime: { timestamp: string; value: number }[]
        connections?: { timestamp: string; value: number }[]
        queries?: { timestamp: string; value: number }[]
        diskUsage?: { timestamp: string; value: number }[]
        bandwidth?: { timestamp: string; value: number }[]
    }
    buildInfo?: {
        commit?: string
        branch?: string
        author?: string
        message?: string
    }
    databaseInfo?: {
        engine: string
        version: string
        port: number
        connectionString?: string
    }
    volumeInfo?: {
        mountPath: string
        filesystem: string
        backupEnabled: boolean
    }
    serverlessInfo?: {
        runtime: string
        timeout: number
        memoryLimit: number
        invocations: number
    }
}

interface ProjectDetails {
    projectname: string
    projectdescription: string
}

interface DeploymentInfoClientProps {
    deployment: DeploymentDetails
    project: ProjectDetails
    projectToken: string
    userSessionToken: string
}

interface LogEntry {
    id: string
    timestamp: string
    message: string
    level: 'info' | 'error' | 'warning'
}

interface MetricsStreamData {
    cpu: number
    memory: number
    memoryMB: number
    networkRxMB: number
    networkTxMB: number
    timestamp: string
}

interface CurrentMetricsData {
    cpu: { usage: number; cores: number }
    memory: { usage: number; limit: number; percent: number; usageMB: number; limitMB: number }
    network: { rxBytes: number; txBytes: number; rxMB: number; txMB: number }
    blockIO: { readBytes: number; writeBytes: number; readMB: number; writeMB: number }
    pids: number
    status: string
    running: boolean
}

const DeploymentInfoClient: React.FC<DeploymentInfoClientProps> = ({ deployment: initialDeployment, project: initialProject, projectToken, userSessionToken }) => {
    const router = useRouter()
    const [project, setProject] = useState<ProjectDetails>(initialProject)
    const [deployment, setDeployment] = useState<DeploymentDetails>(initialDeployment)
    const [socket, setSocket] = useState<Socket | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('overview')
    const [showEnvValues, setShowEnvValues] = useState<{ [key: string]: boolean }>({})

    // Logs state
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [isStreamingLogs, setIsStreamingLogs] = useState(false)
    const [logOptions, setLogOptions] = useState({ tail: 100, timestamps: true })
    const logsEndRef = useRef<HTMLDivElement>(null)
    const logsContainerRef = useRef<HTMLDivElement>(null)
    const [autoScroll, setAutoScroll] = useState(true)

    // Metrics state
    const [metricsData, setMetricsData] = useState<{
        cpu: { timestamp: string; value: number }[]
        memory: { timestamp: string; value: number }[]
        networkRx: { timestamp: string; value: number }[]
        networkTx: { timestamp: string; value: number }[]
    }>({
        cpu: [],
        memory: [],
        networkRx: [],
        networkTx: []
    })
    const [currentMetrics, setCurrentMetrics] = useState<CurrentMetricsData | null>(null)
    const [isStreamingMetrics, setIsStreamingMetrics] = useState(false)
    const [metricsInterval, setMetricsInterval] = useState(2000)

    useEffect(() => {
        const deploymentSocket = io(`${process.env.NEXT_PUBLIC_DEPLOYMENTS_SERVER}`, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        })

        deploymentSocket.on('connect', () => {
            console.log('Connected to deployment server')
        })

        // Existing socket listeners
        deploymentSocket.on('deployment-status-update', (data: { status: string }) => {
            setDeployment(prev => ({ ...prev, status: data.status as any }))
        })

        deploymentSocket.on('deployment-event', (data: { deploymentToken: string; currentState: eDeploymentStatus }) => {
            if (data.deploymentToken !== deployment.deploymenttoken) return
            setDeployment(prev => ({ ...prev, status: data.currentState }))
        })

        // Logs listeners
        deploymentSocket.on('deployment-logs', (data: { deploymentToken: string; logs: string; containerID: string; containerStatus: string; timestamp: string }) => {
            if (data.deploymentToken === deployment.deploymenttoken) {
                const logLines = data.logs.split('\n').filter(line => line.trim())
                const parsedLogs: LogEntry[] = logLines.map((line, i) => ({
                    id: `log-${Date.now()}-${i}`,
                    timestamp: data.timestamp,
                    message: line,
                    level: line.toLowerCase().includes('error') ? 'error' : line.toLowerCase().includes('warn') ? 'warning' : 'info'
                }))
                setLogs(parsedLogs)
            }
        })

        deploymentSocket.on('deployment-logs-stream', (data: { deploymentToken: string; log: string; timestamp: string }) => {
            if (data.deploymentToken === deployment.deploymenttoken) {
                const newLog: LogEntry = {
                    id: `log-${Date.now()}-${Math.random()}`,
                    timestamp: data.timestamp,
                    message: data.log.trim(),
                    level: data.log.toLowerCase().includes('error') ? 'error' : data.log.toLowerCase().includes('warn') ? 'warning' : 'info'
                }
                setLogs(prev => [...prev, newLog].slice(-500)) // Keep last 500 logs
            }
        })

        deploymentSocket.on('deployment-logs-stream-end', (data: { deploymentToken: string }) => {
            if (data.deploymentToken === deployment.deploymenttoken) {
                setIsStreamingLogs(false)
            }
        })

        deploymentSocket.on('logs-stream-stopped', () => {
            setIsStreamingLogs(false)
        })

        deploymentSocket.on('get-logs-error', (data: { error: boolean; errmsg: string }) => {
            console.error('Logs error:', data.errmsg)
            setIsStreamingLogs(false)
        })

        // Metrics listeners
        deploymentSocket.on('deployment-metrics', (data: any) => {
            if (data.deploymentToken === deployment.deploymenttoken) {
                setCurrentMetrics(data)
            }
        })

        deploymentSocket.on('deployment-metrics-stream', (data: MetricsStreamData & { deploymentToken: string }) => {
            if (data.deploymentToken === deployment.deploymenttoken) {
                const timestamp = new Date(data.timestamp).toLocaleTimeString()

                setMetricsData(prev => ({
                    cpu: [...prev.cpu, { timestamp, value: data.cpu }].slice(-30),
                    memory: [...prev.memory, { timestamp, value: data.memory }].slice(-30),
                    networkRx: [...prev.networkRx, { timestamp, value: data.networkRxMB }].slice(-30),
                    networkTx: [...prev.networkTx, { timestamp, value: data.networkTxMB }].slice(-30)
                }))

                // Also update current metrics display
                setCurrentMetrics(prev =>
                    prev
                        ? {
                              ...prev,
                              cpu: { usage: data.cpu, cores: prev.cpu.cores },
                              memory: { ...prev.memory, percent: data.memory, usageMB: data.memoryMB }
                          }
                        : null
                )
            }
        })

        deploymentSocket.on('metrics-stream-stopped', () => {
            setIsStreamingMetrics(false)
        })

        deploymentSocket.on('get-metrics-error', (data: { error: boolean; errmsg: string }) => {
            console.error('Metrics error:', data.errmsg)
            setIsStreamingMetrics(false)
        })

        deploymentSocket.on('stream-metrics-error', (data: { error: boolean; errmsg: string }) => {
            console.error('Metrics stream error:', data.errmsg)
            setIsStreamingMetrics(false)
        })

        deploymentSocket.emit('join-project', { projectToken })
        setSocket(deploymentSocket)

        return () => {
            if (isStreamingLogs) {
                deploymentSocket.emit('stop-logs-stream')
            }
            if (isStreamingMetrics) {
                deploymentSocket.emit('stop-metrics-stream')
            }
            deploymentSocket.disconnect()
        }
    }, [deployment.deploymenttoken, projectToken])

    // Auto-scroll logs
    useEffect(() => {
        if (autoScroll && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [logs, autoScroll])

    // Handle manual scroll
    const handleLogsScroll = () => {
        if (!logsContainerRef.current) return
        const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
        setAutoScroll(isAtBottom)
    }

    // Logs functions
    const fetchLogs = () => {
        if (!socket) return
        setLogs([])
        socket.emit('get-deployment-logs', {
            projectToken,
            deploymentToken: deployment.deploymenttoken,
            options: logOptions
        })
    }

    const startLogsStream = () => {
        if (!socket) return
        setIsStreamingLogs(true)
        setLogs([])
        socket.emit('stream-deployment-logs', {
            projectToken,
            deploymentToken: deployment.deploymenttoken,
            options: { ...logOptions, follow: true }
        })
    }

    const stopLogsStream = () => {
        if (!socket) return
        socket.emit('stop-logs-stream')
        setIsStreamingLogs(false)
    }

    const clearLogs = () => {
        setLogs([])
    }

    const downloadLogs = () => {
        const logText = logs.map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`).join('\n')

        const blob = new Blob([logText], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${deployment.name}-logs-${new Date().toISOString()}.txt`
        a.click()
        URL.revokeObjectURL(url)
    }

    // Metrics functions
    const fetchMetrics = () => {
        if (!socket) return
        socket.emit('get-deployment-metrics', {
            projectToken,
            deploymentToken: deployment.deploymenttoken
        })
    }

    const startMetricsStream = () => {
        if (!socket) return
        setIsStreamingMetrics(true)
        setMetricsData({ cpu: [], memory: [], networkRx: [], networkTx: [] })
        socket.emit('stream-deployment-metrics', {
            projectToken,
            deploymentToken: deployment.deploymenttoken,
            interval: metricsInterval
        })
    }

    const stopMetricsStream = () => {
        if (!socket) return
        socket.emit('stop-metrics-stream')
        setIsStreamingMetrics(false)
    }

    const getTypeConfig = (type: string) => {
        const configs = {
            app: {
                icon: Code,
                label: 'Application',
                color: 'bg-blue-500',
                showFramework: true,
                showBuild: true,
                showDomains: true,
                showMetrics: ['cpu', 'memory', 'requests', 'responseTime'],
                tabs: ['overview', 'logs', 'metrics', 'environment', 'build', 'domains']
            },
            linux: {
                icon: Monitor,
                label: 'Linux VM',
                color: 'bg-orange-500',
                showFramework: false,
                showBuild: false,
                showDomains: false,
                showMetrics: ['cpu', 'memory'],
                tabs: ['overview', 'logs', 'metrics', 'environment']
            },
            database: {
                icon: Database,
                label: 'Database',
                color: 'bg-green-500',
                showFramework: false,
                showBuild: false,
                showDomains: false,
                showMetrics: ['cpu', 'memory', 'connections', 'queries'],
                tabs: ['overview', 'logs', 'metrics', 'environment', 'database']
            },
            volume: {
                icon: HardDrive,
                label: 'Data Volume',
                color: 'bg-purple-500',
                showFramework: false,
                showBuild: false,
                showDomains: false,
                showMetrics: ['diskUsage'],
                tabs: ['overview', 'metrics', 'volume']
            },
            static: {
                icon: Globe,
                label: 'Static Site',
                color: 'bg-cyan-500',
                showFramework: true,
                showBuild: true,
                showDomains: true,
                showMetrics: ['bandwidth', 'requests'],
                tabs: ['overview', 'metrics', 'build', 'domains']
            },
            serverless: {
                icon: Zap,
                label: 'Serverless Function',
                color: 'bg-yellow-500',
                showFramework: true,
                showBuild: true,
                showDomains: false,
                showMetrics: ['memory', 'responseTime'],
                tabs: ['overview', 'logs', 'metrics', 'environment', 'build', 'serverless']
            },
            service: {
                icon: Server,
                label: 'Project Service',
                color: 'bg-indigo-500',
                showFramework: false,
                showBuild: false,
                showDomains: true,
                showMetrics: ['cpu', 'memory'],
                tabs: ['overview', 'logs', 'metrics', 'environment', 'domains']
            }
        }
        return configs[type as keyof typeof configs] || configs.app
    }

    const typeConfig = getTypeConfig(deployment.type)

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'deployed':
            case 'running':
                return 'bg-green-500'
            case 'building':
            case 'pending':
                return 'bg-yellow-500'
            case 'failed':
                return 'bg-red-500'
            case 'stopped':
                return 'bg-gray-500'
            default:
                return 'bg-blue-500'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'deployed':
            case 'running':
                return <CheckCircle className="h-4 w-4" />
            case 'building':
            case 'pending':
                return <Clock className="h-4 w-4" />
            case 'failed':
                return <XCircle className="h-4 w-4" />
            case 'stopped':
                return <Square className="h-4 w-4" />
            default:
                return <AlertCircle className="h-4 w-4" />
        }
    }

    const handleAction = async (action: string) => {
        setIsLoading(true)
        try {
            switch (action) {
                case 'start':
                    socket?.emit('start-deployment', {
                        projectToken,
                        userSessionToken,
                        deploymentToken: deployment.deploymenttoken
                    })
                    break
                case 'stop':
                    socket?.emit('stop-deployment', {
                        projectToken,
                        deploymentToken: deployment.deploymenttoken
                    })
                    break
                case 'delete':
                    if (confirm('Are you sure you want to delete this deployment?')) {
                        socket?.emit('delete-deployment', {
                            projectToken,
                            deploymentToken: deployment.deploymenttoken
                        })
                        setTimeout(() => router.back(), 1000)
                    }
                    break
            }
        } catch (error) {
            console.error('Action failed:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
    }

    const toggleEnvValue = (key: string) => {
        setShowEnvValues(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString()
    }

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const getLogLevelColor = (level: string) => {
        switch (level) {
            case 'error':
                return 'text-red-400'
            case 'warning':
                return 'text-yellow-400'
            default:
                return 'text-zinc-300'
        }
    }

    const getAvailableTabs = () => {
        const allTabs = [
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'logs', label: 'Logs', icon: Terminal },
            { id: 'metrics', label: 'Metrics', icon: BarChart3 },
            { id: 'environment', label: 'Environment', icon: Settings },
            { id: 'build', label: 'Build', icon: Server },
            { id: 'domains', label: 'Domains', icon: Globe },
            { id: 'database', label: 'Database', icon: Database },
            { id: 'volume', label: 'Volume', icon: HardDrive },
            { id: 'serverless', label: 'Function', icon: Zap }
        ]

        return allTabs.filter(tab => typeConfig.tabs.includes(tab.id))
    }

    const TypeIcon = typeConfig.icon

    return (
        <div className="h-full text-white overflow-y-auto">
            <div className="border-b border-white px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white">
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </button>
                        <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${typeConfig.color}`}>
                                <TypeIcon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl font-bold">{deployment.name}</h1>
                                    <span className="rounded bg-zinc-800 px-2 py-1 text-sm text-zinc-400">{typeConfig.label}</span>
                                </div>
                                <p className="text-sm text-zinc-400">Created {formatTimestamp(deployment.createdat)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm text-white ${getStatusColor(deployment.status)}`}>
                            {getStatusIcon(deployment.status)}
                            <span className="capitalize">{deployment.status}</span>
                        </div>

                        <div className="flex gap-2">
                            {deployment.status === eDeploymentStatus.DEPLOYED && deployment.type !== 'volume' && (
                                <button onClick={() => handleAction('stop')} disabled={isLoading} className="flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-sm transition-colors hover:bg-zinc-800 disabled:opacity-50">
                                    <Square className="h-4 w-4" />
                                    Stop
                                </button>
                            )}

                            {deployment.status === eDeploymentStatus.STOPPED && deployment.type !== 'volume' && (
                                <button onClick={() => handleAction('start')} disabled={isLoading} className="flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-sm transition-colors hover:bg-zinc-800 disabled:opacity-50">
                                    <Play className="h-4 w-4" />
                                    Start
                                </button>
                            )}

                            <button onClick={() => handleAction('delete')} disabled={isLoading} className="flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm transition-colors hover:bg-red-700 disabled:opacity-50">
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {/* Tabs */}
                <div className="mb-6">
                    <div className="flex space-x-1 rounded-xl bg-zinc-900 p-1">
                        {getAvailableTabs().map(tab => {
                            const Icon = tab.icon
                            return (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'}`}>
                                    <Icon className="h-4 w-4" />
                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="space-y-6 lg:col-span-2">
                            <div className="rounded-lg bg-[#0000005b] p-6">
                                <h3 className="mb-4 text-lg font-semibold">Deployment Information</h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-zinc-400">Status</p>
                                            <div className="mt-1 flex items-center gap-2">
                                                {getStatusIcon(deployment.status)}
                                                <span className="capitalize">{deployment.status}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm text-zinc-400">Type</p>
                                            <p className="mt-1">{typeConfig.label}</p>
                                        </div>
                                        {typeConfig.showFramework && deployment.framework && (
                                            <div>
                                                <p className="text-sm text-zinc-400">Framework</p>
                                                <p className="mt-1">{deployment.framework}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm text-zinc-400">Region</p>
                                            <p className="mt-1">{deployment.datacenterlocation}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <div className="space-y-6">
                            <div className="rounded-lg bg-[#0000005b] p-6">
                                <h3 className="mb-4 text-lg font-semibold">Quick Actions</h3>
                                <div className="space-y-3">
                                    {typeConfig.tabs.includes('logs') && (
                                        <button onClick={() => setActiveTab('logs')} className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-700 px-4 py-2 transition-colors hover:bg-zinc-800">
                                            <Terminal className="h-4 w-4" />
                                            View Logs
                                        </button>
                                    )}
                                    {typeConfig.tabs.includes('metrics') && (
                                        <button onClick={() => setActiveTab('metrics')} className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-700 px-4 py-2 transition-colors hover:bg-zinc-800">
                                            <BarChart3 className="h-4 w-4" />
                                            View Metrics
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Logs Tab */}
                {activeTab === 'logs' && typeConfig.tabs.includes('logs') && (
                    <div className="space-y-4">
                        {/* Controls */}
                        <div className="rounded-lg bg-zinc-900 p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-zinc-400">Tail:</label>
                                        <select value={logOptions.tail} onChange={e => setLogOptions(prev => ({ ...prev, tail: Number(e.target.value) }))} className="rounded bg-zinc-800 px-3 py-1 text-sm" disabled={isStreamingLogs}>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                            <option value={500}>500</option>
                                            <option value={1000}>1000</option>
                                        </select>
                                    </div>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={logOptions.timestamps} onChange={e => setLogOptions(prev => ({ ...prev, timestamps: e.target.checked }))} disabled={isStreamingLogs} className="rounded" />
                                        <span className="text-zinc-400">Timestamps</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} className="rounded" />
                                        <span className="text-zinc-400">Auto-scroll</span>
                                    </label>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={fetchLogs} disabled={isStreamingLogs} className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50">
                                        <RefreshCw className="h-4 w-4" />
                                        Fetch
                                    </button>
                                    {!isStreamingLogs ? (
                                        <button onClick={startLogsStream} className="flex items-center gap-2 rounded-md bg-green-600 px-3 py-1.5 text-sm hover:bg-green-700">
                                            <Play className="h-4 w-4" />
                                            Stream
                                        </button>
                                    ) : (
                                        <button onClick={stopLogsStream} className="flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm hover:bg-red-700">
                                            <Pause className="h-4 w-4" />
                                            Stop
                                        </button>
                                    )}
                                    <button onClick={downloadLogs} disabled={logs.length === 0} className="flex items-center gap-2 rounded-md bg-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-600 disabled:opacity-50">
                                        <Download className="h-4 w-4" />
                                        Download
                                    </button>
                                    <button onClick={clearLogs} className="flex items-center gap-2 rounded-md bg-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-600">
                                        Clear
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Logs Display */}
                        <div className="rounded-lg bg-zinc-900 p-4">
                            <div className="mb-2 flex items-center justify-between">
                                <h3 className="text-sm font-medium text-zinc-400">
                                    Logs ({logs.length})
                                    {isStreamingLogs && (
                                        <span className="ml-2 inline-flex items-center gap-1 text-green-400">
                                            <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                                            Streaming
                                        </span>
                                    )}
                                </h3>
                            </div>
                            <div ref={logsContainerRef} onScroll={handleLogsScroll} className="h-[500px] overflow-auto rounded-lg bg-zinc-950 p-4 font-mono text-sm">
                                {logs.length === 0 ? (
                                    <div className="flex h-full items-center justify-center text-zinc-500">No logs available. Click "Fetch" or "Stream" to load logs.</div>
                                ) : (
                                    <div className="space-y-1">
                                        {logs.map(log => (
                                            <div key={log.id} className="font-mono text-sm">
                                                {logOptions.timestamps && <span className="text-zinc-500">[{new Date(log.timestamp).toLocaleTimeString()}] </span>}
                                                <span className={getLogLevelColor(log.level)}>{log.message}</span>
                                            </div>
                                        ))}
                                        <div ref={logsEndRef} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'metrics' && typeConfig.tabs.includes('metrics') && (
                    <div className="space-y-6">
                        <div className="rounded-lg bg-zinc-900 p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-zinc-400">Update Interval:</label>
                                        <select value={metricsInterval} onChange={e => setMetricsInterval(Number(e.target.value))} className="rounded bg-zinc-800 px-3 py-1 text-sm" disabled={isStreamingMetrics}>
                                            <option value={1000}>1s</option>
                                            <option value={2000}>2s</option>
                                            <option value={5000}>5s</option>
                                            <option value={10000}>10s</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={fetchMetrics} disabled={isStreamingMetrics} className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50">
                                        <RefreshCw className="h-4 w-4" />
                                        Fetch
                                    </button>
                                    {!isStreamingMetrics ? (
                                        <button onClick={startMetricsStream} className="flex items-center gap-2 rounded-md bg-green-600 px-3 py-1.5 text-sm hover:bg-green-700">
                                            <Play className="h-4 w-4" />
                                            Stream
                                        </button>
                                    ) : (
                                        <button onClick={stopMetricsStream} className="flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm hover:bg-red-700">
                                            <Pause className="h-4 w-4" />
                                            Stop
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Current Metrics Summary */}
                        {currentMetrics && (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <div className="rounded-lg bg-zinc-900 p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-zinc-400">CPU Usage</p>
                                            <p className="text-2xl font-bold">{currentMetrics.cpu.usage.toFixed(1)}%</p>
                                            <p className="text-xs text-zinc-500">{currentMetrics.cpu.cores} cores</p>
                                        </div>
                                        <Activity className="h-8 w-8 text-blue-500" />
                                    </div>
                                </div>
                                <div className="rounded-lg bg-zinc-900 p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-zinc-400">Memory Usage</p>
                                            <p className="text-2xl font-bold">{currentMetrics.memory.percent.toFixed(1)}%</p>
                                            <p className="text-xs text-zinc-500">
                                                {currentMetrics.memory.usageMB.toFixed(0)} / {currentMetrics.memory.limitMB.toFixed(0)} MB
                                            </p>
                                        </div>
                                        <Database className="h-8 w-8 text-green-500" />
                                    </div>
                                </div>
                                <div className="rounded-lg bg-zinc-900 p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-zinc-400">Network RX</p>
                                            <p className="text-2xl font-bold">{currentMetrics.network.rxMB.toFixed(2)} MB</p>
                                            <p className="text-xs text-zinc-500">Received</p>
                                        </div>
                                        <ArrowLeft className="h-8 w-8 text-purple-500" />
                                    </div>
                                </div>
                                <div className="rounded-lg bg-zinc-900 p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-zinc-400">Network TX</p>
                                            <p className="text-2xl font-bold">{currentMetrics.network.txMB.toFixed(2)} MB</p>
                                            <p className="text-xs text-zinc-500">Transmitted</p>
                                        </div>
                                        <ArrowLeft className="h-8 w-8 rotate-180 text-orange-500" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Metrics Charts */}
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* CPU Usage Chart */}
                            {typeConfig.showMetrics.includes('cpu') && (
                                <div className="rounded-lg bg-zinc-900 p-6">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h3 className="text-lg font-semibold">CPU Usage</h3>
                                        {isStreamingMetrics && (
                                            <span className="inline-flex items-center gap-1 text-xs text-green-400">
                                                <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                                                Live
                                            </span>
                                        )}
                                    </div>
                                    <div className="h-64">
                                        {metricsData.cpu.length === 0 ? (
                                            <div className="flex h-full items-center justify-center text-zinc-500">No data available. Start streaming metrics.</div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={metricsData.cpu}>
                                                    <XAxis dataKey="timestamp" stroke="#888888" fontSize={12} />
                                                    <YAxis stroke="#888888" fontSize={12} domain={[0, 100]} />
                                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} formatter={(value: number) => [`${value.toFixed(2)}%`, 'CPU']} />
                                                    <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Memory Usage Chart */}
                            {typeConfig.showMetrics.includes('memory') && (
                                <div className="rounded-lg bg-zinc-900 p-6">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h3 className="text-lg font-semibold">Memory Usage</h3>
                                        {isStreamingMetrics && (
                                            <span className="inline-flex items-center gap-1 text-xs text-green-400">
                                                <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                                                Live
                                            </span>
                                        )}
                                    </div>
                                    <div className="h-64">
                                        {metricsData.memory.length === 0 ? (
                                            <div className="flex h-full items-center justify-center text-zinc-500">No data available. Start streaming metrics.</div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={metricsData.memory}>
                                                    <XAxis dataKey="timestamp" stroke="#888888" fontSize={12} />
                                                    <YAxis stroke="#888888" fontSize={12} domain={[0, 100]} />
                                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} formatter={(value: number) => [`${value.toFixed(2)}%`, 'Memory']} />
                                                    <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Network RX Chart */}
                            <div className="rounded-lg bg-zinc-900 p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Network Received</h3>
                                    {isStreamingMetrics && (
                                        <span className="inline-flex items-center gap-1 text-xs text-green-400">
                                            <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                                            Live
                                        </span>
                                    )}
                                </div>
                                <div className="h-64">
                                    {metricsData.networkRx.length === 0 ? (
                                        <div className="flex h-full items-center justify-center text-zinc-500">No data available. Start streaming metrics.</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={metricsData.networkRx}>
                                                <XAxis dataKey="timestamp" stroke="#888888" fontSize={12} />
                                                <YAxis stroke="#888888" fontSize={12} />
                                                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} formatter={(value: number) => [`${value.toFixed(2)} MB`, 'RX']} />
                                                <Line type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={2} dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                            {/* Network TX Chart */}
                            <div className="rounded-lg bg-zinc-900 p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Network Transmitted</h3>
                                    {isStreamingMetrics && (
                                        <span className="inline-flex items-center gap-1 text-xs text-green-400">
                                            <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                                            Live
                                        </span>
                                    )}
                                </div>
                                <div className="h-64">
                                    {metricsData.networkTx.length === 0 ? (
                                        <div className="flex h-full items-center justify-center text-zinc-500">No data available. Start streaming metrics.</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={metricsData.networkTx}>
                                                <XAxis dataKey="timestamp" stroke="#888888" fontSize={12} />
                                                <YAxis stroke="#888888" fontSize={12} />
                                                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} formatter={(value: number) => [`${value.toFixed(2)} MB`, 'TX']} />
                                                <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Block I/O Stats */}
                        {currentMetrics && currentMetrics.blockIO && (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="rounded-lg bg-zinc-900 p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-zinc-400">Disk Read</p>
                                            <p className="text-2xl font-bold">{currentMetrics.blockIO.readMB.toFixed(2)} MB</p>
                                        </div>
                                        <HardDrive className="h-8 w-8 text-cyan-500" />
                                    </div>
                                </div>
                                <div className="rounded-lg bg-zinc-900 p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-zinc-400">Disk Write</p>
                                            <p className="text-2xl font-bold">{currentMetrics.blockIO.writeMB.toFixed(2)} MB</p>
                                        </div>
                                        <HardDrive className="h-8 w-8 text-pink-500" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Environment Tab */}
                {activeTab === 'environment' && typeConfig.tabs.includes('environment') && (
                    <div className="rounded-lg bg-zinc-900 p-6">
                        <h3 className="mb-2 text-lg font-semibold">Environment Variables</h3>
                        <p className="mb-4 text-sm text-zinc-400">Environment variables configured for this deployment</p>
                        <div className="space-y-3">
                            {deployment.environmentVariables.map((env, index) => (
                                <div key={index} className="flex items-center justify-between rounded-lg bg-zinc-800 p-3">
                                    <div className="flex-1">
                                        <p className="font-medium">{env.key}</p>
                                        <p className="font-mono text-sm text-zinc-400">{env.hidden && !showEnvValues[env.key] ? '••••••••' : env.value}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {env.hidden && (
                                            <button onClick={() => toggleEnvValue(env.key)} className="rounded p-2 hover:bg-zinc-700">
                                                {showEnvValues[env.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        )}
                                        <button onClick={() => copyToClipboard(env.value)} className="rounded p-2 hover:bg-zinc-700">
                                            <Copy className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Other tabs remain the same as original... */}
            </div>
        </div>
    )
}

export default DeploymentInfoClient
