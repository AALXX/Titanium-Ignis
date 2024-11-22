import React from 'react'

interface OptionPickerProps {
    label: string
    options: string[]
    value: string
    onChange: (value: string) => void
    className?: string
}

const OptionPicker: React.FC<OptionPickerProps> = ({ className, label, options, value, onChange }) => {
    return (
        <div className="mb-4 flex flex-col items-start ">
            <select value={value} onChange={e => onChange(e.target.value)} className={className}>
                <option value="">Select {label}</option>
                {options.map((option, index) => (
                    <option key={index} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        </div>
    )
}

export default OptionPicker
