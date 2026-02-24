import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Construction, 
    ArrowLeft, 
    Users, 
    GraduationCap,
    Sparkles,
    ShieldCheck
} from 'lucide-react';
import SEO from '../../components/shared/SEO';
import Button from '../../components/ui/Button';

const RegistrarDashboard = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4 overflow-hidden relative">
            <SEO title="Registrar Command Center (WIP)" description="Phase 2 of the Registrar module is currently under construction." />
            
            {/* Animated Background Orbs */}
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-400/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-400/10 rounded-full blur-[120px] animate-pulse delay-700" />

            <div className="max-w-2xl w-full text-center relative z-10">
                <div className="relative inline-block mb-12">
                    <div className="absolute inset-0 bg-blue-600 blur-[40px] opacity-20 animate-pulse" />
                    <div className="relative w-32 h-32 bg-white rounded-[40px] shadow-2xl border border-gray-100 flex items-center justify-center mx-auto transform hover:-rotate-6 transition-transform duration-500">
                        <Construction className="w-16 h-16 text-blue-600" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-12">
                        <Sparkles className="w-5 h-5" />
                    </div>
                </div>

                <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tighter mb-6">
                    Command Center <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 uppercase text-lg tracking-[0.3em] font-black">Work in Progress</span>
                </h1>

                <p className="text-gray-500 font-bold text-lg mb-12 max-w-lg mx-auto leading-relaxed">
                    We're refactoring the Registrar dashboard to be more integrated with the <span className="text-gray-900">Academic Affairs</span> engine. Some features are being migrated to the new centralized system.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
                    <FeaturePreview icon={Users} label="Masterlist 2.0" />
                    <FeaturePreview icon={GraduationCap} label="Curriculum Sync" />
                    <FeaturePreview icon={ShieldCheck} label="Audit Authority" />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button 
                        variant="primary" 
                        onClick={() => navigate('/academics')}
                        className="px-10 py-5 rounded-[24px]"
                    >
                        GO TO ACADEMICS
                    </Button>
                    <Button 
                        variant="secondary" 
                        icon={ArrowLeft} 
                        onClick={() => navigate(-1)}
                        className="px-10 py-5 rounded-[24px]"
                    >
                        GO BACK
                    </Button>
                </div>

                <p className="mt-20 text-[10px] font-black text-gray-300 uppercase tracking-widest flex items-center justify-center gap-2">
                    Phase 2 Deployment <ArrowLeft className="w-3 h-3 rotate-180" /> Q1 2026 Core Release
                </p>
            </div>
        </div>
    );
};

const FeaturePreview = ({ icon: Icon, label }) => (
    <div className="bg-white/50 backdrop-blur-sm border border-gray-100 p-6 rounded-[32px] shadow-xl shadow-blue-500/5 hover:bg-white hover:border-blue-100 transition-all group">
        <Icon className="w-6 h-6 text-blue-600 mb-3 mx-auto group-hover:scale-110 transition-transform" />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
    </div>
);

export default RegistrarDashboard;
