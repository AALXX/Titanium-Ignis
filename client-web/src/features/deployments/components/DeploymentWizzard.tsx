'use client'

import type React from 'react'

import { useState, useEffect } from 'react'
import { X, Check, Loader2, Server, Database, Globe, HardDrive, Code, Cpu, HardDriveIcon } from 'lucide-react'
import DoubleValueOptionPicker from '@/components/DoubleValueOptionPicker'
import type { DataCenters, DeploymentOptions, DeploymentOS } from '../types/DeploymentOptions'
import { Socket } from 'socket.io-client'
import { ProjectService } from '../types/servicedeployment'

interface CreateDeploymentWizardProps {
    projectToken: string
    userSessionToken: string
    deploymentOptions: DeploymentOptions
    services: ProjectService[]
    socket: Socket
    onSuccess: () => void
}

interface ResourceAllocation {
    cpu: number
    ram: number
    storage: number
}

interface HardwarePreset {
    id: string
    name: string
    description: string
    cpu: number
    ram: number
    storage: number
    price?: string
}

interface LanguageConfig {
    language: string
    version: string
    runtime?: string
    buildCommand?: string
    startCommand?: string
    availableVersions?: string[]
}

interface FormData {
    name: string
    type: string
    domain: string
    dataCenterLocation: DataCenters
    environment: string
    serviceID: number
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
    hardwarePresetId: string
    languageConfig?: LanguageConfig
}

const HARDWARE_PRESETS: HardwarePreset[] = [
    {
        id: 'micro',
        name: 'Micro',
        description: 'Perfect for small apps and testing',
        cpu: 1,
        ram: 1,
        storage: 10,
        price: '$5/month'
    },
    {
        id: 'small',
        name: 'Small',
        description: 'Good for small production apps',
        cpu: 2,
        ram: 2,
        storage: 20,
        price: '$12/month'
    },
    {
        id: 'medium',
        name: 'Medium',
        description: 'Balanced performance for most apps',
        cpu: 4,
        ram: 4,
        storage: 40,
        price: '$24/month'
    },
    {
        id: 'large',
        name: 'Large',
        description: 'High performance for demanding apps',
        cpu: 8,
        ram: 8,
        storage: 80,
        price: '$48/month'
    },
    {
        id: 'xlarge',
        name: 'X-Large',
        description: 'Maximum performance',
        cpu: 16,
        ram: 16,
        storage: 160,
        price: '$96/month'
    },
    {
        id: 'custom',
        name: 'Custom',
        description: 'Configure your own resources',
        cpu: 1,
        ram: 1,
        storage: 10
    }
]

const detectLanguageFromCommand = (startCommand: string): LanguageConfig | null => {
    const command = startCommand.toLowerCase().trim()

    if (command.includes('node ') || command.includes('npm ') || command.includes('yarn ') || command.includes('pnpm ') || command.includes('bun ')) {
        let framework = ''

        if (command.includes('next') || command.includes('next dev') || command.includes('next start')) {
            framework = 'nextjs'
        } else if (command.includes('react')) {
            framework = 'react'
        } else if (command.includes('vue')) {
            framework = 'vue'
        } else if (command.includes('express')) {
            framework = 'express'
        } else if (command.includes('nest')) {
            framework = 'nestjs'
        }

        return {
            language: 'nodejs',
            version: '22.21.1',
            runtime: 'node',
            startCommand: startCommand,
            availableVersions: ['14.21.3', '16.20.2', '18.20.8', '20.19.5', '22.21.1', '24.11.1', '25.2.0']
        }
    }

    if (command.includes('python') || command.includes('python3') || command.includes('pip') || command.includes('uvicorn') || command.includes('gunicorn')) {
        let framework = ''

        if (command.includes('django')) {
            framework = 'django'
        } else if (command.includes('flask')) {
            framework = 'flask'
        } else if (command.includes('fastapi') || command.includes('uvicorn')) {
            framework = 'fastapi'
        }

        return {
            language: 'python',
            version: '3.11',
            runtime: 'python3',
            startCommand: startCommand,
            availableVersions: ['3.9', '3.10', '3.11', '3.12', '3.13']
        }
    }

    if (command.includes('go run') || command.includes('go build') || command.includes('./main')) {
        return {
            language: 'go',
            version: '1.21',
            runtime: 'go',
            startCommand: startCommand,
            availableVersions: ['1.20', '1.21', '1.22', '1.23']
        }
    }

    if (command.includes('java ') || command.includes('mvn ') || command.includes('gradle ') || command.includes('.jar')) {
        let framework = ''

        if (command.includes('spring')) {
            framework = 'spring'
        }

        return {
            language: 'java',
            version: '17',
            runtime: 'java',
            startCommand: startCommand,
            availableVersions: ['11', '17', '21']
        }
    }

    if (command.includes('php ') || command.includes('artisan') || command.includes('composer')) {
        let framework = ''

        if (command.includes('artisan')) {
            framework = 'laravel'
        }

        return {
            language: 'php',
            version: '8.2',
            runtime: 'php',
            startCommand: startCommand,
            availableVersions: ['8.1', '8.2', '8.3']
        }
    }

    if (command.includes('ruby') || command.includes('rails') || command.includes('bundle')) {
        return {
            language: 'ruby',
            version: '3.2',
            runtime: 'ruby',
            startCommand: startCommand,
            availableVersions: ['3.1', '3.2', '3.3']
        }
    }

    if (command.includes('cargo') || command.includes('./target/')) {
        return {
            language: 'rust',
            version: '1.75',
            runtime: 'cargo',
            startCommand: startCommand,
            availableVersions: ['1.73', '1.74', '1.75', '1.76']
        }
    }

    if (command.includes('dotnet')) {
        return {
            language: 'dotnet',
            version: '8.0',
            runtime: 'dotnet',
            startCommand: startCommand,
            availableVersions: ['6.0', '7.0', '8.0', '9.0']
        }
    }

    return null
}

