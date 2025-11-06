import React from 'react'
import { MetricCardProps } from '../types/MetricCardType'

export const MetricCard = ({ title, value, change, changeType = 'neutral', icon: Icon, iconColor = 'text-cyan-400' }: MetricCardProps) => {
    const getChangeColorClass = () => {
        if (changeType === 'positive') return 'text-green-500'
        if (changeType === 'negative') return 'text-red-500'
        return 'text-gray-400'
    }

    return (
        <div className="rounded-xl border border-[#4d4d4d] bg-[#0303035b] bg-gradient-to-br p-6 text-gray-50 shadow-sm transition-all duration-300 ease-out hover:shadow-[0_0_40px_rgba(34,211,238,0.3)]">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="mb-2 text-sm font-medium text-gray-400">{title}</p>
                    <h3 className="mb-1 text-3xl font-bold text-gray-50">{value}</h3>
                    {change && <p className={`text-sm font-medium ${getChangeColorClass()}`}>{change}</p>}
                </div>
                <div className="rounded-lg bg-[#4e4e4e] p-3 transition-colors duration-300">
                    <Icon
                        style={{
                            height: '1.5rem',
                            width: '1.5rem'
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
