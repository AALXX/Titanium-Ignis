'use client'

import React, { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import axios from 'axios'
import DoubleValueOptionPicker from '@/components/DoubleValueOptionPicker'
import { formatCurrency } from '../utils/utils'

interface BudgetFormData {
    ProjectToken: string
    UserSessionToken: string
    BugetName: string
    TotalBuget: string
    SpentAmount: string
    Currency: string
    bugetPeriod: string
    Notes: string
}

interface SetBudgetProps {
    onClose: () => void
    onSuccess?: (budget: any) => void
    projectToken: string
    userSessionToken: string
}

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

const BUDGET_PERIODS = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'project', label: 'Project Lifetime' }
]

export const SetBudget: React.FC<SetBudgetProps> = ({ onClose, onSuccess, projectToken, userSessionToken }) => {
    const [formData, setFormData] = useState<BudgetFormData>({
        ProjectToken: projectToken,
        UserSessionToken: userSessionToken,
        BugetName: '',
        TotalBuget: '',
        SpentAmount: '0',
        Currency: 'EUR',
        bugetPeriod: 'project',
        Notes: ''
    })

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target

        setFormData(prev => ({
            ...prev,
            [name]: value
        }))

        // Clear validation error for this field
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

        // Budget name validation (optional but if provided must meet requirements)
        if (formData.BugetName && formData.BugetName.length > 100) {
            errors.BugetName = 'Budget name cannot exceed 100 characters'
        }

        // Total budget validation
        if (!formData.TotalBuget) {
            errors.TotalBuget = 'Total budget is required'
        } else if (parseFloat(formData.TotalBuget) < 0) {
            errors.TotalBuget = 'Total budget must be a positive number'
        }

        // Spent amount validation
        if (formData.SpentAmount) {
            const spent = parseFloat(formData.SpentAmount)
            const total = parseFloat(formData.TotalBuget)

            if (spent < 0) {
                errors.SpentAmount = 'Spent amount must be a positive number'
            } else if (spent > total) {
                errors.SpentAmount = 'Spent amount cannot exceed total budget'
            }
        }

        // Currency validation
        if (formData.Currency && formData.Currency.length !== 3) {
            errors.Currency = 'Currency must be a 3-letter code'
        }

        // Budget period validation
        if (formData.bugetPeriod && !['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'project'].includes(formData.bugetPeriod)) {
            errors.bugetPeriod = 'Invalid budget period'
        }

        // Notes validation
        if (formData.Notes && formData.Notes.length > 1000) {
            errors.Notes = 'Notes cannot exceed 1000 characters'
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
            const budgetData = {
                ProjectToken: formData.ProjectToken,
                UserSessionToken: formData.UserSessionToken,
                TotalBuget: parseFloat(formData.TotalBuget),
                ...(formData.BugetName && { BugetName: formData.BugetName }),
                ...(formData.SpentAmount && { SpentAmount: parseFloat(formData.SpentAmount) }),
                ...(formData.Currency && { Currency: formData.Currency }),
                ...(formData.bugetPeriod && { bugetPeriod: formData.bugetPeriod }),
                ...(formData.Notes && { Notes: formData.Notes })
            }

            const response = await axios.post(`${process.env.NEXT_PUBLIC_FINANCIAL_SERVER}/api/project-buget-manager/set-project-buget`, budgetData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            console.log('Budget set successfully:', response.data)

            if (onSuccess && response.data.buget) {
                onSuccess(response.data.buget)
            }

            setTimeout(() => onClose(), 1500)
        } catch (err) {
            console.error('Error setting budget:', err)
            if (axios.isAxiosError(err)) {
                const errorMessage = err.response?.data?.message || err.message || 'Failed to set budget'
                setError(errorMessage)
            } else {
                setError('An unexpected error occurred. Please try again.')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const getRemainingBudget = () => {
        const total = parseFloat(formData.TotalBuget) || 0
        const spent = parseFloat(formData.SpentAmount) || 0
        return total - spent
    }

    const getBudgetUtilization = () => {
        const total = parseFloat(formData.TotalBuget) || 0
        const spent = parseFloat(formData.SpentAmount) || 0
        if (total === 0) return 0
        return (spent / total) * 100
    }

    return (
        <div className="w-full">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Set Budget</h2>
                <p className="mt-1 text-sm text-gray-400">Allocate budget for your project</p>
            </div>

            {error && (
                <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-200">Budget Name (Optional)</label>
                    <input
                        type="text"
                        name="BugetName"
                        value={formData.BugetName}
                        onChange={handleInputChange}
                        maxLength={100}
                        placeholder="Q1 Development Budget"
                        className={`w-full rounded-lg border ${validationErrors.BugetName ? 'border-red-500/50' : 'border-white/10'} bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none`}
                    />
                    <p className="mt-1 text-xs text-gray-500">{formData.BugetName.length}/100 characters</p>
                    {validationErrors.BugetName && <p className="mt-1 text-xs text-red-400">{validationErrors.BugetName}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">
                            Total Budget <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="number"
                            name="TotalBuget"
                            value={formData.TotalBuget}
                            onChange={handleInputChange}
                            step="0.01"
                            min="0"
                            placeholder="150000.00"
                            className={`w-full rounded-lg border ${validationErrors.TotalBuget ? 'border-red-500/50' : 'border-white/10'} bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none`}
                        />
                        {validationErrors.TotalBuget && <p className="mt-1 text-xs text-red-400">{validationErrors.TotalBuget}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">Spent Amount (Optional)</label>
                        <input
                            type="number"
                            name="SpentAmount"
                            value={formData.SpentAmount}
                            onChange={handleInputChange}
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className={`w-full rounded-lg border ${validationErrors.SpentAmount ? 'border-red-500/50' : 'border-white/10'} bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none`}
                        />
                        {validationErrors.SpentAmount && <p className="mt-1 text-xs text-red-400">{validationErrors.SpentAmount}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                            className={`w-full rounded-lg border ${validationErrors.Currency ? 'border-red-500/50' : 'border-white/10'} bg-[#363636] px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:ring-2 focus:ring-zinc-600 focus:outline-none`}
                        />
                        {validationErrors.Currency && <p className="mt-1 text-xs text-red-400">{validationErrors.Currency}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">Budget Period</label>
                        <DoubleValueOptionPicker
                            label="Budget Period"
                            options={BUDGET_PERIODS}
                            value={formData.bugetPeriod}
                            onChange={value => {
                                setFormData(prev => ({ ...prev, bugetPeriod: value }))
                                if (validationErrors.bugetPeriod) {
                                    setValidationErrors(prev => {
                                        const newErrors = { ...prev }
                                        delete newErrors.bugetPeriod
                                        return newErrors
                                    })
                                }
                            }}
                            className={`w-full rounded-lg border ${validationErrors.bugetPeriod ? 'border-red-500/50' : 'border-white/10'} bg-[#363636] px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:ring-2 focus:ring-zinc-600 focus:outline-none`}
                        />
                        {validationErrors.bugetPeriod && <p className="mt-1 text-xs text-red-400">{validationErrors.bugetPeriod}</p>}
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-200">Notes (Optional)</label>
                    <textarea
                        name="Notes"
                        value={formData.Notes}
                        onChange={handleInputChange}
                        rows={3}
                        maxLength={1000}
                        placeholder="Additional budget details or allocation notes..."
                        className={`w-full resize-none rounded-lg border ${validationErrors.Notes ? 'border-red-500/50' : 'border-white/10'} bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none`}
                    />
                    <p className="mt-1 text-xs text-gray-500">{formData.Notes.length}/1000 characters</p>
                    {validationErrors.Notes && <p className="mt-1 text-xs text-red-400">{validationErrors.Notes}</p>}
                </div>

                {formData.TotalBuget && (
                    <div className="space-y-4 rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                        <h4 className="text-sm font-semibold text-gray-200">Budget Summary</h4>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-400">Total Budget:</span>
                                <span className="text-sm font-medium text-gray-100">
                                    {formatCurrency(formData.Currency)} {parseFloat(formData.TotalBuget || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-400">Spent Amount:</span>
                                <span className="text-sm font-medium text-gray-100">
                                    {formatCurrency(formData.Currency)} {parseFloat(formData.SpentAmount || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>

                            <div className="border-t border-white/10 pt-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-200">Remaining Budget:</span>
                                    <span className={`text-lg font-bold ${getRemainingBudget() < 0 ? 'text-red-400' : 'text-cyan-400'}`}>
                                        {formatCurrency(formData.Currency)} {getRemainingBudget().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-400">Budget Utilization</span>
                                    <span className={`font-medium ${getBudgetUtilization() > 100 ? 'text-red-400' : getBudgetUtilization() > 80 ? 'text-yellow-400' : 'text-cyan-400'}`}>{getBudgetUtilization().toFixed(1)}%</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                                    <div className={`h-full transition-all duration-300 ${getBudgetUtilization() > 100 ? 'bg-red-400' : getBudgetUtilization() > 80 ? 'bg-yellow-400' : 'bg-cyan-400'}`} style={{ width: `${Math.min(getBudgetUtilization(), 100)}%` }} />
                                </div>
                            </div>
                        </div>

                        {getRemainingBudget() < 0 && (
                            <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                                <p className="text-xs text-red-400">Warning: Spent amount exceeds total budget</p>
                            </div>
                        )}
                    </div>
                )}

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
                        {isSubmitting ? 'Setting Budget...' : 'Set Budget'}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default SetBudget
