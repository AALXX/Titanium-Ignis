import { Response } from 'express';
import { validationResult } from 'express-validator';
import logging from '../config/logging';
import { connect, CustomRequest, query } from '../config/postgresql';
import utilFunctions from '../util/utilFunctions';
import { PoolClient } from 'pg';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

interface RevenueData {
    total_invoiced: string;
    total_paid: string;
    total_outstanding: string;
    total_draft: string;
    invoice_count: string;
}

interface PaymentsData {
    total_payments_received: string;
    payment_count: string;
}

interface ExpensesData {
    total_expenses: string;
    approved_expenses: string;
    pending_expenses: string;
    rejected_expenses: string;
    expense_count: string;
    approved_count: string;
}

interface ExpenseCategory {
    category: string;
    total_amount: string;
    expense_count: string;
}

interface TeamCostsData {
    total_labor_cost: number;
    billable_labor_cost: number;
    non_billable_labor_cost: number;
    total_hours: number;
    billable_hours: number;
    team_member_count: number;
}

interface BudgetData {
    total_budget: string;
    total_spent: string;
    remaining_budget: string;
}

interface TimeSeriesRow {
    period: Date;
    period_label: string;
    revenue: string;
    expenses: string;
    profit: string;
}

interface TimeSeriesDataPoint {
    Period: string;
    Revenue: number;
    Expenses: number;
    Profit: number;
    ProfitMargin: string;
}

interface BudgetStatusRow {
    buget_token: string;
    buget_name: string;
    total_buget: string;
    spent_amount: string;
    remaining_buget: string;
    utilization_percent: string;
    expense_count: string;
    pending_expenses: string;
    currency: string;
}

interface BudgetRevisionRow {
    revision_token: string;
    buget_token: string;
    previous_amount: string;
    new_amount: string;
    change_amount: string;
    change_reason: string;
    revision_type: string;
    revision_date: Date;
    fiscal_period: string;
    approved_by_name: string;
    buget_name?: string;
}

interface ExpenseTrendRow {
    month: Date;
    buget_token: string;
    buget_name: string;
    expense_count: string;
    total_amount: string;
}

interface CashFlowSummaryRow {
    projectname: string;
    projecttoken: string;
    revenue_received: string;
    revenue_pending: string;
    expenses_paid: string;
    expenses_pending: string;
    net_cash_flow: string;
}

interface CashFlowTimelineRow {
    period: Date;
    cash_in: string;
    cash_out: string;
    net_cash_flow: string;
}

interface AuditLogRow {
    audit_token: string;
    expense_token: string;
    action_type: string;
    field_changed: string;
    old_value: string;
    new_value: string;
    amount_impact: string;
    change_reason: string;
    changed_at: Date;
    changed_by_name: string;
}

interface FinancialEventRow {
    event_token: string;
    event_type: string;
    related_entity_type: string;
    related_entity_token: string;
    amount: string;
    currency: string;
    transaction_date: Date;
    description: string;
    metadata: Record<string, any>;
    created_at: Date;
    created_by_name: string;
}

type GroupByPeriod = 'month' | 'quarter' | 'year';
type DateTruncFormat = 'month' | 'quarter' | 'year';
type CashFlowGroupBy = 'day' | 'week' | 'month' | 'quarter';


const CustomRequestValidationResult = validationResult.withDefaults({
    formatter: (error) => {
        return {
            errorMsg: error.msg,
        };
    },
});


const getDateTruncFormat = (groupBy: string): DateTruncFormat => {
    switch (groupBy) {
        case 'quarter':
            return 'quarter';
        case 'year':
            return 'year';
        case 'month':
        default:
            return 'month';
    }
};

const getDateGroupFormat = (groupBy: string): string => {
    switch (groupBy) {
        case 'quarter':
            return 'YYYY-Q';
        case 'year':
            return 'YYYY';
        case 'month':
        default:
            return 'YYYY-MM';
    }
};

