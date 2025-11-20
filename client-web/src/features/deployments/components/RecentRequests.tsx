import React from 'react'
import { RecentRequestsProps } from '../types/Requests'
import { ArrowUpRight, Clock } from 'lucide-react'

const RecentRequests: React.FC<{ recentRequests: RecentRequestsProps[] }> = ({ recentRequests }) => {
    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffSecs = Math.floor(diffMs / 1000)
        const diffMins = Math.floor(diffSecs / 60)
        const diffHours = Math.floor(diffMins / 60)

        if (diffSecs < 60) return `${diffSecs}s ago`
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        return date.toLocaleDateString()
    }

    const getMethodColor = (method: string) => {
        switch (method.toUpperCase()) {
            case 'GET':
                return 'bg-blue-900/30 text-blue-400 border-blue-800'
            case 'POST':
                return 'bg-green-900/30 text-green-400 border-green-800'
            case 'PUT':
            case 'PATCH':
                return 'bg-yellow-900/30 text-yellow-400 border-yellow-800'
            case 'DELETE':
                return 'bg-red-900/30 text-red-400 border-red-800'
            default:
                return 'bg-purple-900/30 text-purple-400 border-purple-800'
        }
    }

    const getStatusColor = (status: number) => {
        if (status < 200) return 'bg-zinc-900/30 text-zinc-400 border-zinc-700'
        if (status < 300) return 'bg-green-900/30 text-green-400 border-green-800'
        if (status < 400) return 'bg-blue-900/30 text-blue-400 border-blue-800'
        if (status < 500) return 'bg-yellow-900/30 text-yellow-400 border-yellow-800'
        return 'bg-red-900/30 text-red-400 border-red-800'
    }

    const getResponseTimeColor = (time: string) => {
        const timeMs = parseInt(time)
        if (timeMs < 100) return 'text-green-400'
        if (timeMs < 500) return 'text-yellow-400'
        if (timeMs < 1000) return 'text-orange-400'
        return 'text-red-400'
    }

    return (
        <div className="flex w-full flex-col space-y-2">
            {recentRequests.map((request, index) => (
                <div key={request.id} className="group flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left section - Method, Path, Status */}
                    <div className="flex flex-1 items-center gap-3">
                        {/* Method Badge */}
                        <span className={`inline-flex shrink-0 items-center rounded border px-2.5 py-1 text-xs font-semibold ${getMethodColor(request.method)}`}>{request.method}</span>

                        {/* Path */}
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-mono text-sm font-medium text-white transition-colors group-hover:text-blue-400">{request.path}</p>

                            {/* Metadata */}
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatTimestamp(request.timestamp)}
                                </span>
                                <span>•</span>
                                <span>{request.ip}</span>
                                <span>•</span>
                                <span className={getResponseTimeColor(request.time)}>{request.time}ms</span>
                            </div>
                        </div>
                    </div>

                    {/* Right section - Status */}
                    <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center rounded border px-3 py-1 text-sm font-semibold ${getStatusColor(request.status)}`}>{request.status}</span>

                        {request.status < 400 ? (
                            <div className="hidden items-center gap-1 text-green-500 sm:flex">
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                <span className="text-sm font-medium">Success</span>
                            </div>
                        ) : (
                            <div className="hidden items-center gap-1 text-red-500 sm:flex">
                                <div className="h-2 w-2 rounded-full bg-red-500" />
                                <span className="text-sm font-medium">Error</span>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

export default RecentRequests
