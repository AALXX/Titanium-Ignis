'use client'
import PopupCanvas from '@/components/PopupCanvas'
import { PlusSquare } from 'lucide-react'
import React, { useState } from 'react'

const List = () => {
    const [addConvPopup, setAddConvPopup] = useState<boolean>(false)

    return (
        <div className="flex w-[24rem] bg-[#0000004d] p-4">
            <div className="flex h-[3rem] w-full flex-row">
                <button className="flex h-[2rem] cursor-pointer" onClick={() => setAddConvPopup(true)}>
                    <PlusSquare className="m-auto text-white" />
                    <h3 className="ml-2 self-center text-white">Add</h3>
                </button>
            </div>

            {addConvPopup && (
                <PopupCanvas closePopup={() => setAddConvPopup(false)}>
                    <div>
                        
                    </div>
                </PopupCanvas>
            )}
        </div>
    )
}

export default List
