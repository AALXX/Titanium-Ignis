'use client'

import type React from 'react'

import { useState } from 'react'
import { X, Check, Loader2, Server, Database, Globe, HardDrive, Code } from 'lucide-react'
import DoubleValueOptionPicker from '@/components/DoubleValueOptionPicker'
import type { DataCenters, DeploymentOptions, DeploymentOS } from '../types/DeploymentOptions'
import { Socket } from 'socket.io-client'

interface CreateDeploymentWizardProps {
    projectToken: string
    userSessionToken: string
    deploymentOptions: DeploymentOptions
    socket: Socket
    onSuccess: () => void
}

interface ResourceAllocation {
    cpu: number
    ram: number
    storage: number
}



interface FormData {
    name: string
    type: string
    domain: string
    dataCenterLocation: DataCenters
    environment: string
    isActive: boolean
    resourceAllocation: ResourceAllocation
    deploymentMethod: string
    tags: string[]
    framework: string
    version: string
    os: DeploymentOS
    databaseType: string
    volumeType: string
    backupEnabled: boolean
}

export default function CreateDeploymentWizard({ projectToken, userSessionToken, deploymentOptions, socket, onSuccess }: CreateDeploymentWizardProps) {
    const [currentStep, setCurrentStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedType, setSelectedType] = useState<string | null>(null)
    const [currentTag, setCurrentTag] = useState('')
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})

    const [formData, setFormData] = useState<FormData>({
        name: '',
        type: '',
        domain: '',
        dataCenterLocation: {
            id: 0,
            datacenterlocation: ''
        },
        environment: 'production',
        isActive: true,
        resourceAllocation: {
            cpu: 1,
            ram: 1,
            storage: 10
        },
        deploymentMethod: 'manual',
        tags: [],
        framework: '',
        version: '',
        os: {
            id: deploymentOptions.os[0].id,
            os: deploymentOptions.os[0].os
        },
        databaseType: '',
        volumeType: '',
        backupEnabled: false
    })

    const deploymentTypes = deploymentOptions.types.map(type => {
        let icon
        switch (type.types) {
            case 'app':
                icon = <Globe className="h-10 w-10 text-white" />
                break
            case 'linux':
                icon = <Server className="h-10 w-10 text-white" />
                break
            case 'database':
                icon = <Database className="h-10 w-10 text-white" />
                break
            case 'volume':
                icon = <HardDrive className="h-10 w-10 text-white" />
                break
            case 'static':
                icon = <Globe className="h-10 w-10 text-white" />
                break
            case 'serverless':
                icon = <Code className="h-10 w-10 text-white" />
                break
            default:
                icon = <Server className="h-10 w-10 text-white" />
        }

        return {
            id: type.id,
            name: type.name,
            icon,
            types: type.types
        }
    })

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData({ ...formData, [name]: value })

        if (formErrors[name]) {
            const newErrors = { ...formErrors }
            delete newErrors[name]
            setFormErrors(newErrors)
        }
    }

    const handleDatacenterLocChange = (field: keyof DataCenters, value: string | number | boolean) => {
        const numericValue = typeof value === 'string' ? parseInt(value, 10) : value

        setFormData(prev => ({
            ...prev,
            dataCenterLocation: {
                ...prev.dataCenterLocation,
                [field]: numericValue,
                datacenterlocation: deploymentOptions.datacenters.find(dc => dc.id === numericValue)?.datacenterlocation || ''
            }
        }))

        if (formErrors[field]) {
            const newErrors = { ...formErrors }
            delete newErrors[field]
            setFormErrors(newErrors)
        }
    }

    const handleOsChange = (selectedOsId: number) => {
        const selectedOs = deploymentOptions.os.find(os => os.id === Number(selectedOsId))
        if (selectedOs) {
            setFormData({
                ...formData,
                os: {
                    id: selectedOsId,
                    os: selectedOs.os
                }
            })
        }
    }

    const handleResourceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData({
            ...formData,
            resourceAllocation: {
                ...formData.resourceAllocation,
                [name]: Number(value)
            }
        })
    }

    const addTag = () => {
        if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
            setFormData({
                ...formData,
                tags: [...formData.tags, currentTag.trim()]
            })
            setCurrentTag('')
        }
    }

    const removeTag = (tagToRemove: string) => {
        setFormData({
            ...formData,
            tags: formData.tags.filter(tag => tag !== tagToRemove)
        })
    }

    const selectDeploymentType = (typeId: number) => {
        const selectedTypeObj = deploymentOptions.types.find(t => t.id === typeId)
        setSelectedType(selectedTypeObj?.types || '')
        setFormData({
            ...formData,
            type: selectedTypeObj?.types || ''
        })
    }

    const validateCurrentStep = () => {
        const errors: Record<string, string> = {}

        if (currentStep === 2) {
            if (!formData.name.trim()) errors.name = 'Name is required'
            if (!formData.dataCenterLocation.id) errors.dataCenterLocation = 'Data center location is required'

            if (['app', 'static'].includes(formData.type) && !formData.domain.trim()) {
                errors.domain = 'Domain is required'
            }
        }

        if (currentStep === 3) {
            if (formData.resourceAllocation.cpu <= 0) errors.cpu = 'CPU must be greater than 0'
            if (formData.resourceAllocation.ram <= 0) errors.ram = 'RAM must be greater than 0'
            if (formData.resourceAllocation.storage <= 0) errors.storage = 'Storage must be greater than 0'

            if (formData.type === 'database' && !formData.databaseType) {
                errors.databaseType = 'Database type is required'
            }
        }

        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const nextStep = () => {
        if (currentStep === 1 && !selectedType) {
            setFormErrors({ type: 'Please select a deployment type' })
            return
        }

        if (validateCurrentStep()) {
            setCurrentStep(currentStep + 1)
        }
    }

    const prevStep = () => {
        setCurrentStep(currentStep - 1)
    }

    const toggleActive = () => {
        setFormData({
            ...formData,
            isActive: !formData.isActive
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateCurrentStep()) return

        setIsSubmitting(true)

        console.log(formData)

        try {
            const payload = {
                projectToken,
                userSessionToken,
                formData: formData,
            }

            socket.emit('create-deployment', payload)


            onSuccess()
        } catch (error) {
            console.error('Error creating deployment:', error)
            setFormErrors({
                submit: typeof error === 'string' ? error : 'Failed to create deployment. Please try again.'
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const renderStepIndicators = () => {
        const steps = ['Type', 'Basic Info', 'Configuration', 'Review']

        return (
            <div className="mb-8 flex items-center justify-center">
                {steps.map((step, index) => (
                    <div key={index} className="flex items-center">
                        <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                                currentStep > index + 1 ? 'border-green-600 bg-green-500 text-white' : currentStep === index + 1 ? 'border-zinc-600 bg-zinc-700 text-white' : 'border-zinc-700 bg-zinc-800 text-zinc-400'
                            }`}
                        >
                            {currentStep > index + 1 ? <Check className="h-4 w-4" /> : index + 1}
                        </div>
                        <div className="mr-3 ml-1 text-xs text-zinc-400">{step}</div>
                        {index < steps.length - 1 && <div className={`mr-1 h-0.5 w-8 ${currentStep > index + 1 ? 'bg-green-500' : 'bg-zinc-700'}`} />}
                    </div>
                ))}
            </div>
        )
    }

    const renderTypeSelection = () => {
        return (
            <div className="space-y-6">
                <h3 className="text-lg font-medium text-white">Select Deployment Type</h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {deploymentTypes.map(type => (
                        <div
                            key={type.id}
                            onClick={() => selectDeploymentType(type.id)}
                            className={`flex cursor-pointer flex-col items-center rounded-lg border p-6 transition-all ${
                                selectedType === deploymentOptions.types.find(t => t.id === type.id)?.types ? 'border-zinc-500 bg-zinc-700 ring-2 ring-zinc-500' : 'hover:bg-zinc-750 border-zinc-700 bg-zinc-800'
                            }`}
                        >
                            <div className={`mb-4 rounded-full p-3 ${selectedType === type.name ? 'bg-zinc-600' : 'bg-zinc-700'}`}>{type.icon}</div>
                            <h4 className="mb-2 text-lg font-medium text-white">{type.name}</h4>
                        </div>
                    ))}
                </div>

                {formErrors.type && <p className="mt-2 text-sm text-red-500">{formErrors.type}</p>}
            </div>
        )
    }

    const renderBasicInfo = () => {
        return (
            <div className="space-y-6">
                <h3 className="text-lg font-medium text-white">Basic Information</h3>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                        <label htmlFor="name" className="block text-sm font-medium text-white">
                            Deployment Name
                        </label>
                        <input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder={`e.g., ${selectedType === 'app' ? 'Web App' : selectedType === 'linux' ? 'API Server' : 'Database'} Production`}
                            className={`w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none ${
                                formErrors.name ? 'border-red-500 focus:ring-red-500' : ''
                            }`}
                        />
                        {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
                    </div>

                    {(selectedType === 'app' || selectedType === 'static') && (
                        <div className="space-y-2">
                            <label htmlFor="domain" className="block text-sm font-medium text-white">
                                Domain
                            </label>
                            <input
                                id="domain"
                                name="domain"
                                value={formData.domain}
                                onChange={handleInputChange}
                                placeholder="e.g., app.example.com"
                                className={`w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none ${
                                    formErrors.domain ? 'border-red-500 focus:ring-red-500' : ''
                                }`}
                            />
                            {formErrors.domain && <p className="text-sm text-red-500">{formErrors.domain}</p>}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label htmlFor="environment" className="block text-sm font-medium text-white">
                            Environment
                        </label>
                        <select
                            id="environment"
                            name="environment"
                            value={formData.environment}
                            onChange={handleInputChange}
                            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none"
                        >
                            <option value="production">Production</option>
                            <option value="staging">Staging</option>
                            <option value="development">Development</option>
                            <option value="testing">Testing</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="dataCenterLocation" className="block text-sm font-medium text-white">
                            Data Center Location
                        </label>
                        <DoubleValueOptionPicker
                            label="Data Center Location"
                            options={deploymentOptions.datacenters.map(location => ({
                                value: location.id,
                                label: location.datacenterlocation
                            }))}
                            value={formData.dataCenterLocation.id}
                            onChange={value => handleDatacenterLocChange('id', value)}
                            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none"
                        />
                        {formErrors.dataCenterLocation && <p className="text-sm text-red-500">{formErrors.dataCenterLocation}</p>}
                    </div>
                </div>
            </div>
        )
    }

    const renderConfiguration = () => {
        return (
            <div className="space-y-6">
                <h3 className="text-lg font-medium text-white">Configuration</h3>

                <div className="space-y-4">
                    <h4 className="text-md font-medium text-white">Resource Allocation</h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <label htmlFor="cpu" className="block text-sm font-medium text-white">
                                CPU (cores)
                            </label>
                            <input
                                id="cpu"
                                name="cpu"
                                type="number"
                                min="1"
                                step="1"
                                value={formData.resourceAllocation.cpu}
                                onChange={handleResourceChange}
                                className={`w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none ${
                                    formErrors.cpu ? 'border-red-500 focus:ring-red-500' : ''
                                }`}
                            />
                            {formErrors.cpu && <p className="text-sm text-red-500">{formErrors.cpu}</p>}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="ram" className="block text-sm font-medium text-white">
                                RAM (GB)
                            </label>
                            <input
                                id="ram"
                                name="ram"
                                type="number"
                                min="0.5"
                                step="0.5"
                                value={formData.resourceAllocation.ram}
                                onChange={handleResourceChange}
                                className={`w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none ${
                                    formErrors.ram ? 'border-red-500 focus:ring-red-500' : ''
                                }`}
                            />
                            {formErrors.ram && <p className="text-sm text-red-500">{formErrors.ram}</p>}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="storage" className="block text-sm font-medium text-white">
                                Storage (GB)
                            </label>
                            <input
                                id="storage"
                                name="storage"
                                type="number"
                                min="1"
                                step="1"
                                value={formData.resourceAllocation.storage}
                                onChange={handleResourceChange}
                                className={`w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none ${
                                    formErrors.storage ? 'border-red-500 focus:ring-red-500' : ''
                                }`}
                            />
                            {formErrors.storage && <p className="text-sm text-red-500">{formErrors.storage}</p>}
                        </div>
                    </div>
                </div>

                {selectedType === 'app' && (
                    <div className="space-y-4">
                        <h4 className="text-md font-medium text-white">Application Settings</h4>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label htmlFor="framework" className="block text-sm font-medium text-white">
                                    Framework
                                </label>
                                <select
                                    id="framework"
                                    name="framework"
                                    value={formData.framework}
                                    onChange={handleInputChange}
                                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none"
                                >
                                    <option value="">Select Framework</option>
                                    <option value="nextjs">Next.js</option>
                                    <option value="react">React</option>
                                    <option value="vue">Vue.js</option>
                                    <option value="angular">Angular</option>
                                    <option value="express">Express.js</option>
                                    <option value="django">Django</option>
                                    <option value="laravel">Laravel</option>
                                    <option value="rails">Ruby on Rails</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="deploymentMethod" className="block text-sm font-medium text-white">
                                    Deployment Method
                                </label>
                                <select
                                    id="deploymentMethod"
                                    name="deploymentMethod"
                                    value={formData.deploymentMethod}
                                    onChange={handleInputChange}
                                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none"
                                >
                                    <option value="manual">Manual</option>
                                    <option value="ci-cd">CI/CD Pipeline</option>
                                    <option value="git-hook">Git Hook</option>
                                    <option value="scheduled">Scheduled</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {selectedType === 'linux' && (
                    <div className="space-y-4">
                        <h4 className="text-md font-medium text-white">VM Settings</h4>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label htmlFor="os" className="block text-sm font-medium text-white">
                                    Operating System
                                </label>

                                <DoubleValueOptionPicker
                                    label="Operating System"
                                    options={deploymentOptions.os.map(os => ({
                                        value: os.id,
                                        label: os.os
                                    }))}
                                    value={formData.os.id}
                                    onChange={value => handleOsChange(value)}
                                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {selectedType === 'database' && (
                    <div className="space-y-4">
                        <h4 className="text-md font-medium text-white">Database Settings</h4>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label htmlFor="databaseType" className="block text-sm font-medium text-white">
                                    Database Type
                                </label>
                                <select
                                    id="databaseType"
                                    name="databaseType"
                                    value={formData.databaseType}
                                    onChange={handleInputChange}
                                    className={`w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none ${
                                        formErrors.databaseType ? 'border-red-500 focus:ring-red-500' : ''
                                    }`}
                                >
                                    <option value="postgres">PostgreSQL</option>
                                    <option value="mysql">MySQL</option>
                                    <option value="mariadb">MariaDB</option>
                                    <option value="mongodb">MongoDB</option>
                                    <option value="redis">Redis</option>
                                </select>
                                {formErrors.databaseType && <p className="text-sm text-red-500">{formErrors.databaseType}</p>}
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="version" className="block text-sm font-medium text-white">
                                    Version
                                </label>
                                <input
                                    id="version"
                                    name="version"
                                    value={formData.version}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 14.5"
                                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none"
                                />
                            </div>

                            <div className="flex items-center space-y-2">
                                <div className="relative mr-2 inline-flex items-center">
                                    <input type="checkbox" id="backupEnabled" checked={formData.backupEnabled} onChange={() => setFormData({ ...formData, backupEnabled: !formData.backupEnabled })} className="sr-only" />
                                    <div
                                        onClick={() => setFormData({ ...formData, backupEnabled: !formData.backupEnabled })}
                                        className={`h-5 w-10 rounded-full transition-colors ${formData.backupEnabled ? 'bg-zinc-500' : 'bg-zinc-700'}`}
                                    >
                                        <div className={`absolute h-4 w-4 transform rounded-full bg-white transition-transform ${formData.backupEnabled ? 'translate-x-5' : 'translate-x-1'} top-0.5`} />
                                    </div>
                                </div>
                                <label htmlFor="backupEnabled" className="cursor-pointer text-sm font-medium text-white">
                                    Enable automated backups
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {selectedType === 'volume' && (
                    <div className="space-y-4">
                        <h4 className="text-md font-medium text-white">Volume Settings</h4>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label htmlFor="volumeType" className="block text-sm font-medium text-white">
                                    Volume Type
                                </label>
                                <select
                                    id="volumeType"
                                    name="volumeType"
                                    value={formData.volumeType}
                                    onChange={handleInputChange}
                                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none"
                                >
                                    <option value="ssd">SSD</option>
                                    <option value="hdd">HDD</option>
                                    <option value="nvme">NVMe</option>
                                </select>
                            </div>

                            <div className="flex items-center space-y-2">
                                <div className="relative mr-2 inline-flex items-center">
                                    <input type="checkbox" id="backupEnabled" checked={formData.backupEnabled} onChange={() => setFormData({ ...formData, backupEnabled: !formData.backupEnabled })} className="sr-only" />
                                    <div
                                        onClick={() => setFormData({ ...formData, backupEnabled: !formData.backupEnabled })}
                                        className={`h-5 w-10 rounded-full transition-colors ${formData.backupEnabled ? 'bg-zinc-500' : 'bg-zinc-700'}`}
                                    >
                                        <div className={`absolute h-4 w-4 transform rounded-full bg-white transition-transform ${formData.backupEnabled ? 'translate-x-5' : 'translate-x-1'} top-0.5`} />
                                    </div>
                                </div>
                                <label htmlFor="backupEnabled" className="cursor-pointer text-sm font-medium text-white">
                                    Enable automated backups
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    const renderReview = () => {
        return (
            <div className="space-y-6">
                <h3 className="text-lg font-medium text-white">Review Deployment</h3>

                <div className="space-y-4 rounded-lg bg-zinc-800 p-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <h4 className="text-sm font-medium text-zinc-400">Deployment Type</h4>
                            <p className="text-white">{deploymentOptions.types.find(t => t.types === selectedType)?.name}</p>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-zinc-400">Name</h4>
                            <p className="text-white">{formData.name}</p>
                        </div>

                        {formData.domain && (
                            <div>
                                <h4 className="text-sm font-medium text-zinc-400">Domain</h4>
                                <p className="text-white">{formData.domain}</p>
                            </div>
                        )}

                        <div>
                            <h4 className="text-sm font-medium text-zinc-400">Environment</h4>
                            <p className="text-white">{formData.environment}</p>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-zinc-400">Data Center</h4>
                            <p className="text-white">{formData.dataCenterLocation.datacenterlocation}</p>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-zinc-400">Resources</h4>
                            <p className="text-white">
                                {formData.resourceAllocation.cpu} CPU cores, {formData.resourceAllocation.ram} GB RAM, {formData.resourceAllocation.storage} GB Storage
                            </p>
                        </div>

                        {selectedType === 'app' && (
                            <div>
                                <h4 className="text-sm font-medium text-zinc-400">Framework</h4>
                                <p className="text-white">{formData.framework || 'Not specified'}</p>
                            </div>
                        )}

                        {selectedType === 'linux' && (
                            <div>
                                <h4 className="text-sm font-medium text-zinc-400">Operating System</h4>
                                <p className="text-white">{formData.os.os}</p>
                            </div>
                        )}

                        {selectedType === 'database' && (
                            <div>
                                <h4 className="text-sm font-medium text-zinc-400">Database Type</h4>
                                <p className="text-white">
                                    {formData.databaseType} {formData.version && `(${formData.version})`}
                                </p>
                            </div>
                        )}

                        {(selectedType === 'database' || selectedType === 'volume') && (
                            <div>
                                <h4 className="text-sm font-medium text-zinc-400">Backups</h4>
                                <p className="text-white">{formData.backupEnabled ? 'Enabled' : 'Disabled'}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="tags" className="block text-sm font-medium text-white">
                        Tags
                    </label>
                    <div className="flex gap-2">
                        <input
                            id="currentTag"
                            value={currentTag}
                            onChange={e => setCurrentTag(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                            placeholder="Add tag and press Enter"
                            className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none"
                        />
                        <button type="button" onClick={addTag} className="rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700 focus:ring-2 focus:ring-zinc-600 focus:outline-none">
                            Add
                        </button>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                            <div key={index} className="inline-flex items-center rounded-full bg-zinc-700 px-3 py-1 text-white">
                                {tag}
                                <button type="button" onClick={() => removeTag(tag)} className="ml-2 text-zinc-400 hover:text-white">
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <div className="relative inline-flex items-center">
                        <input type="checkbox" id="isActive" checked={formData.isActive} onChange={toggleActive} className="sr-only" />
                        <div onClick={toggleActive} className={`h-5 w-10 rounded-full transition-colors ${formData.isActive ? 'bg-zinc-500' : 'bg-zinc-700'}`}>
                            <div className={`absolute h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isActive ? 'translate-x-5' : 'translate-x-1'} top-0.5`} />
                        </div>
                    </div>
                    <label htmlFor="isActive" className="cursor-pointer text-sm font-medium text-white">
                        Set as active deployment
                    </label>
                </div>

                {formErrors.submit && <div className="rounded-md border border-red-800 bg-red-900/30 p-3 text-red-300">{formErrors.submit}</div>}
            </div>
        )
    }

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return renderTypeSelection()
            case 2:
                return renderBasicInfo()
            case 3:
                return renderConfiguration()
            case 4:
                return renderReview()
            default:
                return null
        }
    }

    return (
        <div className="h-full w-full">
            {renderStepIndicators()}

            <form onSubmit={e => e.preventDefault()} className="flex h-[calc(100%-3.5rem)] flex-col">
                {renderStepContent()}

                <div className="mt-auto flex justify-between border-t border-zinc-700 pt-6">
                    {currentStep > 1 ? (
                        <button
                            type="button"
                            onClick={prevStep}
                            className="cursor-pointer rounded-md border border-zinc-700 bg-transparent px-4 py-2 text-white hover:bg-zinc-800 focus:ring-2 focus:ring-zinc-600 focus:outline-none"
                        >
                            Back
                        </button>
                    ) : (
                        <div></div>
                    )}

                    {currentStep < 4 ? (
                        <button type="button" onClick={nextStep} className="cursor-pointer rounded-md bg-zinc-100 px-4 py-2 text-zinc-900 hover:bg-zinc-200 focus:ring-2 focus:ring-zinc-300 focus:outline-none">
                            Next
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex items-center rounded-md bg-zinc-100 px-4 py-2 text-zinc-900 hover:bg-zinc-200 focus:ring-2 focus:ring-zinc-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Check className="mr-2 h-4 w-4" />
                                    Create Deployment
                                </>
                            )}
                        </button>
                    )}
                </div>
            </form>
        </div>
    )
}
