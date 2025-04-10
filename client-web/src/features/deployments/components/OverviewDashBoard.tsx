'use client'
import { Container, Plus, RadioTower, RefreshCw } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import RecentRequests from './RecentRequests'
import axios from 'axios'
import { RecentRequestsProps } from '../types/Requests'

const DeploymentsOverView: React.FC<{ projectToken: string; userSessionToken: string }> = ({ projectToken, userSessionToken }) => {
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
    const [activeTab, setActiveTab] = useState<string>('overview')
    const [requests, setRequests] = useState<RecentRequestsProps[]>([])
    const [totalDeployments, setTotalDeployments] = useState<number>(0)
    const [totalActiveDeployments, setTotalActiveDeployments] = useState<number>(0)
    const [totalRequests, setTotalRequests] = useState<number>(0)
    const [avgResponseTime, setAvgResponseTime] = useState<number>(0)
    const [requestPerHour, setRequestPerHour] = useState<{ name: string; requests: number; responseTime: number }[]>([])

    useEffect(() => {
        refreshData()
    }, [])

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

    const data = [
        {
            name: '00:00',
            requests: 2340,
            responseTime: 89
        },
        {
            name: '03:00',
            requests: 1830,
            responseTime: 78
        },
        {
            name: '06:00',
            requests: 1580,
            responseTime: 65
        },
        {
            name: '09:00',
            requests: 3908,
            responseTime: 92
        },
        {
            name: '12:00',
            requests: 4800,
            responseTime: 105
        },
        {
            name: '15:00',
            requests: 4903,
            responseTime: 110
        },
        {
            name: '18:00',
            requests: 5400,
            responseTime: 98
        },
        {
            name: '21:00',
            requests: 4021,
            responseTime: 87
        }
    ]

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
                                    <h1 className="text-sm font-medium text-white">Requests (24h)</h1>
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
                return <div className="grid grid-cols-1 gap-6 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"></div>

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
                <button onClick={refreshData} disabled={isRefreshing} className="flex cursor-pointer items-center gap-2 rounded-md bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-700">
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh data</span>
                </button>
            </div>

            <div className="mt-4 w-full overflow-x-auto">
                <div className="flex space-x-1 rounded-xl bg-zinc-900 p-1">
                    {['Overview', 'Services', 'Requests', 'Logs'].map((tab, index) => (
                        <button
                            key={index}
                            onClick={() => setActiveTab(tab.toLowerCase())}
                            className={`rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.toLowerCase() ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-300'}`}
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
