'use client'

import React, { useState } from 'react'
import { Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { Budget } from '../types/BugetTypes'
import { Expense } from '../types/ExpensesTypes'
import { Invoice } from '../types/InvoiceType'
import DoubleValueOptionPicker from '@/components/DoubleValueOptionPicker'
import autoTable from 'jspdf-autotable'

interface ExportDataProps {
    bugetData: Budget[]
    expenseData: Expense[]
    invoiceData: Invoice[]
    onClose: () => void
}

const dataTypeOptions = [
    { id: 'budgets', label: 'Budgets' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'invoices', label: 'Invoices' }
]

const formatOptions = [
    { label: 'CSV (Comma-separated values)', value: 'csv' },
    { label: 'PDF (Portable Document)', value: 'pdf' },
    { label: 'Excel (Spreadsheet)', value: 'excel' }
]

const ExportData = ({ bugetData, expenseData, invoiceData, onClose }: ExportDataProps) => {
    const [selectedTypes, setSelectedTypes] = useState<string[]>([])
    const [exportFormat, setExportFormat] = useState<string>('')
    const [startDate, setStartDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')

    const toggleDataType = (id: string) => {
        setSelectedTypes(prev => (prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]))
    }

    const filterByDateRange = (data: any[], dateField: string) => {
        if (!startDate || !endDate) return data

        return data.filter(item => {
            const itemDate = new Date(item[dateField])
            const start = new Date(startDate)
            const end = new Date(endDate)
            return itemDate >= start && itemDate <= end
        })
    }

    const exportToCSV = (data: any[], filename: string) => {
        if (data.length === 0) return

        const headers = Object.keys(data[0])
        const csvContent = [
            headers.join(','),
            ...data.map(row =>
                headers
                    .map(header => {
                        const value = row[header]
                        const stringValue = value === null || value === undefined ? '' : String(value)
                        return stringValue.includes(',') ? `"${stringValue}"` : stringValue
                    })
                    .join(',')
            )
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `${filename}.csv`
        link.click()
    }

    const exportToExcel = (datasets: { name: string; data: any[] }[]) => {
        const wb = XLSX.utils.book_new()

        datasets.forEach(({ name, data }) => {
            if (data.length > 0) {
                const ws = XLSX.utils.json_to_sheet(data)
                XLSX.utils.book_append_sheet(wb, ws, name)
            }
        })

        XLSX.writeFile(wb, `financial_data_${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    const exportToPDF = (datasets: { name: string; data: any[] }[]) => {
        const doc = new jsPDF()
        let yPosition = 20

        doc.setFontSize(18)
        doc.text('Financial Data Export', 14, yPosition)
        yPosition += 10

        doc.setFontSize(10)
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, yPosition)
        yPosition += 15

        datasets.forEach(({ name, data }, index) => {
            if (data.length === 0) return

            if (index > 0) {
                doc.addPage()
                yPosition = 20
            }

            doc.setFontSize(14)
            doc.text(name, 14, yPosition)
            yPosition += 10

            const headers = Object.keys(data[0])
            const rows = data.map(item =>
                headers.map(header => {
                    const value = item[header]
                    return value === null || value === undefined ? '' : String(value)
                })
            )

            autoTable(doc, {
                head: [headers],
                body: rows,
                startY: yPosition,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [34, 211, 238] }
            })
        })

        doc.save(`financial_data_${new Date().toISOString().split('T')[0]}.pdf`)
    }

    const handleSubmit = () => {
        if (selectedTypes.length === 0) {
            alert('Please select at least one data type to export')
            return
        }

        if (!exportFormat) {
            alert('Please select an export format')
            return
        }

        if (!startDate || !endDate) {
            alert('Please select both start and end dates')
            return
        }

        const datasets: { name: string; data: any[] }[] = []

        if (selectedTypes.includes('budgets')) {
            const filteredBudgets = filterByDateRange(bugetData, 'CreatedAt')
            datasets.push({ name: 'Budgets', data: filteredBudgets })
        }

        if (selectedTypes.includes('expenses')) {
            const filteredExpenses = filterByDateRange(expenseData, 'ExpenseDate')
            datasets.push({ name: 'Expenses', data: filteredExpenses })
        }

        if (selectedTypes.includes('invoices')) {
            const filteredInvoices = filterByDateRange(invoiceData, 'IssueDate')
            datasets.push({ name: 'Invoices', data: filteredInvoices })
        }

        switch (exportFormat) {
            case 'csv':
                datasets.forEach(({ name, data }) => {
                    if (data.length > 0) {
                        exportToCSV(data, name.toLowerCase())
                    }
                })
                break
            case 'excel':
                exportToExcel(datasets)
                break
            case 'pdf':
                exportToPDF(datasets)
                break
        }

        onClose()
    }

    return (
        <div className="w-full">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Export Data</h2>
                <p className="mt-1 text-sm text-gray-400">Download your financial data in various formats</p>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-200">Export Format *</label>
                    <DoubleValueOptionPicker label="Export Format" options={formatOptions} value={exportFormat} onChange={setExportFormat} className="w-full rounded-lg border border-white/10 bg-[#363636] px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:ring-2 focus:ring-zinc-600 focus:outline-none" />
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
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none" />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-200">End Date *</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-gray-100 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none" />
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-100 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 focus:ring-2 focus:ring-cyan-400/30 focus:outline-none">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-500 px-4 py-2.5 text-sm font-medium text-gray-900 shadow-lg shadow-cyan-500/30 transition-all hover:from-cyan-500 hover:to-cyan-600 hover:shadow-cyan-500/40 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                    >
                        <Download className="h-4 w-4" />
                        Export Data
                    </button>
                </div>
            </div>
        </div>
    )
}
export default ExportData
