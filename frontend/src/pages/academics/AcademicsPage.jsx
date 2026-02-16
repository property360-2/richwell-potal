import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
    GraduationCap, 
    Users, 
    BookOpen, 
    Layers, 
    Building2,
    Calendar
} from 'lucide-react';
import SEO from '../../components/shared/SEO';

// Tabs
import FacultyTab from './tabs/FacultyTab';
import ProgramsTab from './tabs/ProgramsTab';
import SubjectsTab from './tabs/SubjectsTab';
import SectionsTab from './tabs/SectionsTab';
import FacilitiesTab from './tabs/FacilitiesTab';
import SchedulesTab from './tabs/SchedulesTab';

const AcademicsPage = () => {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'faculty');

    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);
        }
    }, [location.state]);

    const TABS = [
        { id: 'faculty', label: 'Faculty', icon: Users, component: FacultyTab },
        { id: 'programs', label: 'Programs', icon: BookOpen, component: ProgramsTab },
        { id: 'subjects', label: 'Subjects', icon: BookOpen, component: SubjectsTab },
        { id: 'sections', label: 'Sections', icon: Layers, component: SectionsTab },
        { id: 'facilities', label: 'Facilities', icon: Building2, component: FacilitiesTab },
        { id: 'schedules', label: 'Schedules', icon: Calendar, component: SchedulesTab },
    ];

    const ActiveComponent = TABS.find(t => t.id === activeTab)?.component || FacultyTab;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            <SEO title="Academics Management" description="Centralized academic resource planning and management." />
            
            {/* Header */}
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                        <GraduationCap className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Academic Affairs</h1>
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">Resource & Curriculum Planning</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-1 bg-gray-100/50 p-1.5 rounded-2xl mb-8 overflow-x-auto">
                {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap
                                ${isActive 
                                    ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-100 ring-1 ring-black/5' 
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                                }
                            `}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-indigo-500/5 p-8 min-h-[400px]">
                <ActiveComponent />
            </div>
        </div>
    );
};

export default AcademicsPage;
