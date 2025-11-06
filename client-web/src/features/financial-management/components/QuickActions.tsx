import React, { SetStateAction, useState } from 'react'
import { DollarSign, Receipt, FileText, TrendingUp, Download, Plus } from 'lucide-react'
import PopupCanvas from '@/components/PopupCanvas'
import { CreateInvoiceDialog } from './CreateInvoice'
import { LogExpense } from './LogExpense'
import { SetBudget } from './SetBuget'
import { RecordPayment } from './RecordPayment'
import { ExportData } from './ExportData'

export const QuickActions = () => {
    const [activeDialog, setActiveDialog] = useState('')

    const openDialog = (dialogName: SetStateAction<string>) => setActiveDialog(dialogName)
    const closeDialog = () => setActiveDialog('')

    const actions = [
        {
            id: 'invoice',
            icon: Plus,
            title: 'Create Invoice',
            description: 'Generate new client invoice',
            isDefault: true,
            dialog: 'invoice'
        },
        {
            id: 'expense',
            icon: Receipt,
            title: 'Log Expense',
            description: 'Record new expense',
            isDefault: false,
            dialog: 'expense'
        },
        {
            id: 'budget',
            icon: DollarSign,
            title: 'Set Budget',
            description: 'Allocate project budget',
            isDefault: false,
            dialog: 'budget'
        },
        {
            id: 'payment',
            icon: DollarSign,
            title: 'Record Payment',
            description: 'Record new payment',
            isDefault: false,
            dialog: 'payment'
        },

        {
            id: 'export',
            icon: Download,
            title: 'Export Data',
            description: 'Download financial data',
            isDefault: false,
            dialog: 'export'
        }
    ]

    return (
        <>
            <div className="rounded-lg border border-[#4d4d4d] bg-[#0303035b] p-6 text-gray-100 shadow-lg">
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-100">Quick Actions</h3>
                    <p className="mt-1 text-sm text-gray-400">Common financial operations</p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {actions.map(action => {
                        const Icon = action.icon

                        return (
                            <button
                                key={action.id}
                                className={`inline-flex h-auto w-full flex-col items-center justify-center gap-2 rounded-md border border-[#4d4d4d] bg-[#0303035b] p-4 text-sm font-medium whitespace-nowrap text-gray-100 transition-all duration-300 hover:border-cyan-400/50 hover:bg-gray-700/50 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50`}
                                onClick={() => action.dialog && openDialog(action.dialog)}
                            >
                                <div className="flex w-full items-center gap-3">
                                    <div className="rounded-lg bg-cyan-400/10 p-2">
                                        <Icon className="h-5 w-5 text-cyan-400" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold">{action.title}</p>
                                        <p className="text-xs text-gray-400">{action.description}</p>
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>

            {activeDialog === 'invoice' && (
                <PopupCanvas closePopup={closeDialog}>
                    <CreateInvoiceDialog onClose={closeDialog} />
                </PopupCanvas>
            )}

            {activeDialog === 'expense' && (
                <PopupCanvas closePopup={closeDialog}>
                    <LogExpense onClose={closeDialog} />
                </PopupCanvas>
            )}

            {activeDialog === 'budget' && (
                <PopupCanvas closePopup={closeDialog}>
                    <SetBudget onClose={closeDialog} />
                </PopupCanvas>
            )}

            {activeDialog === 'payment' && (
                <PopupCanvas closePopup={closeDialog}>
                    <RecordPayment onClose={closeDialog} />
                </PopupCanvas>
            )}

            {activeDialog === 'export' && (
                <PopupCanvas closePopup={closeDialog}>
                    <ExportData onClose={closeDialog} />
                </PopupCanvas>
            )}
        </>
    )
}
