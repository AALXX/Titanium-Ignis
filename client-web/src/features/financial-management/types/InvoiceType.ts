export interface LineItem {
    LineItemId: number
    Name: string
    Description: string
    Quantity: number
    UnitPrice: number
    Amount: number
    TaxRate: number
    TaxAmount: number
    ItemType: string
    CreatedAt: string
    UpdatedAt: string
}

export interface Payment {
    PaymentId: number
    Amount: number
    PaymentDate: string
    PaymentMethod: string
    TransactionId: string | null
    ReferenceNumber: string | null
    Notes: string | null
    CreatedAt: string
}

export interface Invoice {
    InvoiceId: number
    InvoiceToken: string
    ProjectToken: string
    ClientName: string
    BillingType: string
    TotalAmount: number
    TotalPaid: number
    AmountDue: number
    Subtotal: number
    TaxAmount: number
    DiscountAmount: number
    Status: string
    IssueDate: string
    DueDate: string | null
    SentDate: string | null
    PaidDate: string | null
    Currency: string
    Notes: string | null
    Terms: string | null
    PaymentInstructions: string | null
    CreatedBy: string
    CreatedByName: string
    CreatedAt: string
    UpdatedAt: string
    LineItems: LineItem[]
    Payments: Payment[]
}

export interface InvoiceSummary {
    TotalAmount: number
    DraftAmount: number
    SentAmount: number
    PaidAmount: number
    PartiallyPaidAmount: number
    OverdueAmount: number
}

