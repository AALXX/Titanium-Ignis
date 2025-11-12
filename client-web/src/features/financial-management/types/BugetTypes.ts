export interface BudgetItem {
    id: string
    project: string
    budget: number
    spent: number
    remaining: number
    status: 'healthy' | 'warning' | 'critical'
}




export interface Budget {
    BugetName: string
    BugetToken: string
    ProjectToken: string
    TotalBuget: number
    SpentAmount: number
    RemainingBuget: number
    SpentPercentage: number
    Currency: string
    BugetPeriod: string
    Notes: string | null
    CreatedAt: string
    UpdatedAt: string
}

export interface BudgetSummary {
    TotalBuget: number
    TotalSpent: number
    TotalRemaining: number
    OverallSpentPercentage: number
}

export interface BudgetData {
    data: {
        ProjectToken: string
        bugets: Budget[]
        totalBugets: number
        summary: BudgetSummary
    }
}

