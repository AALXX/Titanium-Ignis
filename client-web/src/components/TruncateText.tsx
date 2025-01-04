import React from 'react'
type InputTextProps = {
    characters: number
    text: string
} & React.HTMLProps<HTMLHeadingElement>

const TruncatedText = (props: InputTextProps) => {
    const { text, characters, ...otherProps } = props


    const truncatedText = text.length > characters ? text.substring(0, characters) + '...' : props.text
    return <h1 {...otherProps}>{truncatedText}</h1>
}

export default TruncatedText
