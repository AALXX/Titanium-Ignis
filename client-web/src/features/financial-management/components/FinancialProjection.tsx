import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'


interface FinancialProjectionProps {
    data: Array<{ month: string; actual: number | null; projected: number }>
}

export const FinancialProjection: React.FC<FinancialProjectionProps> = ({ data }) => {
    const formatCurrency = (value: number) => {
        return `$${(value / 1000).toFixed(0)}k`
    }

    return (
        <div className="">
            <div className="rounded-xl border border-[#4d4d4d] bg-[#0303035b] p-8">
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-slate-50">Financial Projection</h3>
                    <p className="mt-1 text-sm text-slate-400">9-month revenue forecast with growth projections</p>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data}>
                        <defs>
                            <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="rgb(34 211 238)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="rgb(34 211 238)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-800" />
                        <XAxis dataKey="month" className="text-slate-400" fontSize={12} tickLine={false} stroke="rgb(148 163 184)" />
                        <YAxis className="text-slate-400" fontSize={12} tickLine={false} tickFormatter={formatCurrency} stroke="rgb(148 163 184)" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgb(15 23 42)',
                                border: '1px solid rgb(30 41 59)',
                                borderRadius: '8px',
                                color: 'rgb(248 250 252)'
                            }}
                            formatter={value => [
                                new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                    minimumFractionDigits: 0
                                }).format(value as number)
                            ]}
                        />
                        <Legend wrapperStyle={{ color: 'rgb(248 250 252)' }} iconType="line" />
                        <Line type="monotone" dataKey="actual" stroke="rgb(34 211 238)" strokeWidth={3} dot={{ fill: 'rgb(34 211 238)', r: 4 }} name="Actual Revenue" connectNulls={false} />
                        <Line type="monotone" dataKey="projected" stroke="rgb(52 211 153)" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: 'rgb(52 211 153)', r: 3 }} name="Projected Revenue" />
                    </LineChart>
                </ResponsiveContainer>

                <div className="mt-6 grid grid-cols-3 gap-4 border-t border-slate-800 pt-6">
                    <div>
                        <p className="mb-1 text-sm text-slate-400">Current Month</p>
                        <p className="text-2xl font-bold text-slate-50">$234k</p>
                    </div>
                    <div>
                        <p className="mb-1 text-sm text-slate-400">Projected (Jun)</p>
                        <p className="text-2xl font-bold text-emerald-400">$341k</p>
                    </div>
                    <div>
                        <p className="mb-1 text-sm text-slate-400">Growth Rate</p>
                        <p className="text-2xl font-bold text-green-500">+45.7%</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