const CreateDeploymentWizard = ({ projectToken, userSessionToken, deploymentOptions, services, socket, onSuccess }: CreateDeploymentWizardProps) => {
    const [currentStep, setCurrentStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedType, setSelectedType] = useState<string | null>(null)
    const [currentTag, setCurrentTag] = useState('')
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})
    const [selectedHardwarePreset, setSelectedHardwarePreset] = useState<string>('small')
    const [showCustomResources, setShowCustomResources] = useState(false)

    const [formData, setFormData] = useState<FormData>({
        name: '',
        type: '',
        domain: '',
        dataCenterLocation: {
            id: 0,
            datacenterlocation: ''
        },
        serviceID: 0,
        environment: 'production',
        isActive: true,
        resourceAllocation: {
            cpu: 2,
            ram: 2,
            storage: 20
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
        backupEnabled: false,
        hardwarePresetId: 'small',
        languageConfig: undefined
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
            case 'service':
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

    const handleServiceChange = (selectedServiceId: number) => {
        const selectedService = services.find(service => service.id === Number(selectedServiceId))
        if (selectedService) {
            // Detect language from start command
            const languageConfig = detectLanguageFromCommand(selectedService['start-command'])

            setFormData({
                ...formData,
                serviceID: selectedServiceId,
                languageConfig: languageConfig || undefined,
                framework: languageConfig?.language || '',
                version: languageConfig?.version || ''
            })
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

    const handleHardwarePresetChange = (presetId: string) => {
        setSelectedHardwarePreset(presetId)
        const preset = HARDWARE_PRESETS.find(p => p.id === presetId)

        if (preset) {
            if (presetId === 'custom') {
                setShowCustomResources(true)
            } else {
                setShowCustomResources(false)
                setFormData({
                    ...formData,
                    hardwarePresetId: presetId,
                    resourceAllocation: {
                        cpu: preset.cpu,
                        ram: preset.ram,
                        storage: preset.storage
                    }
                })
            }
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

    const handleLanguageConfigChange = (field: keyof LanguageConfig, value: string) => {
        setFormData({
            ...formData,
            languageConfig: {
                ...formData.languageConfig!,
                [field]: value
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

            if (formData.type === 'service' && !formData.serviceID) {
                errors.serviceID = 'Service selection is required'
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
                formData: formData
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
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${currentStep > index + 1 ? 'border-green-600 bg-green-500 text-white' : currentStep === index + 1 ? 'border-zinc-600 bg-zinc-700 text-white' : 'border-zinc-700 bg-zinc-800 text-zinc-400'}`}>
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
                            className={`flex cursor-pointer flex-col items-center rounded-lg border p-6 transition-all ${selectedType === deploymentOptions.types.find(t => t.id === type.id)?.types ? 'border-zinc-500 bg-zinc-700 ring-2 ring-zinc-500' : 'hover:bg-zinc-750 border-zinc-700 bg-zinc-800'}`}
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
                            className={`w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none ${formErrors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
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
                                className={`w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none ${formErrors.domain ? 'border-red-500 focus:ring-red-500' : ''}`}
                            />
                            {formErrors.domain && <p className="text-sm text-red-500">{formErrors.domain}</p>}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label htmlFor="environment" className="block text-sm font-medium text-white">
                            Environment
                        </label>
                        <select id="environment" name="environment" value={formData.environment} onChange={handleInputChange} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none">
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
                    {selectedType === 'service' && (
                        <div className="space-y-2">
                            <label htmlFor="dataCenterLocation" className="block text-sm font-medium text-white">
                                Deployment Service
                            </label>
                            <DoubleValueOptionPicker className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none" label="Select Service" options={services.map(s => ({ label: s.name, value: s.id }))} value={formData.serviceID} onChange={handleServiceChange} />
                            {formErrors.serviceID && <p className="text-sm text-red-500">{formErrors.serviceID}</p>}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    const renderConfiguration = () => {
        return (
            <div className="space-y-6">
                <h3 className="text-lg font-medium text-white">Configuration</h3>

                {/* Hardware Presets */}
                <div className="space-y-4">
                    <h4 className="text-md font-medium text-white">Hardware Configuration</h4>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {HARDWARE_PRESETS.map(preset => (
                            <div key={preset.id} onClick={() => handleHardwarePresetChange(preset.id)} className={`cursor-pointer rounded-lg border p-4 transition-all ${selectedHardwarePreset === preset.id ? 'border-zinc-500 bg-zinc-700 ring-2 ring-zinc-500' : 'hover:bg-zinc-750 border-zinc-700 bg-zinc-800'}`}>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h5 className="font-medium text-white">{preset.name}</h5>
                                        <p className="mt-1 text-xs text-zinc-400">{preset.description}</p>
                                    </div>
                                    {preset.price && <span className="text-sm font-medium text-zinc-300">{preset.price}</span>}
                                </div>
                                {preset.id !== 'custom' && (
                                    <div className="mt-3 flex gap-4 text-xs text-zinc-400">
                                        <span className="flex items-center gap-1">
                                            <Cpu className="h-3 w-3" />
                                            {preset.cpu} CPU
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Server className="h-3 w-3" />
                                            {preset.ram}GB RAM
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <HardDriveIcon className="h-3 w-3" />
                                            {preset.storage}GB
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Custom Resources */}
                {showCustomResources && (
                    <div className="space-y-4">
                        <h4 className="text-md font-medium text-white">Custom Resource Allocation</h4>
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
                                    className={`w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none ${formErrors.cpu ? 'border-red-500 focus:ring-red-500' : ''}`}
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
                                    className={`w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none ${formErrors.ram ? 'border-red-500 focus:ring-red-500' : ''}`}
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
                                    className={`w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none ${formErrors.storage ? 'border-red-500 focus:ring-red-500' : ''}`}
                                />
                                {formErrors.storage && <p className="text-sm text-red-500">{formErrors.storage}</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Language Configuration for Service Type */}
                {selectedType === 'service' && formData.languageConfig && (
                    <div className="space-y-4 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
                        <h4 className="text-md flex items-center gap-2 font-medium text-white">
                            <Code className="h-5 w-5" />
                            Detected Language Configuration
                        </h4>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-white">Language</label>
                                <input type="text" value={formData.languageConfig.language.toUpperCase()} disabled className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-400" />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-white">Version</label>
                                <select value={formData.languageConfig.version} onChange={e => handleLanguageConfigChange('version', e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none">
                                    {formData.languageConfig.availableVersions?.map(version => (
                                        <option key={version} value={version}>
                                            {version}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {formData.languageConfig.runtime && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-white">Runtime</label>
                                    <input type="text" value={formData.languageConfig.runtime} disabled className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-400" />
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-white">Start Command</label>
                                <input type="text" value={formData.languageConfig.startCommand || ''} disabled className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-400" />
                            </div>
                        </div>
                    </div>
                )}

                {selectedType === 'app' && (
                    <div className="space-y-4">
                        <h4 className="text-md font-medium text-white">Application Settings</h4>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label htmlFor="framework" className="block text-sm font-medium text-white">
                                    Framework
                                </label>
                                <select id="framework" name="framework" value={formData.framework} onChange={handleInputChange} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none">
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
                                <select id="deploymentMethod" name="deploymentMethod" value={formData.deploymentMethod} onChange={handleInputChange} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none">
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
                                <select id="databaseType" name="databaseType" value={formData.databaseType} onChange={handleInputChange} className={`w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none ${formErrors.databaseType ? 'border-red-500 focus:ring-red-500' : ''}`}>
                                    <option value="">Select Database</option>
                                    <option value="postgresql">PostgreSQL</option>
                                    <option value="mysql">MySQL</option>
                                    <option value="mariadb">MariaDB</option>
                                    <option value="mongodb">MongoDB</option>
                                    <option value="redis">Redis</option>
                                    <option value="elasticsearch">Elasticsearch</option>
                                    <option value="cassandra">Cassandra</option>
                                    <option value="neo4j">Neo4j</option>
                                </select>
                                {formErrors.databaseType && <p className="text-sm text-red-500">{formErrors.databaseType}</p>}
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="version" className="block text-sm font-medium text-white">
                                    Version
                                </label>
                                <input id="version" name="version" value={formData.version} onChange={handleInputChange} placeholder="e.g., 14.5" className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none" />
                            </div>

                            <div className="flex items-center space-y-2">
                                <div className="relative mr-2 inline-flex items-center">
                                    <input type="checkbox" id="backupEnabled" checked={formData.backupEnabled} onChange={() => setFormData({ ...formData, backupEnabled: !formData.backupEnabled })} className="sr-only" />
                                    <div onClick={() => setFormData({ ...formData, backupEnabled: !formData.backupEnabled })} className={`h-5 w-10 rounded-full transition-colors ${formData.backupEnabled ? 'bg-zinc-500' : 'bg-zinc-700'}`}>
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

                {selectedType === 'static' && (
                    <div className="space-y-4">
                        <h4 className="text-md font-medium text-white">Static Site Settings</h4>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label htmlFor="framework" className="block text-sm font-medium text-white">
                                    Static Site Generator
                                </label>
                                <select id="framework" name="framework" value={formData.framework} onChange={handleInputChange} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none">
                                    <option value="">Select Framework</option>
                                    <option value="nextjs-static">Next.js (Static Export)</option>
                                    <option value="gatsby">Gatsby</option>
                                    <option value="hugo">Hugo</option>
                                    <option value="jekyll">Jekyll</option>
                                    <option value="vitepress">VitePress</option>
                                    <option value="astro">Astro</option>
                                    <option value="11ty">11ty (Eleventy)</option>
                                    <option value="docusaurus">Docusaurus</option>
                                    <option value="html">Plain HTML/CSS/JS</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="deploymentMethod" className="block text-sm font-medium text-white">
                                    Build Directory
                                </label>
                                <input
                                    id="buildDirectory"
                                    name="buildDirectory"
                                    value={formData.framework === 'nextjs-static' ? 'out' : formData.framework === 'gatsby' ? 'public' : 'dist'}
                                    onChange={handleInputChange}
                                    placeholder="e.g., dist, build, out"
                                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-white">CDN Configuration</label>
                                <select className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none">
                                    <option value="auto">Auto (Recommended)</option>
                                    <option value="cloudflare">Cloudflare CDN</option>
                                    <option value="cloudfront">AWS CloudFront</option>
                                    <option value="none">No CDN</option>
                                </select>
                            </div>

                            <div className="flex items-center space-y-2">
                                <div className="relative mr-2 inline-flex items-center">
                                    <input type="checkbox" id="sslEnabled" defaultChecked className="sr-only" />
                                    <div className="h-5 w-10 rounded-full bg-zinc-500">
                                        <div className="absolute top-0.5 h-4 w-4 translate-x-5 transform rounded-full bg-white transition-transform" />
                                    </div>
                                </div>
                                <label htmlFor="sslEnabled" className="cursor-pointer text-sm font-medium text-white">
                                    Enable SSL/HTTPS
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {selectedType === 'serverless' && (
                    <div className="space-y-4">
                        <h4 className="text-md font-medium text-white">Serverless Function Settings</h4>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label htmlFor="framework" className="block text-sm font-medium text-white">
                                    Runtime Environment
                                </label>
                                <select id="framework" name="framework" value={formData.framework} onChange={handleInputChange} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none">
                                    <option value="">Select Runtime</option>
                                    <option value="nodejs">Node.js</option>
                                    <option value="python">Python</option>
                                    <option value="go">Go</option>
                                    <option value="rust">Rust</option>
                                    <option value="dotnet">.NET</option>
                                    <option value="java">Java</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="version" className="block text-sm font-medium text-white">
                                    Runtime Version
                                </label>
                                <input id="version" name="version" value={formData.version} onChange={handleInputChange} placeholder="e.g., 20.x, 3.11" className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none" />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="timeout" className="block text-sm font-medium text-white">
                                    Timeout (seconds)
                                </label>
                                <input type="number" id="timeout" name="timeout" defaultValue={30} min={1} max={900} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none" />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="maxConcurrency" className="block text-sm font-medium text-white">
                                    Max Concurrency
                                </label>
                                <input type="number" id="maxConcurrency" name="maxConcurrency" defaultValue={100} min={1} max={1000} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none" />
                            </div>

                            <div className="flex items-center space-y-2">
                                <div className="relative mr-2 inline-flex items-center">
                                    <input type="checkbox" id="autoScale" defaultChecked className="sr-only" />
                                    <div className="h-5 w-10 rounded-full bg-zinc-500">
                                        <div className="absolute top-0.5 h-4 w-4 translate-x-5 transform rounded-full bg-white transition-transform" />
                                    </div>
                                </div>
                                <label htmlFor="autoScale" className="cursor-pointer text-sm font-medium text-white">
                                    Enable Auto-scaling
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
                                <select id="volumeType" name="volumeType" value={formData.volumeType} onChange={handleInputChange} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:ring-2 focus:ring-zinc-600 focus:outline-none">
                                    <option value="ssd">SSD</option>
                                    <option value="hdd">HDD</option>
                                    <option value="nvme">NVMe</option>
                                </select>
                            </div>

                            <div className="flex items-center space-y-2">
                                <div className="relative mr-2 inline-flex items-center">
                                    <input type="checkbox" id="backupEnabled" checked={formData.backupEnabled} onChange={() => setFormData({ ...formData, backupEnabled: !formData.backupEnabled })} className="sr-only" />
                                    <div onClick={() => setFormData({ ...formData, backupEnabled: !formData.backupEnabled })} className={`h-5 w-10 rounded-full transition-colors ${formData.backupEnabled ? 'bg-zinc-500' : 'bg-zinc-700'}`}>
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
        const selectedService = services.find(s => s.id === formData.serviceID)

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
                            <h4 className="text-sm font-medium text-zinc-400">Hardware Configuration</h4>
                            <p className="text-white">{HARDWARE_PRESETS.find(p => p.id === formData.hardwarePresetId)?.name || 'Custom'}</p>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-zinc-400">Resources</h4>
                            <p className="text-white">
                                {formData.resourceAllocation.cpu} CPU cores, {formData.resourceAllocation.ram} GB RAM, {formData.resourceAllocation.storage} GB Storage
                            </p>
                        </div>

                        {selectedType === 'service' && selectedService && (
                            <>
                                <div>
                                    <h4 className="text-sm font-medium text-zinc-400">Service</h4>
                                    <p className="text-white">{selectedService.name}</p>
                                </div>
                                {formData.languageConfig && (
                                    <div>
                                        <h4 className="text-sm font-medium text-zinc-400">Language & Runtime</h4>
                                        <p className="text-white">
                                            {formData.languageConfig.language.toUpperCase()} {formData.languageConfig.version}
                                            {formData.languageConfig.runtime && ` (${formData.languageConfig.runtime})`}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}

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

                        {selectedType === 'static' && (
                            <div>
                                <h4 className="text-sm font-medium text-zinc-400">Static Site Generator</h4>
                                <p className="text-white">{formData.framework || 'Not specified'}</p>
                            </div>
                        )}

                        {selectedType === 'serverless' && (
                            <>
                                <div>
                                    <h4 className="text-sm font-medium text-zinc-400">Runtime</h4>
                                    <p className="text-white">
                                        {formData.framework} {formData.version && `(${formData.version})`}
                                    </p>
                                </div>
                            </>
                        )}

                        {selectedType === 'volume' && (
                            <div>
                                <h4 className="text-sm font-medium text-zinc-400">Volume Type</h4>
                                <p className="text-white">{formData.volumeType}</p>
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
                        <button type="button" onClick={prevStep} className="cursor-pointer rounded-md border border-zinc-700 bg-transparent px-4 py-2 text-white hover:bg-zinc-800 focus:ring-2 focus:ring-zinc-600 focus:outline-none">
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
                        <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="flex items-center rounded-md bg-zinc-100 px-4 py-2 text-zinc-900 hover:bg-zinc-200 focus:ring-2 focus:ring-zinc-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50">
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

export default CreateDeploymentWizard
