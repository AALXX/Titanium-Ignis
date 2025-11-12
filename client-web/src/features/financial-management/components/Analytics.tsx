interface AnalyticsProps { 
    data: any
    currency: string
}

export const Analytics: React.FC<AnalyticsProps> = ({ data, currency }) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount)
    }

    const calculatePercentage = (amount: number, total: number) => {
        if (total === 0) return '0'
        return ((amount / total) * 100).toFixed(0)
    }

    const revenue = data?.Revenue || {}
    const expenses = data?.Expenses || {}
    const laborCosts = data?.LaborCosts || {}

    const totalRevenue = revenue.TotalPaid || 0
    const paymentsReceived = revenue.PaymentsReceived || 0
    const outstanding = revenue.Outstanding || 0

    const totalExpenses = expenses.TotalExpenses || 0
    const approvedExpenses = expenses.ApprovedExpenses || 0
    const pendingExpenses = expenses.PendingExpenses || 0
    const totalLaborCost = laborCosts.TotalLaborCost || 0

    const expensesByCategory = expenses.ByCategory || []

    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-[#4d4d4d] bg-[#0303035b] p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-50">Revenue Breakdown</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Payments Received</span>
                        <span className="font-semibold text-slate-50">
                            {formatCurrency(paymentsReceived)} ({calculatePercentage(paymentsReceived, paymentsReceived + outstanding)}%)
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Outstanding</span>
                        <span className="font-semibold text-slate-50">
                            {formatCurrency(outstanding)} ({calculatePercentage(outstanding, paymentsReceived + outstanding)}%)
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Total Invoice Payments</span>
                        <span className="font-semibold text-slate-50">{formatCurrency(totalRevenue)}</span>
                    </div>
                </div>
            </div>
            <div className="rounded-lg border border-[#4d4d4d] bg-[#0303035b] p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-50">Expense Categories</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Labor Costs</span>
                        <span className="font-semibold text-slate-50">
                            {formatCurrency(totalLaborCost)} ({calculatePercentage(totalLaborCost, totalExpenses + totalLaborCost)}%)
                        </span>
                    </div>
                    {expensesByCategory.map((category: any, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                            <span className="text-sm text-slate-400 capitalize">{category.Category}</span>
                            <span className="font-semibold text-slate-50">
                                {formatCurrency(category.Amount)} ({calculatePercentage(category.Amount, totalExpenses + totalLaborCost)}%)
                            </span>
                        </div>
                    ))}
                    {expensesByCategory.length === 0 && totalLaborCost === 0 && <div className="text-sm text-slate-500">No expenses recorded</div>}
                </div>
            </div>
        </div>
    )
}