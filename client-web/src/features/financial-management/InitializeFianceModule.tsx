'use client'
import React, { useState } from 'react'
import { DollarSign, Building2, Globe, Check } from 'lucide-react'
import { Stepper } from '@/components/Stepper'
import axios from 'axios'

interface Step {
    title: string
    description: string
}

interface Currency {
    code: string
    symbol: string
    name: string
}

interface Month {
    value: string
    label: string
}

interface FormData {
    currency: string
    fiscalYearStart: string
}

interface Errors {
    currency?: string
}

const InitializeFinanceModule: React.FC<{projectToken: string, userSessionToken: string}> = ({projectToken, userSessionToken}) => {
    const [currentStep, setCurrentStep] = useState<number>(0)
    const [errors, setErrors] = useState<Errors>({})
    const [formData, setFormData] = useState<FormData>({
        currency: 'EUR',
        fiscalYearStart: '01',
    })

    const currencies: Currency[] = [
        { code: 'EUR', symbol: '€', name: 'Euro' },
        { code: 'USD', symbol: '$', name: 'US Dollar' },
        { code: 'GBP', symbol: '£', name: 'British Pound' },
        { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
        { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
        { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
        { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
        { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' }
    ]

    const months: Month[] = [
        { value: '01', label: 'January' },
        { value: '02', label: 'February' },
        { value: '03', label: 'March' },
        { value: '04', label: 'April' },
        { value: '05', label: 'May' },
        { value: '06', label: 'June' },
        { value: '07', label: 'July' },
        { value: '08', label: 'August' },
        { value: '09', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' }
    ]

    const steps: Step[] = [
        { title: 'Currency', description: 'Select primary currency' },
        { title: 'Comfirmation Settings', description: 'Finishing up' }
    ]

    const validateStep = (step: number): boolean => {
        const newErrors: Errors = {}

        if (step === 0) {
            if (!formData.currency) {
                newErrors.currency = 'Please select a currency'
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const updateFormData = (field: keyof FormData, value: string): void => {
        setFormData(prev => ({ ...prev, [field]: value }))
        if (errors[field as keyof Errors]) {
            setErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[field as keyof Errors]
                return newErrors
            })
        }
    }

    const handleNext = async () => {
        if (validateStep(currentStep)) {
            if (currentStep < steps.length - 1) {
                setCurrentStep(currentStep + 1)
            } else {
                await handleSubmit()
            }
        }
    }

    const handleBack = (): void => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
            setErrors({})
        }
    }

    const handleSubmit = async () => {
        try {
            const resp = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/projects-manager/initialize-module`, {
                projectToken: projectToken, 
                moduleName: 'financial',
                userSessionToken: userSessionToken,
                moduleData: formData
            })

            if (resp.status === 200) {
                window.location.reload()
            }

        } catch (error) {
            alert('an error occured try again')
        }
    }

    return (
        <div className="w-full">
            <div className="mx-auto w-full max-w-4xl rounded-xl border border-[#404040] bg-[#2a2a2a] p-6 text-white shadow-2xl">
                <div className="w-full">
                    <div className="mb-8">
                        <h1 className="mb-2 text-3xl font-bold">Initialize Finance Module</h1>
                        <p className="text-gray-400">Set up your financial management preferences</p>
                    </div>

                    <div className="mb-6">
                        <Stepper steps={steps} currentStep={currentStep} />
                    </div>

                    <div className="flex h-[600px] min-h-[600px] w-full flex-col overflow-y-auto rounded-lg border border-[#404040] bg-[#2a2a2a] p-8">
                        <div className="w-full flex-1">
                            {currentStep === 0 && (
                                <div className="w-full space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg bg-white/10 p-3">
                                            <DollarSign className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold">Select Currency</h2>
                                            <p className="text-sm text-gray-400">Choose your primary currency for financial tracking</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                        {currencies.map(currency => (
                                            <button key={currency.code} type="button" onClick={() => updateFormData('currency', currency.code)} className={`rounded-lg border-2 p-4 text-left transition-all ${formData.currency === currency.code ? 'border-white bg-white/10' : 'border-[#404040] hover:border-[#505050]'}`}>
                                                <div className="mb-2 text-2xl">{currency.symbol}</div>
                                                <div className="text-sm font-semibold">{currency.code}</div>
                                                <div className="text-xs text-gray-400">{currency.name}</div>
                                            </button>
                                        ))}
                                    </div>
                                    {errors.currency && <p className="text-sm text-red-500">{errors.currency}</p>}
                                </div>
                            )}

                            {currentStep === 1 && (
                                <div className="w-full space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg bg-white/10 p-3">
                                            <Globe className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold">Regional Settings</h2>
                                            <p className="text-sm text-gray-400">Configure timezone and fiscal year preferences</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="fiscalYearStart" className="mb-2 block text-sm font-medium">
                                                Fiscal Year Start Month
                                            </label>
                                            <select id="fiscalYearStart" value={formData.fiscalYearStart} onChange={e => updateFormData('fiscalYearStart', e.target.value)} className="w-full rounded-lg border border-[#404040] bg-[#1a1a1a] px-4 py-3 transition-all focus:border-white focus:ring-2 focus:ring-white/50 focus:outline-none">
                                                {months.map(month => (
                                                    <option key={month.value} value={month.value}>
                                                        {month.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="mt-1 text-xs text-gray-400">Select the month your fiscal year begins</p>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-[#404040] bg-[#1a1a1a] p-4">
                                        <h3 className="mb-3 font-medium">Configuration Summary</h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Currency:</span>
                                                <span className="font-medium">
                                                    {formData.currency} ({currencies.find(c => c.code === formData.currency)?.symbol})
                                                </span>
                                            </div>

                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Fiscal Year:</span>
                                                <span className="font-medium">{months.find(m => m.value === formData.fiscalYearStart)?.label}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-auto flex-shrink-0 border-t border-[#404040] pt-6">
                            <div className="flex justify-between">
                                <button type="button" onClick={handleBack} disabled={currentStep === 0} className="rounded-lg border border-[#404040] px-6 py-3 transition-all hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-50">
                                    Back
                                </button>
                                <button type="button" onClick={handleNext} className="rounded-lg bg-white px-6 py-3 font-medium text-black transition-all hover:bg-gray-300">
                                    {currentStep === steps.length - 1 ? 'Complete Setup' : 'Next'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default InitializeFinanceModule
