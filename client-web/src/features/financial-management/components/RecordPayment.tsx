'use client'

import type React from 'react'

import { CreditCard } from 'lucide-react'

interface RecordPaymentProps {
    onClose: () => void
}

export const RecordPayment: React.FC<RecordPaymentProps> = ({ onClose }) => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        console.log('Payment recorded')
        onClose()
    }

    return (
        <div className="w-full">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Record Payment</h2>
                <p className="mt-1 text-sm text-gray-400">Log a payment received from a client</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">Client *</label>
                        <select required className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none">
                            <option value="">Select client</option>
                            <option value="acme">Acme Corporation</option>
                            <option value="tech">Tech Innovations Ltd</option>
                            <option value="global">Global Solutions Inc</option>
                        </select>
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">Invoice *</label>
                        <select required className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none">
                            <option value="">Select invoice</option>
                            <option value="inv-001">INV-001 - $5,000.00</option>
                            <option value="inv-002">INV-002 - $12,500.00</option>
                            <option value="inv-003">INV-003 - $8,750.00</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">Payment Amount (USD) *</label>
                        <input type="number" step="0.01" min="0" required placeholder="0.00" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none" />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">Payment Date *</label>
                        <input type="date" required className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">Payment Method *</label>
                        <select required className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none">
                            <option value="">Select method</option>
                            <option value="bank-transfer">Bank Transfer</option>
                            <option value="credit-card">Credit Card</option>
                            <option value="paypal">PayPal</option>
                            <option value="check">Check</option>
                            <option value="wire">Wire Transfer</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">Transaction ID</label>
                        <input type="text" placeholder="Optional reference number" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none" />
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-200">Payment Status *</label>
                    <select required className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none">
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                    </select>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-200">Notes (Optional)</label>
                    <textarea rows={3} placeholder="Additional payment details or notes..." className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none" />
                </div>

                <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4 backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-white/10 p-2 ring-1 ring-white/10">
                            <CreditCard className="h-5 w-5 text-cyan-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-200">Payment Confirmation</p>
                            <p className="mt-1 text-xs text-gray-400">Recording this payment will update the invoice status and client balance automatically.</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-100 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none">
                        Cancel
                    </button>
                    <button type="submit" className="flex-1 rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-500 px-4 py-2.5 text-sm font-medium text-gray-900 shadow-lg shadow-cyan-500/30 transition-all hover:from-cyan-500 hover:to-cyan-600 hover:shadow-cyan-500/40 focus:ring-2 focus:ring-cyan-400 focus:outline-none">
                        Record Payment
                    </button>
                </div>
            </form>
        </div>
    )
}
