'use client'

import type React from 'react'

import { Upload } from 'lucide-react'

interface LogExpenseDialogProps {
    onClose: () => void
}

export const LogExpense = ({ onClose }: LogExpenseDialogProps) => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        console.log('Expense logged')
        onClose()
    }

    return (
        <div className="w-full">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Log Expense</h2>
                <p className="mt-1 text-sm text-gray-400">Record a new expense for project tracking</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-200">Description *</label>
                    <input type="text" required placeholder="AWS Cloud Services" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">Amount (USD) *</label>
                        <input type="number" step="0.01" min="0" required placeholder="0.00" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none" />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">Expense Date *</label>
                        <input type="date" required className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">Category *</label>
                        <select required className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none">
                            <option value="">Select category</option>
                            <option value="infrastructure">Infrastructure</option>
                            <option value="software">Software</option>
                            <option value="contractors">Contractors</option>
                            <option value="travel">Travel</option>
                            <option value="equipment">Equipment</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">Project *</label>
                        <select required className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none">
                            <option value="">Select project</option>
                            <option value="mobile-app">Mobile App Redesign</option>
                            <option value="cloud-infra">Cloud Infrastructure</option>
                            <option value="ai-platform">AI Integration Platform</option>
                            <option value="website">Website Optimization</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-200">Notes (Optional)</label>
                    <textarea rows={3} placeholder="Additional details about this expense..." className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none" />
                </div>

                <div className="rounded-lg border border-dashed border-white/20 bg-white/5 p-6 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2 text-center">
                        <div className="rounded-lg bg-white/10 p-3 ring-1 ring-white/10">
                            <Upload className="h-8 w-8 text-cyan-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-200">Upload Receipt</p>
                            <p className="text-xs text-gray-400">PNG, JPG or PDF up to 10MB</p>
                        </div>
                        <button type="button" className="mt-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-100 backdrop-blur-sm transition-all hover:border-cyan-400/50 hover:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none">
                            Browse Files
                        </button>
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-100 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none">
                        Cancel
                    </button>
                    <button type="submit" className="flex-1 rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-500 px-4 py-2.5 text-sm font-medium text-gray-900 shadow-lg shadow-cyan-500/30 transition-all hover:from-cyan-500 hover:to-cyan-600 hover:shadow-cyan-500/40 focus:ring-2 focus:ring-cyan-400 focus:outline-none">
                        Submit Expense
                    </button>
                </div>
            </form>
        </div>
    )
}
