

export interface Expense {
    ExpenseId: number
    ExpenseTitle: string
    BugetToken: string
    ExpenseToken: string
    ProjectToken: string
    Category: string
    UserPublicToken: string
    CreatedByName: string
    Amount: number
    ExpenseDate: string 
    Description: string
    ReceiptUrl: string | null
    Status: 'approved' | 'pending' | 'rejected' | string 
    ApprovalDate: string | null
    ApprovedBy: string | null
    ApprovedByName: string | null
    RejectionReason: string | null
    ReimbursementDate: string | null
    CreatedAt: string
    UpdatedAt: string
}

export interface ExpenseSummary {
    TotalAmount: number
    PendingAmount: number
    ApprovedAmount: number
    RejectedAmount: number
    ReimbursedAmount: number
}