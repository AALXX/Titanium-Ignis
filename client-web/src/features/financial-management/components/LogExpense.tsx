'use client'

import React, { useState, useRef } from 'react'
import { Upload, X, FileText, AlertCircle } from 'lucide-react'
import axios from 'axios'
import DoubleValueOptionPicker from '@/components/DoubleValueOptionPicker'

interface LogExpenseProps {
    onClose: () => void
    onSuccess?: (newExpense: any) => void
    budgets: Array<{ BugetToken: string; BugetName: string }>
    projectToken: string
    userSessionToken: string
}

interface ExpenseFormData {
    ProjectToken: string
    UserSessionToken: string
    BugetToken: string
    ExpenseTitle: string
    Amount: string
    Currency: string
    Category: string
    Description: string
    ExpenseDate: string
}

interface UploadedFile {
    file: File
    preview: string
}


const CATEGORIES = [
    { value: 'personnel', label: 'Personnel' },
    { value: 'software_licenses', label: 'Software Licenses' },
    { value: 'hardware', label: 'Hardware' },
    { value: 'cloud_services', label: 'Cloud Services' },
    { value: 'training', label: 'Training' },
    { value: 'travel', label: 'Travel' },
    { value: 'office_expenses', label: 'Office Expenses' },
    { value: 'outsourcing', label: 'Outsourcing' },
    { value: 'communications', label: 'Communications' },
    { value: 'miscellaneous', label: 'Miscellaneous' },
    { value: 'other', label: 'Other' }
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

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/jpg']

export const LogExpense = ({ onClose, onSuccess, budgets, projectToken, userSessionToken }: LogExpenseProps) => {
    const [formData, setFormData] = useState<ExpenseFormData>({
        ProjectToken: projectToken,
        UserSessionToken: userSessionToken,
        BugetToken: '',
        ExpenseTitle: '',
        Amount: '',
        Currency: 'EUR',
        Category: '',
        Description: '',
        ExpenseDate: ''
    })

    const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            setError('Please upload a PDF, Word document, or image file (PNG, JPG, JPEG)')
            return
        }

        if (file.size > MAX_FILE_SIZE) {
            setError('File size must be less than 10MB')
            return
        }

        const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : ''

        setUploadedFile({ file, preview })
        setError(null)
    }

    const handleRemoveFile = () => {
        if (uploadedFile?.preview) {
            URL.revokeObjectURL(uploadedFile.preview)
        }
        setUploadedFile(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {}

        if (!formData.ExpenseTitle.trim()) {
            errors.ExpenseTitle = 'Expense title is required'
        } else if (formData.ExpenseTitle.length > 255) {
            errors.ExpenseTitle = 'Expense title must not exceed 255 characters'
        }

        if (!formData.Amount) {
            errors.Amount = 'Amount is required'
        } else if (parseFloat(formData.Amount) < 0) {
            errors.Amount = 'Amount must be a positive number'
        }

        if (!formData.Category) {
            errors.Category = 'Category is required'
        }

        if (!formData.ExpenseDate) {
            errors.ExpenseDate = 'Expense date is required'
        }

        if (formData.Currency && formData.Currency.length !== 3) {
            errors.Currency = 'Currency must be a 3-letter code'
        }

        if (formData.Description && formData.Description.length > 2000) {
            errors.Description = 'Description cannot exceed 2000 characters'
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
            const expenseData = {
                ProjectToken: formData.ProjectToken,
                UserSessionToken: formData.UserSessionToken,
                ExpenseTitle: formData.ExpenseTitle,
                Amount: parseFloat(formData.Amount),
                Currency: formData.Currency,
                Category: formData.Category,
                ExpenseDate: formData.ExpenseDate,
                ...(formData.BugetToken && { BugetToken: formData.BugetToken }),
                ...(formData.Description && { Description: formData.Description })
            }

            const expenseResponse = await axios.post(`${process.env.NEXT_PUBLIC_FINANCIAL_SERVER}/api/project-expense-manager/add-new-expense`, expenseData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            console.log('Expense logged successfully:', expenseResponse.data)

            if (uploadedFile && expenseResponse.data.expense?.ExpenseToken) {
                try {
                    const receiptFormData = new FormData()
                    receiptFormData.append('ExpenseToken', expenseResponse.data.expense.ExpenseToken)
                    receiptFormData.append('UserSessionToken', formData.UserSessionToken)
                    receiptFormData.append('receipt_file', uploadedFile.file)

                    await axios.post(`${process.env.NEXT_PUBLIC_FINANCIAL_SERVER}/api/project-expense-manager/upload-receipt`, receiptFormData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    })

                    console.log('Receipt uploaded successfully')
                } catch (receiptErr) {
                    console.error('Error uploading receipt:', receiptErr)
                    setError('Expense created but receipt upload failed. You can upload it later.')
                }
            }

            if (onSuccess && expenseResponse.data.expense) {
                onSuccess(expenseResponse.data.expense)
            }

            if (uploadedFile?.preview) {
                URL.revokeObjectURL(uploadedFile.preview)
            }

            if (!error || error.includes('receipt upload failed')) {
                setTimeout(() => onClose(), 1500)
            }
        } catch (err) {
            console.error('Error logging expense:', err)
            if (axios.isAxiosError(err)) {
                const errorMessage = err.response?.data?.message || err.message || 'Failed to log expense'
                setError(errorMessage)
            } else {
                setError('An unexpected error occurred. Please try again.')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="w-full">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Log Expense</h2>
                <p className="mt-1 text-sm text-gray-400">Record a new expense for budget tracking</p>
            </div>

            {error && (
                <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-200">
                        Expense Title <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="text"
                        name="ExpenseTitle"
                        value={formData.ExpenseTitle}
                        onChange={handleInputChange}
                        maxLength={255}
                        placeholder="AWS Cloud Services"
                        className={`w-full rounded-lg border ${validationErrors.ExpenseTitle ? 'border-red-500/50' : 'border-white/10'} bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none`}
                    />
                    {validationErrors.ExpenseTitle && <p className="mt-1 text-xs text-red-400">{validationErrors.ExpenseTitle}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">
                            Amount <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="number"
                            name="Amount"
                            value={formData.Amount}
                            onChange={handleInputChange}
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className={`w-full rounded-lg border ${validationErrors.Amount ? 'border-red-500/50' : 'border-white/10'} bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none`}
                        />
                        {validationErrors.Amount && <p className="mt-1 text-xs text-red-400">{validationErrors.Amount}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">Currency</label>
                        <DoubleValueOptionPicker
                            label="Currency"
                            options={CURRENCIES}
                            value={formData.Currency}
                            onChange={value => {
                                setFormData(prev => ({ ...prev, Currency: value }))
                                if (validationErrors.Currency) {
                                    setValidationErrors(prev => {
                                        const newErrors = { ...prev }
                                        delete newErrors.Currency
                                        return newErrors
                                    })
                                }
                            }}
                            className="w-full rounded-lg border border-white/10 bg-[#363636] px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:ring-2 focus:ring-zinc-600 focus:outline-none"
                        />
                        {validationErrors.Currency && <p className="mt-1 text-xs text-red-400">{validationErrors.Currency}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">
                            Category <span className="text-red-400">*</span>
                        </label>
                        <DoubleValueOptionPicker
                            label="Category"
                            options={CATEGORIES}
                            value={formData.Category}
                            onChange={value => {
                                setFormData(prev => ({ ...prev, Category: value }))
                                if (validationErrors.Category) {
                                    setValidationErrors(prev => {
                                        const newErrors = { ...prev }
                                        delete newErrors.Category
                                        return newErrors
                                    })
                                }
                            }}
                            className={`w-full rounded-lg border ${validationErrors.Category ? 'border-red-500/50' : 'border-white/10'} bg-[#363636] px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:ring-2 focus:ring-zinc-600 focus:outline-none`}
                        />
                        {validationErrors.Category && <p className="mt-1 text-xs text-red-400">{validationErrors.Category}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">Budget (Optional)</label>
                        <DoubleValueOptionPicker
                            label="Budget"
                            options={budgets.map(b => ({ label: b.BugetName, value: b.BugetToken }))}
                            value={formData.BugetToken}
                            onChange={value => setFormData(prev => ({ ...prev, BugetToken: value }))}
                            className="w-full rounded-lg border border-white/10 bg-[#363636] px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:ring-2 focus:ring-zinc-600 focus:outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-200">
                        Expense Date <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="date"
                        name="ExpenseDate"
                        value={formData.ExpenseDate}
                        onChange={handleInputChange}
                        className={`w-full rounded-lg border ${validationErrors.ExpenseDate ? 'border-red-500/50' : 'border-white/10'} bg-white/5 px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none`}
                    />
                    {validationErrors.ExpenseDate && <p className="mt-1 text-xs text-red-400">{validationErrors.ExpenseDate}</p>}
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-200">Description (Optional)</label>
                    <textarea
                        name="Description"
                        value={formData.Description}
                        onChange={handleInputChange}
                        rows={3}
                        maxLength={2000}
                        placeholder="Additional details about this expense..."
                        className={`w-full resize-none rounded-lg border ${validationErrors.Description ? 'border-red-500/50' : 'border-white/10'} bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none`}
                    />
                    <p className="mt-1 text-xs text-gray-500">{formData.Description.length}/2000 characters</p>
                    {validationErrors.Description && <p className="mt-1 text-xs text-red-400">{validationErrors.Description}</p>}
                </div>

                <div className="rounded-lg border border-dashed border-white/20 bg-white/5 p-6 backdrop-blur-sm">
                    {!uploadedFile ? (
                        <div className="flex flex-col items-center gap-2 text-center">
                            <div className="rounded-lg bg-white/10 p-3 ring-1 ring-white/10">
                                <Upload className="h-8 w-8 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-200">Upload Receipt (Optional)</p>
                                <p className="text-xs text-gray-400">PDF, Word, PNG, JPG up to 10MB</p>
                            </div>
                            <input ref={fileInputRef} type="file" onChange={handleFileSelect} accept=".png,.jpg,.jpeg,.pdf,.doc,.docx" className="hidden" />
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-100 backdrop-blur-sm transition-all hover:border-cyan-400/50 hover:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none">
                                Browse Files
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            {uploadedFile.preview ? (
                                <img src={uploadedFile.preview} alt="Receipt preview" className="h-16 w-16 rounded-lg object-cover ring-1 ring-white/10" />
                            ) : (
                                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
                                    <FileText className="h-8 w-8 text-cyan-400" />
                                </div>
                            )}
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-200">{uploadedFile.file.name}</p>
                                <p className="text-xs text-gray-400">{(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <button type="button" onClick={handleRemoveFile} className="rounded-lg p-2 text-gray-400 transition-all hover:bg-white/10 hover:text-red-400 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    )}
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
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-500 px-4 py-2.5 text-sm font-medium text-gray-900 shadow-lg shadow-cyan-500/30 transition-all hover:from-cyan-500 hover:to-cyan-600 hover:shadow-cyan-500/40 focus:ring-2 focus:ring-cyan-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Expense'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default LogExpense
