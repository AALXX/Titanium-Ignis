'use client'

import React, { useState } from 'react'
import { CreditCard, AlertCircle } from 'lucide-react'
import axios from 'axios'
import DoubleValueOptionPicker from '@/components/DoubleValueOptionPicker'

interface PaymentFormData {
    InvoiceToken: string
    UserSessionToken: string
    Amount: string
    PaymentDate: string
    PaymentMethod: string
    TransactionId: string
    ReferenceNumber: string
    Notes: string
}

interface RecordPaymentProps {
    onClose: () => void
    onSuccess?: (payment: any) => void
    invoices: Array<{
        InvoiceToken: string
        ClientName: string
        TotalAmount: number
        AmountDue: number
        Currency: string
    }>
    projectToken: string
    userSessionToken: string
}

const PAYMENT_METHODS = [
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'check', label: 'Check' },
    { value: 'cash', label: 'Cash' },
    { value: 'other', label: 'Other' }
]

export const RecordPayment: React.FC<RecordPaymentProps> = ({ onClose, onSuccess, invoices, projectToken, userSessionToken }) => {
    const [formData, setFormData] = useState<PaymentFormData>({
        InvoiceToken: '',
        UserSessionToken: userSessionToken,
        Amount: '',
        PaymentDate: new Date().toISOString().split('T')[0],
        PaymentMethod: '',
        TransactionId: '',
        ReferenceNumber: '',
        Notes: ''
    })

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
    const [selectedInvoice, setSelectedInvoice] = useState<(typeof invoices)[0] | null>(null)

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target

        setFormData(prev => ({
            ...prev,
            [name]: value
        }))

        if (name === 'InvoiceToken') {
            const invoice = invoices.find(inv => inv.InvoiceToken === value)
            setSelectedInvoice(invoice || null)

            if (invoice) {
                setFormData(prev => ({
                    ...prev,
                    Amount: invoice.AmountDue.toFixed(2)
                }))
            }
        }

        if (validationErrors[name]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[name]
                return newErrors
            })
        }
        setError(null)
    }

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {}

        if (!formData.InvoiceToken.trim()) {
            errors.InvoiceToken = 'Invoice selection is required'
        } else if (formData.InvoiceToken.length > 255) {
            errors.InvoiceToken = 'Invoice token must not exceed 255 characters'
        }

        if (!formData.Amount) {
            errors.Amount = 'Payment amount is required'
        } else if (parseFloat(formData.Amount) <= 0) {
            errors.Amount = 'Payment amount must be greater than 0'
        } else if (selectedInvoice) {
            if (parseFloat(formData.Amount) > selectedInvoice.AmountDue) {
                errors.Amount = `Payment amount cannot exceed remaining balance of ${selectedInvoice.AmountDue.toFixed(2)}`
            }
        }

        if (!formData.PaymentMethod) {
            errors.PaymentMethod = 'Payment method is required'
        } else if (!['bank_transfer', 'credit_card', 'paypal', 'check', 'cash', 'other'].includes(formData.PaymentMethod)) {
            errors.PaymentMethod = 'Invalid payment method'
        }

        if (formData.TransactionId && formData.TransactionId.length > 255) {
            errors.TransactionId = 'Transaction ID cannot exceed 255 characters'
        }

        if (formData.ReferenceNumber && formData.ReferenceNumber.length > 100) {
            errors.ReferenceNumber = 'Reference number cannot exceed 100 characters'
        }

        if (formData.Notes && formData.Notes.length > 1000) {
            errors.Notes = 'Notes cannot exceed 1000 characters'
        }

        if (!formData.PaymentDate) {
            errors.PaymentDate = 'Payment date is required'
        }

        setValidationErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setValidationErrors({})

        if (!validateForm()) {
            setError('Please fill in all required fields correctly')
            return
        }

        setIsSubmitting(true)

        try {
            const paymentData = {
                InvoiceToken: formData.InvoiceToken,
                UserSessionToken: formData.UserSessionToken,
                Amount: parseFloat(formData.Amount),
                PaymentDate: formData.PaymentDate,
                PaymentMethod: formData.PaymentMethod,
                ...(formData.TransactionId && { TransactionId: formData.TransactionId }),
                ...(formData.ReferenceNumber && { ReferenceNumber: formData.ReferenceNumber }),
                ...(formData.Notes && { Notes: formData.Notes })
            }

            const response = await axios.post(`${process.env.NEXT_PUBLIC_FINANCIAL_SERVER}/api/project-invoice-manager/record-payment`, paymentData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            console.log('Payment recorded successfully:', response.data)

            if (onSuccess && response.data.payment) {
                onSuccess(response.data.payment)
            }

            setTimeout(() => onClose(), 1500)
        } catch (err) {
            console.error('Error recording payment:', err)
            if (axios.isAxiosError(err)) {
                const errorMessage = err.response?.data?.message || err.message || 'Failed to record payment'
                setError(errorMessage)
            } else {
                setError('An unexpected error occurred. Please try again.')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const getRemainingBalance = () => {
        if (!selectedInvoice) return 0
        return selectedInvoice.AmountDue
    }

    return (
        <div className="w-full">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Record Payment</h2>
                <p className="mt-1 text-sm text-gray-400">Log a payment received from a client</p>
            </div>

            {error && (
                <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-200">
                        Invoice <span className="text-red-400">*</span>
                    </label>
                    <select
                        name="InvoiceToken"
                        value={formData.InvoiceToken}
                        onChange={handleInputChange}
                        className={`w-full rounded-lg border ${validationErrors.InvoiceToken ? 'border-red-500/50' : 'border-white/10'} bg-[#363636] px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:ring-2 focus:ring-zinc-600 focus:outline-none`}
                    >
                        <option value="">Select invoice</option>
                        {invoices.map(invoice => {
                            return (
                                <option key={invoice.InvoiceToken} value={invoice.InvoiceToken}>
                                    {invoice.ClientName} - {invoice.Currency} {invoice.TotalAmount.toFixed(2)} (Remaining: {invoice.AmountDue.toFixed(2)})
                                </option>
                            )
                        })}
                    </select>
                    {validationErrors.InvoiceToken && <p className="mt-1 text-xs text-red-400">{validationErrors.InvoiceToken}</p>}
                </div>

                {selectedInvoice && (
                    <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4 backdrop-blur-sm">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-400">Client:</p>
                                <p className="font-medium text-gray-200">{selectedInvoice.ClientName}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Invoice Total:</p>
                                <p className="font-medium text-gray-200">
                                    {selectedInvoice.Currency} {selectedInvoice.TotalAmount.toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-400">Amount Paid:</p>
                                <p className="font-medium text-gray-200">
                                    {selectedInvoice.Currency} {(selectedInvoice.TotalAmount - selectedInvoice.AmountDue).toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-400">Remaining Balance:</p>
                                <p className="font-medium text-cyan-400">
                                    {selectedInvoice.Currency} {getRemainingBalance().toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">
                            Payment Amount <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="number"
                            name="Amount"
                            value={formData.Amount}
                            onChange={handleInputChange}
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            className={`w-full rounded-lg border ${validationErrors.Amount ? 'border-red-500/50' : 'border-white/10'} bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none`}
                        />
                        {validationErrors.Amount && <p className="mt-1 text-xs text-red-400">{validationErrors.Amount}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">
                            Payment Date <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="date"
                            name="PaymentDate"
                            value={formData.PaymentDate}
                            onChange={handleInputChange}
                            className={`w-full rounded-lg border ${validationErrors.PaymentDate ? 'border-red-500/50' : 'border-white/10'} bg-white/5 px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none`}
                        />
                        {validationErrors.PaymentDate && <p className="mt-1 text-xs text-red-400">{validationErrors.PaymentDate}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">
                            Payment Method <span className="text-red-400">*</span>
                        </label>
                        <DoubleValueOptionPicker
                            label="Payment Method"
                            options={PAYMENT_METHODS}
                            value={formData.PaymentMethod}
                            onChange={value => {
                                setFormData(prev => ({ ...prev, PaymentMethod: value }))
                                if (validationErrors.PaymentMethod) {
                                    setValidationErrors(prev => {
                                        const newErrors = { ...prev }
                                        delete newErrors.PaymentMethod
                                        return newErrors
                                    })
                                }
                            }}
                            className={`w-full rounded-lg border ${validationErrors.PaymentMethod ? 'border-red-500/50' : 'border-white/10'} bg-[#363636] px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:ring-2 focus:ring-zinc-600 focus:outline-none`}
                        />
                        {validationErrors.PaymentMethod && <p className="mt-1 text-xs text-red-400">{validationErrors.PaymentMethod}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">Transaction ID (Optional)</label>
                        <input
                            type="text"
                            name="TransactionId"
                            value={formData.TransactionId}
                            onChange={handleInputChange}
                            maxLength={255}
                            placeholder="Optional transaction reference"
                            className={`w-full rounded-lg border ${validationErrors.TransactionId ? 'border-red-500/50' : 'border-white/10'} bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none`}
                        />
                        {validationErrors.TransactionId && <p className="mt-1 text-xs text-red-400">{validationErrors.TransactionId}</p>}
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-200">Reference Number (Optional)</label>
                    <input
                        type="text"
                        name="ReferenceNumber"
                        value={formData.ReferenceNumber}
                        onChange={handleInputChange}
                        maxLength={100}
                        placeholder="Optional reference number"
                        className={`w-full rounded-lg border ${validationErrors.ReferenceNumber ? 'border-red-500/50' : 'border-white/10'} bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none`}
                    />
                    {validationErrors.ReferenceNumber && <p className="mt-1 text-xs text-red-400">{validationErrors.ReferenceNumber}</p>}
                    <p className="mt-1 text-xs text-gray-500">{formData.ReferenceNumber.length}/100 characters</p>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-200">Notes (Optional)</label>
                    <textarea
                        name="Notes"
                        value={formData.Notes}
                        onChange={handleInputChange}
                        rows={3}
                        maxLength={1000}
                        placeholder="Additional payment details or notes..."
                        className={`w-full resize-none rounded-lg border ${validationErrors.Notes ? 'border-red-500/50' : 'border-white/10'} bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none`}
                    />
                    <p className="mt-1 text-xs text-gray-500">{formData.Notes.length}/1000 characters</p>
                    {validationErrors.Notes && <p className="mt-1 text-xs text-red-400">{validationErrors.Notes}</p>}
                </div>

                <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4 backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-white/10 p-2 ring-1 ring-white/10">
                            <CreditCard className="h-5 w-5 text-cyan-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-200">Payment Confirmation</p>
                            <p className="mt-1 text-xs text-gray-400">Recording this payment will update the invoice status and remaining balance automatically.</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-100 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-500 px-4 py-2.5 text-sm font-medium text-gray-900 shadow-lg shadow-cyan-500/30 transition-all hover:from-cyan-500 hover:to-cyan-600 hover:shadow-cyan-500/40 focus:ring-2 focus:ring-cyan-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSubmitting ? 'Recording...' : 'Record Payment'}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default RecordPayment