const GetProjectProfitLoss = async (req: CustomRequest, res: Response): Promise<void> => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_PROJECT_PROFIT_LOSS', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    let connection: PoolClient | null = null;

    try {
        connection = await connect(req.pool!);

        if (!connection) {
            logging.error('GET_PROJECT_PROFIT_LOSS', 'Failed to establish database connection');
            res.status(200).json({
                error: true,
                errmsg: 'Database connection failed',
            });
            return;
        }

        const { ProjectToken, UserSessionToken } = req.params;
        const { StartDate, EndDate, GroupBy } = req.query;

        const userPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection, UserSessionToken);
        if (!userPrivateToken) {
            connection.release();
            logging.error('GET_PROJECT_PROFIT_LOSS', 'Invalid user session token');
            res.status(200).json({
                error: true,
                errmsg: 'Invalid user session token',
            });
            return;
        }

        const projectExists = await utilFunctions.checkProjectExists(connection, ProjectToken);
        if (!projectExists) {
            connection.release();
            logging.error('GET_PROJECT_PROFIT_LOSS', `Project not found: ${ProjectToken}`);
            res.status(200).json({
                error: true,
                errmsg: 'Project not found',
            });
            return;
        }

        let startDate = StartDate as string;
        let endDate = EndDate as string;

        if (!startDate) {
            startDate = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        }

        if (!endDate) {
            endDate = new Date().toISOString().split('T')[0];
        }

        const groupByPeriod = (GroupBy as GroupByPeriod) || 'month';

        // ==========================================
        // 1. GET REVENUE
        // ==========================================
        const revenueQuery = `
            SELECT 
                COALESCE(SUM(i.total_amount), 0) as total_invoiced,
                COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total_amount ELSE 0 END), 0) as total_paid,
                COALESCE(SUM(CASE WHEN i.status = 'sent' OR i.status = 'overdue' THEN i.total_amount ELSE 0 END), 0) as total_outstanding,
                COALESCE(SUM(CASE WHEN i.status = 'draft' THEN i.total_amount ELSE 0 END), 0) as total_draft,
                COUNT(i.id) as invoice_count
            FROM invoices i
            WHERE i.project_token = $1
                AND (i.issue_date IS NULL OR i.issue_date BETWEEN $2 AND $3)
        `;

        const revenueResult = await query(connection, revenueQuery, [ProjectToken, startDate, endDate]);
        const revenueData: RevenueData = revenueResult[0];

        const paymentsQuery = `
            SELECT 
                COALESCE(SUM(p.amount), 0) as total_payments_received,
                COUNT(p.id) as payment_count
            FROM payments p
            INNER JOIN invoices i ON p.invoice_token = i.invoice_token
            WHERE i.project_token = $1
                AND p.payment_date BETWEEN $2 AND $3
        `;

        const paymentsResult = await query(connection, paymentsQuery, [ProjectToken, startDate, endDate]);
        const paymentsData: PaymentsData = paymentsResult[0];

        // ==========================================
        // 2. GET EXPENSES
        // ==========================================
        const expensesQuery = `
            SELECT 
                COALESCE(SUM(e.amount), 0) as total_expenses,
                COALESCE(SUM(CASE WHEN e.status = 'approved' THEN e.amount ELSE 0 END), 0) as approved_expenses,
                COALESCE(SUM(CASE WHEN e.status = 'pending' THEN e.amount ELSE 0 END), 0) as pending_expenses,
                COALESCE(SUM(CASE WHEN e.status = 'rejected' THEN e.amount ELSE 0 END), 0) as rejected_expenses,
                COUNT(e.id) as expense_count,
                COUNT(CASE WHEN e.status = 'approved' THEN 1 END) as approved_count
            FROM project_expenses e
            WHERE e.ProjectToken = $1
                AND e.expense_date BETWEEN $2 AND $3
        `;

        const expensesResult = await query(connection, expensesQuery, [ProjectToken, startDate, endDate]);
        const expensesData: ExpensesData = expensesResult[0];

        // ==========================================
        // 3. GET EXPENSES BY CATEGORY
        // ==========================================
        const expensesByCategoryQuery = `
            SELECT 
                e.category,
                COALESCE(SUM(e.amount), 0) as total_amount,
                COUNT(e.id) as expense_count
            FROM project_expenses e
            WHERE e.ProjectToken = $1
                AND e.status = 'approved'
                AND e.expense_date BETWEEN $2 AND $3
            GROUP BY e.category
            ORDER BY total_amount DESC
        `;

        const expensesByCategoryResult = await query(connection, expensesByCategoryQuery, [ProjectToken, startDate, endDate]);

        // ==========================================
        // 4. GET TEAM COSTS
        // ==========================================
        const teamCostsQuery = `
            SELECT 
                COALESCE(SUM(tl.hours * tr.hourly_rate), 0) as total_labor_cost,
                COALESCE(SUM(CASE WHEN tl.billable THEN tl.hours * tr.hourly_rate ELSE 0 END), 0) as billable_labor_cost,
                COALESCE(SUM(CASE WHEN NOT tl.billable THEN tl.hours * tr.hourly_rate ELSE 0 END), 0) as non_billable_labor_cost,
                COALESCE(SUM(tl.hours), 0) as total_hours,
                COALESCE(SUM(CASE WHEN tl.billable THEN tl.hours ELSE 0 END), 0) as billable_hours,
                COUNT(DISTINCT tl.user_id) as team_member_count
            FROM time_logs tl
            INNER JOIN team_rates tr ON tl.user_id = tr.user_private_token 
                AND tr.is_active = true
                AND tl.date >= tr.effective_date
                AND (tr.end_date IS NULL OR tl.date <= tr.end_date)
            WHERE tl.project_id = $1
                AND tl.date BETWEEN $2 AND $3
        `;

        let teamCostsData: TeamCostsData = {
            total_labor_cost: 0,
            billable_labor_cost: 0,
            non_billable_labor_cost: 0,
            total_hours: 0,
            billable_hours: 0,
            team_member_count: 0,
        };

        try {
            const teamCostsResult = await query(connection, teamCostsQuery, [ProjectToken, startDate, endDate]);
            if (teamCostsResult && teamCostsResult.length > 0) {
                teamCostsData = teamCostsResult[0];
            }
        } catch (error: any) {
            logging.warn('GET_PROJECT_PROFIT_LOSS', 'Time logs table not available or query failed');
        }

        // ==========================================
        // 5. CALCULATE METRICS
        // ==========================================
        const totalRevenue = parseFloat(paymentsData.total_payments_received || '0');
        const totalExpenses = parseFloat(expensesData.approved_expenses || '0');
        const totalLaborCost = parseFloat(String(teamCostsData.total_labor_cost) || '0');

        const totalCosts = totalExpenses + totalLaborCost;
        const grossProfit = totalRevenue - totalCosts;
        const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        const outstandingRevenue = parseFloat(revenueData.total_outstanding || '0');
        const projectedRevenue = totalRevenue + outstandingRevenue;
        const projectedProfit = projectedRevenue - totalCosts;
        const projectedMargin = projectedRevenue > 0 ? (projectedProfit / projectedRevenue) * 100 : 0;

        // ==========================================
        // 6. GET BUDGET COMPARISON
        // ==========================================
        const budgetQuery = `
            SELECT 
                COALESCE(SUM(total_buget), 0) as total_budget,
                COALESCE(SUM(spent_amount), 0) as total_spent,
                COALESCE(SUM(total_buget - spent_amount), 0) as remaining_budget
            FROM projects_bugets
            WHERE ProjectToken = $1
        `;

        const budgetResult = await query(connection, budgetQuery, [ProjectToken]);
        const budgetData: BudgetData = budgetResult[0];

        // ==========================================
        // 7. GET TIME SERIES DATA FOR CHART
        // ==========================================
        const dateTruncFormat = getDateTruncFormat(groupByPeriod);
        const dateGroupFormat = getDateGroupFormat(groupByPeriod);

        // Query for revenue over time
        const timeSeriesRevenueQuery = `
            SELECT 
                DATE_TRUNC('${dateTruncFormat}', p.payment_date) as period,
                TO_CHAR(DATE_TRUNC('${dateTruncFormat}', p.payment_date), '${dateGroupFormat}') as period_label,
                COALESCE(SUM(p.amount), 0) as revenue
            FROM payments p
            INNER JOIN invoices i ON p.invoice_token = i.invoice_token
            WHERE i.project_token = $1
                AND p.payment_date BETWEEN $2 AND $3
            GROUP BY DATE_TRUNC('${dateTruncFormat}', p.payment_date)
            ORDER BY period ASC
        `;

        // Query for expenses over time
        const timeSeriesExpensesQuery = `
            SELECT 
                DATE_TRUNC('${dateTruncFormat}', e.expense_date) as period,
                TO_CHAR(DATE_TRUNC('${dateTruncFormat}', e.expense_date), '${dateGroupFormat}') as period_label,
                COALESCE(SUM(e.amount), 0) as expenses
            FROM project_expenses e
            WHERE e.ProjectToken = $1
                AND e.status = 'approved'
                AND e.expense_date BETWEEN $2 AND $3
            GROUP BY DATE_TRUNC('${dateTruncFormat}', e.expense_date)
            ORDER BY period ASC
        `;

        // Query for labor costs over time
        const timeSeriesLaborQuery = `
            SELECT 
                DATE_TRUNC('${dateTruncFormat}', tl.date) as period,
                TO_CHAR(DATE_TRUNC('${dateTruncFormat}', tl.date), '${dateGroupFormat}') as period_label,
                COALESCE(SUM(tl.hours * tr.hourly_rate), 0) as labor_cost
            FROM time_logs tl
            INNER JOIN team_rates tr ON tl.user_id = tr.user_private_token 
                AND tr.is_active = true
                AND tl.date >= tr.effective_date
                AND (tr.end_date IS NULL OR tl.date <= tr.end_date)
            WHERE tl.project_id = $1
                AND tl.date BETWEEN $2 AND $3
            GROUP BY DATE_TRUNC('${dateTruncFormat}', tl.date)
            ORDER BY period ASC
        `;

        const revenueTimeSeriesResult = await query(connection, timeSeriesRevenueQuery, [ProjectToken, startDate, endDate]);
        const expensesTimeSeriesResult = await query(connection, timeSeriesExpensesQuery, [ProjectToken, startDate, endDate]);

        let laborTimeSeriesResult: any[] = [];
        try {
            laborTimeSeriesResult = await query(connection, timeSeriesLaborQuery, [ProjectToken, startDate, endDate]);
        } catch (error: any) {
            logging.warn('GET_PROJECT_PROFIT_LOSS', 'Labor costs time series not available');
        }

        // Combine all time series data
        const periodMap = new Map<string, { revenue: number; expenses: number; laborCost: number }>();

        // Add revenue data
        revenueTimeSeriesResult.forEach((row: any) => {
            const label = row.period_label;
            if (!periodMap.has(label)) {
                periodMap.set(label, { revenue: 0, expenses: 0, laborCost: 0 });
            }
            periodMap.get(label)!.revenue = parseFloat(row.revenue);
        });

        // Add expense data
        expensesTimeSeriesResult.forEach((row: any) => {
            const label = row.period_label;
            if (!periodMap.has(label)) {
                periodMap.set(label, { revenue: 0, expenses: 0, laborCost: 0 });
            }
            periodMap.get(label)!.expenses = parseFloat(row.expenses);
        });

        // Add labor cost data
        laborTimeSeriesResult.forEach((row: any) => {
            const label = row.period_label;
            if (!periodMap.has(label)) {
                periodMap.set(label, { revenue: 0, expenses: 0, laborCost: 0 });
            }
            periodMap.get(label)!.laborCost = parseFloat(row.labor_cost);
        });

        // Convert to array and calculate totals
        const timeSeriesData: TimeSeriesDataPoint[] = Array.from(periodMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([period, data]) => {
                const totalExpensesForPeriod = data.expenses + data.laborCost;
                const profit = data.revenue - totalExpensesForPeriod;
                const profitMarginForPeriod = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;

                return {
                    Period: period,
                    Revenue: data.revenue,
                    Expenses: totalExpensesForPeriod,
                    Profit: profit,
                    ProfitMargin: profitMarginForPeriod.toFixed(2),
                };
            });

        connection.release();

        const response = {
            error: false,
            message: 'Profit & Loss report generated successfully',
            data: {
                ProjectToken,
                ReportPeriod: {
                    StartDate: startDate,
                    EndDate: endDate,
                    GroupBy: groupByPeriod,
                },
                Revenue: {
                    TotalInvoiced: parseFloat(revenueData.total_invoiced),
                    TotalPaid: parseFloat(revenueData.total_paid),
                    Outstanding: parseFloat(revenueData.total_outstanding),
                    Draft: parseFloat(revenueData.total_draft),
                    InvoiceCount: parseInt(revenueData.invoice_count),
                    PaymentsReceived: parseFloat(paymentsData.total_payments_received),
                    PaymentCount: parseInt(paymentsData.payment_count),
                },
                Expenses: {
                    TotalExpenses: parseFloat(expensesData.total_expenses),
                    ApprovedExpenses: parseFloat(expensesData.approved_expenses),
                    PendingExpenses: parseFloat(expensesData.pending_expenses),
                    RejectedExpenses: parseFloat(expensesData.rejected_expenses),
                    ExpenseCount: parseInt(expensesData.expense_count),
                    ApprovedCount: parseInt(expensesData.approved_count),
                    ByCategory: expensesByCategoryResult.map((cat: ExpenseCategory) => ({
                        Category: cat.category,
                        Amount: parseFloat(cat.total_amount),
                        Count: parseInt(cat.expense_count),
                    })),
                },
                LaborCosts: {
                    TotalLaborCost: parseFloat(String(teamCostsData.total_labor_cost)),
                    BillableCost: parseFloat(String(teamCostsData.billable_labor_cost)),
                    NonBillableCost: parseFloat(String(teamCostsData.non_billable_labor_cost)),
                    TotalHours: parseFloat(String(teamCostsData.total_hours)),
                    BillableHours: parseFloat(String(teamCostsData.billable_hours)),
                    TeamMemberCount: parseInt(String(teamCostsData.team_member_count)),
                },
                ProfitLoss: {
                    TotalRevenue: totalRevenue,
                    TotalExpenses: totalExpenses,
                    TotalLaborCosts: totalLaborCost,
                    TotalCosts: totalCosts,
                    GrossProfit: grossProfit,
                    ProfitMargin: parseFloat(profitMargin.toFixed(2)),
                    ProjectedRevenue: projectedRevenue,
                    ProjectedProfit: projectedProfit,
                    ProjectedMargin: parseFloat(projectedMargin.toFixed(2)),
                },
                BudgetComparison: {
                    TotalBudget: parseFloat(budgetData.total_budget),
                    TotalSpent: parseFloat(budgetData.total_spent),
                    RemainingBudget: parseFloat(budgetData.remaining_budget),
                    BudgetUtilization: parseFloat(budgetData.total_budget) > 0 ? parseFloat(((parseFloat(budgetData.total_spent) / parseFloat(budgetData.total_budget)) * 100).toFixed(2)) : 0,
                },
                HealthIndicators: {
                    IsProfitable: grossProfit > 0,
                    IsOverBudget: parseFloat(budgetData.total_spent) > parseFloat(budgetData.total_budget),
                    OutstandingToRevenue: totalRevenue > 0 ? parseFloat(((outstandingRevenue / totalRevenue) * 100).toFixed(2)) : 0,
                    CostToRevenue: totalRevenue > 0 ? parseFloat(((totalCosts / totalRevenue) * 100).toFixed(2)) : 0,
                },
                ChartData: timeSeriesData,
            },
        };

        res.status(200).json(response);
    } catch (error: any) {
        if (connection) {
            connection.release();
        }
        logging.error('GET_PROJECT_PROFIT_LOSS', error.message);
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

const GetProjectBudgetPerformance = async (req: CustomRequest, res: Response): Promise<void> => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_PROJECT_BUDGET_PERFORMANCE', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    let connection: PoolClient | null = null;

    try {
        connection = await connect(req.pool!);

        if (!connection) {
            logging.error('GET_PROJECT_BUDGET_PERFORMANCE', 'Failed to establish database connection');
            res.status(200).json({
                error: true,
                errmsg: 'Database connection failed',
            });
            return;
        }

        const { ProjectToken, UserSessionToken } = req.params;
        const { StartDate, EndDate } = req.query;

        const userPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection, UserSessionToken);
        if (!userPrivateToken) {
            connection.release();
            logging.error('GET_PROJECT_BUDGET_PERFORMANCE', 'Invalid user session token');
            res.status(200).json({
                error: true,
                errmsg: 'Invalid user session token',
            });
            return;
        }

        const projectExists = await utilFunctions.checkProjectExists(connection, ProjectToken);
        if (!projectExists) {
            connection.release();
            logging.error('GET_PROJECT_BUDGET_PERFORMANCE', `Project not found: ${ProjectToken}`);
            res.status(200).json({
                error: true,
                errmsg: 'Project not found',
            });
            return;
        }

        const budgetStatusQuery = `SELECT * FROM v_budget_status WHERE project_token = $1`;
        const budgetStatus = await query(connection, budgetStatusQuery, [ProjectToken]);

        const revisionsQuery = `
            SELECT 
                br.revision_token,
                br.buget_token,
                br.previous_amount,
                br.new_amount,
                br.change_amount,
                br.change_reason,
                br.revision_type,
                br.revision_date,
                br.fiscal_period,
                u.UserName as approved_by_name
            FROM budget_revisions br
            LEFT JOIN users u ON br.approved_by = u.UserPrivateToken
            WHERE br.project_token = $1
            ORDER BY br.revision_date DESC
        `;
        const revisions = await query(connection, revisionsQuery, [ProjectToken]);

        let expenseTrendsQuery = `
            SELECT 
                DATE_TRUNC('month', e.expense_date) as month,
                e.buget_token,
                pb.buget_name,
                COUNT(e.id) as expense_count,
                SUM(e.amount) as total_amount
            FROM project_expenses e
            INNER JOIN projects_bugets pb ON e.buget_token = pb.buget_token
            WHERE e.ProjectToken = $1 AND e.status = 'approved'
        `;

        const trendParams: any[] = [ProjectToken];
        let paramCounter = 2;

        if (StartDate) {
            expenseTrendsQuery += ` AND e.expense_date >= $${paramCounter++}`;
            trendParams.push(StartDate);
        }

        if (EndDate) {
            expenseTrendsQuery += ` AND e.expense_date <= $${paramCounter++}`;
            trendParams.push(EndDate);
        }

        expenseTrendsQuery += ` GROUP BY DATE_TRUNC('month', e.expense_date), e.buget_token, pb.buget_name ORDER BY month DESC`;

        const expenseTrends = await query(connection, expenseTrendsQuery, trendParams);

        connection.release();

        res.status(200).json({
            error: false,
            message: 'Budget performance report generated successfully',
            data: {
                ProjectToken,
                CurrentBudgets: budgetStatus.map((b: BudgetStatusRow) => ({
                    BugetToken: b.buget_token,
                    BugetName: b.buget_name,
                    TotalBuget: parseFloat(b.total_buget),
                    SpentAmount: parseFloat(b.spent_amount),
                    RemainingBuget: parseFloat(b.remaining_buget),
                    UtilizationPercent: parseFloat(b.utilization_percent),
                    ExpenseCount: parseInt(b.expense_count),
                    PendingExpenses: parseFloat(b.pending_expenses),
                    Currency: b.currency,
                    Status: parseFloat(b.utilization_percent) >= 100 ? 'Over Budget' : parseFloat(b.utilization_percent) >= 90 ? 'Critical' : parseFloat(b.utilization_percent) >= 75 ? 'Warning' : 'On Track',
                })),
                RevisionHistory: revisions.map((r: BudgetRevisionRow) => ({
                    RevisionToken: r.revision_token,
                    BugetToken: r.buget_token,
                    PreviousAmount: parseFloat(r.previous_amount),
                    NewAmount: parseFloat(r.new_amount),
                    ChangeAmount: parseFloat(r.change_amount),
                    ChangeReason: r.change_reason,
                    RevisionType: r.revision_type,
                    RevisionDate: r.revision_date,
                    FiscalPeriod: r.fiscal_period,
                    ApprovedByName: r.approved_by_name,
                })),
                ExpenseTrends: expenseTrends.map((t: ExpenseTrendRow) => ({
                    Month: t.month,
                    BugetToken: t.buget_token,
                    BugetName: t.buget_name,
                    ExpenseCount: parseInt(t.expense_count),
                    TotalAmount: parseFloat(t.total_amount),
                })),
            },
        });
    } catch (error: any) {
        if (connection) {
            connection.release();
        }
        logging.error('GET_PROJECT_BUDGET_PERFORMANCE', error.message);
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

const GetProjectCashFlow = async (req: CustomRequest, res: Response): Promise<void> => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_PROJECT_CASH_FLOW', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    let connection: PoolClient | null = null;

    try {
        connection = await connect(req.pool!);

        if (!connection) {
            logging.error('GET_PROJECT_CASH_FLOW', 'Failed to establish database connection');
            res.status(200).json({
                error: true,
                errmsg: 'Database connection failed',
            });
            return;
        }

        const { ProjectToken, UserSessionToken } = req.params;
        const { StartDate, EndDate, GroupBy } = req.query;

        const userPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection, UserSessionToken);
        if (!userPrivateToken) {
            connection.release();
            logging.error('GET_PROJECT_CASH_FLOW', 'Invalid user session token');
            res.status(200).json({
                error: true,
                errmsg: 'Invalid user session token',
            });
            return;
        }

        const projectExists = await utilFunctions.checkProjectExists(connection, ProjectToken);
        if (!projectExists) {
            connection.release();
            logging.error('GET_PROJECT_CASH_FLOW', `Project not found: ${ProjectToken}`);
            res.status(200).json({
                error: true,
                errmsg: 'Project not found',
            });
            return;
        }

        const cashFlowSummaryQuery = `SELECT * FROM v_project_cash_flow WHERE projecttoken = $1`;
        const cashFlowSummary = await query(connection, cashFlowSummaryQuery, [ProjectToken]);

        const groupByPeriod = (GroupBy as CashFlowGroupBy) || 'month';
        let dateFormat: string;

        switch (groupByPeriod) {
            case 'day':
                dateFormat = 'day';
                break;
            case 'week':
                dateFormat = 'week';
                break;
            case 'quarter':
                dateFormat = 'quarter';
                break;
            default:
                dateFormat = 'month';
        }

        const startDate = (StartDate as string) || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        const endDate = (EndDate as string) || new Date().toISOString().split('T')[0];

        const cashFlowTimelineQuery = `
            WITH payments_timeline AS (
                SELECT 
                    DATE_TRUNC('${dateFormat}', p.payment_date) as period,
                    SUM(p.amount) as cash_in
                FROM payments p
                INNER JOIN invoices i ON p.invoice_token = i.invoice_token
                WHERE i.project_token = $1
                    AND p.payment_date BETWEEN $2 AND $3
                GROUP BY DATE_TRUNC('${dateFormat}', p.payment_date)
            ),
            expenses_timeline AS (
                SELECT 
                    DATE_TRUNC('${dateFormat}', e.expense_date) as period,
                    SUM(e.amount) as cash_out
                FROM project_expenses e
                WHERE e.ProjectToken = $1
                    AND e.status = 'approved'
                    AND e.expense_date BETWEEN $2 AND $3
                GROUP BY DATE_TRUNC('${dateFormat}', e.expense_date)
            )
            SELECT 
                COALESCE(p.period, e.period) as period,
                COALESCE(p.cash_in, 0) as cash_in,
                COALESCE(e.cash_out, 0) as cash_out,
                COALESCE(p.cash_in, 0) - COALESCE(e.cash_out, 0) as net_cash_flow
            FROM payments_timeline p
            FULL OUTER JOIN expenses_timeline e ON p.period = e.period
            ORDER BY COALESCE(p.period, e.period) ASC
        `;

        const cashFlowTimeline = await query(connection, cashFlowTimelineQuery, [ProjectToken, startDate, endDate]);

        let runningBalance = 0;
        const timelineWithBalance = cashFlowTimeline.map((row: CashFlowTimelineRow) => {
            runningBalance += parseFloat(row.net_cash_flow);
            return {
                Period: row.period,
                CashIn: parseFloat(row.cash_in),
                CashOut: parseFloat(row.cash_out),
                NetCashFlow: parseFloat(row.net_cash_flow),
                RunningBalance: runningBalance,
            };
        });

        connection.release();

        res.status(200).json({
            error: false,
            message: 'Cash flow report generated successfully',
            data: {
                ProjectToken,
                ReportPeriod: {
                    StartDate: startDate,
                    EndDate: endDate,
                    GroupBy: groupByPeriod,
                },
                Summary:
                    cashFlowSummary.length > 0
                        ? {
                              ProjectName: cashFlowSummary[0].projectname,
                              RevenueReceived: parseFloat(cashFlowSummary[0].revenue_received),
                              RevenuePending: parseFloat(cashFlowSummary[0].revenue_pending),
                              ExpensesPaid: parseFloat(cashFlowSummary[0].expenses_paid),
                              ExpensesPending: parseFloat(cashFlowSummary[0].expenses_pending),
                              NetCashFlow: parseFloat(cashFlowSummary[0].net_cash_flow),
                          }
                        : null,
                Timeline: timelineWithBalance,
            },
        });
    } catch (error: any) {
        if (connection) {
            connection.release();
        }
        logging.error('GET_PROJECT_CASH_FLOW', error.message);
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

const GetExpenseAuditTrail = async (req: CustomRequest, res: Response): Promise<void> => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_EXPENSE_AUDIT_TRAIL', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    let connection: PoolClient | null = null;

    try {
        connection = await connect(req.pool!);

        if (!connection) {
            logging.error('GET_EXPENSE_AUDIT_TRAIL', 'Failed to establish database connection');
            res.status(200).json({
                error: true,
                errmsg: 'Database connection failed',
            });
            return;
        }

        const { ExpenseToken, UserSessionToken } = req.params;

        const userPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection, UserSessionToken);
        if (!userPrivateToken) {
            connection.release();
            logging.error('GET_EXPENSE_AUDIT_TRAIL', 'Invalid user session token');
            res.status(200).json({
                error: true,
                errmsg: 'Invalid user session token',
            });
            return;
        }

        const auditQuery = `
            SELECT 
                eal.audit_token,
                eal.expense_token,
                eal.action_type,
                eal.field_changed,
                eal.old_value,
                eal.new_value,
                eal.amount_impact,
                eal.change_reason,
                eal.changed_at,
                u.UserName as changed_by_name
            FROM expense_audit_log eal
            LEFT JOIN users u ON eal.changed_by = u.UserPrivateToken
            WHERE eal.expense_token = $1
            ORDER BY eal.changed_at DESC
        `;

        const auditTrail = await query(connection, auditQuery, [ExpenseToken]);

        connection.release();

        res.status(200).json({
            error: false,
            message: 'Expense audit trail retrieved successfully',
            data: {
                ExpenseToken,
                AuditTrail: auditTrail.map((log: AuditLogRow) => ({
                    AuditToken: log.audit_token,
                    ActionType: log.action_type,
                    FieldChanged: log.field_changed,
                    OldValue: log.old_value,
                    NewValue: log.new_value,
                    AmountImpact: parseFloat(log.amount_impact),
                    ChangeReason: log.change_reason,
                    ChangedBy: log.changed_by_name,
                    ChangedAt: log.changed_at,
                })),
                TotalChanges: auditTrail.length,
            },
        });
    } catch (error: any) {
        if (connection) {
            connection.release();
        }
        logging.error('GET_EXPENSE_AUDIT_TRAIL', error.message);
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

const GetBudgetRevisionHistory = async (req: CustomRequest, res: Response): Promise<void> => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_BUDGET_REVISION_HISTORY', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    let connection: PoolClient | null = null;

    try {
        connection = await connect(req.pool!);

        if (!connection) {
            logging.error('GET_BUDGET_REVISION_HISTORY', 'Failed to establish database connection');
            res.status(200).json({
                error: true,
                errmsg: 'Database connection failed',
            });
            return;
        }

        const { BugetToken, UserSessionToken } = req.params;

        const userPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection, UserSessionToken);
        if (!userPrivateToken) {
            connection.release();
            logging.error('GET_BUDGET_REVISION_HISTORY', 'Invalid user session token');
            res.status(200).json({
                error: true,
                errmsg: 'Invalid user session token',
            });
            return;
        }

        const revisionsQuery = `
            SELECT 
                br.revision_token,
                br.previous_amount,
                br.new_amount,
                br.change_amount,
                br.change_reason,
                br.revision_type,
                br.revision_date,
                br.fiscal_period,
                u.UserName as approved_by_name,
                pb.buget_name
            FROM budget_revisions br
            LEFT JOIN users u ON br.approved_by = u.UserPrivateToken
            INNER JOIN projects_bugets pb ON br.buget_token = pb.buget_token
            WHERE br.buget_token = $1
            ORDER BY br.revision_date DESC
        `;

        const revisions = await query(connection, revisionsQuery, [BugetToken]);

        connection.release();

        res.status(200).json({
            error: false,
            message: 'Budget revision history retrieved successfully',
            data: {
                BugetToken,
                BugetName: revisions.length > 0 ? revisions[0].buget_name : null,
                Revisions: revisions.map((r: BudgetRevisionRow) => ({
                    RevisionToken: r.revision_token,
                    PreviousAmount: parseFloat(r.previous_amount),
                    NewAmount: parseFloat(r.new_amount),
                    ChangeAmount: parseFloat(r.change_amount),
                    ChangeReason: r.change_reason,
                    RevisionType: r.revision_type,
                    RevisionDate: r.revision_date,
                    FiscalPeriod: r.fiscal_period,
                    ApprovedBy: r.approved_by_name,
                })),
                TotalRevisions: revisions.length,
            },
        });
    } catch (error: any) {
        if (connection) {
            connection.release();
        }
        logging.error('GET_BUDGET_REVISION_HISTORY', error.message);
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

const GetFinancialEvents = async (req: CustomRequest, res: Response): Promise<void> => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_FINANCIAL_EVENTS', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    let connection: PoolClient | null = null;

    try {
        connection = await connect(req.pool!);

        if (!connection) {
            logging.error('GET_FINANCIAL_EVENTS', 'Failed to establish database connection');
            res.status(200).json({
                error: true,
                errmsg: 'Database connection failed',
            });
            return;
        }

        const { ProjectToken, UserSessionToken } = req.params;
        const { StartDate, EndDate, EventType, Limit, Offset } = req.query;

        const userPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection, UserSessionToken);
        if (!userPrivateToken) {
            connection.release();
            logging.error('GET_FINANCIAL_EVENTS', 'Invalid user session token');
            res.status(200).json({
                error: true,
                errmsg: 'Invalid user session token',
            });
            return;
        }

        const projectExists = await utilFunctions.checkProjectExists(connection, ProjectToken);
        if (!projectExists) {
            connection.release();
            logging.error('GET_FINANCIAL_EVENTS', `Project not found: ${ProjectToken}`);
            res.status(200).json({
                error: true,
                errmsg: 'Project not found',
            });
            return;
        }

        let eventsQuery = `
            SELECT 
                fe.event_token,
                fe.event_type,
                fe.related_entity_type,
                fe.related_entity_token,
                fe.amount,
                fe.currency,
                fe.transaction_date,
                fe.description,
                fe.metadata,
                fe.created_at,
                u.UserName as created_by_name
            FROM financial_events fe
            LEFT JOIN users u ON fe.created_by = u.UserPrivateToken
            WHERE fe.project_token = $1
        `;

        const queryParams: any[] = [ProjectToken];
        let paramCounter = 2;

        if (StartDate) {
            eventsQuery += ` AND fe.transaction_date >= ${paramCounter++}`;
            queryParams.push(StartDate);
        }

        if (EndDate) {
            eventsQuery += ` AND fe.transaction_date <= ${paramCounter++}`;
            queryParams.push(EndDate);
        }

        if (EventType) {
            eventsQuery += ` AND fe.event_type = ${paramCounter++}`;
            queryParams.push(EventType);
        }

        eventsQuery += ` ORDER BY fe.created_at DESC`;
        eventsQuery += ` LIMIT ${paramCounter++}`;
        queryParams.push(Limit || 100);

        eventsQuery += ` OFFSET ${paramCounter++}`;
        queryParams.push(Offset || 0);

        const events = await query(connection, eventsQuery, queryParams);

        connection.release();

        res.status(200).json({
            error: false,
            message: 'Financial events retrieved successfully',
            data: {
                ProjectToken,
                Events: events.map((e: FinancialEventRow) => ({
                    EventToken: e.event_token,
                    EventType: e.event_type,
                    RelatedEntityType: e.related_entity_type,
                    RelatedEntityToken: e.related_entity_token,
                    Amount: parseFloat(e.amount),
                    Currency: e.currency,
                    TransactionDate: e.transaction_date,
                    Description: e.description,
                    Metadata: e.metadata,
                    CreatedBy: e.created_by_name,
                    CreatedAt: e.created_at,
                })),
                Pagination: {
                    Limit: Limit || 100,
                    Offset: Offset || 0,
                    Count: events.length,
                },
            },
        });
    } catch (error: any) {
        if (connection) {
            connection.release();
        }
        logging.error('GET_FINANCIAL_EVENTS', error.message);
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

const GetCompanyFinancialOverview = async (req: CustomRequest, res: Response): Promise<void> => {
    res.status(200).json({
        error: false,
        message: 'Company financial overview - Coming soon',
        data: {},
    });
};

const GenerateCashFlowSnapshot = async (req: CustomRequest, res: Response): Promise<void> => {
    res.status(200).json({
        error: false,
        message: 'Cash flow snapshot generated - Coming soon',
        data: {},
    });
};




export default {
    GetProjectProfitLoss,
    GetProjectBudgetPerformance,
    GetProjectCashFlow,
    GetExpenseAuditTrail,
    GetBudgetRevisionHistory,
    GetFinancialEvents,
    GetCompanyFinancialOverview,
    GenerateCashFlowSnapshot,
};
