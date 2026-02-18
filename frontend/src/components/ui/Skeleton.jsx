import React from 'react';

const Skeleton = ({ className, ...props }) => {
    return (
        <div 
            className={`animate-pulse bg-gray-200/80 rounded-xl ${className}`} 
            {...props} 
        />
    );
};

export default Skeleton;
