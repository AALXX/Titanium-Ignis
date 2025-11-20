'use client'

import CopyTextDisplay from '@/components/CopyTextDisplay'
import { Container, MoreVertical, Server, Database, Globe, HardDrive, Code } from 'lucide-react'
import type React from 'react'
import { useState, useRef, useEffect } from 'react'
import DeploymentCardMenu from './DeploymentCardMenu'
import type { Socket } from 'socket.io-client'
import { ServiceCardPropsRequest, DataCenters } from '../types/DeploymentOptions'
import { useRouter } from 'next/navigation'

interface ServiceCardProps {
    socket: Socket
    userSessionToken: string
    deployment: ServiceCardPropsRequest
}

const ServiceCard: React.FC<ServiceCardProps> = ({ deployment, userSessionToken, socket }) => {
    const [showMenu, setShowMenu] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLDivElement>(null)

    const router = useRouter()

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node) && buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setShowMenu(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

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

    const handleStart = () => {
        console.log(`Starting deployment ${deployment.id}`)

        socket.emit('start-deployment', {
            projectToken: deployment.projecttoken,
            userSessionToken: userSessionToken,
            deploymentToken: deployment.deploymenttoken
        })

        setShowMenu(false)
    }

    const handleRestart = () => {
        console.log(`Restarting deployment ${deployment.id}`)
        socket.emit('restart-deployment', {
            projectToken: deployment.projecttoken,
            deploymentToken: deployment.deploymenttoken
        })
        setShowMenu(false)
    }

    const handleStop = () => {
        console.log(`Stopping deployment ${deployment.id}`)
        socket.emit('stop-deployment', {
            projectToken: deployment.projecttoken,
            deploymentToken: deployment.deploymenttoken
        })
        setShowMenu(false)
    }

    const handleDelete = () => {
        console.log(`Deleting deployment ${deployment.id}`)
        socket.emit('delete-deployment', {
            projectToken: deployment.projecttoken,
            deploymentToken: deployment.deploymenttoken
        })
        setShowMenu(false)
    }

    const handleViewDetails = () => {
        router.push(`/projects/${deployment.projecttoken}/deployments/${deployment.deploymenttoken}`)

        setShowMenu(false)
    }

    const handleSSHConnect = () => {
        console.log(`SSH connecting to deployment ${deployment.id}`)
        setShowMenu(false)
    }

    const handleBackup = () => {
        console.log(`Creating backup for deployment ${deployment.id}`)
        setShowMenu(false)
    }

    const handleCardClick = (e: React.MouseEvent) => {
        // Only navigate if clicking on the card itself, not interactive elements
        router.push(`/projects/${deployment.projecttoken}/deployments/${deployment.deploymenttoken}`)
    }

    return (
        <div className="h-40 w-full cursor-pointer rounded-xl bg-[#00000062] p-4" onClick={handleCardClick}>
            <div className="flex">
                <div className={`flex h-3 w-3 self-center rounded-full ${getStatusColor()}`} />
                <h1 className="ml-2 self-center text-lg font-bold text-white">{deployment.name}</h1>
                <div className="ml-2 flex items-center rounded-md bg-[#ffffff15] px-2 py-0.5">
                    {getTypeIcon()}
                    <span className="ml-1 text-xs text-white">{deployment.type}</span>
                </div>

                <div className="relative ml-auto">
                    <div
                        ref={buttonRef}
                        className="z-20 cursor-pointer"
                        onClick={event => {
                            event.preventDefault()
                            event.stopPropagation()
                            event.nativeEvent.stopImmediatePropagation()
                            setShowMenu(!showMenu)
                        }}
                    >
                        <MoreVertical className="self-center text-white" />
                    </div>

                    {showMenu && (
                        <div
                            ref={menuRef}
                            onClick={event => {
                                event.preventDefault()
                                event.stopPropagation()
                                event.nativeEvent.stopImmediatePropagation()
                            }}
                        >
                            <DeploymentCardMenu currentStatus={deployment.status} deploymentId={deployment.id} deploymentType={deployment.type} onStart={handleStart} onRestart={handleRestart} onStop={handleStop} onDelete={handleDelete} onViewDetails={handleViewDetails} onSSHConnect={handleSSHConnect} onBackup={handleBackup} />
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-1 flex w-full items-center">
                <Container className="h-4 w-4 self-center text-[#7c7c7c]" />
                <h1 className="ml-2 self-center text-sm font-bold text-[#7c7c7c]">{deployment.os.os}</h1>
                <span className="ml-2 text-xs text-[#7c7c7c]">{deployment.datacenterlocation.datacenterlocation}</span>
            </div>
            <div className="mt-4 flex w-full items-center justify-between" onClick={e => e.stopPropagation()}>
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
