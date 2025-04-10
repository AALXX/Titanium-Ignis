import React from 'react'
import { RecentRequestsProps } from '../types/Requests'
// Mock data for recent requests


const RecentRequests: React.FC<{ recentRequests: RecentRequestsProps[] }> = ({ recentRequests }) => {
    console.log(recentRequests[0])
    return (
        <div className="flex w-full flex-col space-y-4">
            {recentRequests.map(request => (
                <div key={request.id} className="flex flex-col justify-between border-b border-zinc-800 pb-3 last:border-0 sm:flex-row sm:items-center">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span
                                className={`inline-flex rounded px-2 py-1 text-xs font-medium ${
                                    request.method === 'GET'
                                        ? 'bg-blue-900/30 text-blue-400'
                                        : request.method === 'POST'
                                          ? 'bg-green-900/30 text-green-400'
                                          : request.method === 'PUT'
                                            ? 'bg-yellow-900/30 text-yellow-400'
                                            : request.method === 'DELETE'
                                              ? 'bg-red-900/30 text-red-400'
                                              : 'bg-purple-900/30 text-purple-400'
                                }`}
                            >
                                {request.method}
                            </span>
                            <p className="text-sm font-medium text-white">{request.path}</p>
                            <span
                                className={`inline-flex rounded px-2 py-1 text-xs font-medium ${
                                    request.status < 300
                                        ? 'bg-green-900/30 text-green-400'
                                        : request.status < 400
                                          ? 'bg-blue-900/30 text-blue-400'
                                          : request.status < 500
                                            ? 'bg-yellow-900/30 text-yellow-400'
                                            : 'bg-red-900/30 text-red-400'
                                }`}
                            >
                                {request.status}
                            </span>
                        </div>
                        <p className="text-xs text-zinc-400">
                            {request.timestamp} • {request.ip} • {request.time} ms
                        </p>
                    </div>
                    <div className="mt-2 font-medium sm:mt-0">{request.status < 400 ? <span className="text-green-500">Success</span> : <span className="text-red-500">Error</span>}</div>
                </div>
            ))}
        </div>
    )
}

export default RecentRequests
