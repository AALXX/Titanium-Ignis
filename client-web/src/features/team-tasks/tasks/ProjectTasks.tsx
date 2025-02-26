'use client'
import React, { FC, useState } from 'react'
import { EContainerState, ITaskContainers, ITasks } from '../ITeamTasks'
import TaskContainerTemplate from './components/TaskContainerTemplate'
import CreateTaskContainerButton from './components/CreateTaskContainerButton'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'
import TaskTemplate from './components/TaskTemplate'

interface IProjectTasks {
    tasks: ITasks[]
    taskContainers: ITaskContainers[]
    userSessionToken: string | undefined
    TaskBannerToken: string
    projectToken: string
}

const ProjectTasks: FC<IProjectTasks> = ({ tasks, taskContainers, userSessionToken, TaskBannerToken, projectToken }) => {
    const [allTasks, setAllTasks] = useState<ITasks[]>(tasks)
    const [allTaskContainers, setAllTaskContainers] = useState<ITaskContainers[]>(taskContainers)
    const [isCreatingTaskContainer, setIsCreatingTaskContainer] = useState<boolean>(false)
    const [lastContainerUUID, setLastContainerUUID] = useState<string | null>(null)

    const createTaskContainer = async (newTaskContainerName: string): Promise<boolean> => {
        try {
            const resp = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/create-task-container`, {
                userSessionToken: userSessionToken,
                projectToken: projectToken,
                bannerToken: TaskBannerToken,
                taskContainerName: newTaskContainerName,
                taskContainerUUID: lastContainerUUID
            })

            if (resp.data.error === true) {
                return false
            }

            setIsCreatingTaskContainer(false)
            return true
        } catch (error) {
            return false
        }
    }

    const deleteTaskContainer = async (containerUUID: string): Promise<void> => {
        try {
            const resp = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/delete-task-container`, {
                userSessionToken: userSessionToken,
                bannerToken: TaskBannerToken,
                taskContainerUUID: containerUUID,
                projectToken: projectToken
            })

            if (resp.data.error === true) {
            }

            setAllTaskContainers(allTaskContainers.filter(container => container.containeruuid !== containerUUID))
        } catch (error: any) {}
    }

    return (
        <div className="flex h-full gap-4 overflow-x-auto p-4">
            {allTaskContainers.map((container: ITaskContainers, index: number) => (
                <TaskContainerTemplate
                    key={index}
                    title={container.containername}
                    containerState={container.state}
                    onCreateTaskContainer={createTaskContainer}
                    taskContainerUUID={container.containeruuid}
                    onDeleteTaskContainer={deleteTaskContainer}
                >
                    {allTasks
                        .filter(task => task.ContainerUUID === container.containeruuid)
                        .map((task: ITasks, index: number) => (
                            <TaskTemplate
                                key={index}
                                TaskUUID={task.TaskUUID}
                                title={task.TaskName}
                                taskState={task.State}
                                onCreateTask={async newTasktaskName => {
                                    return true
                                }}
                                onDeleteTask={async TaskUUID => {}}
                                taskContainerUUID={container.containeruuid}
                            />
                        ))}
                </TaskContainerTemplate>
            ))}
            <CreateTaskContainerButton
                addTaskContainer={() => {
                    setIsCreatingTaskContainer(true)
                    if (!isCreatingTaskContainer) {
                        let uuid = uuidv4()
                        setLastContainerUUID(uuid)
                        setAllTaskContainers([...allTaskContainers, { containeruuid: uuid, containername: '', state: EContainerState.Creating }])
                    }
                }}
            />
        </div>
    )
}

export default ProjectTasks
