'use client'

import React, { useState } from 'react'
import { Plus, Trash2, AlertCircle } from 'lucide-react'
import axios from 'axios'
import DoubleValueOptionPicker from '@/components/DoubleValueOptionPicker'
import { formatCurrency } from '../utils/utils'

interface LineItem {
    id: string
    Name: string
    Description: string
    Quantity: number
    UnitPrice: number
    TaxRate: number
    ItemType: string
}

interface InvoiceFormData {
    ProjectToken: string
    UserSessionToken: string
    ClientName: string
    BillingType: string
    IssueDate: string
    DueDate: string
    Currency: string
    TaxAmount: number
    DiscountAmount: number
    Notes: string
    Terms: string
    PaymentInstructions: string
    LineItems: Omit<LineItem, 'id'>[]
}

interface CreateInvoiceDialogProps {
    onClose: () => void
    onSuccess?: (newInvoice: any) => void
    projectToken: string
    userSessionToken: string
}

const BILLING_TYPES = [
    { value: 'fixed-price', label: 'Fixed Price' },
    { value: 'hourly', label: 'Time & Materials' },
    { value: 'milestone', label: 'Milestone-based' },
    { value: 'retainer', label: 'Retainer' }
]

const CURRENCIES = [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' },
    { value: 'JPY', label: 'JPY - Japanese Yen' },
    { value: 'CAD', label: 'CAD - Canadian Dollar' },
    { value: 'AUD', label: 'AUD - Australian Dollar' },
    { value: 'CHF', label: 'CHF - Swiss Franc' },
    { value: 'CNY', label: 'CNY - Chinese Yuan' },
    { value: 'RON', label: 'RON - Romanian Leu' }
]

const ITEM_TYPES = [
    { value: 'service', label: 'Service (e.g. Development, Consulting)' },
    { value: 'product', label: 'Product (e.g. Software License, Hardware)' },
    { value: 'subscription', label: 'Subscription (e.g. SaaS, Hosting)' },
    { value: 'milestone', label: 'Milestone Payment (Project-based)' },
    { value: 'retainer', label: 'Retainer / Ongoing Support' },
    { value: 'training', label: 'Training / Workshop' },
    { value: 'expense', label: 'Reimbursable Expense' },
    { value: 'maintenance', label: 'Maintenance / SLA' }
]

