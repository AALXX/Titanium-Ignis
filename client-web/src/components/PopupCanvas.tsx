'use client'
import React, { ReactNode } from 'react'

interface IPopupCanvasProps {
    closePopup: () => void
    children: ReactNode
}

const PopupCanvas = (props: IPopupCanvasProps) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden">
            {/* Blurred background */}
            <div className="fixed inset-0 bg-black opacity-50 backdrop-blur-xs backdrop-filter"></div>

            {/* Content container */}
            <div className="relative z-50 mx-auto h-[90vh] w-[95%] max-w-7xl overflow-y-auto rounded-lg bg-linear-to-tr from-[#212121] to-[#757575] shadow-xl sm:w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 2xl:w-1/2">
                <button
                    className="absolute right-2 top-2 rounded-full p-1 cursor-pointer text-white hover:text-gray-300 focus:outline-hidden focus:ring-white focus:ring-opacity-50"
                    onClick={props.closePopup}
                    aria-label="Close"
                >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                <div className="p-4 sm:p-6 md:p-8 flex h-full">{props.children}</div>
            </div>
        </div>
    )
}

export default PopupCanvas
