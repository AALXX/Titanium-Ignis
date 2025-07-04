'use client'
import type React from 'react'
import { useEffect, useState } from 'react'
import {
    ArrowLeft,
    Play,
    Square,
    RotateCcw,
    Trash2,
    ExternalLink,
    Copy,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    Activity,
    Server,
    Globe,
    Settings,
    Terminal,
    BarChart3,
    Eye,
    EyeOff,
    Database,
    HardDrive,
    Zap,
    Code,
    Monitor
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { io, type Socket } from 'socket.io-client'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from 'recharts'
import axios from 'axios'
import { eDeploymentStatus } from '@/features/code-enviroment/rightPanel/types/RightPanelTypes'

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
    framework?: string // Optional since services don't have frameworks
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
        connections?: { timestamp: string; value: number }[] // For databases
        queries?: { timestamp: string; value: number }[] // For databases
        diskUsage?: { timestamp: string; value: number }[] // For volumes
        bandwidth?: { timestamp: string; value: number }[] // For static sites
    }
    buildInfo?: {
        commit?: string
        branch?: string
        author?: string
        message?: string
    }
    // Type-specific fields
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

const DeploymentInfoClient: React.FC<DeploymentInfoClientProps> = ({ deployment: initialDeployment, project: initialProject, projectToken, userSessionToken }) => {
    const router = useRouter()
    const [project, setProject] = useState<ProjectDetails>(initialProject)
    const [deployment, setDeployment] = useState<DeploymentDetails>(initialDeployment)
    const [socket, setSocket] = useState<Socket | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('overview')
    const [showEnvValues, setShowEnvValues] = useState<{ [key: string]: boolean }>({})

    useEffect(() => {
        console.log(initialDeployment)
        const deploymentSocket = io(`${process.env.NEXT_PUBLIC_DEPLOYMENTS_SERVER}`, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        })

        deploymentSocket.on('connect', () => {
            console.log('Connected to deployment server')
        })

        deploymentSocket.on('deployment-status-update', (data: { status: string }) => {
            setDeployment(prev => ({ ...prev, status: data.status as any }))
        })

        deploymentSocket.on('new-log', (data: { log: any; type: 'build' | 'runtime' }) => {
            setDeployment(prev => ({
                ...prev,
                buildLogs: data.type === 'build' ? [...prev.buildLogs, data.log] : prev.buildLogs,
                runtimeLogs: data.type === 'runtime' ? [...prev.runtimeLogs, data.log] : prev.runtimeLogs
            }))
        })

        deploymentSocket.on('metrics-update', (data: { metrics: any }) => {
            setDeployment(prev => ({ ...prev, metrics: data.metrics }))
        })

        deploymentSocket.emit('join-project', { projectToken })

        deploymentSocket.on('deployment-event', (data: { deploymentToken: string; currentState: eDeploymentStatus }) => {

            if (data.deploymentToken !== deployment.deploymenttoken) return

            setDeployment(prev => ({ ...prev, status: data.currentState }))
        })

        setSocket(deploymentSocket)

        return () => {
            deploymentSocket.disconnect()
        }
    }, [deployment.id])

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
            case 'running':
                return 'bg-green-500'
            case 'building':
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
            case 'running':
                return <CheckCircle className="h-4 w-4" />
            case 'building':
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
                    socket!.emit('start-deployment', {
                        projectToken: projectToken,
                        userSessionToken: userSessionToken,
                        deploymentToken: deployment.deploymenttoken
                    })
                    break
                case 'stop':
                    await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/stop-deployment`, {
                        deploymentId: deployment.id,
                        projectToken,
                        userSessionToken
                    })
                    break
            }
            // await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/deployment-action`, {
            //     deploymentId: deployment.id,
            //     action,
            //     projectToken,
            //     userSessionToken
            // })
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
        <div className="h-full text-white">
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
                            {deployment.status === 'running' && deployment.type !== 'volume' && (
                                <button
                                    onClick={() => handleAction('stop')}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-sm transition-colors hover:bg-zinc-800 disabled:opacity-50"
                                >
                                    <Square className="h-4 w-4" />
                                    Stop
                                </button>
                            )}

                            {deployment.status === 'stopped' && deployment.type !== 'volume' && (
                                <button
                                    onClick={() => handleAction('start')}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-sm transition-colors hover:bg-zinc-800 disabled:opacity-50"
                                >
                                    <Play className="h-4 w-4" />
                                    Start
                                </button>
                            )}

                            {deployment.type !== 'volume' && (
                                <button
                                    onClick={() => handleAction('restart')}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-sm transition-colors hover:bg-zinc-800 disabled:opacity-50"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    Restart
                                </button>
                            )}

                            <button
                                onClick={() => handleAction('delete')}
                                disabled={isLoading}
                                className="flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm transition-colors hover:bg-red-700 disabled:opacity-50"
                            >
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
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                        activeTab === tab.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="space-y-6 lg:col-span-2">
                            {/* Deployment Information */}
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

                                    {deployment.url && typeConfig.showDomains && (
                                        <div>
                                            <p className="text-sm text-zinc-400">URL</p>
                                            <div className="mt-1 flex items-center gap-2">
                                                <a href={deployment.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
                                                    {deployment.url}
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                                <button onClick={() => copyToClipboard(deployment.url!)} className="rounded p-1 hover:bg-zinc-800">
                                                    <Copy className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Type-specific Information */}
                            {deployment.type === 'database' && deployment.databaseInfo && (
                                <div className="rounded-lg bg-[#0000005b] p-6">
                                    <h3 className="mb-4 text-lg font-semibold">Database Information</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-zinc-400">Engine</p>
                                            <p className="mt-1">{deployment.databaseInfo.engine}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-zinc-400">Version</p>
                                            <p className="mt-1">{deployment.databaseInfo.version}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-zinc-400">Port</p>
                                            <p className="mt-1">{deployment.databaseInfo.port}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {deployment.type === 'serverless' && deployment.serverlessInfo && (
                                <div className="rounded-lg bg-[#0000005b] p-6">
                                    <h3 className="mb-4 text-lg font-semibold">Function Information</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-zinc-400">Runtime</p>
                                            <p className="mt-1">{deployment.serverlessInfo.runtime}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-zinc-400">Timeout</p>
                                            <p className="mt-1">{deployment.serverlessInfo.timeout}s</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-zinc-400">Memory Limit</p>
                                            <p className="mt-1">{deployment.serverlessInfo.memoryLimit}MB</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-zinc-400">Total Invocations</p>
                                            <p className="mt-1">{deployment.serverlessInfo.invocations.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {deployment.type === 'volume' && deployment.volumeInfo && (
                                <div className="rounded-lg bg-[#0000005b] p-6">
                                    <h3 className="mb-4 text-lg font-semibold">Volume Information</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-zinc-400">Mount Path</p>
                                            <p className="mt-1 font-mono text-sm">{deployment.volumeInfo.mountPath}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-zinc-400">Filesystem</p>
                                            <p className="mt-1">{deployment.volumeInfo.filesystem}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-zinc-400">Backup</p>
                                            <p className="mt-1">{deployment.volumeInfo.backupEnabled ? 'Enabled' : 'Disabled'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Resource Usage - Hide for volumes */}
                            {deployment.type !== 'volume' && (
                                <div className="rounded-lg bg-[#0000005b] p-6">
                                    <h3 className="mb-4 text-lg font-semibold">Resource Usage</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        {deployment.type !== 'static' && (
                                            <div className="text-center">
                                                <p className="text-2xl font-bold">{deployment.cpu}</p>
                                                <p className="text-sm text-zinc-400">CPU Cores</p>
                                            </div>
                                        )}
                                        <div className="text-center">
                                            <p className="text-2xl font-bold">{formatBytes(deployment.memory * 1024 * 1024)}</p>
                                            <p className="text-sm text-zinc-400">Memory</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold">{formatBytes(deployment.storage * 1024 * 1024 * 1024)}</p>
                                            <p className="text-sm text-zinc-400">Storage</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            {/* Quick Actions */}
                            <div className="rounded-lg bg-[#0000005b] p-6">
                                <h3 className="mb-4 text-lg font-semibold">Quick Actions</h3>
                                <div className="space-y-3">
                                    {deployment.url && typeConfig.showDomains && (
                                        <a
                                            href={deployment.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-700 px-4 py-2 transition-colors hover:bg-zinc-800"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            Visit Site
                                        </a>
                                    )}
                                    {typeConfig.tabs.includes('logs') && (
                                        <button
                                            onClick={() => setActiveTab('logs')}
                                            className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-700 px-4 py-2 transition-colors hover:bg-zinc-800"
                                        >
                                            <Terminal className="h-4 w-4" />
                                            View Logs
                                        </button>
                                    )}
                                    {typeConfig.tabs.includes('metrics') && (
                                        <button
                                            onClick={() => setActiveTab('metrics')}
                                            className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-700 px-4 py-2 transition-colors hover:bg-zinc-800"
                                        >
                                            <BarChart3 className="h-4 w-4" />
                                            View Metrics
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Build Information - Only for types that support builds */}
                            {typeConfig.showBuild && deployment.buildInfo && (
                                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                                    <h3 className="mb-4 text-lg font-semibold">Build Information</h3>
                                    <div className="space-y-2">
                                        {deployment.buildInfo.commit && (
                                            <div>
                                                <p className="text-sm text-zinc-400">Commit</p>
                                                <p className="font-mono text-sm">{deployment.buildInfo.commit.substring(0, 8)}</p>
                                            </div>
                                        )}
                                        {deployment.buildInfo.branch && (
                                            <div>
                                                <p className="text-sm text-zinc-400">Branch</p>
                                                <p className="text-sm">{deployment.buildInfo.branch}</p>
                                            </div>
                                        )}
                                        {deployment.buildInfo.author && (
                                            <div>
                                                <p className="text-sm text-zinc-400">Author</p>
                                                <p className="text-sm">{deployment.buildInfo.author}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Logs Tab - Only for types that have logs */}
                {activeTab === 'logs' && typeConfig.tabs.includes('logs') && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Build Logs - Only for types that support builds */}
                        {typeConfig.showBuild && (
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                                <h3 className="mb-2 text-lg font-semibold">Build Logs</h3>
                                <p className="mb-4 text-sm text-zinc-400">Logs from the build process</p>
                                <div className="h-96 overflow-auto rounded-lg bg-zinc-950 p-4">
                                    <div className="space-y-2">
                                        {deployment.buildLogs.map((log, index) => (
                                            <div key={index} className="font-mono text-sm">
                                                <span className="text-zinc-500">{formatTimestamp(log.timestamp)}</span>
                                                <span className={`ml-2 ${log.level === 'error' ? 'text-red-400' : log.level === 'warning' ? 'text-yellow-400' : 'text-zinc-300'}`}>{log.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Runtime Logs */}
                        <div className={`rounded-lg border border-zinc-800 bg-zinc-900 p-6 ${!typeConfig.showBuild ? 'lg:col-span-2' : ''}`}>
                            <h3 className="mb-2 text-lg font-semibold">{deployment.type === 'database' ? 'Database Logs' : deployment.type === 'serverless' ? 'Function Logs' : 'Runtime Logs'}</h3>
                            <p className="mb-4 text-sm text-zinc-400">
                                {deployment.type === 'database' ? 'Database activity logs' : deployment.type === 'serverless' ? 'Function execution logs' : 'Live application logs'}
                            </p>
                            <div className="h-96 overflow-auto rounded-lg bg-zinc-950 p-4">
                                <div className="space-y-2">
                                    {deployment.runtimeLogs.map((log, index) => (
                                        <div key={index} className="font-mono text-sm">
                                            <span className="text-zinc-500">{formatTimestamp(log.timestamp)}</span>
                                            <span className={`ml-2 ${log.level === 'error' ? 'text-red-400' : log.level === 'warning' ? 'text-yellow-400' : 'text-zinc-300'}`}>{log.message}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Metrics Tab - Customized per type */}
                {activeTab === 'metrics' && typeConfig.tabs.includes('metrics') && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* CPU Usage - Not for static sites or volumes */}
                        {typeConfig.showMetrics.includes('cpu') && (
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                                <h3 className="mb-4 text-lg font-semibold">CPU Usage</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={deployment.metrics.cpu}>
                                            <XAxis dataKey="timestamp" stroke="#888888" fontSize={12} />
                                            <YAxis stroke="#888888" fontSize={12} />
                                            <Tooltip />
                                            <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Memory Usage */}
                        {typeConfig.showMetrics.includes('memory') && (
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                                <h3 className="mb-4 text-lg font-semibold">Memory Usage</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={deployment.metrics.memory}>
                                            <XAxis dataKey="timestamp" stroke="#888888" fontSize={12} />
                                            <YAxis stroke="#888888" fontSize={12} />
                                            <Tooltip />
                                            <Area type="monotone" dataKey="value" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Database-specific metrics */}
                        {typeConfig.showMetrics.includes('connections') && deployment.metrics.connections && (
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                                <h3 className="mb-4 text-lg font-semibold">Active Connections</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={deployment.metrics.connections}>
                                            <XAxis dataKey="timestamp" stroke="#888888" fontSize={12} />
                                            <YAxis stroke="#888888" fontSize={12} />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="value" stroke="#ff7300" strokeWidth={2} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {typeConfig.showMetrics.includes('queries') && deployment.metrics.queries && (
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                                <h3 className="mb-4 text-lg font-semibold">Queries per Minute</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={deployment.metrics.queries}>
                                            <XAxis dataKey="timestamp" stroke="#888888" fontSize={12} />
                                            <YAxis stroke="#888888" fontSize={12} />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Volume-specific metrics */}
                        {typeConfig.showMetrics.includes('diskUsage') && deployment.metrics.diskUsage && (
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 lg:col-span-2">
                                <h3 className="mb-4 text-lg font-semibold">Disk Usage</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={deployment.metrics.diskUsage}>
                                            <XAxis dataKey="timestamp" stroke="#888888" fontSize={12} />
                                            <YAxis stroke="#888888" fontSize={12} />
                                            <Tooltip />
                                            <Area type="monotone" dataKey="value" stroke="#ff7300" fill="#ff7300" fillOpacity={0.3} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Static site metrics */}
                        {typeConfig.showMetrics.includes('bandwidth') && deployment.metrics.bandwidth && (
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                                <h3 className="mb-4 text-lg font-semibold">Bandwidth Usage</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={deployment.metrics.bandwidth}>
                                            <XAxis dataKey="timestamp" stroke="#888888" fontSize={12} />
                                            <YAxis stroke="#888888" fontSize={12} />
                                            <Tooltip />
                                            <Area type="monotone" dataKey="value" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Standard web metrics */}
                        {typeConfig.showMetrics.includes('requests') && (
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                                <h3 className="mb-4 text-lg font-semibold">Requests per Minute</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={deployment.metrics.requests}>
                                            <XAxis dataKey="timestamp" stroke="#888888" fontSize={12} />
                                            <YAxis stroke="#888888" fontSize={12} />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="value" stroke="#ffc658" strokeWidth={2} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {typeConfig.showMetrics.includes('responseTime') && (
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                                <h3 className="mb-4 text-lg font-semibold">Response Time</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={deployment.metrics.responseTime}>
                                            <XAxis dataKey="timestamp" stroke="#888888" fontSize={12} />
                                            <YAxis stroke="#888888" fontSize={12} />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="value" stroke="#ff7300" strokeWidth={2} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Environment Tab - For types that support environment variables */}
                {activeTab === 'environment' && typeConfig.tabs.includes('environment') && (
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
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

                {/* Build Tab - Only for types that support builds */}
                {activeTab === 'build' && typeConfig.showBuild && (
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                        <h3 className="mb-4 text-lg font-semibold">Build Details</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-zinc-400">Build Time</p>
                                    <p className="mt-1">{deployment.buildTime ? `${deployment.buildTime}s` : 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-zinc-400">Last Deployment</p>
                                    <p className="mt-1">{deployment.lastDeployment ? formatTimestamp(deployment.lastDeployment) : 'N/A'}</p>
                                </div>
                            </div>

                            {deployment.buildInfo && (
                                <>
                                    <div className="border-t border-zinc-700 pt-4">
                                        <h4 className="mb-3 font-medium">Git Information</h4>
                                        <div className="space-y-3">
                                            {deployment.buildInfo.commit && (
                                                <div>
                                                    <p className="text-sm text-zinc-400">Commit Hash</p>
                                                    <p className="mt-1 font-mono text-sm">{deployment.buildInfo.commit}</p>
                                                </div>
                                            )}
                                            {deployment.buildInfo.message && (
                                                <div>
                                                    <p className="text-sm text-zinc-400">Commit Message</p>
                                                    <p className="mt-1 text-sm">{deployment.buildInfo.message}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Domains Tab - Only for types that support domains */}
                {activeTab === 'domains' && typeConfig.showDomains && (
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                        <h3 className="mb-2 text-lg font-semibold">Domains & URLs</h3>
                        <p className="mb-4 text-sm text-zinc-400">Domains and URLs associated with this deployment</p>
                        <div className="space-y-3">
                            {deployment.url && (
                                <div className="flex items-center justify-between rounded-lg bg-zinc-800 p-3">
                                    <div>
                                        <p className="font-medium">Primary URL</p>
                                        <a href={deployment.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300">
                                            {deployment.url}
                                        </a>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => copyToClipboard(deployment.url!)} className="rounded p-2 hover:bg-zinc-700">
                                            <Copy className="h-4 w-4" />
                                        </button>
                                        <a href={deployment.url} target="_blank" rel="noopener noreferrer" className="rounded p-2 hover:bg-zinc-700">
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    </div>
                                </div>
                            )}

                            {deployment.domain && (
                                <div className="flex items-center justify-between rounded-lg bg-zinc-800 p-3">
                                    <div>
                                        <p className="font-medium">Custom Domain</p>
                                        <p className="text-sm text-zinc-400">{deployment.domain}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => copyToClipboard(deployment.domain!)} className="rounded p-2 hover:bg-zinc-700">
                                            <Copy className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Database-specific tab */}
                {activeTab === 'database' && deployment.type === 'database' && deployment.databaseInfo && (
                    <div className="space-y-6">
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                            <h3 className="mb-4 text-lg font-semibold">Database Configuration</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-zinc-400">Engine</p>
                                    <p className="mt-1 font-medium">{deployment.databaseInfo.engine}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-zinc-400">Version</p>
                                    <p className="mt-1">{deployment.databaseInfo.version}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-zinc-400">Port</p>
                                    <p className="mt-1 font-mono">{deployment.databaseInfo.port}</p>
                                </div>
                                {deployment.databaseInfo.connectionString && (
                                    <div className="col-span-2">
                                        <p className="text-sm text-zinc-400">Connection String</p>
                                        <div className="mt-1 flex items-center gap-2">
                                            <p className="flex-1 rounded bg-zinc-800 p-2 font-mono text-sm">
                                                {showEnvValues['connection'] ? deployment.databaseInfo.connectionString : '••••••••••••••••••••••••••••••••'}
                                            </p>
                                            <button onClick={() => toggleEnvValue('connection')} className="rounded p-2 hover:bg-zinc-700">
                                                {showEnvValues['connection'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                            <button onClick={() => copyToClipboard(deployment.databaseInfo!.connectionString!)} className="rounded p-2 hover:bg-zinc-700">
                                                <Copy className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Volume-specific tab */}
                {activeTab === 'volume' && deployment.type === 'volume' && deployment.volumeInfo && (
                    <div className="space-y-6">
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                            <h3 className="mb-4 text-lg font-semibold">Volume Configuration</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-zinc-400">Mount Path</p>
                                    <p className="mt-1 rounded bg-zinc-800 p-2 font-mono">{deployment.volumeInfo.mountPath}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-zinc-400">Filesystem</p>
                                        <p className="mt-1">{deployment.volumeInfo.filesystem}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-zinc-400">Backup Status</p>
                                        <div className="mt-1 flex items-center gap-2">
                                            <div className={`h-2 w-2 rounded-full ${deployment.volumeInfo.backupEnabled ? 'bg-green-500' : 'bg-red-500'}`} />
                                            <span>{deployment.volumeInfo.backupEnabled ? 'Enabled' : 'Disabled'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-zinc-400">Storage Capacity</p>
                                    <p className="mt-1 text-2xl font-bold">{formatBytes(deployment.storage * 1024 * 1024 * 1024)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Serverless-specific tab */}
                {activeTab === 'serverless' && deployment.type === 'serverless' && deployment.serverlessInfo && (
                    <div className="space-y-6">
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                            <h3 className="mb-4 text-lg font-semibold">Function Configuration</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-zinc-400">Runtime</p>
                                    <p className="mt-1 font-medium">{deployment.serverlessInfo.runtime}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-zinc-400">Timeout</p>
                                    <p className="mt-1">{deployment.serverlessInfo.timeout} seconds</p>
                                </div>
                                <div>
                                    <p className="text-sm text-zinc-400">Memory Limit</p>
                                    <p className="mt-1">{deployment.serverlessInfo.memoryLimit} MB</p>
                                </div>
                                <div>
                                    <p className="text-sm text-zinc-400">Total Invocations</p>
                                    <p className="mt-1 text-2xl font-bold">{deployment.serverlessInfo.invocations.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default DeploymentInfoClient
