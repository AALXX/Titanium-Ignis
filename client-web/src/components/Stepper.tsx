'use client'

import * as React from 'react'
import { Check } from 'lucide-react'

interface StepperProps {
    steps: string[] | { title: string; description?: string }[]
    currentStep: number
}

export const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
    return (
        <div className="w-full">
            <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                    const stepTitle = typeof step === 'string' ? step : step.title
                    const stepDescription = typeof step === 'object' ? step.description : undefined

                    return (
                        <React.Fragment key={stepTitle}>
                            <div className="flex flex-1 flex-col items-center">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${index < currentStep ? 'border-[#ffffff] bg-[#ffffff] text-black' : index === currentStep ? 'border-[#ffffff] bg-[#2a2a2a] text-[#ffffff]' : 'border-[#404040] bg-[#2a2a2a] text-[#666666]'}`}>
                                    {index < currentStep ? <Check className="h-4 w-4" /> : <span className="text-sm">{index + 1}</span>}
                                </div>
                                <div className="mt-2 px-1 text-center">
                                    <span className={`block text-xs leading-tight font-medium ${index <= currentStep ? 'text-white' : 'text-[#888888]'}`}>{stepTitle}</span>
                                    {stepDescription && <span className="mt-0.5 block text-[10px] leading-tight text-gray-500">{stepDescription}</span>}
                                </div>
                            </div>
                            {index < steps.length - 1 && <div className={`mx-1 h-0.5 max-w-16 flex-1 transition-colors ${index < currentStep ? 'bg-[#ffffff]' : 'bg-[#404040]'}`} />}
                        </React.Fragment>
                    )
                })}
            </div>
        </div>
    )
}
