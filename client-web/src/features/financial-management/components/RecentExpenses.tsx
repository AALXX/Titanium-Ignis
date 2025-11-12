'use client'

import { CheckCircle, Clock, XCircle, Cloud, Code, Users, Plane, MoreVertical, Search } from 'lucide-react'
import { useState, useMemo } from 'react'
import { Expense } from '../types/ExpensesTypes'
import PopupCanvas from '@/components/PopupCanvas'
import { ExpenseDetails } from './ExpenseDetails'

interface ExpenseProps {
    data: Expense[]
    currency: string
    userSessionToken: string
    bugetNamesAndTokens: { [key: string]: string }
}

const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'Infrastructure':
            return Cloud
        case 'Software':
            return Code
        case 'Contractors':
            return Users
        case 'Travel':
            return Plane
        default:
            return Cloud
    }
}

const getStatusConfig = (status: string) => {
    switch (status) {
        case 'approved':
            return {
                icon: CheckCircle,
                className: 'bg-green-500/10 text-green-500 border-green-500/20',
                label: 'Approved'
            }
        case 'pending':
            return {
                icon: Clock,
                className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                label: 'Pending'
            }
        case 'rejected':
            return {
                icon: XCircle,
                className: 'bg-red-500/10 text-red-500 border-red-500/20',
                label: 'Rejected'
            }
        default:
            return {
                icon: Clock,
                className: 'bg-slate-800 text-slate-400 border-slate-700',
                label: status
            }
    }
}

export const RecentExpenses: React.FC<ExpenseProps> = ({ data, currency, bugetNamesAndTokens, userSessionToken }) => {
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [showMore, setShowMore] = useState<boolean>(false)

    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)

    const formatCurrency = (amount: number, curirrency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: curirrency,
            minimumFractionDigits: 0
        }).format(amount)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const filteredExpenses = useMemo(() => {
        if (!searchQuery.trim()) return data

        const query = searchQuery.toLowerCase()
        return data.filter(expense => expense.Description?.toLowerCase().includes(query) || expense.Category.toLowerCase().includes(query) || expense.ExpenseTitle.toLowerCase().includes(query) || expense.Status.toLowerCase().includes(query) || formatCurrency(expense.Amount, currency).toLowerCase().includes(query))
    }, [searchQuery])

    return (
        <div className="p-4">
            <div className="rounded-xl border border-[#4d4d4d] bg-[#0303035b] p-8">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-slate-50">Recent Expenses</h3>
                        <p className="mt-1 text-sm text-slate-400">Latest expense submissions and approvals</p>
                    </div>
                </div>

                <div className="relative mb-6">
                    <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search expenses by description, category, project, or status..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-[#4d4d4d] bg-[#03030367] py-3 pr-4 pl-10 text-slate-50 placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 focus:outline-none"
                    />
                </div>

                {showMore && (
                    <PopupCanvas
                        closePopup={() => {
                            setShowMore(false)
                        }}
                    >
                        <ExpenseDetails expense={selectedExpense!} onClose={() => setShowMore(false)} bugetNamesAndTokens={bugetNamesAndTokens} userSessionToken={userSessionToken} />
                    </PopupCanvas>
                )}

                <div className="space-y-3">
                    {filteredExpenses.length === 0 ? (
                        <div className="rounded-lg border border-[#4d4d4d] bg-[#03030367] p-8 text-center">
                            <p className="text-slate-400">No expenses found matching "{searchQuery}"</p>
                        </div>
                    ) : (
                        filteredExpenses.map(expense => {
                            const CategoryIcon = getCategoryIcon(expense.Category)
                            const statusConfig = getStatusConfig(expense.Status)
                            const StatusIcon = statusConfig.icon

                            return (
                                <div
                                    key={expense.ExpenseToken}
                                    className="group flex cursor-pointer items-center gap-4 rounded-lg border border-[#4d4d4d] bg-[#03030367] p-4 transition-colors hover:bg-slate-800/50"
                                    onClick={() => {
                                        setShowMore(true)
                                        setSelectedExpense(expense)
                                    }}
                                >
                                    <div className="rounded-lg bg-cyan-400/10 p-3">
                                        <CategoryIcon className="h-5 w-5 text-cyan-400" />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1 flex items-center gap-2">
                                            <h4 className="truncate font-semibold text-slate-50">{expense.ExpenseTitle}</h4>
                                            <span className="rounded border border-slate-800 bg-slate-800/50 px-2 py-1 text-xs text-slate-50">{expense.Category}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-400">
                                            <span>{expense.Description}</span>
                                            <span>{formatDate(expense.CreatedAt)}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-slate-50">{formatCurrency(expense.Amount, currency)}</p>
                                        </div>

                                        <span className={`flex items-center gap-1 rounded border px-2 py-1 text-sm ${statusConfig.className}`}>
                                            <StatusIcon className="h-3 w-3" />
                                            {statusConfig.label}
                                        </span>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}
