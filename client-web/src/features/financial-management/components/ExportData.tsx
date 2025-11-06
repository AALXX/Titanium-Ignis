'use client'

import type React from 'react'

import { useState } from 'react'
import { Download } from 'lucide-react'

interface ExportDataProps {
    onClose: () => void
}

const dataTypeOptions = [
    { id: 'budgets', label: 'Budgets' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'payments', label: 'Payments' },
    { id: 'projections', label: 'Projections' }
]

export const ExportData: React.FC<ExportDataProps> = ({ onClose }: ExportDataProps) => {
    const [selectedTypes, setSelectedTypes] = useState<string[]>([])

    const toggleDataType = (id: string) => {
        setSelectedTypes(prev => (prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        console.log('Export started')
        onClose()
    }

    return (
        <div className="w-full">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Export Data</h2>
                <p className="mt-1 text-sm text-gray-400">Download your financial data in various formats</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-200">Export Format *</label>
                    <select required className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none">
                        <option value="csv">CSV (Comma-separated values)</option>
                        <option value="pdf">PDF (Portable Document)</option>
                        <option value="excel">Excel (Spreadsheet)</option>
                    </select>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-200">Data to Export *</label>
                    <p className="mb-3 text-xs text-gray-400">Select the types of data you want to export</p>
                    <div className="space-y-3">
                        {dataTypeOptions.map(option => (
                            <label key={option.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 backdrop-blur-sm transition-all hover:border-cyan-400/50 hover:bg-white/10">
                                <input type="checkbox" checked={selectedTypes.includes(option.id)} onChange={() => toggleDataType(option.id)} className="h-4 w-4 rounded border-white/10 bg-white/5 text-cyan-400 focus:ring-2 focus:ring-cyan-400/30 focus:ring-offset-0" />
                                <span className="text-sm text-gray-200">{option.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">Start Date *</label>
                        <input type="date" required className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none" />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">End Date *</label>
                        <input type="date" required className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none" />
                    </div>
                </div>

                <div className="flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-100 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-500 px-4 py-2.5 text-sm font-medium text-gray-900 shadow-lg shadow-cyan-500/30 transition-all hover:from-cyan-500 hover:to-cyan-600 hover:shadow-cyan-500/40 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                    >
                        <Download className="h-4 w-4" />
                        Export Data
                    </button>
                </div>
            </form>
        </div>
    )
}
