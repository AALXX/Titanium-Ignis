import CreateCodebase from '@/features/code-enviroment/components/CreateCodebase'
import FinancialManagementDashboard from '@/features/financial-management/FinancialManagementDashboard'
import InitializeFinanceModule from '@/features/financial-management/InitializeFianceModule'
import { BudgetResponse, ExpensesResponse, InvoicesResponse, ProjectProfitAndLossData } from '@/features/financial-management/types/ResponseTypes'
import { checkAccountStatus } from '@/hooks/useAccountServerSide'
import { IsModuleInitialized } from '@/lib/utils'
import axios from 'axios'
import { Lock } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

const getFinancialConfig = async (ProjectToken: string, accessToken: string | undefined): Promise<{ data: { currency: string; fiscalYearStart: Date }; error: boolean }> => {
    try {
        const response = await axios.get<{ data: { currency: string; fiscalYearStart: Date }; error: boolean }>(`${process.env.NEXT_PUBLIC_FINANCIAL_SERVER}/api/project-config-manager/get-financial-config/${ProjectToken}/${accessToken}`)
        return response.data
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            throw new Error('Access Denied')
        }
        throw error
    }
}

const getProfitAndLoss = async (ProjectToken: string, accessToken: string | undefined): Promise<ProjectProfitAndLossData> => {
    try {
        const response = await axios.get<ProjectProfitAndLossData>(`${process.env.NEXT_PUBLIC_FINANCIAL_SERVER}/api/project-report-manager/profit-loss/${ProjectToken}/${accessToken}`)
        return response.data
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            throw new Error('Access Denied')
        }
        throw error
    }
}

const getBugetsData = async (ProjectToken: string, accessToken: string | undefined): Promise<BudgetResponse> => {
    try {
        const response = await axios.get<BudgetResponse>(`${process.env.NEXT_PUBLIC_FINANCIAL_SERVER}/api/project-buget-manager/get-project-bugets/${ProjectToken}/${accessToken}`)
        return response.data
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            throw new Error('Access Denied')
        }
        throw error
    }
}

const getExpenses = async (ProjectToken: string, accessToken: string | undefined): Promise<ExpensesResponse> => {
    try {
        const response = await axios.get<ExpensesResponse>(`${process.env.NEXT_PUBLIC_FINANCIAL_SERVER}/api/project-expense-manager/get-project-expenses/${ProjectToken}/${accessToken}`)
        return response.data
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            throw new Error('Access Denied')
        }
        throw error
    }
}

const getInvoices = async (ProjectToken: string, accessToken: string | undefined): Promise<InvoicesResponse> => {
    try {
        const response = await axios.get<InvoicesResponse>(`${process.env.NEXT_PUBLIC_FINANCIAL_SERVER}/api/project-invoice-manager/get-project-invoices/${ProjectToken}/${accessToken}`)
        
        return response.data
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            throw new Error('Access Denied')
        }
        throw error
    }
}

const FinancialManagement = async ({ params }: { params: Promise<{ ProjectToken: string }> }) => {
    const { ProjectToken } = await params
    const accountStatus = await checkAccountStatus()

    if (!accountStatus.isLoggedIn) {
        return (
            <div className="flex h-screen items-center justify-center p-4">
                <div className="w-full max-w-md rounded-lg border border-[#4a4a4a] bg-[#3a3a3a] shadow-2xl">
                    <div className="space-y-6 p-8 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#5a5a5a] bg-[#4a4a4a]">
                            <Lock className="h-8 w-8 text-[#e0e0e0]" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-medium text-[#f0f0f0]">Authentication Required</h1>
                            <p className="text-sm leading-relaxed text-[#b0b0b0]">Please sign in to access your messages and start chatting</p>
                        </div>
                    </div>

                    <div className="space-y-6 px-8 pb-8">
                        <Link href="/account/login-register" className="flex w-full items-center justify-center rounded-md border border-[#5a5a5a] bg-[#4a4a4a] px-4 py-3 text-sm font-medium text-[#f0f0f0] transition-all duration-200 hover:border-[#6a6a6a] hover:bg-[#5a5a5a]">
                            Sign In to Continue
                        </Link>

                        <p className="text-center text-xs text-[#888888]">
                            {"Don't have an account? "}
                            <Link href="/account/login-register" className="text-[#b0b0b0] underline underline-offset-2 hover:text-[#d0d0d0]">
                                Sign up here
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    try {
        const profitAndLoss = await getProfitAndLoss(ProjectToken, accountStatus.accessToken)
        const bugets = await getBugetsData(ProjectToken, accountStatus.accessToken)
        const expenses = await getExpenses(ProjectToken, accountStatus.accessToken)
        const invoices = await getInvoices(ProjectToken, accountStatus.accessToken)
        const config = await getFinancialConfig(ProjectToken, accountStatus.accessToken)

        if (!(await IsModuleInitialized(ProjectToken, 'financial', accountStatus.accessToken!))) {
            return (
                <div className="flex h-screen items-center justify-center">
                    <InitializeFinanceModule projectToken={ProjectToken} userSessionToken={accountStatus.accessToken!} />
                </div>
            )
        }

        return (
            <div className="flex h-screen flex-col overflow-y-auto">
                {Object.keys(profitAndLoss.data).length === 0 ? (
                    <div className="flex h-[30rem] w-[60rem] items-center justify-center"></div>
                ) : (
                    <FinancialManagementDashboard bugetData={bugets} profitAndLoss={profitAndLoss} expenses={expenses} projectToken={ProjectToken} userSessionToken={accountStatus.accessToken!} invoices={invoices} currency={config.data.currency} fiscalYearStart={config.data.fiscalYearStart} />
                )}
            </div>
        )
    } catch (error) {
        if (error instanceof Error && error.message === 'Access Denied') {
            return (
                <div className="flex h-screen items-center justify-center">
                    <h1 className="text-white">You do not have access to this page</h1>
                </div>
            )
        } else if (error instanceof Error) {
            console.error('An unexpected error occurred:', error.message)
            return (
                <div className="flex h-screen items-center justify-center">
                    <h1 className="text-white">An error occurred while fetching data</h1>
                </div>
            )
        }

        // notFound()+
    }
}

export default FinancialManagement
