'use client'
import DoubleValueOptionPicker from '@/components/DoubleValueOptionPicker'
import OptionPicker from '@/components/OptionPicker'
import { GitBranch, Server, Tag, Box, Info, Rocket, Computer } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'
import { Socket } from 'socket.io-client'

interface DeploymentData {
    name: string
    type: 'docker' | 'kubernetes'
    branch: string
    version: string
    domain: string
    description: string
    server: string
    deploymentID: number
}

interface ICreteDeployment {
    socketRef: Socket
    userSessionToken: string
    projectToken: string
    deployments: Array<{ deployName: string; deployID: number }>
}

const CreateDeployment: React.FC<ICreteDeployment> = ({ socketRef, userSessionToken, projectToken, deployments }) => {
    const [deploymentData, setDeploymentData] = useState<DeploymentData>({
        name: '',
        type: 'docker',
        branch: 'main',
        version: 'latest',
        domain: `${projectToken}.ti.dev`,
        description: '',
        server: 'localhost',
        deploymentID: 0
    })

    const [errors, setErrors] = useState<Partial<Record<keyof DeploymentData, string>>>({})

    const handleChange = (field: keyof DeploymentData, value: string | boolean) => {
        setDeploymentData(prev => ({
            ...prev,
            [field]: value
        }))

        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: undefined
            }))
        }
    }

    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof DeploymentData, string>> = {}

        if (!deploymentData.name.trim()) {
            newErrors.name = 'Deployment name is required'
        }

        if (!deploymentData.branch.trim()) {
            newErrors.branch = 'Branch is required'
        }

        if (!deploymentData.version.trim()) {
            newErrors.version = 'Version is required'
        }

        if (!deploymentData.domain.trim()) {
            newErrors.domain = 'Domain is required'
        }

        if (!deploymentData.server.trim()) {
            newErrors.server = 'Server is required'
        }

        if (!deploymentData.deploymentID) {
            newErrors.deploymentID = 'Deployment ID is required'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        socketRef.emit('start-deployment', {
            userSessionToken: userSessionToken,
            projectToken: projectToken,
            name: deploymentData.name,
            deploymentID: deploymentData.deploymentID,
            branch: deploymentData.branch,
            version: deploymentData.version,
            server: deploymentData.server,
            domain: deploymentData.domain,
            description: deploymentData.description
        })
    }

    return (
        <div className="flex w-full flex-col rounded-xl">
            <div className="mb-6 flex flex-col items-center justify-center text-center">
                <h2 className="text-2xl font-bold text-white">Create New Deployment</h2>

                <div className="mt-4 flex flex-wrap justify-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${deploymentData.type === 'docker' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                        <span className="text-white">Type: {deploymentData.type}</span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="w-full px-4">
                <div className="mb-6 w-full">
                    <h3 className="mb-3 text-center text-lg font-semibold text-white">Basic Information</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-2 rounded-lg bg-[#3a3a3a] p-4">
                            <label htmlFor="name" className="text-sm text-white/70">
                                Deployment Name
                            </label>
                            <div className="relative">
                                <Box className="absolute top-2.5 left-3 h-4 w-4 text-white/50" />
                                <input
                                    id="name"
                                    placeholder="Enter deployment name"
                                    value={deploymentData.name}
                                    onChange={e => handleChange('name', e.target.value)}
                                    className={`w-full rounded-md border-0 bg-[#2e2e2e] px-3 py-2 pl-9 text-white placeholder:text-white/30 focus:ring-2 focus:ring-white focus:outline-none`}
                                />
                            </div>
                            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                        </div>

                        <div className="flex flex-col gap-2 rounded-lg bg-[#3a3a3a] p-4">
                            <label htmlFor="type" className="text-sm text-white/70">
                                Deployment Type
                            </label>
                            <div className="relative">
                                <Rocket className="absolute top-2.5 left-3 h-4 w-4 text-white/50" />
                                <OptionPicker
                                    options={['docker', 'kubernetes', 'serverless']}
                                    className="w-full rounded-md border-0 bg-[#2e2e2e] px-3 py-2 pl-9 text-white focus:ring-2 focus:ring-white focus:outline-none"
                                    value={deploymentData.type}
                                    label="Type"
                                    onChange={value => handleChange('type', value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="mb-3 text-center text-lg font-semibold text-white">Source Control</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-2 rounded-lg bg-[#3a3a3a] p-4">
                            <label htmlFor="branch" className="text-sm text-white/70">
                                Branch
                            </label>
                            <div className="relative">
                                <GitBranch className="absolute top-2.5 left-3 h-4 w-4 text-white/50" />
                                <input
                                    id="branch"
                                    placeholder="main"
                                    value={deploymentData.branch}
                                    onChange={e => handleChange('branch', e.target.value)}
                                    className={`w-full rounded-md border-0 bg-[#2e2e2e] px-3 py-2 pl-9 text-white placeholder:text-white/30 focus:ring-2 focus:ring-white focus:outline-none`}
                                />
                            </div>
                            {errors.branch && <p className="mt-1 text-sm text-red-500">{errors.branch}</p>}
                        </div>

                        <div className="flex flex-col gap-2 rounded-lg bg-[#3a3a3a] p-4">
                            <label htmlFor="version" className="text-sm text-white/70">
                                Version
                            </label>
                            <div className="relative">
                                <Tag className="absolute top-2.5 left-3 h-4 w-4 text-white/50" />
                                <input
                                    id="version"
                                    placeholder="latest"
                                    value={deploymentData.version}
                                    onChange={e => handleChange('version', e.target.value)}
                                    className="w-full rounded-md border-0 bg-[#2e2e2e] px-3 py-2 pl-9 text-white placeholder:text-white/30 focus:ring-2 focus:ring-white focus:outline-none"
                                />
                                {errors.version && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="mb-3 text-center text-lg font-semibold text-white">Deployment Details</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-2 rounded-lg bg-[#3a3a3a] p-4">
                            <label htmlFor="server" className="text-sm text-white/70">
                                Server
                            </label>
                            <div className="relative">
                                <Server className="absolute top-2.5 left-3 h-4 w-4 text-white/50" />
                                <input
                                    id="server"
                                    placeholder="localhost"
                                    value={deploymentData.server}
                                    onChange={e => handleChange('server', e.target.value)}
                                    className="w-full rounded-md border-0 bg-[#2e2e2e] px-3 py-2 pl-9 text-white placeholder:text-white/30 focus:ring-2 focus:ring-white focus:outline-none"
                                />
                                {errors.server && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 rounded-lg bg-[#3a3a3a] p-4">
                            <label htmlFor="version" className="text-sm text-white/70">
                                Domain
                            </label>
                            <div className="relative">
                                <Computer className="absolute top-2.5 left-3 h-4 w-4 text-white/50" />
                                <input
                                    id="version"
                                    placeholder="example.com"
                                    value={deploymentData.domain}
                                    onChange={e => handleChange('domain', e.target.value)}
                                    className="w-full rounded-md border-0 bg-[#2e2e2e] px-3 py-2 pl-9 text-white placeholder:text-white/30 focus:ring-2 focus:ring-white focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 rounded-lg bg-[#3a3a3a] p-4">
                        {deployments.length === 0 ? (
                            <div className="flex items-center justify-center">
                                <p className="text-white/50">No deployments found</p>
                            </div>
                        ) : (
                            <>
                                <DoubleValueOptionPicker
                                    label="Deployment"
                                    options={deployments.map(deployment => ({ label: deployment.deployName, value: deployment.deployID }))}
                                    value={deploymentData.deploymentID}
                                    onChange={value => handleChange('deploymentID', value)}
                                    className="mt-4 h-[4rem] w-full rounded-xl bg-[#00000048] indent-3 text-white"
                                />
                                {errors.deploymentID && <p className="mt-1 text-sm text-red-500">{errors.deploymentID}</p>}
                            </>
                        )}
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="mb-3 text-center text-lg font-semibold text-white">Description</h3>
                    <div className="flex flex-col gap-2 rounded-lg bg-[#3a3a3a] p-4">
                        <label htmlFor="description" className="text-sm text-white/70">
                            Description (Optional)
                        </label>
                        <div className="relative">
                            <Info className="absolute top-3 left-3 h-4 w-4 text-white/50" />
                            <textarea
                                id="description"
                                placeholder="Enter deployment description"
                                value={deploymentData.description}
                                onChange={e => handleChange('description', e.target.value)}
                                rows={3}
                                className="w-full resize-none rounded-md border-0 bg-[#2e2e2e] px-3 py-2 pl-9 text-white placeholder:text-white/30 focus:ring-2 focus:ring-white focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="mb-6 flex justify-center">
                    <button type="submit" className="h-[4rem] w-full cursor-pointer rounded-md bg-[#2b2b2b] px-4 py-2 text-xl font-medium text-white hover:bg-[#161616] focus:ring-2 focus:ring-white focus:outline-none">
                        Create Deployment
                    </button>
                </div>
            </form>
        </div>
    )
}

export default CreateDeployment
