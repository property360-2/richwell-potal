import React from 'react';
import { Construction, Wrench, CalendarDays, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import SEO from '../../components/shared/SEO';
import ProfessorLayout from './ProfessorLayout';

const ProfessorDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <ProfessorLayout>
            <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
                <SEO title="Professor Dashboard" description="Teaching schedule and grade management center." />
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tighter">
                            Welcome back, {user?.first_name || 'Professor'}
                        </h1>
                        <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-[10px]">
                            Instructor Hub
                        </p>
                    </div>
                </div>

                {/* WIP Banner */}
                <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 p-12 relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-50 to-orange-50 rounded-full -mr-32 -mt-32 opacity-60" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-50 to-indigo-50 rounded-full -ml-24 -mb-24 opacity-60" />
                    
                    <div className="relative flex flex-col items-center text-center py-12">
                        <div className="w-24 h-24 bg-amber-50 rounded-[28px] flex items-center justify-center mb-8 shadow-inner border border-amber-100">
                            <Construction className="w-12 h-12 text-amber-500" />
                        </div>
                        
                        <h2 className="text-3xl font-black text-gray-900 tracking-tighter mb-3">
                            Work in Progress
                        </h2>
                        
                        <p className="text-sm text-gray-500 font-medium max-w-md mb-2">
                            The instructor dashboard is currently being built. Analytics, quick actions, and semester summaries will appear here soon.
                        </p>
                        
                        <div className="flex items-center gap-2 mt-2 mb-10">
                            <Wrench className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                                Under Construction
                            </span>
                        </div>

                        {/* Quick Links */}
                        <div className="flex flex-wrap gap-4 justify-center">
                            <Button 
                                variant="secondary" 
                                icon={CalendarDays} 
                                onClick={() => navigate('/professor/schedule')}
                            >
                                View Schedule
                            </Button>
                            <Button 
                                variant="primary" 
                                icon={Award} 
                                onClick={() => navigate('/professor/grades')}
                            >
                                Submit Grades
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </ProfessorLayout>
    );
};

export default ProfessorDashboard;
