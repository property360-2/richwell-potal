/**
 * Currency and Date Formatters
 */

/**
 * Format number to Philippine Peso
 */
export const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '₱0.00';
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    }).format(amount);
};

/**
 * Format date to human readable string (e.g., "Jan 1, 2024")
 */
export const formatDate = (dateString) => {
    if (!dateString) return '---';
    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }).format(date);
    } catch (e) {
        return dateString;
    }
};

/**
 * Format date to full string with time
 */
export const formatFullDate = (dateString) => {
    if (!dateString) return '---';
    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    } catch (e) {
        return dateString;
    }
};
