import Breadcrumbs from './Breadcrumbs';

const PageHeader = ({ 
    title, 
    subtitle, 
    icon: Icon, 
    iconColor = 'blue',
    actions,
    breadcrumbs,
    children 
}) => {
    const iconColors = {
        blue: 'text-blue-600 bg-blue-100',
        green: 'text-green-600 bg-green-100',
        purple: 'text-purple-600 bg-purple-100',
        orange: 'text-orange-600 bg-orange-100',
        red: 'text-red-600 bg-red-100',
        indigo: 'text-indigo-600 bg-indigo-100',
        gray: 'text-gray-600 bg-gray-100',
    };

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div>
                {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
                <div className="flex items-center gap-3 mb-2">
                    {Icon && (
                        <div className={`p-2 rounded-xl ${iconColors[iconColor] || iconColors.blue}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                    )}
                    <h1 className="text-3xl font-black text-gray-900 tracking-tighter">
                        {title}
                    </h1>
                </div>
                {subtitle && (
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] ml-1">
                        {subtitle}
                    </p>
                )}
            </div>
            <div className="flex gap-4 w-full md:w-auto">
                {actions}
                {children}
            </div>
        </div>
    );
};

export default PageHeader;
