'use client'

import React, { useState } from 'react'
import { CheckCircle, Clock, XCircle, Calendar, User, DollarSign, FileText, Tag, Wallet, Download, AlertCircle } from 'lucide-react'
import { Expense } from '../types/ExpensesTypes'

interface ExpenseDetailsProps {
    expense: Expense
    bugetNamesAndTokens: { [key: string]: string }
    onClose: () => void
    onSuccess?: (updatedExpense: any) => void
    userSessionToken: string
}

const getCategoryLabel = (category: string) => {
    const categories: Record<string, string> = {
        personnel: 'Personnel',
        software_licenses: 'Software Licenses',
        hardware: 'Hardware',
        cloud_services: 'Cloud Services',
        training: 'Training',
        travel: 'Travel',
        office_expenses: 'Office Expenses',
        outsourcing: 'Outsourcing',
        communications: 'Communications',
        miscellaneous: 'Miscellaneous',
        other: 'Other'
    }
    return categories[category] || category
}

const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
        case 'approved':
            return {
                icon: CheckCircle,
                className: 'bg-green-500/10 text-green-500 border-green-500/20',
                label: 'Approved',
                badgeColor: 'bg-green-500'
            }
        case 'pending':
            return {
                icon: Clock,
                className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                label: 'Pending Approval',
                badgeColor: 'bg-amber-500'
            }
        case 'rejected':
            return {
                icon: XCircle,
                className: 'bg-red-500/10 text-red-500 border-red-500/20',
                label: 'Rejected',
                badgeColor: 'bg-red-500'
            }
        default:
            return {
                icon: Clock,
                className: 'bg-slate-800 text-slate-400 border-slate-700',
                label: status,
                badgeColor: 'bg-slate-500'
            }
    }
}

