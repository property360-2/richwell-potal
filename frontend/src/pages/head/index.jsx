import React from 'react';
import { 
    LayoutDashboard, 
    UserCheck,
    Activity,
    BookOpen,
    GraduationCap,
    ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SEO from '../../components/shared/SEO';

const HeadDashboard = () => {
    const { user } = useAuth();
    
    const assignedPrograms = user?.department_head_profile?.program_details || [];

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Head Dashboard" description="Departmental oversight and overview." />
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
                        Dept Head Hub
                        <span className="text-indigo-600/20"><LayoutDashboard className="w-8 h-8" /></span>
                    </h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-[10px]">
                        Academic Oversight & Program Management
                    </p>
                </div>
            </div>

            {/* Work in Progress Banner */}
            <div className="mb-10 p-8 bg-amber-50 border-2 border-dashed border-amber-200 rounded-[40px] flex items-center gap-8 animate-in zoom-in duration-500">
                <div className="w-16 h-16 bg-amber-100 rounded-3xl flex items-center justify-center text-amber-600 shrink-0 shadow-lg shadow-amber-200/20">
                    <Activity className="w-8 h-8" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-amber-900 uppercase tracking-tight leading-none mb-1">Development Phase: Work in Progress</h3>
                    <p className="text-[11px] font-bold text-amber-700 uppercase tracking-widest opacity-80">
                        We're currently refining the departmental dashboard. Some features may be limited or subject to change.
                    </p>
                </div>
            </div>

            {/* Assigned Programs Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase flex items-center gap-2">
                            Assigned Programs
                            <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                        </h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {assignedPrograms.length > 0 ? assignedPrograms.map((program) => (
                            <div key={program.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-xl shadow-indigo-500/5 hover:shadow-indigo-500/10 transition-all group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        <GraduationCap className="w-5 h-5" />
                                    </div>
                                    <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-600 transition-colors" />
                                </div>
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight mb-1">{program.name}</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{program.code}</p>
                            </div>
                        )) : (
                            <div className="col-span-full bg-gray-50 p-10 rounded-[32px] border border-dashed border-gray-200 text-center">
                                <BookOpen className="w-10 h-10 mx-auto mb-4 text-gray-300" />
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No programs assigned to your profile</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Quick Stats</h2>
                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-8 rounded-[40px] text-white shadow-2xl shadow-indigo-200">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Managed Programs</p>
                        <p className="text-4xl font-black tracking-tighter mb-6">{assignedPrograms.length}</p>
                        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                            <div className="w-full h-full bg-white animate-progress" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeadDashboard;
