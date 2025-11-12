'use client'

import React, { useState } from 'react'
import axios from 'axios'
import { CheckCircle, Clock, XCircle, AlertCircle, Calendar, User, DollarSign, FileText, CreditCard, Download, Loader2, Receipt } from 'lucide-react'
import { Invoice } from '../types/InvoiceType'

interface InvoiceDetailsProps {
    invoice: Invoice
    onClose: () => void
    userSessionToken: string
}

const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
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
        case 'cancelled':
            return {
                icon: XCircle,
                className: 'bg-red-500/10 text-red-500 border-red-500/20',
                label: 'Cancelled'
            }
        default:
            return {
                icon: Clock,
                className: 'bg-slate-800 text-slate-400 border-slate-700',
                label: status
            }
    }
}

const getBillingTypeLabel = (type: string) => {
    const types: Record<string, string> = {
        'fixed-price': 'Fixed Price',
        hourly: 'Time & Materials',
        milestone: 'Milestone-based',
        retainer: 'Retainer'
    }
    return types[type] || type
}

const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
        bank_transfer: 'Bank Transfer',
        credit_card: 'Credit Card',
        paypal: 'PayPal',
        check: 'Check',
        cash: 'Cash',
        other: 'Other'
    }
    return methods[method] || method
}

const getItemTypeLabel = (type: string) => {
    const types: Record<string, string> = {
        service: 'Service',
        product: 'Product',
        subscription: 'Subscription',
        milestone: 'Milestone',
        retainer: 'Retainer',
        training: 'Training',
        expense: 'Expense',
        maintenance: 'Maintenance'
    }
    return types[type] || type
}

