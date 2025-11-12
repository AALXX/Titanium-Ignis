'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type React from 'react'

export const RevenueChart: React.FC<{
    data: Array<{
        Period: string
        Revenue: number
        Expenses: number
        Profit: number
        ProfitMargin: string
    }>
    currency: string
}> = ({ data, currency }) => {
    if (!data || data.length === 0) {
        return (
            <div className="rounded-xl border border-[#4d4d4d] bg-[#0303035b] p-6">
                <p className="text-center text-gray-400">No data available</p>
            </div>
        )
    }

    const totalRevenue = data.reduce((sum, item) => sum + item.Revenue, 0)
    const totalExpenses = data.reduce((sum, item) => sum + item.Expenses, 0)
    const totalProfit = data.reduce((sum, item) => sum + item.Profit, 0)
    const avgProfitMargin = ((totalProfit / totalRevenue) * 100).toFixed(1)

    const chartData = data.map(item => ({
        month: formatPeriod(item.Period),
        revenue: item.Revenue,
        expenses: item.Expenses,
        profit: item.Profit
    }))

    function formatPeriod(period: string): string {
        const [year, month] = period.split('-')
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return `${monthNames[Number.parseInt(month) - 1]} ${year}`
    }

    const formatCurrency = (curency: string) => {
        switch (curency) {
            case 'USD':
                return '$'
            case 'EUR':
                return '€'
            case 'GBP':
                return '£'
            case 'JPY':
                return '¥'
            case 'CAD':
                return '$'
            case 'AUD':
                return '$'
            case 'CHF':
                return 'FR'
            case 'CNY':
                return '¥'
        }
    }

    return (
        <div className="space-y-6">
            <div className="rounded-xl border border-[#4d4d4d] bg-[#0303035b] p-8">
                <div className="mb-6 border-b border-[#4d4d4d] pb-6">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold text-gray-50">Financial Performance</h2>
                        <p className="text-sm text-gray-400">Revenue, expenses, and profit comparison over time</p>
                    </div>
                </div>

                <div>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 60, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#4d4d4d" vertical={false} opacity={0.5} />
                            <XAxis dataKey="month" stroke="#9ca3af" style={{ fontSize: '12px', fontWeight: 500 }} axisLine={{ stroke: '#4d4d4d' }} tick={{ fill: '#9ca3af' }} tickLine={false} />
                            <YAxis stroke="#9ca3af" style={{ fontSize: '13px' }} axisLine={{ stroke: '#4d4d4d' }} tick={{ fill: '#9ca3af' }} tickLine={false} tickFormatter={value => `${formatCurrency(currency)} ${(value / 1000).toFixed(0)}k`} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1a1a1a',
                                    border: '1px solid #4d4d4d',
                                    borderRadius: '10px',
                                    padding: '12px 16px',
                                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
                                }}
                                labelStyle={{
                                    color: '#e5e7eb',
                                    marginBottom: '8px',
                                    fontWeight: '600',
                                    fontSize: '14px'
                                }}
                                formatter={(value: number, name: string) => {
                                    const labels = {
                                        revenue: 'Revenue',
                                        expenses: 'Expenses',
                                        profit: 'Profit'
                                    }
                                    return [`${value.toLocaleString()}${formatCurrency(currency)} `, labels[name as keyof typeof labels] || name]
                                }}
                                cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                            />
                            <Legend
                                wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }}
                                iconType="circle"
                                formatter={value => {
                                    const labels = {
                                        revenue: 'Revenue',
                                        expenses: 'Expenses',
                                        profit: 'Profit'
                                    }
                                    return <span style={{ color: '#9ca3af' }}>{labels[value as keyof typeof labels] || value}</span>
                                }}
                            />
                            <Bar dataKey="revenue" fill="#06b6d4" radius={[8, 8, 0, 0]} maxBarSize={60} />
                            <Bar dataKey="expenses" fill="#ef4444" radius={[8, 8, 0, 0]} maxBarSize={60} />
                            <Bar dataKey="profit" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={60} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
