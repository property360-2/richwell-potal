
/**
 * MetricCard.jsx
 * 
 * A premium, glassmorphism-styled card for displaying KPI metrics.
 * Supports progress bars, theme-based accents, and hover effects.
 */

import React from 'react';
import styles from '../SectioningDashboard.module.css';

const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    theme = 'blue', 
    utilization, 
    alert = false 
}) => {
    // Map theme to CSS class
    const themeClass = {
        blue: styles.kpiBlue,
        teal: styles.kpiTeal,
        amber: styles.kpiAmber,
        purple: styles.kpiPurple
    }[theme];

    return (
        <div className={`${styles.kpiCard} ${themeClass} ${alert ? styles.alert : ''}`}>
            <div className={styles.kpiGlow} />
            
            <div className={styles.kpiCardHeader}>
                <span className={styles.kpiTitle}>{title}</span>
                <div className={styles.kpiIconWrapper}>
                    {Icon && <Icon size={20} />}
                </div>
            </div>

            <div className={styles.kpiContent}>
                <div className={styles.kpiValue}>{value}</div>
                <div className={styles.kpiSubtitle}>
                    {subtitle}
                </div>

                {utilization !== undefined && (
                    <div className={styles.kpiUtilBar}>
                        <div 
                            className={`${styles.kpiUtilFill} ${
                                utilization > 90 ? 'bg-error' : 
                                utilization > 75 ? 'bg-warning' : 
                                'bg-primary'
                            }`}
                            style={{ 
                                width: `${Math.min(utilization, 100)}%`,
                                backgroundColor: utilization > 90 ? 'var(--color-error)' : 
                                                utilization > 75 ? 'var(--color-warning)' : 
                                                'var(--color-primary)'
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default MetricCard;
