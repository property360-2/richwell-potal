import React from 'react';
import { Sun, MoonStar, Clock, CheckCircle2, ChevronRight, Users } from 'lucide-react';
import Badge from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';

/**
 * RegularSessionPicker — Refined Interactive Session Selection
 * 
 * Provides regular students with high-impact hero tiles for selecting 
 * their preferred class session (Morning or Afternoon).
 */
const RegularSessionPicker = ({ selectedSession, sectionsMatrix, isProcessing, onSelectSession, onConfirm }) => {
  const sessions = [
    {
      id: 'AM',
      label: 'Morning Session',
      time: '07:00 AM - 12:00 PM',
      icon: Sun,
      description: 'Ideal for early birds. Primary core subjects are scheduled in the morning block.'
    },
    {
      id: 'PM',
      label: 'Afternoon Session',
      time: '01:00 PM - 06:00 PM',
      icon: MoonStar,
      description: 'Perfect for night owls. Afternoon slots offer flexible laboratory and lecture timings.'
    }
  ];

  return (
    <div className="animate-slide-up">
      <div className="sp-section-header">
        <h3 className="text-slate-800">Assign Preferred Session</h3>
        <p className="text-slate-500">Pick a session block to automatically join sections with matching hours.</p>
      </div>

      <div className="sp-selection-grid">
        {sessions.map(session => {
          const isSelected = selectedSession === session.id;
          const availableCount = sectionsMatrix.filter(s => s.session === session.id && !s.is_full).length;
          const isFull = availableCount === 0;

          return (
            <div
              key={session.id}
              onClick={() => !isFull && onSelectSession(session.id)}
              className={`selection-tile ${isSelected ? 'active' : ''} ${isFull ? 'disabled' : ''}`}
            >
              <div className="sp-card-content">
                <div className="flex justify-between items-start mb-6">
                  <div className={`sp-icon-box ${isSelected ? 'active' : ''}`}>
                    <session.icon
                      size={32}
                      className={session.id === 'AM' ? 'text-amber-500' : 'text-indigo-500'}
                    />
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="text-indigo-500 animate-fade-in" size={24} />
                  )}
                </div>

                <div className="mb-8">
                  <h4 className={`text-2xl font-black mb-1 ${isSelected ? 'text-indigo-600' : 'text-slate-900'}`}>
                    {session.label}
                  </h4>
                  <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                    <Clock size={14} />
                    {session.time}
                  </div>
                </div>

                <p className="text-slate-500 leading-relaxed text-sm mb-8">
                  {session.description}
                </p>

                <div className="flex items-center justify-between border-t border-slate-100 pt-6 mt-auto">
                  {!isFull ? (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Users size={14} />
                      <span className="text-xs font-semibold">{availableCount} Sections Available</span>
                    </div>
                  ) : (
                    <Badge variant="error">SESSION FULL</Badge>
                  )}

                  <Badge variant={isSelected ? 'default' : 'secondary'} className="rounded-full">
                    {isSelected ? 'Selected' : 'Select Block'}
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedSession && (
        <div className="sticky-footer animate-slide-up flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="sp-icon-box" style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.1)', marginBottom: 0 }}>
              <CheckCircle2 size={24} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-0.5">Selection Confirmed</p>
              <h5 className="text-white text-lg font-bold">
                {selectedSession === 'AM' ? 'Morning' : 'Afternoon'} Block
              </h5>
            </div>
          </div>

          <Button
            loading={isProcessing}
            onClick={onConfirm}
            className="sp-btn-premium"
          >
            Confirm & Lock Timetable
            <ChevronRight size={16} className="ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default RegularSessionPicker;
