import { Budget, BudgetSummary } from './BugetTypes'
import { Expense, ExpenseSummary } from './ExpensesTypes'
import { Invoice, InvoiceSummary } from './InvoiceType'

export interface ProjectProfitAndLossData {
    error: boolean
    message: string
    data: {
        ProjectToken: string
        ReportPeriod: {
            StartDate: string
            EndDate: string
            GroupBy: string
        }
        Revenue: {
            TotalInvoiced: number
            TotalPaid: number
            Outstanding: number
            Draft: number
            InvoiceCount: number
            PaymentsReceived: number
            PaymentCount: number
        }
        Expenses: {
            TotalExpenses: number
            ApprovedExpenses: number
            PendingExpenses: number
            RejectedExpenses: number
            ExpenseCount: number
            ApprovedCount: number
            ByCategory: {
                Category: string
                Amount: number
                Count: number
            }[]
        }
        LaborCosts: {
            TotalLaborCost: number
            BillableCost: number
            NonBillableCost: number
            TotalHours: number
            BillableHours: number
            TeamMemberCount: number
        }
        ProfitLoss: {
            TotalRevenue: number
            TotalExpenses: number
            TotalLaborCosts: number
            TotalCosts: number
            GrossProfit: number
            ProfitMargin: number
            ProjectedRevenue: number
            ProjectedProfit: number
            ProjectedMargin: number
        }
        BudgetComparison: {
            TotalBudget: number
            TotalSpent: number
            RemainingBudget: number
            BudgetUtilization: number
        }
        HealthIndicators: {
            IsProfitable: boolean
            IsOverBudget: boolean
            OutstandingToRevenue: number
            CostToRevenue: number
        }
        ChartData: {
            Period: string
            Revenue: number
            Expenses: number
            Profit: number
            ProfitMargin: string
        }[]
    }
}

export interface BudgetResponse {
    error: boolean
    message: string
    data: {
        ProjectToken: string
        bugets: Budget[]
        totalBugets: number
        summary: BudgetSummary
    }
}

export interface ExpensesResponse {
    error: boolean
    message: string
    data: {
        ProjectToken: string
        expenses: Expense[]
        totalExpenses: number
        summary: ExpenseSummary
    }
}

export interface InvoicesResponse {
    error: boolean
    message: string
    data: {
        ProjectToken: string
        invoices: Invoice[]
        totalInvoices: number
        summary: InvoiceSummary
    }
}
