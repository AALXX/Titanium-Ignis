import { fileSlice } from '@/features/code-enviroment/lib/fileTreeSlice'
import type { Action, ThunkAction } from '@reduxjs/toolkit'
import { combineSlices, configureStore } from '@reduxjs/toolkit'

// Combine the fileSlice with any other slices you might have
const rootReducer = combineSlices(fileSlice)

// Infer the `RootState` type from the root reducer
export type RootState = ReturnType<typeof rootReducer>

// `makeStore` encapsulates the store configuration to allow
// creating unique store instances, which is particularly important for
// server-side rendering (SSR) scenarios.
export const makeStore = () => {
    return configureStore({
        reducer: rootReducer,
        // Add any additional middleware here if needed
        middleware: getDefaultMiddleware => getDefaultMiddleware()
    })
}

// Infer the return type of `makeStore`
export type AppStore = ReturnType<typeof makeStore>
// Infer the `AppDispatch` type from the store itself
export type AppDispatch = AppStore['dispatch']
export type AppThunk<ThunkReturnType = void> = ThunkAction<ThunkReturnType, RootState, unknown, Action>
