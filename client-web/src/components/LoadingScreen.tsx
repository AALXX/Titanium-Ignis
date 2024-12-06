import React from 'react'

export const LoadingScreen = () => {
    return (
        <div className="fixed z-20 flex h-screen w-full bg-[#000000b0]">
            <div className="m-auto h-20 w-20 animate-spin rounded-full border-4 border-t-4 border-solid border-gray-200 border-t-blue-500"></div>
        </div>
    )
}
