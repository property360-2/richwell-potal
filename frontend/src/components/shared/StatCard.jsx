import React from 'react';
import Card from '../ui/Card';

/**
 * StatCard Component
 * Reusable statistics card for dashboards
 * 
 * @param {string} title - The label for the statistic (e.g., 'Total Students')
 * @param {string|number} value - The main statistic value to display
 * @param {ReactNode} icon - A Lucide React icon component element
 * @param {string} colorTheme - The CSS color theme applied to the icon background (e.g., 'blue', 'emerald', 'purple', 'rose', 'amber') 
 * @param {string} className - Optional extra CSS classes
 * @param {number} delay - Optional animation delay in ms
 * @param {boolean} loading - Optional loading state
 */
const StatCard = ({ 
  title, 
  value, 
  icon, 
  colorTheme = 'blue',
  className = '',
  delay = 0,
  loading = false
}) => {
  return (
    <Card 
        className={`flex items-center gap-5 p-6 animate-in fade-in slide-in-from-bottom-2 ${className}`} 
        style={{ animationDelay: `${delay}ms` }}
    >
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-${colorTheme}-50 text-${colorTheme}-500/80 shrink-0`}>
            {React.isValidElement(icon) ? icon : (icon ? <icon size={24} /> : null)}
        </div>
        <div className="flex flex-col">
            <span className="text-2xl font-black text-slate-900 leading-none mb-1">
                {loading ? '...' : value}
            </span>
            <span className="text-sm font-semibold text-slate-500">
                {title}
            </span>
        </div>
    </Card>
  );
};

export default StatCard;