export const CreateInvoiceDialog: React.FC<CreateInvoiceDialogProps> = ({ onClose, onSuccess, projectToken, userSessionToken }) => {
    const [formData, setFormData] = useState<InvoiceFormData>({
        ProjectToken: projectToken,
        UserSessionToken: userSessionToken,
        ClientName: '',
        BillingType: '',
        IssueDate: '',
        DueDate: '',
        Currency: 'EUR',
        TaxAmount: 0,
        DiscountAmount: 0,
        Notes: '',
        Terms: '',
        PaymentInstructions: '',
        LineItems: []
    })

    const [lineItems, setLineItems] = useState<LineItem[]>([
        {
            id: '1',
            Name: '',
            Description: '',
            Quantity: 1,
            UnitPrice: 0,
            TaxRate: 0,
            ItemType: 'service'
        }
    ])

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: name === 'TaxAmount' || name === 'DiscountAmount' ? parseFloat(value) || 0 : value
        }))

        if (validationErrors[name]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[name]
                return newErrors
            })
        }
        setError(null)
    }

    const addLineItem = () => {
        setLineItems([
            ...lineItems,
            {
                id: Date.now().toString(),
                Name: '',
                Description: '',
                Quantity: 1,
                UnitPrice: 0,
                TaxRate: 0,
                ItemType: 'service'
            }
        ])
    }

    const removeLineItem = (id: string) => {
        if (lineItems.length > 1) {
            setLineItems(lineItems.filter(item => item.id !== id))
        }
    }

    const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
        setLineItems(lineItems.map(item => (item.id === id ? { ...item, [field]: value } : item)))
    }

    const calculateLineTotal = (item: LineItem) => {
        const subtotal = item.Quantity * item.UnitPrice
        const tax = subtotal * (item.TaxRate / 100)
        return subtotal + tax
    }

    const calculateSubtotal = () => {
        return lineItems.reduce((sum, item) => sum + item.Quantity * item.UnitPrice, 0)
    }

    const calculateTax = () => {
        return (
            lineItems.reduce((sum, item) => {
                const subtotal = item.Quantity * item.UnitPrice
                return sum + subtotal * (item.TaxRate / 100)
            }, 0) + formData.TaxAmount
        )
    }

    const calculateTotal = () => {
        const subtotal = calculateSubtotal()
        const tax = calculateTax()
        return subtotal + tax - formData.DiscountAmount
    }

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {}

        if (!formData.ClientName.trim()) {
            errors.ClientName = 'Client name is required'
        } else if (formData.ClientName.length > 100) {
            errors.ClientName = 'Client name must not exceed 100 characters'
        }

        if (!formData.BillingType) {
            errors.BillingType = 'Billing type is required'
        }

        if (!formData.IssueDate) {
            errors.IssueDate = 'Issue date is required'
        }

        if (!formData.DueDate) {
            errors.DueDate = 'Due date is required'
        }

        if (formData.IssueDate && formData.DueDate && new Date(formData.DueDate) < new Date(formData.IssueDate)) {
            errors.DueDate = 'Due date must be after issue date'
        }

        if (formData.Notes && formData.Notes.length > 2000) {
            errors.Notes = 'Notes cannot exceed 2000 characters'
        }

        if (formData.Terms && formData.Terms.length > 2000) {
            errors.Terms = 'Terms cannot exceed 2000 characters'
        }

        if (formData.PaymentInstructions && formData.PaymentInstructions.length > 1000) {
            errors.PaymentInstructions = 'Payment instructions cannot exceed 1000 characters'
        }

        lineItems.forEach((item, index) => {
            if (!item.Name.trim()) {
                errors[`LineItem_${index}_Name`] = 'Line item name is required'
            } else if (item.Name.length > 100) {
                errors[`LineItem_${index}_Name`] = 'Line item name cannot exceed 100 characters'
            }

            if (!item.Description.trim()) {
                errors[`LineItem_${index}_Description`] = 'Line item description is required'
            } else if (item.Description.length > 500) {
                errors[`LineItem_${index}_Description`] = 'Line item description cannot exceed 500 characters'
            }

            if (item.Quantity <= 0) {
                errors[`LineItem_${index}_Quantity`] = 'Quantity must be greater than 0'
            }

            if (item.UnitPrice < 0) {
                errors[`LineItem_${index}_UnitPrice`] = 'Unit price must be a positive number'
            }

            if (item.TaxRate < 0 || item.TaxRate > 100) {
                errors[`LineItem_${index}_TaxRate`] = 'Tax rate must be between 0 and 100'
            }
        })

        if (lineItems.length === 0) {
            errors.LineItems = 'At least one line item is required'
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
            const invoiceData = {
                ...formData,
                LineItems: lineItems.map(({ id, ...item }) => item),
                Status: 'sent'
            }

            const response = await axios.post(`${process.env.NEXT_PUBLIC_FINANCIAL_SERVER}/api/project-invoice-manager/add-new-invoice`, invoiceData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            console.log('Invoice created successfully:', response.data)

            if (onSuccess && response.data.invoice) {
                onSuccess(response.data.invoice)
            }

            setTimeout(() => onClose(), 1500)
        } catch (err) {
            console.error('Error creating invoice:', err)
            if (axios.isAxiosError(err)) {
                const errorMessage = err.response?.data?.message || err.message || 'Failed to create invoice'
                setError(errorMessage)
            } else {
                setError('An unexpected error occurred. Please try again.')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="max-h-[80vh] w-full overflow-y-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Create Invoice</h2>
                <p className="mt-1 text-sm text-gray-400">Generate a new client invoice</p>
            </div>

            {error && (
                <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">
                            Client Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            name="ClientName"
                            value={formData.ClientName}
                            onChange={handleInputChange}
                            maxLength={100}
                            placeholder="Enter client name"
                            className={`w-full rounded-lg border ${validationErrors.ClientName ? 'border-red-500/50' : 'border-white/10'} bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none`}
                        />
                        {validationErrors.ClientName && <p className="mt-1 text-xs text-red-400">{validationErrors.ClientName}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">
                            Billing Type <span className="text-red-400">*</span>
                        </label>
                        <DoubleValueOptionPicker
                            label="Billing Type"
                            options={BILLING_TYPES}
                            value={formData.BillingType}
                            onChange={value => {
                                setFormData(prev => ({ ...prev, BillingType: value }))
                                if (validationErrors.BillingType) {
                                    setValidationErrors(prev => {
                                        const newErrors = { ...prev }
                                        delete newErrors.BillingType
                                        return newErrors
                                    })
                                }
                            }}
                            className={`w-full rounded-lg border ${validationErrors.BillingType ? 'border-red-500/50' : 'border-white/10'} bg-[#363636] px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:ring-2 focus:ring-zinc-600 focus:outline-none`}
                        />
                        {validationErrors.BillingType && <p className="mt-1 text-xs text-red-400">{validationErrors.BillingType}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">
                            Issue Date <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="date"
                            name="IssueDate"
                            value={formData.IssueDate}
                            onChange={handleInputChange}
                            className={`w-full rounded-lg border ${validationErrors.IssueDate ? 'border-red-500/50' : 'border-white/10'} bg-white/5 px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none`}
                        />
                        {validationErrors.IssueDate && <p className="mt-1 text-xs text-red-400">{validationErrors.IssueDate}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">
                            Due Date <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="date"
                            name="DueDate"
                            value={formData.DueDate}
                            onChange={handleInputChange}
                            className={`w-full rounded-lg border ${validationErrors.DueDate ? 'border-red-500/50' : 'border-white/10'} bg-white/5 px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none`}
                        />
                        {validationErrors.DueDate && <p className="mt-1 text-xs text-red-400">{validationErrors.DueDate}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">Currency</label>
                        <DoubleValueOptionPicker
                            label="Currency"
                            options={CURRENCIES}
                            value={formData.Currency}
                            onChange={value => {
                                setFormData(prev => ({ ...prev, Currency: value }))
                            }}
                            className="w-full rounded-lg border border-white/10 bg-[#363636] px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:ring-2 focus:ring-zinc-600 focus:outline-none"
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-200">
                            Line Items <span className="text-red-400">*</span>
                        </label>
                        <button type="button" onClick={addLineItem} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-gray-100 backdrop-blur-sm transition-all hover:border-cyan-400/50 hover:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none">
                            <Plus className="h-4 w-4" />
                            Add Item
                        </button>
                    </div>

                    {validationErrors.LineItems && <p className="text-xs text-red-400">{validationErrors.LineItems}</p>}

                    <div className="space-y-3">
                        {lineItems.map((item, index) => (
                            <div key={item.id} className="rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                                <div className="grid grid-cols-12 gap-3">
                                    <div className="col-span-12 sm:col-span-6">
                                        <label className="mb-1 block text-xs text-gray-400">
                                            Name <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Service or item name"
                                            value={item.Name}
                                            onChange={e => updateLineItem(item.id, 'Name', e.target.value)}
                                            maxLength={100}
                                            className={`w-full rounded-lg border ${validationErrors[`LineItem_${index}_Name`] ? 'border-red-500/50' : 'border-white/10'} bg-white/5 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none`}
                                        />
                                        {validationErrors[`LineItem_${index}_Name`] && <p className="mt-1 text-xs text-red-400">{validationErrors[`LineItem_${index}_Name`]}</p>}
                                    </div>
                                    <div className="col-span-12 sm:col-span-6">
                                        <label className="mb-1 block text-xs text-gray-400">
                                            Description <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Item description"
                                            value={item.Description}
                                            onChange={e => updateLineItem(item.id, 'Description', e.target.value)}
                                            maxLength={500}
                                            className={`w-full rounded-lg border ${validationErrors[`LineItem_${index}_Description`] ? 'border-red-500/50' : 'border-white/10'} bg-white/5 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none`}
                                        />
                                        {validationErrors[`LineItem_${index}_Description`] && <p className="mt-1 text-xs text-red-400">{validationErrors[`LineItem_${index}_Description`]}</p>}
                                    </div>
                                    <div className="col-span-6 sm:col-span-2">
                                        <label className="mb-1 block text-xs text-gray-400">Qty</label>
                                        <input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={item.Quantity}
                                            onChange={e => updateLineItem(item.id, 'Quantity', Number(e.target.value))}
                                            className={`w-full rounded-lg border ${validationErrors[`LineItem_${index}_Quantity`] ? 'border-red-500/50' : 'border-white/10'} bg-white/5 px-3 py-2 text-sm text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none`}
                                        />
                                    </div>
                                    <div className="col-span-6 sm:col-span-3">
                                        <label className="mb-1 block text-xs text-gray-400">Unit Price</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={item.UnitPrice}
                                            onChange={e => updateLineItem(item.id, 'UnitPrice', Number(e.target.value))}
                                            className={`w-full rounded-lg border ${validationErrors[`LineItem_${index}_UnitPrice`] ? 'border-red-500/50' : 'border-white/10'} bg-white/5 px-3 py-2 text-sm text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none`}
                                        />
                                    </div>
                                    <div className="col-span-6 sm:col-span-2">
                                        <label className="mb-1 block text-xs text-gray-400">Tax %</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={item.TaxRate}
                                            onChange={e => updateLineItem(item.id, 'TaxRate', Number(e.target.value))}
                                            className={`w-full rounded-lg border ${validationErrors[`LineItem_${index}_TaxRate`] ? 'border-red-500/50' : 'border-white/10'} bg-white/5 px-3 py-2 text-sm text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none`}
                                        />
                                    </div>
                                    <div className="col-span-6 sm:col-span-3">
                                        <label className="mb-1 block text-xs text-gray-400">Type</label>
                                        <DoubleValueOptionPicker
                                            label="Type"
                                            options={ITEM_TYPES}
                                            value={item.ItemType}
                                            onChange={value => updateLineItem(item.id, 'ItemType', value)}
                                            className="w-full rounded-lg border border-white/10 bg-[#363636] px-3 py-2 text-sm text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:ring-2 focus:ring-zinc-600 focus:outline-none"
                                        />
                                    </div>
                                    <div className="col-span-12 flex items-end sm:col-span-2">
                                        <div className="flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10 backdrop-blur-sm">
                                            <span className="text-sm font-medium text-gray-100">${calculateLineTotal(item).toFixed(2)}</span>
                                            {lineItems.length > 1 && (
                                                <button type="button" onClick={() => removeLineItem(item.id)} className="ml-2 text-gray-400 transition-colors hover:text-red-400">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">Additional Tax Amount</label>
                        <input
                            type="number"
                            name="TaxAmount"
                            value={formData.TaxAmount}
                            onChange={handleInputChange}
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">Discount Amount</label>
                        <input
                            type="number"
                            name="DiscountAmount"
                            value={formData.DiscountAmount}
                            onChange={handleInputChange}
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-200">Notes (Optional)</label>
                    <textarea
                        name="Notes"
                        value={formData.Notes}
                        onChange={handleInputChange}
                        rows={3}
                        maxLength={2000}
                        placeholder="Additional notes for the invoice..."
                        className={`w-full resize-none rounded-lg border ${validationErrors.Notes ? 'border-red-500/50' : 'border-white/10'} bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none`}
                    />
                    <p className="mt-1 text-xs text-gray-500">{formData.Notes.length}/2000 characters</p>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-200">Terms & Conditions (Optional)</label>
                    <textarea
                        name="Terms"
                        value={formData.Terms}
                        onChange={handleInputChange}
                        rows={3}
                        maxLength={2000}
                        placeholder="Payment terms and conditions..."
                        className={`w-full resize-none rounded-lg border ${validationErrors.Terms ? 'border-red-500/50' : 'border-white/10'} bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none`}
                    />
                    <p className="mt-1 text-xs text-gray-500">{formData.Terms.length}/2000 characters</p>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-200">Payment Instructions (Optional)</label>
                    <textarea
                        name="PaymentInstructions"
                        value={formData.PaymentInstructions}
                        onChange={handleInputChange}
                        rows={2}
                        maxLength={1000}
                        placeholder="How to make payment..."
                        className={`w-full resize-none rounded-lg border ${validationErrors.PaymentInstructions ? 'border-red-500/50' : 'border-white/10'} bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none`}
                    />
                    <p className="mt-1 text-xs text-gray-500">{formData.PaymentInstructions.length}/1000 characters</p>
                </div>

                <div className="flex items-center justify-between border-t border-white/10 pt-4">
                    <div className="space-y-1">
                        <div className="flex justify-between gap-8 text-sm">
                            <span className="text-gray-400">Subtotal:</span>
                            <span className="text-gray-100">
                                {formatCurrency(formData.Currency)}
                                {calculateSubtotal().toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between gap-8 text-sm">
                            <span className="text-gray-400">Tax:</span>
                            <span className="text-gray-100">
                                {formatCurrency(formData.Currency)}
                                 {calculateTax().toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between gap-8 text-sm">
                            <span className="text-gray-400">Discount:</span>
                            <span className="text-red-400">
                                -{formatCurrency(formData.Currency)}
                                {formData.DiscountAmount.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between gap-8 border-t border-white/10 pt-2 text-base font-semibold">
                            <span className="text-gray-200">Total Amount:</span>
                            <span className="text-cyan-400">
                                {formatCurrency(formData.Currency)}
                                {calculateTotal().toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
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
                        {isSubmitting ? 'Creating...' : 'Create Invoice'}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default CreateInvoiceDialog
