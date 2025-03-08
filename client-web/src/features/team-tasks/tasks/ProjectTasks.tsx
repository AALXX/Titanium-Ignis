'use client'
import React, { FC, useEffect, useRef, useState } from 'react'
import { EContainerState, ITaskContainers, ITasks } from '../ITeamTasks'
import TaskContainerTemplate from './components/TaskContainerTemplate'
import CreateTaskContainerButton from './components/CreateTaskContainerButton'
import { v4 as uuidv4 } from 'uuid'
import TaskTemplate from './components/TaskTemplate'
import { Reorder } from 'framer-motion'
import { io, Socket } from 'socket.io-client'
import PopupCanvas from '@/components/PopupCanvas'
import OptionPicker from '@/components/OptionPicker'
import ViewTaskPopup from './components/ViewTaskPopup'

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

    const [createTaskPopup, setCreateTaskPopup] = useState<{ open: boolean; TaskContainerUUID: string }>({ open: false, TaskContainerUUID: '' })

    // Task creation states
    const [taskName, setTaskName] = useState<string>('')
    const [taskDescription, setTaskDescription] = useState<string>('')
    const [taskStatus, setTaskStatus] = useState<string>('To Do')
    const [taskDueDate, setTaskDueDate] = useState<Date>(new Date())
    const [taskImportance, setTaskImportance] = useState<string>('Low')
    const [taskEstimatedTime, setTaskEstimatedTime] = useState<number>(0)
    const [taskLabels, setTaskLabels] = useState<string[]>([])

    const [viewTask, setViewTask] = useState<{ open: boolean; TaskUUID: string }>({ open: false, TaskUUID: '' })

    useEffect(() => {
        // Initialize the socket connection
        socketRef.current = io(process.env.NEXT_PUBLIC_TASKS_SERVER as string)

        socketRef.current.emit('join', {
            BannerToken: TaskBannerToken
        })

        socketRef.current.emit('get-project-tasks', {
            BannerToken: TaskBannerToken
        })

        socketRef.current.on('PROJECT_TASKS', (data: any) => {
            setAllTasks(data.tasks)
            setAllTaskContainers(data.containers)
        })

        socketRef.current.on('CREATED_TASK_CONTAINER', (data: any) => {
            setIsCreatingTaskContainer(false)
        })

        socketRef.current?.on('REORDERED_TASK_CONTAINERS', (data: { error: boolean; message: string }) => {
            if (data.error) {
                console.error('Error reordering task containers:', data.message)
            }
        })

        socketRef.current.on('DELETED_TASK_CONTAINER', (data: { error: boolean; containerUUID: string }) => {
            console.log(data)
            if (data.error) {
                return
            }

            setAllTaskContainers((prevContainers: ITaskContainers[]) => prevContainers.filter(container => container.containeruuid !== data.containerUUID))
        })

        socketRef.current.on('CREATED_TASK', (data: { error: boolean; taskUUID: string; containerUUID: string; taskName: string; taskImportance: string; taskDueDate: Date }) => {
            if (data.error) {
                return
            }
            setAllTasks(prevTasks => [...prevTasks, { ContainerUUID: data.containerUUID, TaskUUID: data.taskUUID, TaskName: data.taskName, TaskDueDate: data.taskDueDate, TaskImportance: data.taskImportance }])
        })

        socketRef.current?.on('REORDERED_TASKS', (data: { error: boolean; containerUUID: string; taskUUID: string; task: ITasks; message: string }) => {
            if (!data.error) {
                setAllTasks(prevTasks => prevTasks.map(task => (task.TaskUUID === data.taskUUID ? { ...task, ContainerUUID: data.containerUUID } : task)))
            } else {
                console.error('Error reordering task:', data.message)
            }
        })

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect()
            }
        }
    }, [TaskBannerToken])

    const createTaskContainer = async (newTaskContainerName: string): Promise<boolean> => {
        if (!socketRef.current) {
            console.error('Socket connection not established')
            return false
        }

        socketRef.current.emit('create-task-container', {
            userSessionToken: userSessionToken,
            projectToken: projectToken,
            bannerToken: TaskBannerToken,
            taskContainerName: newTaskContainerName,
            containerUUID: lastContainerUUID
        })

        setIsCreatingTaskContainer(false)
        return true
    }

    const deleteTaskContainer = async (containerUUID: string): Promise<void> => {
        if (!socketRef.current) {
            console.error('Socket connection not established')
            return
        }

        socketRef.current.emit('delete-task-container', {
            userSessionToken: userSessionToken,
            projectToken: projectToken,
            bannerToken: TaskBannerToken,
            containerUUID: containerUUID
        })
    }

    const createTask = async (): Promise<void> => {
        if (!socketRef.current) {
            console.error('Socket connection not established')
            return
        }

        socketRef.current.emit('create-task', {
            userSessionToken: userSessionToken,
            bannerToken: TaskBannerToken,
            projectToken: projectToken,
            taskContainerUUID: createTaskPopup.TaskContainerUUID,
            taskName: taskName,
            taskDescription: taskDescription,
            taskStatus: taskStatus,
            taskDueDate: taskDueDate,
            taskImportance: taskImportance,
            taskEstimatedHours: taskEstimatedTime,
            taskLabels: taskLabels
        })

        setCreateTaskPopup({ open: false, TaskContainerUUID: '' })
    }

    const handleReorder = (newOrder: ITaskContainers[]) => {
        if (Array.isArray(newOrder) && newOrder.length === allTaskContainers.length) {
            setAllTaskContainers(newOrder)

            //* Prepare the data structure expected by the server
            const reorderData = newOrder.map((container, index) => ({
                containerUUID: container.containeruuid,
                order: index + 1
            }))

            if (socketRef.current) {
                socketRef.current.emit('reorder-task-containers', {
                    userSessionToken: userSessionToken,
                    projectToken: projectToken,
                    bannerToken: TaskBannerToken,
                    newOrder: reorderData
                })
            }
        }
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

        setAllTasks(prevTasks => prevTasks.map(task => (task.TaskUUID === draggedTask.TaskUUID ? { ...task, ContainerUUID: targetContainerUUID } : task)))

        socketRef.current?.emit('reorder-task', {
            userSessionToken: userSessionToken,
            projectToken: projectToken,
            bannerToken: TaskBannerToken,
            taskContainerUUID: targetContainerUUID,
            taskUUID: draggedTask.TaskUUID
        })

        setDraggedTask(null)
    }

    const openTask = (TaskUUID: string) => {
        setViewTask({ open: true, TaskUUID: TaskUUID })
    }

    return (
        <Reorder.Group axis="x" values={allTaskContainers} onReorder={handleReorder} as="div" className="flex h-full gap-14 p-4">
            {allTaskContainers.map((container: ITaskContainers) => (
                <Reorder.Item
                    key={container.containeruuid}
                    value={container}
                    as="div"
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={{ left: 1, right: 1 }}
                    dragMomentum={false}
                    className="cursor-grab active:cursor-grabbing"
                >
                    <div
                        className="flex h-full w-64 shrink-0 cursor-pointer flex-col rounded-xl"
                        onDragOver={e => {
                            e.preventDefault()
                        }}
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
                            onCreateTask={async (taskContainerUUID: string) => {
                                setCreateTaskPopup({ open: true, TaskContainerUUID: taskContainerUUID })
                            }}
                        >
                            {allTasks
                                .filter(task => task.ContainerUUID === container.containeruuid)
                                .map((task: ITasks, index: number) => (
                                    <div key={task.TaskUUID} draggable="true" onDragStart={() => handleTaskDragStart(task)} className="">
                                        <TaskTemplate
                                            key={index}
                                            title={task.TaskName}
                                            TaskUUID={task.TaskUUID}
                                            importance={task.TaskImportance}
                                            deadline={task.TaskDueDate}
                                            taskContainerUUID={task.ContainerUUID}
                                            onOpenTask={openTask}
                                        />
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
                        setAllTaskContainers([...allTaskContainers, { containeruuid: uuid, containername: '', state: EContainerState.Creating, containerorder: allTaskContainers.length + 1 }])
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
                                <input
                                    type="text"
                                    placeholder="Enter Task Name"
                                    required
                                    className="h-[4rem] w-full rounded-xl bg-[#00000048] indent-3 text-white"
                                    onChange={e => setTaskName(e.target.value)}
                                    value={taskName}
                                />
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-lg font-semibold text-white">Task Description*</h2>
                                <textarea
                                    placeholder="Enter Task Description"
                                    className="h-[6rem] w-full rounded-xl bg-[#00000048] p-3 text-white"
                                    onChange={e => setTaskDescription(e.target.value)}
                                    value={taskDescription}
                                />
                            </div>

                            <div className="flex flex-col">
                                <h2 className="text-lg font-semibold text-white">Task Status</h2>
                                <OptionPicker
                                    options={['To Do', 'In Progress', 'Done']}
                                    label="Task Status"
                                    className="block h-[4rem] w-full rounded-xl bg-[#00000048] px-4 py-2 text-white shadow-xs focus:outline-hidden"
                                    onChange={setTaskStatus}
                                    value={taskStatus}
                                />
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-lg font-semibold text-white">Task Due Date</h2>
                                <input
                                    type="date"
                                    required
                                    className="h-[4rem] w-full rounded-xl bg-[#00000048] px-4 py-2 text-white shadow-xs focus:outline-hidden"
                                    onChange={e => {
                                        setTaskDueDate(new Date(e.target.value))
                                    }}
                                />
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-lg font-semibold text-white">Task Importance</h2>
                                <OptionPicker
                                    options={['Low', 'Medium', 'High']}
                                    label="Task Importance"
                                    className="block h-[4rem] w-full rounded-xl bg-[#00000048] px-4 py-2 text-white shadow-xs focus:outline-hidden"
                                    onChange={setTaskImportance}
                                    value={taskImportance}
                                />
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-lg font-semibold text-white">Task Estimated Time*</h2>
                                <input
                                    type="number"
                                    placeholder="Enter Task Estimated Time (in hours)"
                                    className="h-[4rem] w-full rounded-xl bg-[#00000048] px-4 py-2 text-white shadow-xs focus:outline-hidden"
                                    onChange={e => setTaskEstimatedTime(Number(e.target.value))}
                                    value={taskEstimatedTime}
                                />
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
