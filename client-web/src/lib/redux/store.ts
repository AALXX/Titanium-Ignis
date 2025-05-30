// store/index.ts
import { accountSlice } from '@/lib/redux/accountSlice'

import { combineSlices, configureStore } from '@reduxjs/toolkit'
import type { Action, ThunkAction } from '@reduxjs/toolkit'

const rootReducer = combineSlices(accountSlice)

export type RootState = ReturnType<typeof rootReducer>

export const makeStore = () => {
    return configureStore({
        reducer: rootReducer,
        middleware: getDefaultMiddleware => getDefaultMiddleware()
    })
}

export type AppStore = ReturnType<typeof makeStore>
export type AppDispatch = AppStore['dispatch']
export type AppThunk<ThunkReturnType = void> = ThunkAction<ThunkReturnType, RootState, unknown, Action>
