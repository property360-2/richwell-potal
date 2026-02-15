import React from 'react';

const Tabs = ({ tabs, activeTab, onTabChange, className = '' }) => {
    return (
        <div className={`border-b border-gray-100 mb-8 overflow-x-auto ${className}`}>
            <nav className="flex gap-1" aria-label="Tabs">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap border-b-2 ${
                                isActive
                                    ? 'text-blue-600 border-blue-600 bg-blue-50/50 shadow-sm'
                                    : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-50'
                            }`}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default Tabs;
