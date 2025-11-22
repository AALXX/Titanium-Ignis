'use client'
import { type FC, useEffect, useRef, useState } from 'react'
import { EContainerState, type ITaskContainers, type ITasks } from '../types/ITeamTasks'
import TaskContainerTemplate from './components/TaskContainerTemplate'
import CreateTaskContainerButton from './components/CreateTaskContainerButton'
import { v4 as uuidv4 } from 'uuid'
import TaskTemplate from './components/TaskTemplate'
import { Reorder } from 'framer-motion'
import { io, type Socket } from 'socket.io-client'
import PopupCanvas from '@/components/PopupCanvas'
import OptionPicker from '@/components/OptionPicker'
import ViewTaskPopup from './components/ViewTaskPopup'
import { ETaskStatus } from '../types/TaskTypes'
import DoubleValueOptionPicker from '@/components/DoubleValueOptionPicker'

interface IProjectTasks {
    userSessionToken: string | undefined
    TaskBannerToken: string
    projectToken: string
}

const ProjectTasks: FC<IProjectTasks> = ({ userSessionToken, TaskBannerToken, projectToken }) => {
    const [allTasks, setAllTasks] = useState<ITasks[]>([])
    const [allTaskContainers, setAllTaskContainers] = useState<ITaskContainers[]>([])
    const [isCreatingTaskContainer, setIsCreatingTaskContainer] = useState<boolean>(false)
    const [lastContainerUUID, setLastContainerUUID] = useState<string | null>(null)
    const [draggedTask, setDraggedTask] = useState<ITasks | null>(null)
    const socketRef = useRef<Socket | null>(null)
    const hasInitialized = useRef<boolean>(false)

    // Store original orders for revert animation
    const [originalContainerOrder, setOriginalContainerOrder] = useState<ITaskContainers[]>([])
    const [originalTaskPositions, setOriginalTaskPositions] = useState<Map<string, string>>(new Map())

    const [createTaskPopup, setCreateTaskPopup] = useState<{ open: boolean; TaskContainerUUID: string }>({
        open: false,
        TaskContainerUUID: ''
    })

    const [taskName, setTaskName] = useState<string>('')
    const [taskDescription, setTaskDescription] = useState<string>('')
    const [taskStatus, setTaskStatus] = useState<ETaskStatus>(ETaskStatus.TODO)
    const [taskDueDate, setTaskDueDate] = useState<Date>(new Date())
    const [taskImportance, setTaskImportance] = useState<string>('Low')
    const [taskEstimatedTime, setTaskEstimatedTime] = useState<number>(0)
    const [taskLabels, setTaskLabels] = useState<string[]>([])

    const [viewTask, setViewTask] = useState<{ open: boolean; TaskUUID: string }>({ open: false, TaskUUID: '' })

    useEffect(() => {
        console.log('=== EFFECT RUNNING ===')
        console.log('hasInitialized:', hasInitialized.current)

        if (hasInitialized.current) {
            console.log('Already initialized, skipping')
            return
        }

        hasInitialized.current = true
        console.log('Creating socket connection to:', process.env.NEXT_PUBLIC_TASKS_SERVER)

        const socket = io(process.env.NEXT_PUBLIC_TASKS_SERVER as string)
        socketRef.current = socket

        socket.on('connect', () => {
            console.log('✅ Socket connected:', socket.id)
        })

        socket.on('connect_error', error => {
            console.log('❌ Socket connection error:', error)
        })

        socket.emit('join', { BannerToken: TaskBannerToken })
        socket.emit('get-project-tasks', { BannerToken: TaskBannerToken })

        socket.on('PROJECT_TASKS', (data: any) => {
            console.log('Project tasks received:', data)
            // Use functional updates to avoid race conditions
            setAllTasks(() => data.tasks || [])
            setAllTaskContainers(() => data.containers || [])
        })

        socket.on('CREATED_TASK_CONTAINER', () => {
            setIsCreatingTaskContainer(false)
        })

        socket.on('REORDERED_TASK_CONTAINERS', (data: { error: boolean; message: string }) => {
            if (data.error) {
                console.error('Error reordering task containers:', data.message)
                // Revert to original order with smooth animation
                if (originalContainerOrder.length > 0) {
                    setTimeout(() => {
                        setAllTaskContainers([...originalContainerOrder])
                        setOriginalContainerOrder([])
                    }, 100)
                }
            } else {
                // Clear original order on success
                setOriginalContainerOrder([])
            }
        })

        socket.on('REORDERED_TASK_CONTAINERS_NOT_ALLOWED', (data: { error: boolean; message: string }) => {
            if (data.error) {
                console.error('Permission denied for reordering containers:', data.message)
            }

            // Smoothly animate back to original position
            if (originalContainerOrder.length > 0) {
                setTimeout(() => {
                    setAllTaskContainers([...originalContainerOrder])
                    setOriginalContainerOrder([])
                }, 100)
            }
        })

        socket.on('DELETED_TASK_CONTAINER', (data: { error: boolean; containerUUID: string }) => {
            if (data.error) return
            setAllTaskContainers(prev => prev.filter(c => c.containeruuid !== data.containerUUID))
        })

        socket.on('CREATED_TASK', (data: { error: boolean; taskUUID: string; containerUUID: string; taskName: string; taskImportance: string; taskDueDate: Date }) => {
            if (data.error) return
            setAllTasks(prev => [
                ...prev,
                {
                    ContainerUUID: data.containerUUID,
                    TaskUUID: data.taskUUID,
                    TaskName: data.taskName,
                    TaskDueDate: data.taskDueDate,
                    TaskImportance: data.taskImportance
                }
            ])
        })

        socket.on('REORDERED_TASKS', (data: { error: boolean; containerUUID: string; taskUUID: string; task: ITasks; message: string }) => {
            if (!data.error) {
                setAllTasks(prev => prev.map(task => (task.TaskUUID === data.taskUUID ? { ...task, ContainerUUID: data.containerUUID } : task)))
                setOriginalTaskPositions(prev => {
                    const newMap = new Map(prev)
                    newMap.delete(data.taskUUID)
                    return newMap
                })
            } else {
                console.error('Error reordering task:', data.message)
                if (data.message.includes('permission')) {
                    window.alert('You do not have permission to reorder tasks')
                }
                const originalContainerUUID = originalTaskPositions.get(data.taskUUID)
                if (originalContainerUUID) {
                    // Smooth revert animation for tasks
                    setTimeout(() => {
                        setAllTasks(prev => prev.map(task => (task.TaskUUID === data.taskUUID ? { ...task, ContainerUUID: originalContainerUUID } : task)))
                        setOriginalTaskPositions(prev => {
                            const newMap = new Map(prev)
                            newMap.delete(data.taskUUID)
                            return newMap
                        })
                    }, 100)
                }
            }
        })

        return () => {
            // Prevent cleanup during strict mode double-mount
            if (!hasInitialized.current) return

            console.log('Cleaning up socket connection')
            // Remove all listeners before disconnecting
            socket.removeAllListeners()
            socket.disconnect()
            socketRef.current = null
        }
    }, [TaskBannerToken])

    const createTaskContainer = async (newTaskContainerName: string): Promise<boolean> => {
        if (!socketRef.current) return false

        socketRef.current.emit('create-task-container', {
            userSessionToken,
            projectToken,
            bannerToken: TaskBannerToken,
            taskContainerName: newTaskContainerName,
            containerUUID: lastContainerUUID
        })

        setIsCreatingTaskContainer(false)
        return true
    }

    const deleteTaskContainer = async (containerUUID: string) => {
        socketRef.current?.emit('delete-task-container', {
            userSessionToken,
            projectToken,
            bannerToken: TaskBannerToken,
            containerUUID
        })
    }

    const createTask = async () => {
        socketRef.current?.emit('create-task', {
            userSessionToken,
            bannerToken: TaskBannerToken,
            projectToken,
            taskContainerUUID: createTaskPopup.TaskContainerUUID,
            taskName,
            taskDescription,
            taskStatus,
            taskDueDate,
            taskImportance,
            taskEstimatedHours: taskEstimatedTime,
            taskLabels
        })

        setCreateTaskPopup({ open: false, TaskContainerUUID: '' })
    }

    const handleReorder = (newOrder: ITaskContainers[]) => {
        if (!Array.isArray(newOrder) || newOrder.length !== allTaskContainers.length) return

        // Save original order for potential revert
        setOriginalContainerOrder([...allTaskContainers])
        setAllTaskContainers(newOrder)

        const reorderData = newOrder.map((container, index) => ({
            containerUUID: container.containeruuid,
            order: index + 1
        }))

        socketRef.current?.emit('reorder-task-containers', {
            userSessionToken,
            projectToken,
            bannerToken: TaskBannerToken,
            newOrder: reorderData
        })
    }

    const handleTaskDragStart = (task: ITasks) => {
        setDraggedTask(task)
    }

    const handleTaskDrop = (targetContainerUUID: string) => {
        if (!draggedTask) return
        if (draggedTask.ContainerUUID === targetContainerUUID) {
            setDraggedTask(null)
            return
        }

        setOriginalTaskPositions(prev => new Map(prev.set(draggedTask.TaskUUID, draggedTask.ContainerUUID)))
        setAllTasks(prev => prev.map(task => (task.TaskUUID === draggedTask.TaskUUID ? { ...task, ContainerUUID: targetContainerUUID } : task)))

        socketRef.current?.emit('reorder-task', {
            userSessionToken,
            projectToken,
            bannerToken: TaskBannerToken,
            taskContainerUUID: targetContainerUUID,
            taskUUID: draggedTask.TaskUUID
        })

        setDraggedTask(null)
    }

    const openTask = (TaskUUID: string) => {
        setViewTask({ open: true, TaskUUID })
    }

    return (
        <Reorder.Group axis="x" values={allTaskContainers} onReorder={handleReorder} as="div" layout transition={{ type: 'spring', stiffness: 600, damping: 40, mass: 0.5 }} className="flex h-full gap-14 p-4">
            {allTaskContainers.map((container: ITaskContainers) => (
                <Reorder.Item key={container.containeruuid} value={container} as="div" layout transition={{ type: 'spring', stiffness: 600, damping: 40, mass: 0.5 }} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={1} dragMomentum={false} className="cursor-grab active:cursor-grabbing">
                    <div
                        className="flex h-full w-64 shrink-0 flex-col rounded-xl"
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => {
                            e.preventDefault()
                            handleTaskDrop(container.containeruuid)
                        }}
                    >
                        <TaskContainerTemplate
                            title={container.containername}
                            containerState={container.state}
                            onCreateTaskContainer={createTaskContainer}
                            taskContainerUUID={container.containeruuid}
                            onDeleteTaskContainer={deleteTaskContainer}
                            onCreateTask={async uuid => {
                                setCreateTaskPopup({ open: true, TaskContainerUUID: uuid })
                            }}
                        >
                            {allTasks
                                .filter(task => task.ContainerUUID === container.containeruuid)
                                .map((task: ITasks, index: number) => (
                                    <div key={task.TaskUUID} draggable="true" onDragStart={() => handleTaskDragStart(task)}>
                                        <TaskTemplate key={index} title={task.TaskName} TaskUUID={task.TaskUUID} importance={task.TaskImportance} deadline={task.TaskDueDate} taskContainerUUID={task.ContainerUUID} onOpenTask={openTask} />
                                    </div>
                                ))}
                        </TaskContainerTemplate>
                    </div>
                </Reorder.Item>
            ))}
            <CreateTaskContainerButton
                addTaskContainer={() => {
                    setIsCreatingTaskContainer(true)
                    if (!isCreatingTaskContainer) {
                        const uuid = uuidv4()
                        setLastContainerUUID(uuid)
                        setAllTaskContainers([
                            ...allTaskContainers,
                            {
                                containeruuid: uuid,
                                containername: '',
                                state: EContainerState.Creating,
                                containerorder: allTaskContainers.length + 1
                            }
                        ])
                    }
                }}
            />

            {viewTask.open && (
                <PopupCanvas closePopup={() => setViewTask({ open: false, TaskUUID: '' })}>
                    <ViewTaskPopup socketRef={socketRef} taskUUID={viewTask.TaskUUID} />
                </PopupCanvas>
            )}

            {createTaskPopup.open && (
                <PopupCanvas closePopup={() => setCreateTaskPopup({ open: false, TaskContainerUUID: '' })}>
                    <div className="flex h-full w-full flex-col overflow-y-auto p-4">
                        <h1 className="self-center text-2xl font-bold text-white">Create Task</h1>

                        <div className="mt-8 flex flex-col gap-6">
                            <div className="flex flex-col">
                                <h2 className="text-lg font-semibold text-white">Task Name</h2>
                                <input type="text" placeholder="Enter Task Name" required className="h-[4rem] w-full rounded-xl bg-[#00000048] indent-3 text-white" onChange={e => setTaskName(e.target.value)} value={taskName} />
                            </div>

                            <div className="flex flex-col">
                                <h2 className="text-lg font-semibold text-white">Task Description*</h2>
                                <textarea placeholder="Enter Task Description" className="h-[6rem] w-full rounded-xl bg-[#00000048] p-3 text-white" onChange={e => setTaskDescription(e.target.value)} value={taskDescription} />
                            </div>

                            <div className="flex flex-col">
                                <h2 className="text-lg font-semibold text-white">Task Status</h2>
                                <DoubleValueOptionPicker
                                    options={[
                                        {
                                            label: ETaskStatus.TODO,
                                            value: ETaskStatus.TODO
                                        },
                                        {
                                            label: ETaskStatus.IN_PROGRESS,
                                            value: ETaskStatus.IN_PROGRESS
                                        },
                                        {
                                            label: ETaskStatus.DONE,
                                            value: ETaskStatus.DONE
                                        }
                                    ]}
                                    label="Task Status"
                                    className="block h-[4rem] w-full rounded-xl bg-[#00000048] px-4 py-2 text-white shadow-xs focus:outline-hidden"
                                    onChange={setTaskStatus}
                                    value={taskStatus}
                                />
                            </div>

                            <div className="flex flex-col">
                                <h2 className="text-lg font-semibold text-white">Task Due Date</h2>
                                <input type="date" required className="h-[4rem] w-full rounded-xl bg-[#00000048] px-4 py-2 text-white shadow-xs focus:outline-hidden" onChange={e => setTaskDueDate(new Date(e.target.value))} />
                            </div>

                            <div className="flex flex-col">
                                <h2 className="text-lg font-semibold text-white">Task Importance</h2>
                                <OptionPicker options={['Low', 'Medium', 'High']} label="Task Importance" className="block h-[4rem] w-full rounded-xl bg-[#00000048] px-4 py-2 text-white shadow-xs focus:outline-hidden" onChange={setTaskImportance} value={taskImportance} />
                            </div>

                            <div className="flex flex-col">
                                <h2 className="text-lg font-semibold text-white">Task Estimated Time*</h2>
                                <input type="number" placeholder="Enter Task Estimated Time (in hours)" className="h-[4rem] w-full rounded-xl bg-[#00000048] px-4 py-2 text-white shadow-xs focus:outline-hidden" onChange={e => setTaskEstimatedTime(Number(e.target.value))} value={taskEstimatedTime} />
                            </div>

                            <div className="flex flex-col">
                                <h2 className="text-lg font-semibold text-white">Task Labels*</h2>
                                <input type="text" placeholder="Enter Task Labels (comma-separated)" className="h-[4rem] w-full rounded-xl bg-[#00000048] px-4 py-2 text-white shadow-xs focus:outline-hidden" />
                            </div>

                            <button className="h-[4rem] rounded-xl bg-[#00000048] px-4 py-2 text-white proportional-nums active:bg-[#00000065]" onClick={createTask}>
                                Create Task
                            </button>
                        </div>
                    </div>
                </PopupCanvas>
            )}
        </Reorder.Group>
    )
}

export default ProjectTasks
