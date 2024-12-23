'use client'
import React, { useState } from 'react'
import axios from 'axios'
import OptionPicker from '@/components/OptionPicker'

interface CreateProjectFormProps {
    userSessionToken: string | undefined
}

const CreateProjectForm: React.FC<CreateProjectFormProps> = ({ userSessionToken }) => {
    const [projectName, setProjectName] = useState<string>('')
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [repoType, setRepoType] = useState<string>('')

    const createProject = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!userSessionToken) {
            console.error('User token not found')
            return
        }

        try {
            setIsLoading(true)
            const resp = await axios.post(`${process.env.NEXT_PUBLIC_PROJECTS_SERVER}/api/projects/create-project`, {
                ProjectName: projectName,
                UserSessionToken: userSessionToken
            })
            if (resp.status === 200) setIsLoading(false)
        } catch (error) {
            console.error('Error creating project:', error)
        }
    }

    return (
        <div className="flex h-full justify-center">
            <form className="flex h-[60vh] w-[90%] flex-col self-center rounded-3xl bg-[#0000004d] p-4 shadow-xl md:h-[80vh] md:w-[60%] xl:w-[50%]" onSubmit={createProject}>
                <h1 className="mt-4 self-center text-2xl font-bold text-white">Add A New Project</h1>

                <div className="w-full lg:mt-10 3xl:mt-28">
                    <h1 className="text-white">Project Name</h1>
                    <input
                        className="mt-4 h-[4rem] w-full rounded-xl bg-[#00000048] indent-3 text-white"
                        placeholder="ProjectName..."
                        type="text"
                        value={projectName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProjectName(e.target.value)}
                    />
                </div>
                <div className="mt-10 w-full">
                    <h1 className="text-white">Project version control</h1>
                    <OptionPicker label='Type' options={['Git']} className='mt-4 w-full bg-[#00000048] text-white h-[4rem] rounded-xl' onChange={setRepoType} value={repoType} />
                </div>

                {!isLoading ? (
                    <input className="mt-10 h-[4rem] w-full cursor-pointer rounded-xl bg-[#00000048] text-xl text-white" type="submit" value="Create Project" />
                ) : (
                    <button className="mt-10 h-[4rem] w-full rounded-xl bg-[#00000048] text-xl text-white" disabled>
                        Creating Project...
                    </button>
                )}
            </form>
        </div>
    )
}

export default CreateProjectForm
