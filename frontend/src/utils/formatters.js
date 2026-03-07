export const formatDate = (dateString, options = {}) => {
    if (!dateString) return '';
    const date = new Date(dateString);

    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
    };

    return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
};

export const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '';
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    }).format(amount);
};

export const formatUserName = (user) => {
    if (!user) return 'Unknown User';
    const { first_name, last_name, email, username } = user;

    if (first_name && last_name) {
        return `${first_name} ${last_name}`;
    }

    return username || email || 'Unknown User';
};
