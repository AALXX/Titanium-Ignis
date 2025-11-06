import React from 'react'

interface AnalyticsProps { 
    data: any
}

const Analytics: React.FC<AnalyticsProps> = ({data}) => {
    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-[#4d4d4d] bg-[#0303035b] p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-50">Revenue Breakdown</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Fixed Price Projects</span>
                        <span className="font-semibold text-slate-50">$1.2M (56%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Time & Materials</span>
                        <span className="font-semibold text-slate-50">$650k (30%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Retainers</span>
                        <span className="font-semibold text-slate-50">$284k (14%)</span>
                    </div>
                </div>
            </div>
            <div className="rounded-lg border border-[#4d4d4d] bg-[#0303035b] p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-50">Expense Categories</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Labor Costs</span>
                        <span className="font-semibold text-slate-50">$785k (59%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Infrastructure</span>
                        <span className="font-semibold text-slate-50">$324k (24%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Software & Tools</span>
                        <span className="font-semibold text-slate-50">$214k (17%)</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Analytics
