'use client'
import React, { ReactNode } from 'react'

interface IPopupCanvasProps {
    closePopup: () => void
    children: ReactNode
}

const PopupCanvas = (props: IPopupCanvasProps) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto">
            <div className="fixed inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70 backdrop-blur-md" onClick={props.closePopup}></div>

            <div className="relative z-50 mx-auto h-[90vh] w-[95%] max-w-7xl overflow-hidden rounded-2xl bg-[#2c2c2c] shadow-2xl ring-1 ring-white/10 sm:w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 2xl:w-1/2">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

                <button className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-gray-400 backdrop-blur-sm transition-all duration-200 hover:rotate-90 hover:bg-white/10 hover:text-white focus:ring-2 focus:ring-white/20 focus:outline-none" onClick={props.closePopup} aria-label="Close">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>

                <div className="h-full overflow-y-auto p-4 sm:p-6 md:p-8">
                    <div className="flex h-full">{props.children}</div>
                </div>
            </div>
        </div>
    )
}

export default PopupCanvas
