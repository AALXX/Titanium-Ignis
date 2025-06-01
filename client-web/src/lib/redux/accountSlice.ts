// lib/redux/accountSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

interface User {
    name: string
    accountType: string
    image: string
}

interface AccountState {
    user: User | null
    authenticated: boolean
    status: 'idle' | 'loading' | 'succeeded' | 'failed'
    error: string | null
}

// Update the interface to match your actual API response
interface FetchAccountResponse {
    name: string
    authenticated: boolean
    accountType: string
    image: string
}

const initialState: AccountState = {
    user: null,
    authenticated: false,
    status: 'idle',
    error: null
}

export const fetchAccount = createAsyncThunk('account/fetchAccount', async (_, { rejectWithValue }) => {
    try {
        const response = await fetch('/api/account')

        if (!response.ok) {
            throw new Error('Failed to fetch account')
        }

        const data = await response.json()

        if (data.error) {
            
            throw new Error(data.error)
        }

        return data
    } catch (error) {
        console.error('Fetch account error:', error)
        return rejectWithValue(error instanceof Error ? error.message : 'Unknown error')
    }
})

export const accountSlice = createSlice({
    name: 'account',
    initialState,
    reducers: {
        logout: state => {
            state.user = null
            state.authenticated = false
            state.status = 'idle'
            state.error = null
        },
        clearError: state => {
            state.error = null
        }
    },
    extraReducers: builder => {
        builder
            .addCase(fetchAccount.pending, state => {
                state.status = 'loading'
                state.error = null
            })
            .addCase(fetchAccount.fulfilled, (state, action: PayloadAction<FetchAccountResponse>) => {
                state.status = 'succeeded'
                state.user = {
                    name: action.payload.name,
                    accountType: action.payload.accountType,
                    image: action.payload.image
                }
                state.authenticated = action.payload.authenticated
                state.error = null
            })
            .addCase(fetchAccount.rejected, (state, action) => {
                state.status = 'failed'
                state.authenticated = false
                state.user = null
                state.error = action.payload as string
            })
    }
})

export const { logout, clearError } = accountSlice.actions
export default accountSlice.reducer
