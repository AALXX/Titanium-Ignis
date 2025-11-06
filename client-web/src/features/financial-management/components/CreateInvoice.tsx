'use client'

import type React from 'react'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { LineItem } from '../types/InvoiceType'

interface CreateInvoiceDialogProps {
    onClose: () => void
}

export const CreateInvoiceDialog: React.FC<CreateInvoiceDialogProps> = ({ onClose }) => {
    const [lineItems, setLineItems] = useState<LineItem[]>([{ id: '1', description: '', quantity: 1, unitPrice: 0 }])

    const addLineItem = () => {
        setLineItems([...lineItems, { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0 }])
    }

    const removeLineItem = (id: string) => {
        if (lineItems.length > 1) {
            setLineItems(lineItems.filter(item => item.id !== id))
        }
    }

    const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
        setLineItems(lineItems.map(item => (item.id === id ? { ...item, [field]: value } : item)))
    }

    const calculateTotal = () => {
        return lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        console.log('Invoice created')
        onClose()
    }

    return (
        <div className="w-full">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Create Invoice</h2>
                <p className="mt-1 text-sm text-gray-400">Generate a new client invoice</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">Client Name *</label>
                        <input type="text" required placeholder="Enter client name" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none" />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">Project *</label>
                        <select required className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none">
                            <option value="">Select project</option>
                            <option value="alpha">Project Alpha</option>
                            <option value="beta">Project Beta</option>
                            <option value="gamma">Project Gamma</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">Billing Type *</label>
                        <select required className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none">
                            <option value="">Select type</option>
                            <option value="fixed">Fixed Price</option>
                            <option value="hourly">Time & Materials</option>
                            <option value="milestone">Milestone-based</option>
                            <option value="retainer">Retainer</option>
                        </select>
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">Issue Date *</label>
                        <input type="date" required className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none" />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">Due Date *</label>
                        <input type="date" required className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none" />
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-200">Line Items *</label>
                        <button type="button" onClick={addLineItem} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-gray-100 backdrop-blur-sm transition-all hover:border-cyan-400/50 hover:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none">
                            <Plus className="h-4 w-4" />
                            Add Item
                        </button>
                    </div>

                    <div className="space-y-2">
                        {lineItems.map((item, index) => (
                            <div key={item.id} className="grid grid-cols-12 items-end gap-2">
                                <div className="col-span-5">
                                    {index === 0 && <label className="mb-1 block text-xs text-gray-400">Description</label>}
                                    <input
                                        type="text"
                                        placeholder="Service or item description"
                                        value={item.description}
                                        onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none"
                                    />
                                </div>
                                <div className="col-span-2">
                                    {index === 0 && <label className="mb-1 block text-xs text-gray-400">Qty</label>}
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={e => updateLineItem(item.id, 'quantity', Number(e.target.value))}
                                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none"
                                    />
                                </div>
                                <div className="col-span-3">
                                    {index === 0 && <label className="mb-1 block text-xs text-gray-400">Unit Price</label>}
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={item.unitPrice}
                                        onChange={e => updateLineItem(item.id, 'unitPrice', Number(e.target.value))}
                                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none"
                                    />
                                </div>
                                <div className="col-span-2">
                                    {index === 0 && <label className="mb-1 block text-xs text-gray-400">Total</label>}
                                    <div className="flex h-10 items-center justify-between rounded-lg bg-white/5 px-3 ring-1 ring-white/10 backdrop-blur-sm">
                                        <span className="text-sm font-medium text-gray-100">${(item.quantity * item.unitPrice).toFixed(2)}</span>
                                        {lineItems.length > 1 && (
                                            <button type="button" onClick={() => removeLineItem(item.id)} className="ml-2 text-gray-400 transition-colors hover:text-red-400">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-4 border-t border-white/10 pt-4">
                    <div className="text-right">
                        <p className="text-sm text-gray-400">Total Amount</p>
                        <p className="text-2xl font-bold text-cyan-400">${calculateTotal().toFixed(2)}</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-100 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none">
                        Cancel
                    </button>
                    <button type="button" className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-100 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none">
                        Save as Draft
                    </button>
                    <button type="submit" className="flex-1 rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-500 px-4 py-2.5 text-sm font-medium text-gray-900 shadow-lg shadow-cyan-500/30 transition-all hover:from-cyan-500 hover:to-cyan-600 hover:shadow-cyan-500/40 focus:ring-2 focus:ring-cyan-400 focus:outline-none">
                        Create & Send
                    </button>
                </div>
            </form>
        </div>
    )
}
