export interface BudgetItem {
    id: string
    project: string
    budget: number
    spent: number
    remaining: number
    status: 'healthy' | 'warning' | 'critical'
}

export interface BudgetItemProps {
    data: BudgetItem[]
}
