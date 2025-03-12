'use client'
import React, { useState } from 'react'
import axios from 'axios'
import OptionPicker from '@/components/OptionPicker'
import { Stepper } from '../utils/Stepper'
import { Roles } from '../utils/Roels'
import { useRouter } from 'next/navigation'

interface CreateProjectFormProps {
    userSessionToken: string | undefined
}

interface TeamMember {
    email: string
    role: string
}

const CreateProjectForm: React.FC<CreateProjectFormProps> = ({ userSessionToken }) => {
    const [step, setStep] = useState<number>(0)
    const [projectName, setProjectName] = useState<string>('')
    const [projectDescription, setProjectDescription] = useState<string>('')
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [newMemberEmail, setNewMemberEmail] = useState<string>('')
    const [newMemberRole, setNewMemberRole] = useState<string>('')
    const [repoType, setRepoType] = useState<string>('')
    const [isLoading, setIsLoading] = useState<boolean>(false)

    const router = useRouter()

    const steps = ['Project Details', 'Project Team', 'Codebase']

    const nextStep = () => {
        if (projectName && projectDescription || teamMembers.length > 0 || repoType) {
            setStep(prev => Math.min(prev + 1, steps.length - 1))
        } else {
            window.alert('Please fill out all fields')
        }
    }
    const prevStep = () => setStep(prev => Math.max(prev - 1, 0))

    const addTeamMember = () => {
        if (newMemberEmail && newMemberRole) {
            setTeamMembers([...teamMembers, { email: newMemberEmail, role: newMemberRole }])
            setNewMemberEmail('')
            setNewMemberRole('')
        }
    }

    const removeTeamMember = (index: number) => {
        const updatedMembers = [...teamMembers]
        updatedMembers.splice(index, 1)
        setTeamMembers(updatedMembers)
    }

    const createProject = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        window.alert('Project created successfully')

        if (!userSessionToken) {
            console.error('User token not found')
            return
        }

        try {
            setIsLoading(true)
            const resp = await axios.post(`${process.env.NEXT_PUBLIC_PROJECTS_SERVER}/api/projects/create-project`, {
                ProjectName: projectName,
                ProjectDescription: projectDescription,
                TeamMembers: teamMembers,
                RepoType: repoType,
                UserSessionToken: userSessionToken
            })
            if (resp.status === 200) {
                setIsLoading(false)
                router.push('/projects')
            }
        } catch (error) {
            console.error('Error creating project:', error)
            setIsLoading(false)
        }
    }

    return (
        <div className="flex h-full justify-center">
            <form className="flex h-[80vh] w-[90%] flex-col self-center rounded-3xl bg-[#0000004d] p-4 shadow-xl md:w-[60%] xl:w-[50%]" onSubmit={createProject}>
                <h1 className="mt-4 self-center text-2xl font-bold text-white">{steps[step]}</h1>

                <Stepper steps={steps} currentStep={step} />

                {step === 0 && (
                    <>
                        <div className="w-full lg:mt-10 3xl:mt-28">
                            <h1 className="text-white">Project Name</h1>
                            <input
                                className="mt-4 h-[4rem] w-full rounded-xl bg-[#00000048] indent-3 text-white"
                                placeholder="Project Name..."
                                type="text"
                                value={projectName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProjectName(e.target.value)}
                            />
                            <h1 className="mt-4 text-white">Project Description</h1>
                            <textarea
                                className="mt-4 h-[8rem] w-full rounded-xl bg-[#00000048] p-3 text-white"
                                placeholder="Project Description..."
                                value={projectDescription}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setProjectDescription(e.target.value)}
                            />
                        </div>
                        <div className="mb-8 mt-auto flex justify-center">
                            <button type="button" onClick={nextStep} className="mt-10 h-[4rem] w-[45%] rounded-xl bg-[#00000048] text-2xl text-white">
                                Next
                            </button>
                        </div>
                    </>
                )}

                {step === 1 && (
                    <>
                        <div className="w-full lg:mt-10 3xl:mt-28">
                            <h1 className="text-white">Project Team</h1>
                            <div className="mt-4 flex space-x-2">
                                <input
                                    className="h-[4rem] grow rounded-xl bg-[#00000048] indent-3 text-white"
                                    placeholder="Team Member Email"
                                    type="email"
                                    value={newMemberEmail}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMemberEmail(e.target.value)}
                                />

                                <OptionPicker label="Type" options={Roles} className="h-[4rem] w-full rounded-xl bg-[#00000048] text-white" onChange={setNewMemberRole} value={newMemberRole} />
                                <button type="button" onClick={addTeamMember} className="h-[4rem] rounded-xl bg-[#00000048] px-4 text-white">
                                    Add
                                </button>
                            </div>
                            <ul className="mt-4 list-disc pl-5 text-white">
                                {teamMembers.map((member, index) => (
                                    <li key={index}>
                                        {member.email} - {member.role}
                                        <button type="button" onClick={() => removeTeamMember(index)} className="ml-2 text-red-500">
                                            Remove
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="mb-8 mt-auto flex justify-between">
                            <button type="button" onClick={prevStep} className="mt-10 h-[4rem] w-[40%] rounded-xl bg-[#00000048] text-xl text-white">
                                Previous
                            </button>
                            <button type="button" onClick={nextStep} className="mt-10 h-[4rem] w-[40%] rounded-xl bg-[#00000048] text-2xl text-white">
                                Next
                            </button>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        <div className="mt-10 w-full">
                            <h1 className="text-white">Project version control</h1>
                            <OptionPicker label="Type" options={['Git', 'SVN (Not Supported yet)']} className="mt-4 h-[4rem] w-full rounded-xl bg-[#00000048] text-white" onChange={setRepoType} value={repoType} />
                        </div>
                        <div className="mb-8 mt-auto flex justify-between">
                            <button type="button" onClick={prevStep} className="mt-10 h-[4rem] w-[40%] rounded-xl bg-[#00000048] text-xl text-white">
                                Previous
                            </button>
                            <button type="submit" disabled={isLoading} className="mt-10 h-[4rem] w-[40%] rounded-xl bg-[#00000048] text-xl text-white">
                                {isLoading ? 'Creating Project...' : 'Create Project'}
                            </button>
                        </div>
                    </>
                )}
            </form>
        </div>
    )
}

export default CreateProjectForm
