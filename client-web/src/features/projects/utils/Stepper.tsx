import { Check } from 'lucide-react'

interface StepperProps {
    steps: string[]
    currentStep: number
}

export const Stepper = ({ steps, currentStep }: StepperProps) => {
    return (
        <div className="mt-4 flex items-center justify-center space-x-4">
            
            {steps.map((step, index) => (
                <div key={step} className="flex items-center">
                    <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            index < currentStep ? 'bg-green-500 text-white' : index === currentStep ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                        }`}
                    >
                        {index < currentStep ? <Check className="h-5 w-5" /> : <span>{index + 1}</span>}
                    </div>
                    {index < steps.length - 1 && <div className={`h-1 w-14 ${index < currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />}
                </div>
            ))}
        </div>
    )
}
