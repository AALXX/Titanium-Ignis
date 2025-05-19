'use client'
import { Container, Plus, RadioTower, RefreshCw } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import RecentRequests from './RecentRequests'
import axios from 'axios'
import { RecentRequestsProps } from '../types/Requests'
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
    const [activeTab, setActiveTab] = useState<string>('services')
    const [requests, setRequests] = useState<RecentRequestsProps[]>([])
    const [totalDeployments, setTotalDeployments] = useState<number>(0)
    const [totalActiveDeployments, setTotalActiveDeployments] = useState<number>(0)
    const [totalRequests, setTotalRequests] = useState<number>(0)
    const [avgResponseTime, setAvgResponseTime] = useState<number>(0)
    const [requestPerHour, setRequestPerHour] = useState<{ name: string; requests: number; responseTime: number }[]>([])

    const [deploymentsSocket, setDeploymentsSocket] = useState<Socket | null>(null)

    const [deployments, setDeployments] = useState<ServiceCardPropsRequest[]>([])

    const [createDeploymentPopup, setCreateDeploymentPopup] = useState<boolean>(false)

    const [services, setServices] = useState<ProjectService[]>([])

    const refreshData = async () => {
        ;(async () => {
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
            setIsRefreshing(false)
        })()
    }

    useEffect(() => {
        refreshData()
    }, [])


    
    useEffect(() => {
        ;(async () => {
            const resp = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/get-project-services/${projectToken}/${userSessionToken}`)
            if (resp.data.error) {
                console.error('Error fetching requests:', resp.data.error)
                return
            }
            console.log(resp.data.services)
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
        })

        deploymentsSocket.on('deployment-event', (data: { deploymentToken: string; currentState: eDeploymentStatus }) => {
            console.log(data)
            setDeployments(prev => prev.map(deployment => (deployment.deploymenttoken === data.deploymentToken ? { ...deployment, status: data.currentState } : deployment)))
        })

        return () => {
            if (deploymentsSocket) {
                deploymentsSocket.disconnect()
            }
        }
    }, [projectToken, userSessionToken])

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
                                    <p className="text-xs text-zinc-500">+2 since last month</p>
                                </div>
                            </div>

                            <div className="flex h-36 flex-col rounded-xl bg-zinc-900/40 p-6">
                                <div className="flex flex-row items-center justify-between">
                                    <h1 className="text-sm font-medium text-white">Active Deployments</h1>
                                    <Container className="h-4 w-4 text-white" />
                                </div>
                                <div className="mt-auto flex flex-col">
                                    <div className="mb-2 text-2xl font-bold text-white">{totalActiveDeployments}</div>
                                    <p className="text-xs text-zinc-500">+2 since last month</p>
                                </div>
                            </div>

                            <div className="flex h-36 flex-col rounded-xl bg-zinc-900/40 p-6">
                                <div className="flex flex-row items-center justify-between">
                                    <h1 className="text-sm font-medium text-white">Requests </h1>
                                    <RadioTower className="h-4 w-4 text-white" />
                                </div>
                                <div className="mt-auto flex flex-col">
                                    <div className="mb-2 text-2xl font-bold text-white">{totalRequests}</div>
                                    <p className="text-xs text-zinc-500">+18.2% from last 24h</p>
                                </div>
                            </div>

                            <div className="flex h-36 flex-col rounded-xl bg-zinc-900/40 p-6">
                                <div className="flex flex-row items-center justify-between">
                                    <h1 className="text-sm font-medium text-white">Avg. Response Time</h1>
                                    <Plus className="h-4 w-4 text-white" />
                                </div>
                                <div className="mt-auto flex flex-col">
                                    <div className="mb-2 text-2xl font-bold text-white">{avgResponseTime}ms</div>
                                    <p className="text-xs text-zinc-500">-12ms since yesterday</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <div className="flex flex-col gap-4 rounded-xl bg-zinc-900/40 p-6">
                                <h1 className="text-xl font-bold text-white md:text-2xl">Requests & Response Time</h1>
                                <div className="h-[21.875rem] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={requestPerHour}>
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
                                    <RecentRequests recentRequests={requests} />
                                </div>
                            </div>
                        </div>
                    </div>
                )
            case 'services':
                return (
                    <div className="flex flex-col gap-3">
                        {deployments.map(deployment => (
                            <div key={deployment.id}>
                                <ServiceCard deployment={deployment} socket={deploymentsSocket} userSessionToken={userSessionToken} />
                            </div>
                        ))}
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
                    <CreateDeploymentWizard
                        onSuccess={() => setCreateDeploymentPopup(false)}
                        projectToken={projectToken}
                        userSessionToken={userSessionToken}
                        services={services}
                        deploymentOptions={deploymentOptions}
                        socket={deploymentsSocket}
                    />
                </PopupCanvas>
            )}

            <div className="mt-4 w-full overflow-x-auto">
                <div className="flex space-x-1 rounded-xl bg-zinc-900 p-1">
                    {['Overview', 'Services', 'Requests', 'Logs'].map((tab, index) => (
                        <button
                            key={index}
                            onClick={() => setActiveTab(tab.toLowerCase())}
                            className={`cursor-pointer rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.toLowerCase() ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-300'}`}
                        >
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
