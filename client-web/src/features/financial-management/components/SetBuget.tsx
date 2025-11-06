'use client'

import type React from 'react'

import { useState } from 'react'

interface SetBudgetProps {
    onClose: () => void
}

export const SetBudget: React.FC<SetBudgetProps> = ({ onClose }) => {
    const [totalBudget, setTotalBudget] = useState('')
    const [labor, setLabor] = useState('')
    const [resources, setResources] = useState('')
    const [infrastructure, setInfrastructure] = useState('')
    const [miscellaneous, setMiscellaneous] = useState('')

    const calculateRemaining = () => {
        const total = Number(totalBudget) || 0
        const allocated = (Number(labor) || 0) + (Number(resources) || 0) + (Number(infrastructure) || 0) + (Number(miscellaneous) || 0)
        return total - allocated
    }

    const remaining = calculateRemaining()

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (remaining < 0) {
            alert('Allocated budget exceeds total budget')
            return
        }
        console.log('Budget set')
        onClose()
    }

    return (
        <div className="w-full">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Set Budget</h2>
                <p className="mt-1 text-sm text-gray-400">Allocate budget across different cost categories</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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

                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-200">Total Project Budget (USD) *</label>
                    <input
                        type="number"
                        step="1000"
                        min="0"
                        required
                        placeholder="150000"
                        value={totalBudget}
                        onChange={e => setTotalBudget(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-gray-400">The overall budget for this project</p>
                </div>

                <div className="space-y-4 rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                    <h4 className="text-sm font-semibold text-gray-200">Budget Allocation</h4>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-200">Labor Costs</label>
                            <input
                                type="number"
                                step="1000"
                                min="0"
                                placeholder="0"
                                value={labor}
                                onChange={e => setLabor(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-200">Resources</label>
                            <input
                                type="number"
                                step="1000"
                                min="0"
                                placeholder="0"
                                value={resources}
                                onChange={e => setResources(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-200">Infrastructure</label>
                            <input
                                type="number"
                                step="1000"
                                min="0"
                                placeholder="0"
                                value={infrastructure}
                                onChange={e => setInfrastructure(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-200">Miscellaneous</label>
                            <input
                                type="number"
                                step="1000"
                                min="0"
                                placeholder="0"
                                value={miscellaneous}
                                onChange={e => setMiscellaneous(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="border-t border-white/10 pt-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Remaining Budget</span>
                            <span className={`text-lg font-bold ${remaining < 0 ? 'text-red-400' : 'text-cyan-400'}`}>${remaining.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-100 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none">
                        Cancel
                    </button>
                    <button type="submit" className="flex-1 rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-500 px-4 py-2.5 text-sm font-medium text-gray-900 shadow-lg shadow-cyan-500/30 transition-all hover:from-cyan-500 hover:to-cyan-600 hover:shadow-cyan-500/40 focus:ring-2 focus:ring-cyan-400 focus:outline-none">
                        Set Budget
                    </button>
                </div>
            </form>
        </div>
    )
}
