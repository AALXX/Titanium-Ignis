'use client'

import type React from 'react'
import { useState } from 'react'
import { Stepper } from './Stepper'
import axios from 'axios'
import Image from 'next/image'

interface CreateCodebaseProps {
    userSessionToken?: string
    projectToken?: string
    onSubmit?: (data: CodebaseFormData) => void
}

interface CodebaseFormData {
    projectToken: string
    mode: 'create' | 'add'
    repositoryName?: string
    description?: string
    initializeWithReadme?: boolean
    gitignoreTemplate?: string
    license?: string
    repositoryUrl?: string
    projectType?: 'git' | 'svn'
    branch?: string
    authMethod?: 'ssh' | 'token' | 'credentials' | 'none'
    accessToken?: string
    sshKey?: string
    username?: string
    password?: string
    autoSync?: boolean
    syncInterval?: number
    lastUserCommitUserToken: string
}

const CreateCodebase: React.FC<CreateCodebaseProps> = ({ projectToken = 'default-project-token', userSessionToken, onSubmit }) => {
    const [currentStep, setCurrentStep] = useState(0)
    const [errors, setErrors] = useState<Record<string, string>>({})

    const [formData, setFormData] = useState<CodebaseFormData>({
        projectToken,
        mode: 'create',
        repositoryName: '',
        description: '',
        initializeWithReadme: true,
        gitignoreTemplate: 'none',
        license: 'none',
        repositoryUrl: '',
        projectType: 'git',
        branch: 'main',
        authMethod: 'token',
        autoSync: true,
        syncInterval: 5,
        lastUserCommitUserToken: userSessionToken || 'default-user-token'
    })

    const getSteps = () => {
        if (formData.mode === 'create') {
            return [
                { title: 'Mode Selection', description: 'Choose how to add codebase' },
                { title: 'Repository Details', description: 'Configure new repository' },
                { title: 'Repository Settings', description: 'Initialize repository' }
            ]
        }
        return [
            { title: 'Mode Selection', description: 'Choose how to add codebase' },
            { title: 'Repository Details', description: 'Configure your repository' },
            { title: 'Authentication', description: 'Set up access credentials' },
            { title: 'Sync Settings', description: 'Configure synchronization' }
        ]
    }

    const steps = getSteps()

    const validateStep = (step: number): boolean => {
        const newErrors: Record<string, string> = {}

        if (step === 0) return true

        if (formData.mode === 'create') {
            if (step === 1) {
                if (!formData.repositoryName?.trim()) {
                    newErrors.repositoryName = 'Repository name is required'
                } else if (!/^[a-zA-Z0-9-_]+$/.test(formData.repositoryName)) {
                    newErrors.repositoryName = 'Only letters, numbers, hyphens, and underscores allowed'
                }
            }
        } else {
            if (step === 1) {
                if (!formData.repositoryUrl?.trim()) {
                    newErrors.repositoryUrl = 'Repository URL is required'
                } else if (!isValidUrl(formData.repositoryUrl)) {
                    newErrors.repositoryUrl = 'Please enter a valid repository URL'
                }
                if (formData.projectType === 'git' && !formData.branch?.trim()) {
                    newErrors.branch = 'Branch name is required for Git repositories'
                }
            }

            if (step === 2) {
                if (formData.authMethod === 'token' && !formData.accessToken?.trim()) {
                    newErrors.accessToken = 'Access token is required'
                }
                if (formData.authMethod === 'ssh' && !formData.sshKey?.trim()) {
                    newErrors.sshKey = 'SSH key is required'
                }
                if (formData.authMethod === 'credentials') {
                    if (!formData.username?.trim()) newErrors.username = 'Username is required'
                    if (!formData.password?.trim()) newErrors.password = 'Password is required'
                }
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const isValidUrl = (url: string): boolean => {
        try {
            new URL(url)
            return true
        } catch {
            return false
        }
    }

    const handleNext = () => {
        if (validateStep(currentStep)) {
            if (currentStep < steps.length - 1) {
                setCurrentStep(currentStep + 1)
            } else {
                handleSubmit()
            }
        }
    }

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
            setErrors({})
        }
    }

    const handleSubmit = async () => {
        if (onSubmit) {
            onSubmit(formData)
        } else {
            const resp = await axios.post(`${process.env.NEXT_PUBLIC_PROJECTS_SERVER}/api/repositories/create`, formData)
            console.log(resp.data)
            // refreshPage
            window.location.reload()

            if (resp.status === 200) {
                window.location.reload()
            }
        }
    }

    const updateFormData = (field: keyof CodebaseFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[field]
                return newErrors
            })
        }
    }

    const handleModeChange = (mode: 'create' | 'add') => {
        updateFormData('mode', mode)
        setCurrentStep(0)
    }

    return (
        <div className="w-full max-w-4xl rounded-xl border-[#404040] bg-[#2a2a2a] p-6 text-white shadow-2xl">
            <div className="mx-auto max-w-3xl">
                <div className="mb-8">
                    <h1 className="mb-2 text-3xl font-bold">{formData.mode === 'create' ? 'Create Codebase' : 'Add Codebase'}</h1>
                    <p className="text-gray-400">{formData.mode === 'create' ? 'Create a new Git repository on your internal server' : 'Connect your Git or SVN repository to the project'}</p>
                </div>  

                <div className="mb-6">
                    <Stepper steps={steps} currentStep={currentStep} />
                </div>

                <div className="flex h-[600px] min-h-[600px] w-full flex-col overflow-y-auto rounded-lg border border-[#404040] bg-[#2a2a2a] p-8">
                    <div className="flex-1">
                        {currentStep === 0 && (
                            <div className="space-y-6">
                                <div>
                                    <label className="mb-4 block text-sm font-medium">
                                        How would you like to add a codebase? <span className="text-red-500">*</span>
                                    </label>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <button type="button" onClick={() => handleModeChange('create')} className={`rounded-lg border-2 p-6 text-left transition-all ${formData.mode === 'create' ? 'border-[#ffffff] bg-[#ffffff]/10' : 'border-[#404040] hover:border-[#505050]'} cursor-pointer`}>
                                            <div className="flex items-start gap-4">
                                                <svg className="mt-1 h-8 w-8 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                                <div>
                                                    <div className="mb-2 text-lg font-semibold">Create New Repository</div>
                                                    <div className="text-sm text-gray-400">Create a new Git repository on your internal server with custom settings</div>
                                                </div>
                                            </div>
                                        </button>

                                        <button type="button" onClick={() => handleModeChange('add')} className={`rounded-lg border-2 p-6 text-left transition-all ${formData.mode === 'add' ? 'border-[#ffffff] bg-[#ffffff]/10' : 'border-[#404040] hover:border-[#505050]'} cursor-pointer`}>
                                            <div className="flex items-start gap-4">
                                                <svg className="mt-1 h-8 w-8 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                </svg>
                                                <div>
                                                    <div className="mb-2 text-lg font-semibold">Add Existing Repository</div>
                                                    <div className="text-sm text-gray-400">Connect an existing Git or SVN repository from GitHub, GitLab, or other providers</div>
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* CREATE MODE STEPS */}
                        {formData.mode === 'create' && currentStep === 1 && (
                            <div className="space-y-6">
                                <div>
                                    <label htmlFor="repositoryName" className="mb-2 block text-sm font-medium">
                                        Repository Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="repositoryName"
                                        type="text"
                                        value={formData.repositoryName}
                                        onChange={e => updateFormData('repositoryName', e.target.value)}
                                        placeholder="my-awesome-project"
                                        className={`w-full rounded-lg border bg-[#1a1a1a] px-4 py-3 transition-all focus:ring-2 focus:outline-none ${errors.repositoryName ? 'border-red-500 focus:ring-red-500/50' : 'border-[#404040] focus:border-[#ffffff] focus:ring-[#ffffff]/50'}`}
                                    />
                                    {errors.repositoryName && <p className="mt-1 text-sm text-red-500">{errors.repositoryName}</p>}
                                    <p className="mt-1 text-xs text-gray-400">Use lowercase letters, numbers, hyphens, and underscores</p>
                                </div>

                                <div>
                                    <label htmlFor="description" className="mb-2 block text-sm font-medium">
                                        Description
                                    </label>
                                    <textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={e => updateFormData('description', e.target.value)}
                                        placeholder="A brief description of your repository..."
                                        rows={3}
                                        className="w-full rounded-lg border border-[#404040] bg-[#1a1a1a] px-4 py-3 transition-all focus:border-[#ffffff] focus:ring-2 focus:ring-[#ffffff]/50 focus:outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        {formData.mode === 'create' && currentStep === 2 && (
                            <div className="space-y-6">
                                <div className="flex items-start gap-3 rounded-lg border border-[#404040] bg-[#1a1a1a] p-4">
                                    <input id="initializeWithReadme" type="checkbox" checked={formData.initializeWithReadme} onChange={e => updateFormData('initializeWithReadme', e.target.checked)} className="mt-1 h-4 w-4 rounded border-[#404040] bg-[#2a2a2a] text-[#ffffff] focus:ring-[#ffffff] focus:ring-offset-0" />
                                    <div className="flex-1">
                                        <label htmlFor="initializeWithReadme" className="block cursor-pointer font-medium">
                                            Initialize with README
                                        </label>
                                        <p className="mt-1 text-sm text-gray-400">Add a README.md file to describe your project</p>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="gitignoreTemplate" className="mb-2 block text-sm font-medium">
                                        .gitignore Template
                                    </label>
                                    <select id="gitignoreTemplate" value={formData.gitignoreTemplate} onChange={e => updateFormData('gitignoreTemplate', e.target.value)} className="w-full rounded-lg border border-[#404040] bg-[#1a1a1a] px-4 py-3 transition-all focus:border-[#ffffff] focus:ring-2 focus:ring-[#ffffff]/50 focus:outline-none">
                                        <option value="none">None</option>
                                        <option value="node">Node.js</option>
                                        <option value="python">Python</option>
                                        <option value="java">Java</option>
                                        <option value="go">Go</option>
                                        <option value="rust">Rust</option>
                                        <option value="csharp">C#</option>
                                        <option value="php">PHP</option>
                                        <option value="ruby">Ruby</option>
                                    </select>
                                    <p className="mt-1 text-xs text-gray-400">Choose a template to ignore common files for your language</p>
                                </div>

                                <div>
                                    <label htmlFor="license" className="mb-2 block text-sm font-medium">
                                        License
                                    </label>
                                    <select id="license" value={formData.license} onChange={e => updateFormData('license', e.target.value)} className="w-full rounded-lg border border-[#404040] bg-[#1a1a1a] px-4 py-3 transition-all focus:border-[#ffffff] focus:ring-2 focus:ring-[#ffffff]/50 focus:outline-none">
                                        <option value="none">None</option>
                                        <option value="mit">MIT License</option>
                                        <option value="apache-2.0">Apache License 2.0</option>
                                        <option value="gpl-3.0">GNU GPLv3</option>
                                        <option value="bsd-3-clause">BSD 3-Clause</option>
                                        <option value="unlicense">The Unlicense</option>
                                    </select>
                                    <p className="mt-1 text-xs text-gray-400">Choose a license for your project</p>
                                </div>

                                <div className="rounded-lg border border-[#404040] bg-[#1a1a1a] p-4">
                                    <h3 className="mb-3 font-medium">Summary</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Repository Name:</span>
                                            <span className="font-medium">{formData.repositoryName || 'Not set'}</span>
                                        </div>

                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Initialize with README:</span>
                                            <span className="font-medium">{formData.initializeWithReadme ? 'Yes' : 'No'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">.gitignore:</span>
                                            <span className="font-medium capitalize">{formData.gitignoreTemplate}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">License:</span>
                                            <span className="font-medium">{formData.license === 'none' ? 'None' : formData.license}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ADD MODE STEPS */}
                        {formData.mode === 'add' && currentStep === 1 && (
                            <div className="space-y-6">
                                <div>
                                    <label className="mb-2 block text-sm font-medium">
                                        Repository Type <span className="text-red-500">*</span>
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button type="button" onClick={() => updateFormData('projectType', 'git')} className={`rounded-lg border-2 p-4 transition-all ${formData.projectType === 'git' ? 'border-[#ffffff] bg-[#ffffff]/10' : 'border-[#404040] hover:border-[#505050]'}`}>
                                            <div className="flex items-center gap-3">
                                                <Image src="/Editor/github.svg" alt="git" width={24} height={24} />
                                                <div className="text-left">
                                                    <div className="font-semibold">Git</div>
                                                    <div className="text-xs text-gray-400">GitHub, GitLab, Bitbucket</div>
                                                </div>
                                            </div>
                                        </button>

                                        <button type="button" onClick={() => updateFormData('projectType', 'svn')} className={`rounded-lg border-2 p-4 transition-all ${formData.projectType === 'svn' ? 'border-[#ffffff] bg-[#ffffff]/10' : 'border-[#404040] hover:border-[#505050]'}`}>
                                            <div className="flex items-center gap-3">
                                                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                                                </svg>
                                                <div className="text-left">
                                                    <div className="font-semibold">SVN</div>
                                                    <div className="text-xs text-gray-400">Apache Subversion</div>
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="repositoryUrl" className="mb-2 block text-sm font-medium">
                                        Repository URL <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="repositoryUrl"
                                        type="text"
                                        value={formData.repositoryUrl}
                                        onChange={e => updateFormData('repositoryUrl', e.target.value)}
                                        placeholder={formData.projectType === 'git' ? 'https://github.com/username/repository.git' : 'https://svn.example.com/repository'}
                                        className={`w-full rounded-lg border bg-[#1a1a1a] px-4 py-3 transition-all focus:ring-2 focus:outline-none ${errors.repositoryUrl ? 'border-red-500 focus:ring-red-500/50' : 'border-[#404040] focus:border-[#ffffff] focus:ring-[#ffffff]/50'}`}
                                    />
                                    {errors.repositoryUrl && <p className="mt-1 text-sm text-red-500">{errors.repositoryUrl}</p>}
                                </div>

                                {formData.projectType === 'git' && (
                                    <div>
                                        <label htmlFor="branch" className="mb-2 block text-sm font-medium">
                                            Default Branch <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="branch"
                                            type="text"
                                            value={formData.branch}
                                            onChange={e => updateFormData('branch', e.target.value)}
                                            placeholder="main"
                                            className={`w-full rounded-lg border bg-[#1a1a1a] px-4 py-3 transition-all focus:ring-2 focus:outline-none ${errors.branch ? 'border-red-500 focus:ring-red-500/50' : 'border-[#404040] focus:border-[#ffffff] focus:ring-[#ffffff]/50'}`}
                                        />
                                        {errors.branch && <p className="mt-1 text-sm text-red-500">{errors.branch}</p>}
                                        <p className="mt-1 text-xs text-gray-400">Common branches: main, master, develop</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {formData.mode === 'add' && currentStep === 2 && (
                            <div className="space-y-6">
                                <div>
                                    <label className="mb-2 block text-sm font-medium">
                                        Authentication Method <span className="text-red-500">*</span>
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button type="button" onClick={() => updateFormData('authMethod', 'token')} className={`rounded-lg border-2 p-4 transition-all ${formData.authMethod === 'token' ? 'border-[#ffffff] bg-[#ffffff]/10' : 'border-[#404040] hover:border-[#505050]'}`}>
                                            <div className="text-left">
                                                <div className="font-semibold">Access Token</div>
                                                <div className="text-xs text-gray-400">Personal access token</div>
                                            </div>
                                        </button>

                                        <button type="button" onClick={() => updateFormData('authMethod', 'ssh')} className={`rounded-lg border-2 p-4 transition-all ${formData.authMethod === 'ssh' ? 'border-[#ffffff] bg-[#ffffff]/10' : 'border-[#404040] hover:border-[#505050]'}`}>
                                            <div className="text-left">
                                                <div className="font-semibold">SSH Key</div>
                                                <div className="text-xs text-gray-400">SSH authentication</div>
                                            </div>
                                        </button>

                                        <button type="button" onClick={() => updateFormData('authMethod', 'credentials')} className={`rounded-lg border-2 p-4 transition-all ${formData.authMethod === 'credentials' ? 'border-[#ffffff] bg-[#ffffff]/10' : 'border-[#404040] hover:border-[#505050]'}`}>
                                            <div className="text-left">
                                                <div className="font-semibold">Username/Password</div>
                                                <div className="text-xs text-gray-400">Basic authentication</div>
                                            </div>
                                        </button>

                                        <button type="button" onClick={() => updateFormData('authMethod', 'none')} className={`rounded-lg border-2 p-4 transition-all ${formData.authMethod === 'none' ? 'border-[#ffffff] bg-[#ffffff]/10' : 'border-[#404040] hover:border-[#505050]'}`}>
                                            <div className="text-left">
                                                <div className="font-semibold">None</div>
                                                <div className="text-xs text-gray-400">Public repository</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {formData.authMethod === 'token' && (
                                    <div>
                                        <label htmlFor="accessToken" className="mb-2 block text-sm font-medium">
                                            Personal Access Token <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="accessToken"
                                            type="password"
                                            value={formData.accessToken || ''}
                                            onChange={e => updateFormData('accessToken', e.target.value)}
                                            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                            className={`w-full rounded-lg border bg-[#1a1a1a] px-4 py-3 transition-all focus:ring-2 focus:outline-none ${errors.accessToken ? 'border-red-500 focus:ring-red-500/50' : 'border-[#404040] focus:border-[#ffffff] focus:ring-[#ffffff]/50'}`}
                                        />
                                        {errors.accessToken && <p className="mt-1 text-sm text-red-500">{errors.accessToken}</p>}
                                        <p className="mt-1 text-xs text-gray-400">Generate a token from your repository provider's settings</p>
                                    </div>
                                )}

                                {formData.authMethod === 'ssh' && (
                                    <div>
                                        <label htmlFor="sshKey" className="mb-2 block text-sm font-medium">
                                            SSH Private Key <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            id="sshKey"
                                            value={formData.sshKey || ''}
                                            onChange={e => updateFormData('sshKey', e.target.value)}
                                            placeholder="-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----"
                                            rows={6}
                                            className={`w-full rounded-lg border bg-[#1a1a1a] px-4 py-3 font-mono text-sm transition-all focus:ring-2 focus:outline-none ${errors.sshKey ? 'border-red-500 focus:ring-red-500/50' : 'border-[#404040] focus:border-[#ffffff] focus:ring-[#ffffff]/50'}`}
                                        />
                                        {errors.sshKey && <p className="mt-1 text-sm text-red-500">{errors.sshKey}</p>}
                                        <p className="mt-1 text-xs text-gray-400">Paste your SSH private key. Keep this secure and never share it.</p>
                                    </div>
                                )}

                                {formData.authMethod === 'credentials' && (
                                    <>
                                        <div>
                                            <label htmlFor="username" className="mb-2 block text-sm font-medium">
                                                Username <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                id="username"
                                                type="text"
                                                value={formData.username || ''}
                                                onChange={e => updateFormData('username', e.target.value)}
                                                placeholder="your-username"
                                                className={`w-full rounded-lg border bg-[#1a1a1a] px-4 py-3 transition-all focus:ring-2 focus:outline-none ${errors.username ? 'border-red-500 focus:ring-red-500/50' : 'border-[#404040] focus:border-[#ffffff] focus:ring-[#ffffff]/50'}`}
                                            />
                                            {errors.username && <p className="mt-1 text-sm text-red-500">{errors.username}</p>}
                                        </div>

                                        <div>
                                            <label htmlFor="password" className="mb-2 block text-sm font-medium">
                                                Password <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                id="password"
                                                type="password"
                                                value={formData.password || ''}
                                                onChange={e => updateFormData('password', e.target.value)}
                                                placeholder="••••••••"
                                                className={`w-full rounded-lg border bg-[#1a1a1a] px-4 py-3 transition-all focus:ring-2 focus:outline-none ${errors.password ? 'border-red-500 focus:ring-red-500/50' : 'border-[#404040] focus:border-[#ffffff] focus:ring-[#ffffff]/50'}`}
                                            />
                                            {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {formData.mode === 'add' && currentStep === 3 && (
                            <div className="space-y-6">
                                <div className="flex items-start gap-3 rounded-lg border border-[#404040] bg-[#1a1a1a] p-4">
                                    <input id="autoSync" type="checkbox" checked={formData.autoSync} onChange={e => updateFormData('autoSync', e.target.checked)} className="mt-1 h-4 w-4 rounded border-[#404040] bg-[#2a2a2a] text-[#ffffff] focus:ring-[#ffffff] focus:ring-offset-0" />
                                    <div className="flex-1">
                                        <label htmlFor="autoSync" className="block cursor-pointer font-medium">
                                            Enable Auto-Sync
                                        </label>
                                        <p className="mt-1 text-sm text-gray-400">Automatically sync repository changes at regular intervals</p>
                                    </div>
                                </div>

                                {formData.autoSync && (
                                    <div>
                                        <label htmlFor="syncInterval" className="mb-2 block text-sm font-medium">
                                            Sync Interval (minutes)
                                        </label>
                                        <input
                                            id="syncInterval"
                                            type="number"
                                            min="1"
                                            max="60"
                                            value={formData.syncInterval || 5}
                                            onChange={e => updateFormData('syncInterval', Number.parseInt(e.target.value))}
                                            className="w-full rounded-lg border border-[#404040] bg-[#1a1a1a] px-4 py-3 transition-all focus:border-[#ffffff] focus:ring-2 focus:ring-[#ffffff]/50 focus:outline-none"
                                        />
                                        <p className="mt-1 text-xs text-gray-400">How often to check for new changes (1-60 minutes)</p>
                                    </div>
                                )}

                                <div className="rounded-lg border border-[#404040] bg-[#1a1a1a] p-4">
                                    <h3 className="mb-3 font-medium">Summary</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Repository Type:</span>
                                            <span className="font-medium uppercase">{formData.projectType}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Repository URL:</span>
                                            <span className="ml-4 max-w-xs truncate font-medium" title={formData.repositoryUrl}>
                                                {formData.repositoryUrl || 'Not set'}
                                            </span>
                                        </div>
                                        {formData.projectType === 'git' && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Branch:</span>
                                                <span className="font-medium">{formData.branch}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Authentication:</span>
                                            <span className="font-medium capitalize">{formData.authMethod}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Auto-Sync:</span>
                                            <span className="font-medium">{formData.autoSync ? `Every ${formData.syncInterval} min` : 'Disabled'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-auto flex-shrink-0 border-t border-[#404040] pt-6">
                        <div className="flex justify-between">
                            <button type="button" onClick={handleBack} disabled={currentStep === 0} className="rounded-lg border border-[#404040] px-6 py-3 transition-all hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-50">
                                Back
                            </button>
                            <button type="button" onClick={handleNext} className="rounded-lg bg-[#ffffff] px-6 py-3 font-medium text-black transition-all hover:bg-[#acacac]">
                                {currentStep === steps.length - 1 ? (formData.mode === 'create' ? 'Create Repository' : 'Connect Repository') : 'Next'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CreateCodebase
