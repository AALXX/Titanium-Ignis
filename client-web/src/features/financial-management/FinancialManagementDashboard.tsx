'use client'
import { BudgetsOverview } from '@/features/financial-management/components/BugetsOverview'
import { FinancialProjection } from '@/features/financial-management/components/FinancialProjection'
import { MetricCard } from '@/features/financial-management/components/MetricCard'
import { QuickActions } from '@/features/financial-management/components/QuickActions'
import { RecentExpenses } from '@/features/financial-management/components/RecentExpenses'
import { RevenueChart } from '@/features/financial-management/components/RevenueChart'
import { BudgetData } from '@/features/financial-management/types/BugetTypes'
import { CreditCard, DollarSign, TrendingUp, Wallet } from 'lucide-react'
import React, { useState } from 'react'
import { ExpensesResponse, InvoicesResponse, ProjectProfitAndLossData } from './types/ResponseTypes'
import { RecentInvoices } from './components/Invoices'
import { Analytics } from './components/Analytics'

interface Props {
    profitAndLoss: ProjectProfitAndLossData
    bugetData: BudgetData
    expenses: ExpensesResponse
    invoices: InvoicesResponse
    projectToken: string
    userSessionToken: string
    currency: string
    fiscalYearStart: Date
}

const FinancialManagementDashboard: React.FC<Props> = ({ profitAndLoss, bugetData, expenses, invoices, projectToken, userSessionToken, currency, fiscalYearStart }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'projection' | 'analytics'>('overview')
    const [TotalRevenue, setTotalRevenue] = useState<number>(profitAndLoss.data.ProfitLoss.TotalRevenue)
    const [TotalExpenses, setTotalExpenses] = useState<number>(profitAndLoss.data.ProfitLoss.TotalExpenses)
    const [ActiveBudgets, setActiveBudgets] = useState<number>(bugetData.data.totalBugets)

    const [bugetList, setBudgetList] = useState(bugetData.data)
    const [expensesList, setExpensesList] = useState(expenses.data.expenses)
    const [invoicesList, setInvoicesList] = useState(invoices.data.invoices)

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'projection', label: 'Projection' },
        { id: 'analytics', label: 'Analytics' }
    ]

    const handleExpenseSuccess = (newExpense: any) => {
        setExpensesList(prev => [newExpense, ...prev])

        setTotalExpenses(prev => prev + parseFloat(newExpense.amount))

        console.log('New expense added:', newExpense)
    }

    const handleInvoiceSuccess = (newInvoice: any) => {
        setInvoicesList(prev => [newInvoice, ...prev])

        console.log('New invoice added:', newInvoice)
    }

    const handleSetBudgetSuccess = (budget: any) => {
        setActiveBudgets(prev => prev + 1)
        console.log('New budget added:', budget)
    }

    return (
        <div>
            <div className="mt-4 mb-8 grid grid-cols-1 gap-6 p-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard title="Total Revenue" value={TotalRevenue.toString()} currency={currency} changeType="positive" icon={DollarSign} />
                <MetricCard title="Total Expenses" value={TotalExpenses.toString()} currency={currency} changeType="negative" icon={CreditCard} />
                <MetricCard title="Net Profit" value={(TotalRevenue - TotalExpenses).toString()} currency={currency} changeType="positive" icon={TrendingUp} />
                <MetricCard title="Active Budgets" value={ActiveBudgets.toString()} changeType="neutral" icon={Wallet} />
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
                        <RevenueChart data={profitAndLoss.data.ChartData} currency={currency} />
                    </div>
                )}
                {/* {activeTab === 'projection' && (
                    <div>
                        <FinancialProjection data={projectionData} />
                    </div>
                )} */}
                {activeTab === 'analytics' && (
                    <div>
                        <Analytics data={profitAndLoss.data} currency={currency} />
                    </div>
                )}
            </div>

            <div className="mb-2 grid grid-cols-1 gap-6 p-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <BudgetsOverview data={bugetList} />
                </div>
                <div>
                    <QuickActions onExpenseSuccess={handleExpenseSuccess} onInvoiceSuccess={handleInvoiceSuccess} budgets={bugetList.bugets} projectToken={projectToken} userSessionToken={userSessionToken} invoices={invoicesList} onRecordPaymentSuccess={handleSetBudgetSuccess} expenses={expensesList}/>
                </div>
            </div>

            <div>
                <RecentExpenses
                    data={expensesList}
                    userSessionToken={userSessionToken}
                    currency={currency}
                    bugetNamesAndTokens={bugetData.data.bugets.reduce((acc: { [key: string]: string }, budget: any) => {
                        acc[budget.BugetToken] = budget.BugetName
                        return acc
                    }, {})}
                />
            </div>
            <div>
                <RecentInvoices data={invoicesList} userSessionToken={userSessionToken} />
            </div>
        </div>
    )
}

export default FinancialManagementDashboard
