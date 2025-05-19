'use client'

import type React from 'react'
import { RefreshCw, Power, Terminal, Trash2, ExternalLink, Download } from 'lucide-react'

interface DeploymentCardMenuProps {
    deploymentId: number
    currentStatus: string
    deploymentType: string
    onStart: () => void
    onRestart: () => void
    onStop: () => void
    onDelete: () => void
    onViewDetails: () => void
    onSSHConnect?: () => void
    onBackup?: () => void
}

const DeploymentCardMenu: React.FC<DeploymentCardMenuProps> = ({ deploymentId, currentStatus, deploymentType, onStart, onRestart, onStop, onDelete, onViewDetails, onSSHConnect, onBackup }) => {
    return (
        <div className="absolute top-10 right-4 z-20 w-48 rounded-md bg-zinc-800 shadow-lg ring-1 ring-zinc-700">
            <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                <button onClick={onViewDetails} className="flex w-full items-center px-4 py-2 text-left text-sm text-white hover:bg-zinc-700" role="menuitem">
                    <ExternalLink className="mr-3 h-4 w-4" />
                    View Details
                </button>
                <button onClick={onRestart} className="flex w-full items-center px-4 py-2 text-left text-sm text-white hover:bg-zinc-700" role="menuitem">
                    <RefreshCw className="mr-3 h-4 w-4" />
                    Restart
                </button>
                {currentStatus === 'deployed' ? (
                    <button onClick={onStop} className="flex w-full items-center px-4 py-2 text-left text-sm text-white hover:bg-zinc-700" role="menuitem">
                        <Power className="mr-3 h-4 w-4" />
                        Stop
                    </button>
                ) : (
                    <button onClick={onStart} className="flex w-full items-center px-4 py-2 text-left text-sm text-white hover:bg-zinc-700" role="menuitem">
                        <Power className="mr-3 h-4 w-4" />
                        Start
                    </button>
                )}

                {(deploymentType === 'linux' || deploymentType === 'app') && (
                    <button onClick={onSSHConnect} className="flex w-full items-center px-4 py-2 text-left text-sm text-white hover:bg-zinc-700" role="menuitem">
                        <Terminal className="mr-3 h-4 w-4" />
                        SSH Connect
                    </button>
                )}

                {(deploymentType === 'database' || deploymentType === 'volume') && (
                    <button onClick={onBackup} className="flex w-full items-center px-4 py-2 text-left text-sm text-white hover:bg-zinc-700" role="menuitem">
                        <Download className="mr-3 h-4 w-4" />
                        Create Backup
                    </button>
                )}

                <div className="my-1 h-px bg-zinc-700"></div>

                <button onClick={onDelete} className="flex w-full items-center px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-700" role="menuitem">
                    <Trash2 className="mr-3 h-4 w-4" />
                    Delete
                </button>
            </div>
        </div>
    )
}

export default DeploymentCardMenu