export const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({ invoice, onClose, userSessionToken }) => {
    const [isDownloading, setIsDownloading] = useState(false)
    const [downloadError, setDownloadError] = useState<string | null>(null)

    const statusConfig = getStatusConfig(invoice.Status)
    const StatusIcon = statusConfig.icon

    const formatCurrency = (amount: number, currency: string = 'EUR') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(amount)
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A'
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const formatDateTime = (dateString: string | null) => {
        if (!dateString) return 'N/A'
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const handleDownloadPDF = async () => {
        setIsDownloading(true)
        setDownloadError(null)

        try {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_FINANCIAL_SERVER}/api/project-invoice-manager/generate-pdf/${invoice.InvoiceToken}/${userSessionToken}`, {
                responseType: 'blob'
            })

            const blob = new Blob([response.data], { type: 'application/pdf' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `invoice-${invoice.InvoiceId.toString().padStart(6, '0')}.pdf`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (err) {
            console.error('Error downloading PDF:', err)
            if (axios.isAxiosError(err)) {
                setDownloadError(err.response?.data?.message || 'Failed to download PDF. Please try again.')
            } else {
                setDownloadError('Failed to download PDF. Please try again.')
            }
        } finally {
            setIsDownloading(false)
        }
    }

    const getPaymentStatusPercentage = () => {
        if (invoice.TotalAmount === 0) return 0
        return (invoice.TotalPaid / invoice.TotalAmount) * 100
    }

    return (
        <div className="h-full w-full overflow-y-auto">
            <div className="mb-6">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-white">Invoice #{invoice.InvoiceId.toString().padStart(6, '0')}</h2>
                            <span className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${statusConfig.className}`}>
                                <StatusIcon className="h-4 w-4" />
                                <span className="text-sm font-medium">{statusConfig.label}</span>
                            </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-400">{invoice.ClientName}</p>
                    </div>
                    <button
                        onClick={handleDownloadPDF}
                        disabled={isDownloading}
                        className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-400 backdrop-blur-sm transition-all hover:border-cyan-400/50 hover:bg-cyan-400/20 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isDownloading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4" />
                                Download PDF
                            </>
                        )}
                    </button>
                </div>
                {downloadError && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                        <p className="text-xs text-red-400">{downloadError}</p>
                    </div>
                )}
            </div>

            <div className="mb-6 rounded-xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 to-cyan-500/5 p-6 backdrop-blur-sm">
                <div className="grid grid-cols-3 gap-6">
                    <div>
                        <p className="text-sm text-gray-400">Total Amount</p>
                        <p className="mt-1 text-3xl font-bold text-cyan-400">{formatCurrency(invoice.TotalAmount, invoice.Currency)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">Amount Paid</p>
                        <p className="mt-1 text-3xl font-bold text-green-400">{formatCurrency(invoice.TotalPaid, invoice.Currency)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">Amount Due</p>
                        <p className={`mt-1 text-3xl font-bold ${invoice.AmountDue > 0 ? 'text-amber-400' : 'text-gray-400'}`}>{formatCurrency(invoice.AmountDue, invoice.Currency)}</p>
                    </div>
                </div>

                <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Payment Progress</span>
                        <span className="font-medium text-cyan-400">{getPaymentStatusPercentage().toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div className="h-full bg-gradient-to-r from-cyan-400 to-green-400 transition-all duration-300" style={{ width: `${Math.min(getPaymentStatusPercentage(), 100)}%` }} />
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                    <h3 className="mb-4 text-lg font-semibold text-white">Invoice Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-white/10 p-2">
                                <FileText className="h-4 w-4 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Billing Type</p>
                                <p className="mt-1 font-medium text-gray-100">{getBillingTypeLabel(invoice.BillingType)}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-white/10 p-2">
                                <DollarSign className="h-4 w-4 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Currency</p>
                                <p className="mt-1 font-medium text-gray-100">{invoice.Currency}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-white/10 p-2">
                                <Calendar className="h-4 w-4 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Issue Date</p>
                                <p className="mt-1 font-medium text-gray-100">{formatDate(invoice.IssueDate)}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-white/10 p-2">
                                <Calendar className="h-4 w-4 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Due Date</p>
                                <p className="mt-1 font-medium text-gray-100">{formatDate(invoice.DueDate)}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-white/10 p-2">
                                <User className="h-4 w-4 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Created By</p>
                                <p className="mt-1 font-medium text-gray-100">{invoice.CreatedByName}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-white/10 p-2">
                                <Clock className="h-4 w-4 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Created On</p>
                                <p className="mt-1 font-medium text-gray-100">{formatDate(invoice.CreatedAt)}</p>
                            </div>
                        </div>
                    </div>

                    {(invoice.SentDate || invoice.PaidDate) && (
                        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                            {invoice.SentDate && (
                                <div className="flex items-start gap-3">
                                    <div className="rounded-lg bg-white/10 p-2">
                                        <Calendar className="h-4 w-4 text-cyan-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Sent Date</p>
                                        <p className="mt-1 font-medium text-gray-100">{formatDate(invoice.SentDate)}</p>
                                    </div>
                                </div>
                            )}
                            {invoice.PaidDate && (
                                <div className="flex items-start gap-3">
                                    <div className="rounded-lg bg-white/10 p-2">
                                        <CheckCircle className="h-4 w-4 text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Paid Date</p>
                                        <p className="mt-1 font-medium text-gray-100">{formatDate(invoice.PaidDate)}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                    <h3 className="mb-4 text-lg font-semibold text-white">Line Items</h3>
                    <div className="space-y-3">
                        {invoice.LineItems.map((item, index) => (
                            <div key={item.LineItemId} className="rounded-lg border border-white/10 bg-white/5 p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-gray-100">{item.Name}</h4>
                                            <span className="rounded border border-slate-700 bg-slate-800/50 px-2 py-0.5 text-xs text-slate-300">{getItemTypeLabel(item.ItemType)}</span>
                                        </div>
                                        <p className="mt-1 text-sm text-gray-400">{item.Description}</p>
                                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                                            <span>Qty: {item.Quantity}</span>
                                            <span>•</span>
                                            <span>Unit Price: {formatCurrency(item.UnitPrice, invoice.Currency)}</span>
                                            {item.TaxRate > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span>Tax: {item.TaxRate}%</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-gray-100">{formatCurrency(item.Amount, invoice.Currency)}</p>
                                        {item.TaxAmount > 0 && <p className="text-xs text-gray-400">+{formatCurrency(item.TaxAmount, invoice.Currency)} tax</p>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Subtotal:</span>
                            <span className="font-medium text-gray-100">{formatCurrency(invoice.Subtotal, invoice.Currency)}</span>
                        </div>
                        {invoice.TaxAmount > 0 && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Tax:</span>
                                <span className="font-medium text-gray-100">{formatCurrency(invoice.TaxAmount, invoice.Currency)}</span>
                            </div>
                        )}
                        {invoice.DiscountAmount > 0 && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Discount:</span>
                                <span className="font-medium text-red-400">-{formatCurrency(invoice.DiscountAmount, invoice.Currency)}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between border-t border-white/10 pt-2">
                            <span className="font-semibold text-gray-200">Total:</span>
                            <span className="text-xl font-bold text-cyan-400">{formatCurrency(invoice.TotalAmount, invoice.Currency)}</span>
                        </div>
                    </div>
                </div>

                {invoice.Payments && invoice.Payments.length > 0 && (
                    <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                        <div className="mb-4 flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-green-400" />
                            <h3 className="text-lg font-semibold text-white">Payment History</h3>
                        </div>
                        <div className="space-y-3">
                            {invoice.Payments.map(payment => (
                                <div key={payment.PaymentId} className="flex items-center justify-between rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg bg-green-500/20 p-2">
                                            <Receipt className="h-4 w-4 text-green-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-100">{getPaymentMethodLabel(payment.PaymentMethod)}</p>
                                            <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                                                <span>{formatDate(payment.PaymentDate)}</span>
                                                {payment.TransactionId && (
                                                    <>
                                                        <span>•</span>
                                                        <span>TXN: {payment.TransactionId}</span>
                                                    </>
                                                )}
                                                {payment.ReferenceNumber && (
                                                    <>
                                                        <span>•</span>
                                                        <span>Ref: {payment.ReferenceNumber}</span>
                                                    </>
                                                )}
                                            </div>
                                            {payment.Notes && <p className="mt-1 text-xs text-gray-500">{payment.Notes}</p>}
                                        </div>
                                    </div>
                                    <p className="text-lg font-bold text-green-400">{formatCurrency(payment.Amount, invoice.Currency)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {(invoice.Notes || invoice.Terms || invoice.PaymentInstructions) && (
                    <div className="space-y-4">
                        {invoice.Notes && (
                            <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                                <h3 className="mb-3 text-lg font-semibold text-white">Notes</h3>
                                <p className="text-sm leading-relaxed text-gray-300">{invoice.Notes}</p>
                            </div>
                        )}
                        {invoice.Terms && (
                            <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                                <h3 className="mb-3 text-lg font-semibold text-white">Terms & Conditions</h3>
                                <p className="text-sm leading-relaxed text-gray-300">{invoice.Terms}</p>
                            </div>
                        )}
                        {invoice.PaymentInstructions && (
                            <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                                <h3 className="mb-3 text-lg font-semibold text-white">Payment Instructions</h3>
                                <p className="text-sm leading-relaxed text-gray-300">{invoice.PaymentInstructions}</p>
                            </div>
                        )}
                    </div>
                )}

                <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                    <h3 className="mb-4 text-lg font-semibold text-white">Metadata</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Invoice ID</span>
                            <span className="font-mono text-gray-100">{invoice.InvoiceId}</span>
                        </div>
                        <div className="flex items-start justify-between gap-4 text-sm">
                            <span className="whitespace-nowrap text-gray-400">Invoice Token</span>
                            <span className="text-right font-mono text-xs break-all text-gray-100">{invoice.InvoiceToken}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Last Updated</span>
                            <span className="text-gray-100">{formatDate(invoice.UpdatedAt)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-100 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none">
                        Close
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        disabled={isDownloading}
                        className="flex-1 rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-500 px-4 py-2.5 text-sm font-medium text-gray-900 shadow-lg shadow-cyan-500/30 transition-all hover:from-cyan-500 hover:to-cyan-600 hover:shadow-cyan-500/40 focus:ring-2 focus:ring-cyan-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isDownloading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating PDF...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <Download className="h-4 w-4" />
                                Download Invoice PDF
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
