'use client'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'

export const RevenueChart: React.FC<{ data: Array<{ month: string; revenue: number; expenses: number }> }> = ({ data }) => {
    return (
        <div className="rounded-xl border border-[#4d4d4d] bg-[#0303035b] p-8">
            <h2 className="mb-2 text-2xl font-bold text-gray-50">Revenue vs Expenses</h2>
            <p className="mb-6 text-sm text-gray-400">Financial performance over the last 10 months</p>

            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4d4d4d" vertical={true} />
                    <XAxis dataKey="month" stroke="#9ca3af" style={{ fontSize: '12px' }} axisLine={{ stroke: '#4d4d4d' }} />
                    <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} axisLine={{ stroke: '#4d4d4d' }} tickFormatter={value => `$${value / 1000}k`} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1a1a1a',
                            border: '1px solid #4d4d4d',
                            borderRadius: '8px'
                        }}
                        labelStyle={{ color: '#06b6d4' }}
                        formatter={value => `$${value.toLocaleString()}`}
                        cursor={{ stroke: '#06b6d4', strokeWidth: 2 }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#06b6d4" fill="url(#colorRevenue)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#colorExpenses)" strokeWidth={2} dot={false} />
                </AreaChart>
            </ResponsiveContainer>

            <div className="mt-6 flex gap-6">
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-cyan-400"></div>
                    <span className="text-sm text-gray-400">Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    <span className="text-sm text-gray-400">Expenses</span>
                </div>
            </div>
        </div>
    )
}
