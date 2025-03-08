'use client'
import type React from 'react'
import { useEffect, useState } from 'react'
import type { Socket } from 'socket.io-client'
import type { ITaskData } from '../../ITeamTasks'
import { Calendar, Clock, Flag, FileText, MessageSquare, User, CheckCircle, Archive, Tag, AlertCircle } from 'lucide-react'

interface ViewTaskPopupProps {
    socketRef: React.MutableRefObject<Socket | null>
    taskUUID: string
    className?: string
}

const ViewTaskPopup: React.FC<ViewTaskPopupProps> = ({ taskUUID, socketRef, className = '' }) => {
    const [taskData, setTaskData] = useState<ITaskData | null>(null)
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!socketRef.current) {
            setError('Socket connection not established')
            setLoading(false)
            return
        }

        const handleTaskData = (data: { error: boolean; task: ITaskData }) => {
            if (data.error) {
                setError('Failed to load task data')
            } else {
                setTaskData(data.task)
            }
            setLoading(false)
        }

        socketRef.current.emit('get-task-data', {
            taskUUID: taskUUID
        })

        socketRef.current.on('TASKS_DATA', handleTaskData)

        return () => {
            if (socketRef.current) {
                socketRef.current.off('TASKS_DATA', handleTaskData)
            }
        }
    }, [taskUUID, socketRef])

    const getImportanceColor = (importance: string) => {
        switch (importance.toLowerCase()) {
            case 'high':
                return 'bg-red-500'
            case 'medium':
                return 'bg-amber-500'
            case 'low':
                return 'bg-green-500'
            default:
                return 'bg-gray-500'
        }
    }

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'to do':
                return 'bg-blue-500'
            case 'in progress':
                return 'bg-amber-500'
            case 'done':
                return 'bg-green-500'
            default:
                return 'bg-gray-500'
        }
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Not set'

        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (loading) {
        return (
            <div className={`flex w-full items-center justify-center ${className}`}>
                <div className="w-full rounded-xl bg-[#2e2e2e] p-6">
                    <div className="flex h-40 items-center justify-center">
                        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-white"></div>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className={`flex w-full flex-col  justify-center ${className}`}>
                <div className="mb-4 flex items-center justify-center">
                    <h2 className="text-xl font-bold text-white">Error</h2>
                </div>
                <div className="mb-4 flex items-center justify-center gap-2 text-red-500">
                    <AlertCircle />
                    <p>{error}</p>
                </div>
            </div>
        )
    }

    if (!taskData) {
        return null
    }

    return (
        <div className={`flex w-full flex-col rounded-xl ${className}`}>
            <div className="mb-6 flex flex-col items-center justify-center text-center">
                <h2 className="text-2xl font-bold text-white">{taskData.taskname}</h2>

                <div className="mt-4 flex flex-wrap justify-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${getStatusColor(taskData.taskstatus)}`}></div>
                        <span className="text-white">Status: {taskData.taskstatus}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Flag size={16} className="text-white" />
                        <span className="text-white">
                            Importance: <span className={`rounded px-2 py-0.5 text-xs text-white ${getImportanceColor(taskData.taskimportance)}`}>{taskData.taskimportance}</span>
                        </span>
                    </div>
                </div>
            </div>

            <div className="mb-6 w-full px-4">
                <h3 className="mb-2 text-center text-lg font-semibold text-white">Description</h3>
                <div className="rounded-lg bg-[#3a3a3a] p-4 text-white/90">{taskData.taskdescription || 'No description provided'}</div>
            </div>

            <div className="w-full px-4">
                <div className="mb-6">
                    <h3 className="mb-3 text-center text-lg font-semibold text-white">Dates</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                        <div className="flex flex-col items-center gap-2 rounded-lg bg-[#3a3a3a] p-3">
                            <Calendar size={18} className="text-white" />
                            <p className="text-sm text-white/70">Due Date</p>
                            <p className="text-center text-white">{formatDate(taskData.taskduedate)}</p>
                        </div>
                        <div className="flex flex-col items-center gap-2 rounded-lg bg-[#3a3a3a] p-3">
                            <Calendar size={18} className="text-white" />
                            <p className="text-sm text-white/70">Created Date</p>
                            <p className="text-center text-white">{formatDate(taskData.taskcreateddate)}</p>
                        </div>
                        <div className="flex flex-col items-center gap-2 rounded-lg bg-[#3a3a3a] p-3">
                            <CheckCircle size={18} className="text-white" />
                            <p className="text-sm text-white/70">Completed Date</p>
                            <p className="text-center text-white">{formatDate(taskData.taskcompleteddate)}</p>
                        </div>
                        <div className="flex flex-col items-center gap-2 rounded-lg bg-[#3a3a3a] p-3">
                            <Clock size={18} className="text-white" />
                            <p className="text-sm text-white/70">Last Updated</p>
                            <p className="text-center text-white">{formatDate(taskData.tasklastupdated)}</p>
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="mb-3 text-center text-lg font-semibold text-white">Time Tracking</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex flex-col items-center gap-2 rounded-lg bg-[#3a3a3a] p-3">
                            <Clock size={18} className="text-white" />
                            <p className="text-sm text-white/70">Estimated Hours</p>
                            <p className="text-white">{taskData.taskestimatedhours || 'Not set'}</p>
                        </div>
                        <div className="flex flex-col items-center gap-2 rounded-lg bg-[#3a3a3a] p-3">
                            <Clock size={18} className="text-white" />
                            <p className="text-sm text-white/70">Actual Hours</p>
                            <p className="text-white">{taskData.taskactualhours || 'Not set'}</p>
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="mb-3 text-center text-lg font-semibold text-white">People</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex flex-col items-center gap-2 rounded-lg bg-[#3a3a3a] p-3">
                            <User size={18} className="text-white" />
                            <p className="text-sm text-white/70">Assigned To</p>
                            <p className="text-white">{taskData.assignedmemberusername || 'Unassigned'}</p>
                        </div>
                        <div className="flex flex-col items-center gap-2 rounded-lg bg-[#3a3a3a] p-3">
                            <User size={18} className="text-white" />
                            <p className="text-sm text-white/70">Created By</p>
                            <p className="text-white">{taskData.createdbyusername || 'Unknown'}</p>
                        </div>
                    </div>
                </div>

                {/* Activity */}
                <div className="mb-6">
                    <h3 className="mb-3 text-center text-lg font-semibold text-white">Activity</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex flex-col items-center gap-2 rounded-lg bg-[#3a3a3a] p-3">
                            <FileText size={18} className="text-white" />
                            <p className="text-sm text-white/70">Attachments</p>
                            <p className="text-white">{taskData.taskattachmentscount || 0}</p>
                        </div>
                        <div className="flex flex-col items-center gap-2 rounded-lg bg-[#3a3a3a] p-3">
                            <MessageSquare size={18} className="text-white" />
                            <p className="text-sm text-white/70">Comments</p>
                            <p className="text-white">{taskData.taskcommentscount || 0}</p>
                        </div>
                    </div>
                </div>

                {taskData.tasklabels && taskData.tasklabels.length > 0 && (
                    <div className="mb-6">
                        <h3 className="mb-3 text-center text-lg font-semibold text-white">Labels</h3>
                        <div className="flex flex-wrap justify-center gap-2">
                            {taskData.tasklabels.map((label, index) => (
                                <span key={index} className="flex items-center gap-1 rounded-md bg-[#4e4e4e] px-2 py-1 text-sm text-white">
                                    <Tag size={12} />
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {taskData.taskisarchived && (
                    <div className="mb-6 flex items-center justify-center gap-2 text-amber-500">
                        <Archive size={18} />
                        <span>This task is archived</span>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ViewTaskPopup
