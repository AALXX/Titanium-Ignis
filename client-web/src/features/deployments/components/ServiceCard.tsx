'use client'

import CopyTextDisplay from '@/components/CopyTextDisplay'
import { Container, MoreVertical, Server, Database, Globe, HardDrive, Code } from 'lucide-react'
import type React from 'react'

interface ServiceCardProps {
    deployment: {
        id: number
        projecttoken: string
        deploymentid: number | null
        name: string
        type: string
        domain: string | null
        ipv4: string
        ipv6: string | null
        localip: string
        ports: Record<string, string[]>
        datacenterlocation: string
        os: string
        createdat: string
        deployedat: string | null
        updatedat: string
        status: string
        environment: string
        isactive: boolean
        resourceallocation: any | null
        deploymentmethod: string | null
        deploymentduration: number | null
        deployedby: string | null
        lasthealthcheckat: string | null
        healthstatus: string | null
        rollbackreference: number | null
        tags: string[] | null
        additionalinfo: {
            sshName?: string
        } | null
    }
    onOptionsClick?: () => void
}

const ServiceCard: React.FC<ServiceCardProps> = ({ deployment, onOptionsClick }) => {
    // Determine icon based on deployment type
    const getTypeIcon = () => {
        switch (deployment.type) {
            case 'app':
                return <Globe className="h-4 w-4 self-center text-white" />
            case 'linux':
                return <Server className="h-4 w-4 self-center text-white" />
            case 'database':
                return <Database className="h-4 w-4 self-center text-white" />
            case 'volume':
                return <HardDrive className="h-4 w-4 self-center text-white" />
            case 'serverless':
                return <Code className="h-4 w-4 self-center text-white" />
            default:
                return <Server className="h-4 w-4 self-center text-white" />
        }
    }

    // Determine status color
    const getStatusColor = () => {
        switch (deployment.status) {
            case 'deployed':
                return 'bg-green-500'
            case 'deploying':
                return 'bg-yellow-500'
            case 'failed':
                return 'bg-red-500'
            case 'stopped':
                return 'bg-gray-500'
            default:
                return 'bg-blue-500'
        }
    }

    // Format ports for display
    const formatPorts = () => {
        if (!deployment.ports || Object.keys(deployment.ports).length === 0) return 'No ports exposed'

        return Object.entries(deployment.ports)
            .map(([port, mappings]) => {
                // Check if this is SSH port (22/tcp) and if we have an SSH name
                if (port === '22/tcp' && deployment.additionalinfo?.sshName) {
                    return `${port} → ${mappings.join(', ')} (SSH: ${deployment.additionalinfo.sshName})`
                }
                return `${port} → ${mappings.join(', ')}`
            })
            .join(', ')
    }

    return (
        <div className="h-40 w-full rounded-xl bg-[#00000062] p-4">
            <div className="flex">
                <div className={`flex h-3 w-3 self-center rounded-full ${getStatusColor()}`} />
                <h1 className="ml-2 self-center text-lg font-bold text-white">{deployment.name}</h1>
                <div className="ml-2 flex items-center rounded-md bg-[#ffffff15] px-2 py-0.5">
                    {getTypeIcon()}
                    <span className="ml-1 text-xs text-white">{deployment.type}</span>
                </div>
                <MoreVertical className="ml-auto cursor-pointer self-center text-white" onClick={onOptionsClick} />
            </div>
            <div className="mt-1 flex w-full items-center">
                <Container className="h-4 w-4 self-center text-[#7c7c7c]" />
                <h1 className="ml-2 self-center text-sm font-bold text-[#7c7c7c]">{deployment.os}</h1>
                <span className="ml-2 text-xs text-[#7c7c7c]">{deployment.datacenterlocation}</span>
                {deployment.additionalinfo && deployment.additionalinfo.sshName && (
                    <div className="ml-2 flex items-center">
                        <span className="text-xs text-[#7c7c7c]">SSH: </span>
                        <span className="ml-1 text-xs font-medium text-[#7c7c7c]">{deployment.additionalinfo.sshName}</span>
                    </div>
                )}
            </div>
            <div className="mt-4 flex w-full items-center justify-between">
                <div className="flex flex-col">
                    <h1 className="text-sm font-bold text-[#7c7c7c]">IPv4 Address</h1>
                    <CopyTextDisplay text={deployment.ipv4} className="mt-1 flex w-full items-center space-x-2 text-sm text-white" />
                </div>
                {deployment.ipv6 && (
                    <div className="flex flex-col">
                        <h1 className="text-sm font-bold text-[#7c7c7c]">IPv6 Address</h1>
                        <CopyTextDisplay text={deployment.ipv6} className="mt-1 flex w-full items-center space-x-2 text-sm text-white" />
                    </div>
                )}
                <div className="flex flex-col">
                    <h1 className="text-sm font-bold text-[#7c7c7c]">Local IP</h1>
                    <CopyTextDisplay text={deployment.localip} className="mt-1 flex w-full items-center space-x-2 text-sm text-white" />
                </div>
            </div>
            <div className="mt-2 text-xs text-[#7c7c7c]">
                <span>Ports: {formatPorts()}</span>
            </div>
        </div>
    )
}

export default ServiceCard
