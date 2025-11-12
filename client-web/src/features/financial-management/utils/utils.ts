const formatCurrency = (curency: string) => {
    switch (curency) {
        case 'USD':
            return '$'
        case 'EUR':
            return '€'
        case 'GBP':
            return '£'
        case 'JPY':
            return '¥'
        case 'CAD':
            return '$'
        case 'AUD':
            return '$'
        case 'CHF':
            return 'FR'
        case 'CNY':
            return '¥'
    }
}

export { formatCurrency }