export const ExpenseDetails: React.FC<ExpenseDetailsProps> = ({ expense, bugetNamesAndTokens, onClose, onSuccess, userSessionToken }) => {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [rejectionReason, setRejectionReason] = useState('')

    const statusConfig = getStatusConfig(expense.Status)
    const StatusIcon = statusConfig.icon

    const formatCurrency = (amount: number, currency: string = 'EUR') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(amount)
    }

    const formatDateShort = (dateString: string | null) => {
        if (!dateString) return 'N/A'
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const getBudgetName = (budgetToken: string) => {
        return bugetNamesAndTokens[budgetToken] || 'Unknown Budget'
    }

    const handleApprove = async () => {
        setError(null)
        setIsSubmitting(true)

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_FINANCIAL_SERVER}/api/project-expense-manager/approve-expense`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ExpenseToken: expense.ExpenseToken,
                    UserSessionToken: userSessionToken,
                    Status: 'approved'
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || 'Failed to approve expense')
            }

            const data = await response.json()
            console.log('Expense approved successfully:', data)

            if (onSuccess) {
                onSuccess(data.expense || { ...expense, Status: 'approved' })
            }

            setTimeout(() => onClose(), 1500)
        } catch (err) {
            console.error('Error approving expense:', err)
            if (err instanceof Error) {
                setError(err.message)
            } else {
                setError('An unexpected error occurred. Please try again.')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            setError('Please provide a reason for rejection')
            return
        }

        setError(null)
        setIsSubmitting(true)

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_FINANCIAL_SERVER}/api/project-expense-manager/approve-expense`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ExpenseToken: expense.ExpenseToken,
                    UserSessionToken: userSessionToken,
                    Status: 'rejected',
                    RejectionReason: rejectionReason
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || 'Failed to reject expense')
            }

            const data = await response.json()
            console.log('Expense rejected successfully:', data)

            if (onSuccess) {
                onSuccess(data.expense || { ...expense, Status: 'rejected', RejectionReason: rejectionReason })
            }

            setTimeout(() => onClose(), 1500)
        } catch (err) {
            console.error('Error rejecting expense:', err)
            if (err instanceof Error) {
                setError(err.message)
            } else {
                setError('An unexpected error occurred. Please try again.')
            }
        } finally {
            setIsSubmitting(false)
            setShowRejectModal(false)
        }
    }

    return (
        <div className="h-full w-full overflow-y-auto">
            <div className="mb-6">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-white">{expense.ExpenseTitle}</h2>
                        <p className="mt-1 text-sm text-gray-400">Expense Details and Information</p>
                    </div>
                    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${statusConfig.className}`}>
                        <StatusIcon className="h-4 w-4" />
                        <span className="text-sm font-medium">{statusConfig.label}</span>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            <div className="mb-6 rounded-xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 to-cyan-500/5 p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-400">Expense Amount</p>
                        <p className="mt-1 text-4xl font-bold text-cyan-400">{formatCurrency(expense.Amount)}</p>
                    </div>
                    <div className="rounded-lg bg-cyan-400/20 p-4">
                        <DollarSign className="h-8 w-8 text-cyan-400" />
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                    <h3 className="mb-4 text-lg font-semibold text-white">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-white/10 p-2">
                                <Tag className="h-4 w-4 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Category</p>
                                <p className="mt-1 font-medium text-gray-100">{getCategoryLabel(expense.Category)}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-white/10 p-2">
                                <Calendar className="h-4 w-4 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Expense Date</p>
                                <p className="mt-1 font-medium text-gray-100">{formatDateShort(expense.ExpenseDate)}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-white/10 p-2">
                                <User className="h-4 w-4 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Created By</p>
                                <p className="mt-1 font-medium text-gray-100">{expense.CreatedByName}</p>
                                <p className="text-xs text-gray-500">{expense.UserPublicToken}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-white/10 p-2">
                                <Clock className="h-4 w-4 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Submitted On</p>
                                <p className="mt-1 font-medium text-gray-100">{formatDateShort(expense.CreatedAt)}</p>
                            </div>
                        </div>
                    </div>

                    {expense.BugetToken && (
                        <div className="mt-4 flex items-start gap-3 border-t border-white/10 pt-4">
                            <div className="rounded-lg bg-white/10 p-2">
                                <Wallet className="h-4 w-4 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Budget</p>
                                <p className="mt-1 text-sm font-medium text-gray-100">{getBudgetName(expense.BugetToken)}</p>
                            </div>
                        </div>
                    )}
                </div>

                {expense.Description && (
                    <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                        <div className="mb-3 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-cyan-400" />
                            <h3 className="text-lg font-semibold text-white">Description</h3>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-300">{expense.Description}</p>
                    </div>
                )}

                {expense.ReceiptUrl && (
                    <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-cyan-400" />
                                <h3 className="text-lg font-semibold text-white">Receipt</h3>
                            </div>
                            <a
                                href={expense.ReceiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-gray-100 backdrop-blur-sm transition-all hover:border-cyan-400/50 hover:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none"
                            >
                                <Download className="h-4 w-4" />
                                Download
                            </a>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                            <p className="text-sm text-gray-400">Receipt file attached</p>
                        </div>
                    </div>
                )}

                {expense.Status.toLowerCase() === 'approved' && (
                    <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-6 backdrop-blur-sm">
                        <div className="mb-4 flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-400" />
                            <h3 className="text-lg font-semibold text-white">Approval Information</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-400">Approved By</p>
                                <p className="mt-1 font-medium text-gray-100">{expense.ApprovedByName || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Approval Date</p>
                                <p className="mt-1 font-medium text-gray-100">{formatDateShort(expense.ApprovalDate)}</p>
                            </div>
                        </div>
                        {expense.ReimbursementDate && (
                            <div className="mt-4 border-t border-green-500/20 pt-4">
                                <p className="text-xs text-gray-400">Reimbursement Date</p>
                                <p className="mt-1 font-medium text-gray-100">{formatDateShort(expense.ReimbursementDate)}</p>
                            </div>
                        )}
                    </div>
                )}

                {expense.Status.toLowerCase() === 'rejected' && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 backdrop-blur-sm">
                        <div className="mb-4 flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-red-400" />
                            <h3 className="text-lg font-semibold text-white">Rejection Information</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-400">Rejected By</p>
                                <p className="mt-1 font-medium text-gray-100">{expense.ApprovedByName || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Rejection Date</p>
                                <p className="mt-1 font-medium text-gray-100">{formatDateShort(expense.ApprovalDate)}</p>
                            </div>
                        </div>
                        {expense.RejectionReason && (
                            <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                                    <div>
                                        <p className="text-xs font-medium text-red-400">Reason</p>
                                        <p className="mt-1 text-sm text-gray-300">{expense.RejectionReason}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                    <h3 className="mb-4 text-lg font-semibold text-white">Metadata</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Expense ID</span>
                            <span className="font-mono text-gray-100">{expense.ExpenseId}</span>
                        </div>
                        <div className="flex items-start justify-between gap-4 text-sm">
                            <span className="whitespace-nowrap text-gray-400">Expense Token</span>
                            <span className="text-right font-mono text-xs break-all text-gray-100">{expense.ExpenseToken}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Last Updated</span>
                            <span className="text-gray-100">{formatDateShort(expense.UpdatedAt)}</span>
                        </div>
                    </div>
                </div>

                {/* Rejection Modal */}
                {showRejectModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-lg border border-white/10 bg-gray-900 p-6">
                            <h3 className="mb-4 text-xl font-bold text-white">Reject Expense</h3>
                            <p className="mb-4 text-sm text-gray-400">Please provide a reason for rejecting this expense:</p>
                            <textarea
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                                rows={4}
                                maxLength={1000}
                                placeholder="Enter rejection reason..."
                                className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none"
                            />
                            <p className="mt-1 text-xs text-gray-500">{rejectionReason.length}/1000 characters</p>
                            <div className="mt-4 flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowRejectModal(false)
                                        setRejectionReason('')
                                        setError(null)
                                    }}
                                    disabled={isSubmitting}
                                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-100 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={isSubmitting || !rejectionReason.trim()}
                                    className="flex-1 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 backdrop-blur-sm transition-all hover:border-red-500/30 hover:bg-red-500/20 focus:ring-2 focus:ring-red-400/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-100 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Close
                    </button>
                    {expense.Status.toLowerCase() === 'pending' && (
                        <>
                            <button
                                onClick={() => setShowRejectModal(true)}
                                disabled={isSubmitting}
                                className="flex-1 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 backdrop-blur-sm transition-all hover:border-red-500/30 hover:bg-red-500/20 focus:ring-2 focus:ring-red-400/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Reject
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={isSubmitting}
                                className="flex-1 rounded-lg bg-gradient-to-r from-green-400 to-green-500 px-4 py-2.5 text-sm font-medium text-gray-900 shadow-lg shadow-green-500/30 transition-all hover:from-green-500 hover:to-green-600 hover:shadow-green-500/40 focus:ring-2 focus:ring-green-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSubmitting ? 'Approving...' : 'Approve'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ExpenseDetails
