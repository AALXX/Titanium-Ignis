'use client'

import { CheckCircle, Clock, XCircle, AlertCircle, FileText, MoreVertical, Search } from 'lucide-react'
import { useState, useMemo } from 'react'
import { Invoice } from '../types/InvoiceType'
import PopupCanvas from '@/components/PopupCanvas'
import { InvoiceDetails } from './InvoiceDetails'

interface InvoicesProps {
    data: Invoice[]
    userSessionToken: string
}

const getStatusConfig = (status: string) => {
    switch (status) {
        case 'paid':
            return {
                icon: CheckCircle,
                className: 'bg-green-500/10 text-green-500 border-green-500/20',
                label: 'Paid'
            }
        case 'partially_paid':
            return {
                icon: Clock,
                className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                label: 'Partially Paid'
            }
        case 'sent':
            return {
                icon: Clock,
                className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                label: 'Sent'
            }
        case 'overdue':
            return {
                icon: AlertCircle,
                className: 'bg-red-500/10 text-red-500 border-red-500/20',
                label: 'Overdue'
            }
        case 'draft':
            return {
                icon: FileText,
                className: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                label: 'Draft'
            }
        default:
            return {
                icon: Clock,
                className: 'bg-slate-800 text-slate-400 border-slate-700',
                label: status
            }
    }
}

export const RecentInvoices: React.FC<InvoicesProps> = ({ data, userSessionToken }) => {
    const [searchQuery, setSearchQuery] = useState('')
    const [showMore, setShowMore] = useState<boolean>(false)

    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
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

    const filteredInvoices = useMemo(() => {
        if (!searchQuery.trim()) return data

        const query = searchQuery.toLowerCase()
        return data.filter(invoice => invoice.ClientName.toLowerCase().includes(query) || invoice.BillingType.toLowerCase().includes(query) || invoice.Status.toLowerCase().includes(query) || formatCurrency(invoice.TotalAmount, invoice.Currency).toLowerCase().includes(query) || invoice.InvoiceToken.toLowerCase().includes(query))
    }, [searchQuery, data])

    return (
        <div className="p-4">
            <div className="rounded-xl border border-[#4d4d4d] bg-[#0303035b] p-8">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-slate-50">Recent Invoices</h3>
                        <p className="mt-1 text-sm text-slate-400">Latest invoice submissions and payments</p>
                    </div>
                </div>

                <div className="relative mb-6">
                    <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search invoices by client, billing type, or status..."
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
                        <InvoiceDetails
                            invoice={selectedInvoice!}
                            userSessionToken={userSessionToken}
                            onClose={() => {
                                setShowMore(false)
                            }}
                        />
                    </PopupCanvas>
                )}
                <div className="space-y-3">
                    {filteredInvoices.length === 0 ? (
                        <div className="rounded-lg border border-[#4d4d4d] bg-[#03030367] p-8 text-center">
                            <p className="text-slate-400">{searchQuery ? `No invoices found matching "${searchQuery}"` : 'No invoices available'}</p>
                        </div>
                    ) : (
                        filteredInvoices.map(invoice => {
                            const statusConfig = getStatusConfig(invoice.Status)
                            const StatusIcon = statusConfig.icon

                            return (
                                <div
                                    key={invoice.InvoiceToken}
                                    className="group flex items-center gap-4 rounded-lg border border-[#4d4d4d] bg-[#03030367] p-4 transition-colors hover:bg-slate-800/50"
                                    onClick={() => {
                                        setShowMore(true)
                                        setSelectedInvoice(invoice)
                                    }}
                                >
                                    <div className="rounded-lg bg-cyan-400/10 p-3">
                                        <FileText className="h-5 w-5 text-cyan-400" />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1 flex items-center gap-2">
                                            <h4 className="truncate font-semibold text-slate-50">{invoice.ClientName}</h4>
                                            <span className="rounded border border-slate-800 bg-slate-800/50 px-2 py-1 text-xs text-slate-50 capitalize">{invoice.BillingType.replace('-', ' ')}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-400">
                                            <span>Invoice #{invoice.InvoiceId}</span>
                                            <span>•</span>
                                            <span>Issued {formatDate(invoice.IssueDate)}</span>
                                            {invoice.AmountDue > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-amber-400">Due: {formatCurrency(invoice.AmountDue, invoice.Currency)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-slate-50">{formatCurrency(invoice.TotalAmount, invoice.Currency)}</p>
                                            {invoice.TotalPaid > 0 && invoice.Status === 'partially_paid' && <p className="text-xs text-green-400">{formatCurrency(invoice.TotalPaid, invoice.Currency)} paid</p>}
                                        </div>

                                        <span className={`flex items-center gap-1 rounded border px-2 py-1 text-sm ${statusConfig.className}`}>
                                            <StatusIcon className="h-3 w-3" />
                                            {statusConfig.label}
                                        </span>

                                        <button className="rounded bg-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-slate-800/50">
                                            <MoreVertical className="h-4 w-4 text-slate-50" />
                                        </button>
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
