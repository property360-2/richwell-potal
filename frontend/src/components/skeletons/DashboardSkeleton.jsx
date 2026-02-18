import React from 'react';
import Skeleton from '../ui/Skeleton';

const DashboardSkeleton = () => {
    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div className="space-y-3">
                    <Skeleton className="h-8 w-64 rounded-2xl" />
                    <Skeleton className="h-4 w-48 rounded-xl" />
                </div>
                <Skeleton className="h-10 w-10 rounded-full" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[1, 2, 3].map(i => (
                    <div key={i} className="p-6 border border-gray-100 rounded-[32px] space-y-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-12 w-16" />
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-64 w-full rounded-[40px]" />
                    <Skeleton className="h-48 w-full rounded-[40px]" />
                </div>
                <div>
                    <Skeleton className="h-[500px] w-full rounded-[40px]" />
                </div>
            </div>
        </div>
    );
};

export default DashboardSkeleton;
