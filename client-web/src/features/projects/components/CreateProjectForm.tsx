'use client'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { Stepper } from '../utils/Stepper'
import { useRouter } from 'next/navigation'
import { X, Mail, UserCircle, DollarSign, Users, ListTodo, Code, Rocket, FolderKanban, ChevronDown, Search } from 'lucide-react'
import { Roles } from '../utils/Roels'

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
    const [enabledModules, setEnabledModules] = useState<string[]>([])
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [newMemberEmail, setNewMemberEmail] = useState<string>('')
    const [newMemberRole, setNewMemberRole] = useState<string>('')
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [errors, setErrors] = useState<{
        projectName?: string
        projectDescription?: string
        projectType?: string
        email?: string
    }>({})
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [isSearchLoading, setIsSearchLoading] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    
    const router = useRouter()

    const steps = ['Project Details', 'Project Settings', 'Project Team']

    const availableModules = [
        { id: 'financial', name: 'Financial Management', icon: DollarSign, description: 'Track budgets and expenses' },
        { id: 'team', name: 'Team Management', icon: Users, description: 'Manage team members and roles' },
        { id: 'tasks', name: 'Task List', icon: ListTodo, description: 'Create and track tasks' },
        { id: 'code', name: 'Code Repository', icon: Code, description: 'Version control integration' },
        { id: 'deployments', name: 'Deployments', icon: Rocket, description: 'Deploy and monitor releases' }
    ]

    useEffect(() => {
        const handleSearch = async () => {
            if (newMemberEmail.length > 0 && newMemberEmail != null) {
                setIsSearchLoading(true)
                setErrors({ email: '' })

                try {
                    const results = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/user-account-manager/search-users/${newMemberEmail}`)
                    setSearchResults(results.data.usersData || [])
                    setShowDropdown(true)
                } catch (err) {
                    setErrors({ email: 'Failed to search for users' })
                    setSearchResults([])
                } finally {
                    setIsSearchLoading(false)
                }
            } else {
                setSearchResults([])
                setShowDropdown(false)
            }
        }

        const timeoutId = setTimeout(handleSearch, 300)
        return () => clearTimeout(timeoutId)
    }, [newMemberEmail])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const handleSelectUser = (user: any) => {
        setSelectedUser(user)
        setNewMemberEmail(user.useremail)
        setShowDropdown(false)
    }

    const validateStep = () => {
        const newErrors: typeof errors = {}

        if (step === 0) {
            if (!projectName.trim()) {
                newErrors.projectName = 'Project name is required'
            }
            if (!projectDescription.trim()) {
                newErrors.projectDescription = 'Project description is required'
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const nextStep = () => {
        if (validateStep()) {
            setStep(prev => Math.min(prev + 1, steps.length - 1))
        }
    }

    const prevStep = () => setStep(prev => Math.max(prev - 1, 0))

    const validateEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    const addTeamMember = () => {
        if (newMemberEmail && newMemberRole) {
            if (!validateEmail(newMemberEmail)) {
                setErrors({ ...errors, email: 'Please enter a valid email address' })
                return
            }
            setTeamMembers([...teamMembers, { email: newMemberEmail, role: newMemberRole }])
            setNewMemberEmail('')
            setNewMemberRole('')
            setSelectedUser(null)
            setSearchResults([])
            setShowDropdown(false)
            setErrors({ ...errors, email: undefined })
        }
    }

    const removeTeamMember = (index: number) => {
        const updatedMembers = [...teamMembers]
        updatedMembers.splice(index, 1)
        setTeamMembers(updatedMembers)
    }

    const toggleModule = (moduleId: string) => {
        setEnabledModules(prev => (prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]))
    }

    const createProject = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (!userSessionToken) {
            console.error('User token not found')
            return
        }

        try {
            setIsLoading(true)
            const resp = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/create-project`, {
                ProjectName: projectName,
                ProjectDescription: projectDescription,
                EnabledModules: enabledModules,
                TeamMembers: teamMembers,
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

    const getStepSubtitle = () => {
        switch (step) {
            case 0:
                return 'Set up your project basics'
            case 1:
                return 'Configure your project  modules'
            case 2:
                return 'Add team members to collaborate'
            default:
                return ''
        }
    }

    return (
        <div className="flex h-screen items-center justify-center overflow-auto">
            <form className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col rounded-xl border border-[#404040] bg-[#2a2a2a] shadow-2xl" onSubmit={createProject}>
                <div className="flex-shrink-0 px-8 pt-8 pb-4 text-center">
                    <h1 className="text-3xl font-bold text-white">{steps[step]}</h1>
                    <p className="mt-2 text-sm text-[#a0a0a0]">{getStepSubtitle()}</p>
                </div>

                <div className="flex-shrink-0 px-8 pb-4">
                    <Stepper steps={steps} currentStep={step} />
                </div>

                {step === 0 && (
                    <div className="scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500 flex-1 space-y-6 overflow-y-auto px-8 pb-8">
                        <div className="space-y-2">
                            <label htmlFor="project-name" className="block text-base font-medium text-white">
                                Project Name
                            </label>
                            <input
                                id="project-name"
                                placeholder="Enter your project name"
                                type="text"
                                value={projectName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    setProjectName(e.target.value)
                                    if (errors.projectName) setErrors({ ...errors, projectName: undefined })
                                }}
                                className={`w-full rounded-lg border bg-[#1a1a1a] px-4 py-3 text-white placeholder-[#666666] transition-colors outline-none focus:border-[#ffffff] ${errors.projectName ? 'border-red-500' : 'border-[#404040]'}`}
                            />
                            {errors.projectName && <p className="text-sm text-red-500">{errors.projectName}</p>}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="project-description" className="block text-base font-medium text-white">
                                Project Description
                            </label>
                            <textarea
                                id="project-description"
                                placeholder="Describe your project goals and objectives"
                                value={projectDescription}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                    setProjectDescription(e.target.value)
                                    if (errors.projectDescription) setErrors({ ...errors, projectDescription: undefined })
                                }}
                                className={`min-h-[120px] w-full resize-none rounded-lg border bg-[#1a1a1a] px-4 py-3 text-white placeholder-[#666666] transition-colors outline-none focus:border-[#ffffff] ${errors.projectDescription ? 'border-red-500' : 'border-[#404040]'}`}
                            />
                            {errors.projectDescription && <p className="text-sm text-red-500">{errors.projectDescription}</p>}
                        </div>

                        <div className="flex justify-end pt-4">
                            <button type="button" onClick={nextStep} className="min-w-[120px] cursor-pointer rounded-lg bg-[#ffffff] px-6 py-3 text-base font-medium text-black transition-colors hover:bg-[#8b8b8b]">
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {step === 1 && (
                    <div className="scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500 flex-1 space-y-6 overflow-y-auto px-8 pb-8">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-base font-medium text-white">Enable Modules</label>
                                <p className="mt-1 text-sm text-[#a0a0a0]">Select the features you want to use in your project</p>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {availableModules.map(module => {
                                    const IconComponent = module.icon
                                    const isEnabled = enabledModules.includes(module.id)
                                    return (
                                        <div key={module.id} className={`cursor-pointer rounded-lg border-2 p-4 transition-all hover:border-[#ffffff]/50 ${isEnabled ? 'border-[#ffffff] bg-[#ffffff]/10' : 'border-[#404040] bg-[#1a1a1a]'}`} onClick={() => toggleModule(module.id)}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isEnabled ? 'bg-[#ffffff]' : 'bg-[#333333]'}`}>
                                                        <IconComponent className={`h-5 w-5 ${isEnabled ? 'text-black' : 'text-[#888888]'}`} />
                                                    </div>
                                                    <div>
                                                        <p className={`text-sm font-medium ${isEnabled ? 'text-white' : 'text-[#a0a0a0]'}`}>{module.name}</p>
                                                        <p className="text-xs text-[#888888]">{module.description}</p>
                                                    </div>
                                                </div>
                                                <div className={`flex h-5 w-5 items-center justify-center rounded border-2 ${isEnabled ? 'border-[#ffffff] bg-[#ffffff]' : 'border-[#666666]'}`}>
                                                    {isEnabled && (
                                                        <svg className="h-3 w-3 text-black" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="flex justify-between gap-4 pt-4">
                            <button type="button" onClick={prevStep} className="min-w-[120px] rounded-lg border border-[#404040] bg-transparent px-6 py-3 text-base font-medium text-white transition-colors hover:bg-[#333333]">
                                Previous
                            </button>
                            <button type="button" onClick={nextStep} className="min-w-[120px] rounded-lg bg-[#ffffff] px-6 py-3 text-base font-medium text-black transition-colors hover:bg-[#8b8b8b] cursor-pointer">
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500 flex-1 space-y-6 overflow-y-auto px-8 pb-8">
                        <div className="space-y-4">
                            <label className="block text-base font-medium text-white">Add Team Members</label>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <div className="relative flex-1 space-y-2">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Search className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        placeholder="Search by email"
                                        type="email"
                                        value={newMemberEmail}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            setNewMemberEmail(e.target.value)
                                            if (errors.email) setErrors({ ...errors, email: undefined })
                                        }}
                                        className={`w-full rounded-lg border bg-[#1a1a1a] py-3 pr-4 pl-10 text-white placeholder-[#666666] transition-colors outline-none focus:border-[#ffffff] ${errors.email ? 'border-red-500' : 'border-[#404040]'}`}
                                    />
                                    {isSearchLoading && (
                                        <div className="absolute top-1/2 right-3 -translate-y-1/2 transform">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></div>
                                        </div>
                                    )}
                                    {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}

                                    {showDropdown && searchResults.length > 0 && (
                                        <div ref={dropdownRef} className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-600 bg-[#2a2a2a] shadow-lg">
                                            {searchResults.map(user => (
                                                <div key={user.id} className="flex cursor-pointer items-center gap-3 border-b border-gray-600 p-3 last:border-b-0 hover:bg-[#3a3a3a]" onClick={() => handleSelectUser(user)}>
                                                    <img src={user.avatar || '/placeholder.svg'} alt={user.username} className="h-8 w-8 rounded-full object-cover" />
                                                    <div>
                                                        <p className="text-sm font-medium text-white">{user.username}</p>
                                                        <p className="text-xs text-gray-400">{user.useremail}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {showDropdown && newMemberEmail && searchResults.length === 0 && !isSearchLoading && (
                                        <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-600 bg-[#2a2a2a] p-3 text-center shadow-lg">
                                            <p className="text-sm text-gray-400">No users found</p>
                                        </div>
                                    )}
                                </div>

                                <div className="relative w-full sm:w-[180px]">
                                    <select value={newMemberRole} onChange={e => setNewMemberRole(e.target.value)} className="w-full appearance-none rounded-lg border border-[#404040] bg-[#1a1a1a] px-4 py-3 pr-10 text-white transition-colors outline-none focus:border-[#ffffff]">
                                        <option value="" disabled>
                                            Select role
                                        </option>
                                        {Roles.map(role => (
                                            <option key={role} value={role}>
                                                {role
                                                    .replace(/_/g, ' ')
                                                    .toLowerCase()
                                                    .replace(/\b\w/g, l => l.toUpperCase())}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2 text-[#666666]" />
                                </div>

                                <button type="button" onClick={addTeamMember} className="w-full rounded-lg border border-[#404040] bg-[#333333] px-6 py-3 text-base font-medium text-white transition-colors hover:bg-[#3a3a3a] sm:w-auto">
                                    Add Member
                                </button>
                            </div>

                            {selectedUser && newMemberRole && (
                                <div className="rounded-md bg-[#3a3a3a] p-4">
                                    <div className="flex items-center gap-3">
                                        <img src={selectedUser.avatar || '/placeholder.svg'} alt={selectedUser.username} className="h-10 w-10 rounded-full object-cover" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-white">{selectedUser.username}</p>
                                            <p className="text-xs text-gray-400">{selectedUser.useremail}</p>
                                            <p className="mt-1 text-xs font-medium text-[#3bc970]">
                                                {newMemberRole
                                                    .replace(/_/g, ' ')
                                                    .toLowerCase()
                                                    .replace(/\b\w/g, l => l.toUpperCase())}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500">Ready to add</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {teamMembers.length > 0 && (
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-[#a0a0a0]">Team Members ({teamMembers.length})</label>
                                <div className="space-y-2">
                                    {teamMembers.map((member, index) => (
                                        <div key={index} className="rounded-lg border border-[#404040] bg-[#1a1a1a] p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffffff]/20">
                                                        <UserCircle className="h-5 w-5 text-[#ffffff]" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <Mail className="h-4 w-4 text-[#888888]" />
                                                            <span className="text-sm font-medium text-white">{member.email}</span>
                                                        </div>
                                                        <span className="text-xs text-[#888888]">
                                                            {member.role
                                                                .replace(/_/g, ' ')
                                                                .toLowerCase()
                                                                .replace(/\b\w/g, l => l.toUpperCase())}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button type="button" onClick={() => removeTeamMember(index)} className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-500/10">
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {teamMembers.length === 0 && (
                            <div className="rounded-lg border border-dashed border-[#404040] bg-[#1a1a1a] p-8 text-center">
                                <UserCircle className="mx-auto h-12 w-12 text-[#666666]" />
                                <p className="mt-2 text-sm text-[#888888]">No team members added yet. Add members to collaborate on this project.</p>
                            </div>
                        )}

                        <div className="flex justify-between gap-4 pt-4">
                            <button type="button" onClick={prevStep} className="min-w-[120px] rounded-lg border border-[#404040] bg-transparent px-6 py-3 text-base font-medium text-white transition-colors hover:bg-[#333333]">
                                Previous
                            </button>
                            <button type="submit" disabled={isLoading} className="min-w-[120px] rounded-lg bg-[#ffffff] px-6 py-3 text-base font-medium text-black transition-colors hover:bg-[#8b8b8b] disabled:opacity-50 cursor-pointer">
                                {isLoading ? 'Creating...' : 'Create Project'}
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    )
}

export default CreateProjectForm
