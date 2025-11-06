import React from 'react'
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { BudgetItemProps } from '../types/BugetTypes'


export const BudgetsOverview: React.FC<BudgetItemProps> = ({ data }) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const getStatusClasses = (status: string) => {
        switch (status) {
            case 'healthy':
                return 'bg-green-500/10 text-green-500 border-green-500/20'
            case 'warning':
                return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            case 'critical':
                return 'bg-red-500/10 text-red-500 border-red-500/20'
            default:
                return 'bg-slate-800 text-slate-400 border-slate-700'
        }
    }

    return (
        <div className="rounded-xl border border-[#4d4d4d] bg-[#0303035b] p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h3 className="m-0 text-xl font-bold text-slate-50">Project Budgets</h3>
                    <p className="mt-1 mb-0 text-sm text-slate-400">Real-time budget tracking across all projects</p>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                {data.map(item => {
                    const percentage = (item.spent / item.budget) * 100

                    return (
                        <div key={item.id} className="rounded-lg border border-[#4d4d4d] bg-[#03030367] p-4 transition-colors hover:bg-slate-800/50">
                            <div className="mb-3 flex items-start justify-between">
                                <div className="flex-1">
                                    <h4 className="mt-0 mb-1 font-semibold text-slate-50">{item.project}</h4>
                                    <div className="flex items-center gap-3 text-sm">
                                        <span className="text-slate-400">Budget: {formatCurrency(item.budget)}</span>
                                        <span className="text-slate-50">Spent: {formatCurrency(item.spent)}</span>
                                    </div>
                                </div>
                                <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusClasses(item.status)}`}>{percentage.toFixed(0)}%</div>
                            </div>

                            <div className="relative mb-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                                <div className="h-full bg-cyan-400 transition-transform duration-300" style={{ width: `${percentage}%` }} />
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    {item.status === 'healthy' ? <TrendingDown className="h-4 w-4 text-green-500" /> : item.status === 'warning' ? <AlertCircle className="h-4 w-4 text-amber-500" /> : <TrendingUp className="h-4 w-4 text-red-500" />}
                                    <span className="text-slate-400">Remaining: {formatCurrency(item.remaining)}</span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
