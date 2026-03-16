import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../hooks/useAuth';

const ProgramHeadDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const programs = user?.headed_programs || [];

    return (
        <div className="p-8 space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Program Head Dashboard</h1>
                    <p className="text-slate-500">Welcome, {user?.first_name}! Managing {programs.length} program(s).</p>
                </div>
            </div>

            {programs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {programs.map(program => (
                        <Card key={program.id} className="relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none group-hover:bg-blue-500/10 transition-colors"></div>
                            <div className="flex items-start gap-4 mb-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                    <BookOpen size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">{program.code}</h3>
                                    <p className="text-sm text-slate-500 line-clamp-1">{program.name}</p>
                                </div>
                            </div>

                            <div className="space-y-3 mt-6">
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <span className="text-sm text-slate-600 font-medium">Status</span>
                                    <Badge variant="success">Active</Badge>
                                </div>
                                <Button
                                    variant="ghost"
                                    className="w-full justify-between"
                                    icon={<ArrowRight size={16} />}
                                    onClick={() => navigate('/program-head/advising')}
                                >
                                    Pending Advising
                                </Button>
                                <Button
                                    variant="secondary"
                                    className="w-full justify-between"
                                    icon={<ArrowRight size={16} />}
                                    onClick={() => navigate(`/program-head/sections?program_id=${program.id}`)}
                                >
                                    Section Management
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="text-center py-12">
                    <BookOpen className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-800">No Programs Assigned</h3>
                    <p className="text-slate-500 mt-2 max-w-md mx-auto">
                        You are not currently assigned as a Program Head for any academic programs.
                        Please contact the Administrator to update your assignments.
                    </p>
                </Card>
            )}

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Total Programs</div>
                    <div className="text-2xl font-bold text-slate-800">{programs.length}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-blue-200 hover:shadow-md cursor-pointer" onClick={() => navigate('/program-head/advising')}>
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Pending Advising</div>
                    <div className="text-2xl font-bold text-blue-600">--</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-amber-200 hover:shadow-md cursor-pointer" onClick={() => navigate('/program-head/resolutions')}>
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Grade Resolutions</div>
                    <div className="text-2xl font-bold text-amber-600">--</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Active Students</div>
                    <div className="text-2xl font-bold text-slate-800">--</div>
                </div>
            </div>
        </div>
    );
};

export default ProgramHeadDashboard;
