'use client'

import * as React from 'react'
import { Check } from 'lucide-react'

interface StepperProps {
    steps: string[]
    currentStep: number
}

export const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
    return (
        <div className="mb-8 w-full">
            <div className="flex items-center justify-between">
                {steps.map((step, index) => (
                    <React.Fragment key={step}>
                        <div className="flex flex-col items-center">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${index < currentStep ? 'border-[#ffffff] bg-[#ffffff] text-black' : index === currentStep ? 'border-[#f0f0f0] bg-[#2a2a2a] text-[#ffffff]' : 'border-[#404040] bg-[#2a2a2a] text-[#666666]'}`}>
                                {index < currentStep ? <Check className="h-5 w-5" /> : <span>{index + 1}</span>}
                            </div>
                            <span className={`mt-2 text-xs font-medium ${index <= currentStep ? 'text-white' : 'text-[#888888]'}`}>{step}</span>
                        </div>
                        {index < steps.length - 1 && <div className={`mx-2 h-0.5 flex-1 transition-colors ${index < currentStep ? 'bg-[#ffffff]' : 'bg-[#404040]'}`} />}
                    </React.Fragment>
                ))}
            </div>
        </div>
    )
}
