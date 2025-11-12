export interface MetricCardProps {
    title: string
    value: string
    currency?: string
    change?: string
    changeType?: 'positive' | 'negative' | 'neutral'
    icon: React.ComponentType<{ style?: React.CSSProperties }>
    iconColor?: string
}