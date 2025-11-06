'use client'
import Analytics from '@/features/financial-management/components/Analytics'
import { BudgetsOverview } from '@/features/financial-management/components/BugetsOverview'
import { FinancialProjection } from '@/features/financial-management/components/FinancialProjection'
import { MetricCard } from '@/features/financial-management/components/MetricCard'
import { QuickActions } from '@/features/financial-management/components/QuickActions'
import { RecentExpenses } from '@/features/financial-management/components/RecentExpenses'
import { RevenueChart } from '@/features/financial-management/components/RevenueChart'
import { BudgetItem } from '@/features/financial-management/types/BugetTypes'
import { CreditCard, DollarSign, TrendingUp, Wallet } from 'lucide-react'
import React, { useState } from 'react'

const FinancialManagement = () => {
    const data = [
        { month: 'Jan', revenue: 99000, expenses: 120000 },
        { month: 'Feb', revenue: -30000, expenses: 95000 },
        { month: 'Mar', revenue: 16000, expenses: 98000 },
        { month: 'Apr', revenue: 16500, expenses: 103000 },
        { month: 'May', revenue: 18000, expenses: 105000 },
        { month: 'Jun', revenue: 19500, expenses: 110000 },
        { month: 'Jul', revenue: 21000, expenses: 115000 },
        { month: 'Aug', revenue: 22500, expenses: 118000 }
    ]

    const projectionData = [
        { month: 'Oct', actual: 234000, projected: 234000 },
        { month: 'Nov', actual: null, projected: 245000 },
        { month: 'Dec', actual: null, projected: 258000 },
        { month: 'Jan', actual: null, projected: 271000 },
        { month: 'Feb', actual: null, projected: 283000 },
        { month: 'Mar', actual: null, projected: 296000 },
        { month: 'Apr', actual: null, projected: 310000 },
        { month: 'May', actual: null, projected: 325000 },
        { month: 'Jun', actual: null, projected: 341000 }
    ]

    const expenses = [
        {
            id: '1',
            description: 'AWS Cloud Services',
            amount: 2847.5,
            category: 'Infrastructure',
            date: '2025-10-24',
            status: 'approved',
            project: 'Mobile App Redesign'
        },
        {
            id: '2',
            description: 'Figma Enterprise License',
            amount: 450.0,
            category: 'Software',
            date: '2025-10-23',
            status: 'approved',
            project: 'Website Optimization'
        },
        {
            id: '3',
            description: 'Frontend Developer Contract',
            amount: 8500.0,
            category: 'Contractors',
            date: '2025-10-22',
            status: 'pending',
            project: 'AI Integration Platform'
        },
        {
            id: '4',
            description: 'Team Offsite Travel',
            amount: 3250.0,
            category: 'Travel',
            date: '2025-10-21',
            status: 'pending',
            project: 'Cloud Infrastructure'
        },
        {
            id: '5',
            description: 'Azure DevOps Premium',
            amount: 890.0,
            category: 'Infrastructure',
            date: '2025-10-20',
            status: 'approved',
            project: 'Mobile App Redesign'
        }
    ]

    const budgetData: BudgetItem[] = [
        {
            id: '1',
            project: 'Mobile App Redesign',
            budget: 150000,
            spent: 87500,
            remaining: 12500,
            status: 'healthy'
        },
        {
            id: '2',
            project: 'Cloud Infrastructure',
            budget: 75000,
            spent: 68250,
            remaining: 6750,
            status: 'warning'
        },
        {
            id: '3',
            project: 'AI Integration Platform',
            budget: 200000,
            spent: 195000,
            remaining: 5000,
            status: 'critical'
        },
        {
            id: '4',
            project: 'Website Optimization',
            budget: 50000,
            spent: 22500,
            remaining: 27500,
            status: 'healthy'
        }
    ]
    const [activeTab, setActiveTab] = useState<'overview' | 'projection' | 'analytics'>('overview')
    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'projection', label: 'Projection' },
        { id: 'analytics', label: 'Analytics' }
    ]

    return (
        <div className="flex h-screen flex-col overflow-y-auto">
            <div className="mt-4 mb-8 grid grid-cols-1 gap-6 p-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard title="Total Revenue" value="$2,134,500" change="+12.5%" changeType="positive" icon={DollarSign} />
                <MetricCard title="Total Expenses" value="$1,323,500" change="+8.2%" changeType="negative" icon={CreditCard} />
                <MetricCard title="Net Profit" value="$811,000" change="+18.7%" changeType="positive" icon={TrendingUp} />
                <MetricCard title="Active Budgets" value="12" change="3 pending" changeType="neutral" icon={Wallet} />
            </div>
            <div className="p-4">
                <div className="mb-4 inline-flex gap-2 rounded-2xl border border-[#4d4d4d] bg-zinc-900/50 p-2 backdrop-blur-sm">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.label.toLowerCase() as 'overview' | 'projection' | 'analytics')}
                            className={`relative rounded-xl px-6 py-2.5 text-sm font-medium transition-all duration-300 ${activeTab === tab.id ? 'border border-zinc-700/50 bg-zinc-900 text-white shadow-lg shadow-cyan-500/5' : 'border border-transparent text-zinc-500 hover:text-zinc-400'} `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                {activeTab === 'overview' && (
                    <div>
                        <RevenueChart data={data} />
                    </div>
                )}
                {activeTab === 'projection' && (
                    <div>
                        <FinancialProjection data={projectionData} />
                    </div>
                )}
                {activeTab === 'analytics' && (
                    <div>
                        <Analytics data={data} />
                    </div>
                )}
            </div>

            <div className="mb-2 grid grid-cols-1 gap-6 p-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <BudgetsOverview data={budgetData} />
                </div>
                <div>
                    <QuickActions />
                </div>
            </div>

            <div>
                <RecentExpenses data={expenses} />
            </div>
        </div>
    )
}

export default FinancialManagement
