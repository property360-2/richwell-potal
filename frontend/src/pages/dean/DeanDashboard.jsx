import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight,
  UserCheck,
  LayoutDashboard
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';

const DeanDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    facultyCount: 0,
    activePrograms: 0,
    pendingSchedules: 0,
    approvedGrades: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Simulated stats for now, real apps would have a /stats endpoint
        const [facultyRes, programsRes] = await Promise.all([
          api.get('faculty/'),
          api.get('academics/programs/')
        ]);
        
        setStats({
          facultyCount: facultyRes.data.count || 0,
          activePrograms: programsRes.data.count || 0,
          pendingSchedules: 4, // Placeholder
          approvedGrades: 128 // Placeholder
        });
      } catch (err) {
        console.error("Failed to fetch Dean stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const quickActions = [
    { title: 'Manage Schedules', icon: <Calendar size={18} />, path: '/dean/scheduling', color: 'bg-blue-50 text-blue-600' },
    { title: 'Faculty Assignment', icon: <UserCheck size={18} />, path: '/dean/faculty', color: 'bg-purple-50 text-purple-600' },
    { title: 'Academic Programs', icon: <BookOpen size={18} />, path: '/academics/programs', color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <LayoutDashboard className="text-indigo-600" />
            Dean Operations Center
          </h1>
          <p className="text-slate-500 mt-1">Welcome back. Here's what's happening in your department today.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="success" className="px-3 py-1">AY 2026-2027</Badge>
          <Badge variant="info" className="px-3 py-1">First Semester</Badge>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Faculty" 
          value={stats.facultyCount} 
          icon={<Users className="text-blue-600" />} 
          trend="+2 this month"
          loading={loading}
        />
        <StatsCard 
          title="Active Programs" 
          value={stats.activePrograms} 
          icon={<BookOpen className="text-emerald-600" />} 
          loading={loading}
        />
        <StatsCard 
          title="Pending Schedules" 
          value={stats.pendingSchedules} 
          icon={<AlertCircle className="text-amber-600" />} 
          trend="Needs Review"
          loading={loading}
        />
        <StatsCard 
          title="Grades Finalized" 
          value={stats.approvedGrades} 
          icon={<CheckCircle className="text-indigo-600" />} 
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          <Card title="Quick Actions">
            <div className="space-y-3">
              {quickActions.map((action, idx) => (
                <button 
                  key={idx}
                  onClick={() => navigate(action.path)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${action.color}`}>
                      {action.icon}
                    </div>
                    <span className="font-semibold text-slate-700">{action.title}</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                </button>
              ))}
            </div>
          </Card>

          <Card title="Department Alerts" icon={<AlertCircle size={18} className="text-amber-500" />}>
             <div className="space-y-4">
                <AlertItem 
                  type="warning" 
                  title="Schedule Conflict" 
                  desc="Section BSCS-1A has overlapping rooms in Lab 2." 
                />
                <AlertItem 
                  type="info" 
                  title="New Faculty Application" 
                  desc="Review credentials for Dr. Sarah Smith." 
                />
             </div>
          </Card>
        </div>

        {/* Main Content Area / Recent Activity */}
        <div className="lg:col-span-2">
          <Card title="Recent Academic Activity">
            <div className="divide-y divide-slate-100">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="py-4 flex items-start gap-4 hover:bg-slate-50/50 transition-colors px-2 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <UserCheck size={18} className="text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-800">Faculty Load Approved</p>
                      <span className="text-[10px] uppercase font-bold text-slate-400">2 hours ago</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">Prof. John Doe has been assigned to "Introduction to Computing".</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4 text-indigo-600">View Full Audit Log</Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

const StatsCard = ({ title, value, icon, trend, loading }) => (
  <Card className="relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
      {React.cloneElement(icon, { size: 48 })}
    </div>
    <div className="flex flex-col">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
      {loading ? (
        <div className="h-8 w-24 bg-slate-100 animate-pulse rounded mt-2" />
      ) : (
        <span className="text-3xl font-bold text-slate-900 mt-1">{value}</span>
      )}
      {trend && <span className="text-[10px] font-bold text-indigo-500 mt-2 bg-indigo-50 px-2 py-0.5 rounded-full w-fit">{trend}</span>}
    </div>
  </Card>
);

const AlertItem = ({ type, title, desc }) => (
  <div className={`p-3 rounded-lg border ${type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
    <p className="text-xs font-bold uppercase tracking-tight">{title}</p>
    <p className="text-[11px] mt-0.5 opacity-90">{desc}</p>
  </div>
);

export default DeanDashboard;
