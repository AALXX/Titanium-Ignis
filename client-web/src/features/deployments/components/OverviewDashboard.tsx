'use client'
import { Container, Plus, RadioTower, RefreshCw, Network, Play, Square, Trash2, Download } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import RecentRequests from './RecentRequests'
import axios from 'axios'
import { RecentRequestsProps, RequestTrackingState } from '../types/Requests'
import ServiceCard from './ServiceCard'
import PopupCanvas from '@/components/PopupCanvas'
import CreateDeploymentWizard from './DeploymentWizzard'
import { DeploymentOptions, ServiceCardPropsRequest } from '../types/DeploymentOptions'
import { io, Socket } from 'socket.io-client'
import { LoadingScreen } from '@/components/LoadingScreen'
import { eDeploymentStatus } from '@/features/code-enviroment/rightPanel/types/RightPanelTypes'
import { ProjectService } from '../types/servicedeployment'

const DeploymentsOverView: React.FC<{ projectToken: string; userSessionToken: string; deploymentOptions: DeploymentOptions }> = ({ projectToken, userSessionToken, deploymentOptions }) => {
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
    const [activeTab, setActiveTab] = useState<string>('overview')
    const [requests, setRequests] = useState<RecentRequestsProps[]>([])
    const [totalDeployments, setTotalDeployments] = useState<number>(0)
    const [totalActiveDeployments, setTotalActiveDeployments] = useState<number>(0)
    const [totalRequests, setTotalRequests] = useState<number>(0)
    const [avgResponseTime, setAvgResponseTime] = useState<number>(0)
    const [requestPerHour, setRequestPerHour] = useState<{ name: string; requests: number; responseTime: number }[]>([])
    const [requestPerDay, setRequestPerDay] = useState<{ name: string; requests: number; responseTime: number }[]>([])
    const [requestPerMonth, setRequestPerMonth] = useState<{ name: string; requests: number; responseTime: number }[]>([])
    const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'month'>('hour')

    const [deploymentsSocket, setDeploymentsSocket] = useState<Socket | null>(null)
    const [deployments, setDeployments] = useState<ServiceCardPropsRequest[]>([])
    const [createDeploymentPopup, setCreateDeploymentPopup] = useState<boolean>(false)
    const [services, setServices] = useState<ProjectService[]>([])

    const [requestTracking, setRequestTracking] = useState<RequestTrackingState>({})
    const [selectedDeploymentForTracking, setSelectedDeploymentForTracking] = useState<string | null>(null)
    const [isEnablingTracking, setIsEnablingTracking] = useState<string | null>(null)

    const refreshData = async () => {
        setIsRefreshing(true)
        const requests = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/get-deployments-overview-data/${projectToken}/${userSessionToken}`)
        if (requests.data.error) {
            console.error('Error fetching requests:', requests.data.error)
            return
        }
        setRequests(requests.data.requests)
        setTotalDeployments(requests.data.totalDeployments)
        setTotalActiveDeployments(requests.data.activeDeployments)
        setTotalRequests(requests.data.totalRequests)
        setAvgResponseTime(requests.data.avgResponseTime)
        setRequestPerHour(requests.data.requestPerHour)
        setRequestPerDay(requests.data.requestPerDay)
        setRequestPerMonth(requests.data.requestPerMonth)
        setIsRefreshing(false)
    }

    useEffect(() => {
        refreshData()
    }, [])

    useEffect(() => {
        ;(async () => {
            const resp = await axios.get(`${process.env.NEXT_PUBLIC_PROJECTS_SERVER}/api/projects/repo-file?projectToken=${projectToken}&path=project-config.json&branch=main`)
            if (resp.data.error) {
                console.error('Error fetching requests:', resp.data.error)
                return
            }
            setServices(resp.data.services)
        })()
    }, [projectToken, userSessionToken])

    useEffect(() => {
        const deploymentsSocket = io(`${process.env.NEXT_PUBLIC_DEPLOYMENTS_SERVER}`, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        })

        deploymentsSocket.on('connect', () => {
            console.log('Connected to deployments server')
        })
        setDeploymentsSocket(deploymentsSocket)

        deploymentsSocket.emit('get-deployments', { projectToken, userSessionToken })
        deploymentsSocket.emit('join-project', { projectToken })

        deploymentsSocket.on('all-deployments', (data: { deployments: ServiceCardPropsRequest[] }) => {
            setDeployments(data.deployments)

            data.deployments.forEach(deployment => {
                setRequestTracking(prev => ({
                    ...prev,
                    [deployment.deploymenttoken]: {
                        enabled: deployment.requesttrackingenabled,
                        proxyPort: null,
                        logs: []
                    }
                }))
            })
        })

        deploymentsSocket.on('DELETED_DEPLOYMENT', (data: { projectToken: string; deploymentToken: string }) => {
            setDeployments(prev => prev.filter(deployment => deployment.deploymenttoken !== data.deploymentToken))
            setRequestTracking(prev => {
                const newState = { ...prev }
                delete newState[data.deploymentToken]
                return newState
            })
        })

        deploymentsSocket.on('deployment-event', (data: { deploymentToken: string; currentState: eDeploymentStatus }) => {
            setDeployments(prev => prev.map(deployment => (deployment.deploymenttoken === data.deploymentToken ? { ...deployment, status: data.currentState } : deployment)))
        })

        deploymentsSocket.on('CREATE_DEPLOYMENT', (data: { vmToken: string; formData: ServiceCardPropsRequest }) => {
            const { formData, vmToken } = data
            const normalizedDeployment: ServiceCardPropsRequest = {
                ...formData,
                deploymenttoken: vmToken,
                id: formData.id,
                os: formData.os,
                datacenterlocation: formData.datacenterlocation
            }
            setDeployments(prev => [...prev, normalizedDeployment])
        })

        deploymentsSocket.on('tracking-enabled', (data: { deploymentToken: string; proxyPort: number; originalPort: number; message: string }) => {
            setRequestTracking(prev => ({
                ...prev,
                [data.deploymentToken]: {
                    enabled: true,
                    proxyPort: data.proxyPort,
                    logs: prev[data.deploymentToken]?.logs || []
                }
            }))
            setIsEnablingTracking(null)
        })

        deploymentsSocket.on('tracking-disabled', (data: { deploymentToken: string; message: string }) => {
            setRequestTracking(prev => ({
                ...prev,
                [data.deploymentToken]: {
                    enabled: false,
                    proxyPort: null,
                    logs: prev[data.deploymentToken]?.logs || []
                }
            }))
            setIsEnablingTracking(null)
        })

        deploymentsSocket.on('tracking-already-enabled', (data: { deploymentToken: string; message: string }) => {
            console.log('Tracking already enabled:', data.message)
            setIsEnablingTracking(null)
        })

        deploymentsSocket.on('request-logged', (data: { deploymentToken: string; request: RecentRequestsProps }) => {
            setRequestTracking(prev => ({
                ...prev,
                [data.deploymentToken]: {
                    ...prev[data.deploymentToken],
                    logs: [data.request, ...(prev[data.deploymentToken]?.logs || [])].slice(0, 100)
                }
            }))
        })

        deploymentsSocket.on('request-logs', (data: { deploymentToken: string; logs: RecentRequestsProps[] }) => {
            setRequestTracking(prev => ({
                ...prev,
                [data.deploymentToken]: {
                    ...prev[data.deploymentToken],
                    logs: data.logs
                }
            }))
        })

        deploymentsSocket.on('request-logs-cleared', (data: { deploymentToken: string; message: string }) => {
            console.log('Logs cleared:', data.message)
            setRequestTracking(prev => ({
                ...prev,
                [data.deploymentToken]: {
                    ...prev[data.deploymentToken],
                    logs: []
                }
            }))
        })

        deploymentsSocket.on('tracking-error', (data: { error: boolean; errmsg: string }) => {
            console.error('Tracking error:', data.errmsg)
            alert(data.errmsg)
            setIsEnablingTracking(null)
        })

        return () => {
            if (deploymentsSocket) {
                deploymentsSocket.disconnect()
            }
        }
    }, [projectToken, userSessionToken])

    // Request tracking functions
    const enableRequestTracking = (deploymentToken: string) => {
        if (!deploymentsSocket) return
        setIsEnablingTracking(deploymentToken)
        deploymentsSocket.emit('enable-request-tracking', {
            projectToken,
            deploymentToken
        })
    }

    const disableRequestTracking = (deploymentToken: string) => {
        if (!deploymentsSocket) return
        setIsEnablingTracking(deploymentToken)
        deploymentsSocket.emit('disable-request-tracking', {
            projectToken,
            deploymentToken
        })
    }

    const fetchRequestLogs = (deploymentToken: string) => {
        if (!deploymentsSocket) return
        deploymentsSocket.emit('get-request-logs', {
            projectToken,
            deploymentToken,
            limit: 100
        })
    }

    const clearRequestLogs = (deploymentToken: string) => {
        if (!deploymentsSocket || !confirm('Are you sure you want to clear all request logs for this deployment?')) return
        deploymentsSocket.emit('clear-request-logs', {
            projectToken,
            deploymentToken
        })
    }

    const downloadLogs = (deploymentToken: string, deploymentName: string) => {
        const logs = requestTracking[deploymentToken]?.logs || []
        const logText = logs.map(log => `[${log.timestamp}] [${log.method}] ${log.path} - ${log.status} - ${log.time}ms - ${log.ip}`).join('\n')

        const blob = new Blob([logText], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${deploymentName}-requests-${new Date().toISOString()}.txt`
        a.click()
        URL.revokeObjectURL(url)
    }

    const getChartData = () => {
        switch (timeRange) {
            case 'hour':
                return requestPerHour
            case 'day':
                return requestPerDay
            case 'month':
                return requestPerMonth
            default:
                return requestPerHour
        }
    }

    if (!deploymentsSocket) {
        return (
            <div className="flex h-full w-full">
                <LoadingScreen />
            </div>
        )
    }

    const renderComponent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="w-full py-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="flex h-36 flex-col rounded-xl bg-zinc-900/40 p-6">
                                <div className="flex flex-row items-center justify-between">
                                    <h1 className="text-sm font-medium text-white">Total Deployments</h1>
                                    <Plus className="h-4 w-4 text-white" />
                                </div>
                                <div className="mt-auto flex flex-col">
                                    <div className="mb-2 text-2xl font-bold text-white">{totalDeployments}</div>
                                </div>
                            </div>

                            <div className="flex h-36 flex-col rounded-xl bg-zinc-900/40 p-6">
                                <div className="flex flex-row items-center justify-between">
                                    <h1 className="text-sm font-medium text-white">Active Deployments</h1>
                                    <Container className="h-4 w-4 text-white" />
                                </div>
                                <div className="mt-auto flex flex-col">
                                    <div className="mb-2 text-2xl font-bold text-white">{totalActiveDeployments}</div>
                                </div>
                            </div>

                            <div className="flex h-36 flex-col rounded-xl bg-zinc-900/40 p-6">
                                <div className="flex flex-row items-center justify-between">
                                    <h1 className="text-sm font-medium text-white">Requests</h1>
                                    <RadioTower className="h-4 w-4 text-white" />
                                </div>
                                <div className="mt-auto flex flex-col">
                                    <div className="mb-2 text-2xl font-bold text-white">{totalRequests}</div>
                                </div>
                            </div>

                            <div className="flex h-36 flex-col rounded-xl bg-zinc-900/40 p-6">
                                <div className="flex flex-row items-center justify-between">
                                    <h1 className="text-sm font-medium text-white">Avg. Response Time</h1>
                                    <Plus className="h-4 w-4 text-white" />
                                </div>
                                <div className="mt-auto flex flex-col">
                                    <div className="mb-2 text-2xl font-bold text-white">{avgResponseTime}ms</div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <div className="flex flex-col gap-4 rounded-xl bg-zinc-900/40 p-6">
                                <div className="flex items-center justify-between">
                                    <h1 className="text-xl font-bold text-white md:text-2xl">Requests & Response Time</h1>
                                    <div className="flex gap-2">
                                        <button onClick={() => setTimeRange('hour')} className={`rounded px-3 py-1 text-sm font-medium transition-colors ${timeRange === 'hour' ? 'bg-white text-black' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}>
                                            Hour
                                        </button>
                                        <button onClick={() => setTimeRange('day')} className={`rounded px-3 py-1 text-sm font-medium transition-colors ${timeRange === 'day' ? 'bg-white text-black' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}>
                                            Day
                                        </button>
                                        <button onClick={() => setTimeRange('month')} className={`rounded px-3 py-1 text-sm font-medium transition-colors ${timeRange === 'month' ? 'bg-white text-black' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}>
                                            Month
                                        </button>
                                    </div>
                                </div>
                                <div className="h-[21.875rem] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={getChartData()}>
                                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={value => `${value}`} />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="requests" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
                                            <Line type="monotone" dataKey="responseTime" stroke="#82ca9d" strokeWidth={2} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="flex flex-col gap-4 rounded-xl bg-zinc-900/40 p-6">
                                <h1 className="text-xl font-bold text-white md:text-2xl">Recent Requests</h1>
                                <div className="h-[21.875rem] overflow-auto">
                                    <RecentRequests recentRequests={requests.slice(0, 10)} />
                                </div>
                            </div>
                        </div>
                    </div>
                )
            case 'services':
                return (
                    <div className="flex flex-col gap-3">
                        {deployments.map((deployment, index) => (
                            <div key={index}>
                                <ServiceCard deployment={deployment} socket={deploymentsSocket} userSessionToken={userSessionToken} />
                            </div>
                        ))}
                    </div>
                )

            case 'requests':
                return (
                    <div className="flex flex-col gap-6">
                        <div className="rounded-xl bg-zinc-900/40 p-6">
                            <div className="mb-4">
                                <h2 className="text-xl font-bold text-white">Request Tracking</h2>
                                <p className="mt-1 text-sm text-zinc-400">Enable request tracking for individual deployments to monitor incoming HTTP requests</p>
                            </div>

                            <div className="space-y-4">
                                {deployments
                                    .filter(d => d.type !== 'volume')
                                    .map(deployment => {
                                        const trackingState = requestTracking[deployment.deploymenttoken]
                                        const isTracking = trackingState?.enabled
                                        const proxyPort = trackingState?.proxyPort
                                        const logs = trackingState?.logs || []
                                        const isLoading = isEnablingTracking === deployment.deploymenttoken

                                        return (
                                            <div key={deployment.deploymenttoken} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3">
                                                            <h3 className="text-lg font-semibold text-white">{deployment.name}</h3>
                                                            <span className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400">{deployment.type}</span>
                                                            <div className={`flex items-center gap-2 rounded-full px-2 py-1 text-xs ${isTracking ? 'bg-green-900/30 text-green-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                                                <div className={`h-2 w-2 rounded-full ${isTracking ? 'animate-pulse bg-green-400' : 'bg-zinc-600'}`} />
                                                                {isTracking ? 'Tracking Active' : 'Tracking Inactive'}
                                                            </div>
                                                        </div>
                                                        {isTracking && proxyPort && (
                                                            <div className="mt-2 rounded-md border border-blue-800 bg-blue-900/20 p-2">
                                                                <p className="text-xs text-blue-300">
                                                                    <span className="font-semibold">Proxy URL:</span> http://localhost:{proxyPort}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex gap-2">
                                                        {!isTracking ? (
                                                            <button
                                                                onClick={() => enableRequestTracking(deployment.deploymenttoken)}
                                                                disabled={isLoading || deployment.status !== 'deployed'}
                                                                className="flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                <Play className="h-4 w-4" />
                                                                {isLoading ? 'Enabling...' : 'Enable Tracking'}
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => fetchRequestLogs(deployment.deploymenttoken)} className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">
                                                                    <RefreshCw className="h-4 w-4" />
                                                                    Refresh
                                                                </button>
                                                                <button onClick={() => downloadLogs(deployment.deploymenttoken, deployment.name)} disabled={logs.length === 0} className="flex items-center gap-2 rounded-md bg-zinc-700 px-3 py-2 text-sm text-white hover:bg-zinc-600 disabled:opacity-50">
                                                                    <Download className="h-4 w-4" />
                                                                </button>
                                                                <button onClick={() => clearRequestLogs(deployment.deploymenttoken)} disabled={logs.length === 0} className="flex items-center gap-2 rounded-md bg-zinc-700 px-3 py-2 text-sm text-white hover:bg-zinc-600 disabled:opacity-50">
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                                <button onClick={() => disableRequestTracking(deployment.deploymenttoken)} disabled={isLoading} className="flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700">
                                                                    <Square className="h-4 w-4" />
                                                                    {isLoading ? 'Disabling...' : 'Disable'}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {isTracking && logs.length > 0 && (
                                                    <div className="mt-4 grid grid-cols-4 gap-3">
                                                        <div className="rounded-lg bg-zinc-800/50 p-3">
                                                            <p className="text-xs text-zinc-400">Total</p>
                                                            <p className="text-lg font-bold text-white">{logs.length}</p>
                                                        </div>
                                                        <div className="rounded-lg bg-zinc-800/50 p-3">
                                                            <p className="text-xs text-zinc-400">Success Rate</p>
                                                            <p className="text-lg font-bold text-green-400">{((logs.filter(r => r.status < 400).length / logs.length) * 100).toFixed(1)}%</p>
                                                        </div>
                                                        <div className="rounded-lg bg-zinc-800/50 p-3">
                                                            <p className="text-xs text-zinc-400">Avg Response</p>
                                                            <p className="text-lg font-bold text-yellow-400">{(logs.reduce((acc, r) => acc + parseInt(r.time), 0) / logs.length).toFixed(0)}ms</p>
                                                        </div>
                                                        <div className="rounded-lg bg-zinc-800/50 p-3">
                                                            <p className="text-xs text-zinc-400">Error Rate</p>
                                                            <p className="text-lg font-bold text-red-400">{((logs.filter(r => r.status >= 400).length / logs.length) * 100).toFixed(1)}%</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {isTracking && (
                                                    <div className="mt-4">
                                                        <div className="rounded-lg bg-zinc-950 p-4">
                                                            {logs.length === 0 ? (
                                                                <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
                                                                    <Network className="mb-2 h-8 w-8 opacity-50" />
                                                                    <p className="text-sm">No requests tracked yet</p>
                                                                    <p className="mt-1 text-xs">Send requests to http://localhost:{proxyPort} to see them here</p>
                                                                </div>
                                                            ) : (
                                                                <div className="max-h-96 overflow-y-auto">
                                                                    <RecentRequests recentRequests={logs} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}

                                {deployments.filter(d => d.type !== 'volume').length === 0 && (
                                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-700 py-12 text-zinc-500">
                                        <Container className="mb-3 h-12 w-12 opacity-50" />
                                        <p className="text-lg font-medium">No deployments available</p>
                                        <p className="mt-1 text-sm">Create a deployment to enable request tracking</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-xl bg-zinc-900/40 p-6">
                            <h2 className="mb-4 text-xl font-bold text-white">All Recent Requests</h2>
                            <div className="rounded-lg bg-zinc-950 p-4">
                                {requests.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
                                        <RadioTower className="mb-2 h-8 w-8 opacity-50" />
                                        <p className="text-sm">No requests recorded</p>
                                    </div>
                                ) : (
                                    <RecentRequests recentRequests={requests} />
                                )}
                            </div>
                        </div>
                    </div>
                )

            default:
                return <div>No matching component found</div>
        }
    }

    return (
        <div className="h-full w-full flex-1 space-y-4 p-4 pt-6 md:p-8">
            <div className="flex flex-col items-start justify-between space-y-2 md:flex-row md:items-center md:space-y-0">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Deployment Monitoring</h2>
                    <p className="text-sm text-zinc-400 md:text-base">Monitor your deployments, container metrics, and request analytics</p>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={refreshData} disabled={isRefreshing} className="flex cursor-pointer items-center gap-2 rounded-md bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-700">
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh data</span>
                    </button>
                    <button
                        onClick={() => {
                            setCreateDeploymentPopup(true)
                        }}
                        className="flex cursor-pointer items-center gap-2 rounded-md bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-700"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">New Deployment</span>
                    </button>
                </div>
            </div>

            {createDeploymentPopup && (
                <PopupCanvas closePopup={() => setCreateDeploymentPopup(false)}>
                    <CreateDeploymentWizard onSuccess={() => setCreateDeploymentPopup(false)} projectToken={projectToken} userSessionToken={userSessionToken} services={services} deploymentOptions={deploymentOptions} socket={deploymentsSocket} />
                </PopupCanvas>
            )}

            <div className="mt-4 w-full overflow-x-auto">
                <div className="flex space-x-1 rounded-xl bg-zinc-900 p-1">
                    {['Overview', 'Services', 'Requests'].map((tab, index) => (
                        <button key={index} onClick={() => setActiveTab(tab.toLowerCase())} className={`cursor-pointer rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.toLowerCase() ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-300'}`}>
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-4 h-fit w-full">{renderComponent()}</div>
        </div>
    )
}

export default DeploymentsOverView
