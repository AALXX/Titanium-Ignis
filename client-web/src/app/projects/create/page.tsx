'use client'
import React from 'react'
import OptionPicker from '@/components/CommonUI/OptionPicker'
import { useState } from 'react'

const Createproject = () => {
    const [projectName, setProjectName] = useState<string>('')
    const [RepoURL, setRepoURL] = useState<string>('')
    const [RepoType, setRepoType] = useState<string>('Git')

    return (
        <div className="flex h-full justify-center">
            <div className="flex h-[60vh] w-[90%] flex-col self-center rounded-3xl bg-[#0000004d] p-4 shadow-xl md:h-[80vh] md:w-[60%] xl:w-[50%]">
                <h1 className="self-center text-2xl font-bold text-white">Add A New Project</h1>

                <div className="mt-32 w-full">
                    <h1 className="text-white">Project Name</h1>
                    <input
                        className="mt-4 h-[4rem] w-full rounded-xl bg-[#00000048] indent-3 text-white"
                        placeholder="ProjectName..."
                        type="text"
                        value={projectName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProjectName(e.target.value)}
                    />
                </div>

                <div className="mt-8 w-full">
                    <h1 className="text-white">Repository URL</h1>
                    <input
                        className="mt-4 h-[4rem] w-full rounded-xl bg-[#00000048] indent-3 text-white"
                        placeholder="Repository URL..."
                        type="text"
                        value={RepoURL}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRepoURL(e.target.value)}
                    />
                </div>

                <div className="mt-8 w-full">
                    <h1 className="text-white">Repository Type</h1>
                    <OptionPicker
                        label="Project Type"
                        options={['Svn', 'Git']}
                        value={RepoType}
                        onChange={value => {
                            setRepoType(value)
                        }}
                        className="mt-2 block h-[4rem] w-full rounded-xl bg-[#00000048] px-4 py-2 text-white shadow-sm focus:outline-none"
                    />
                </div>
            </div>
        </div>
    )
}

export default Createproject
