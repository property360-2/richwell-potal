import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Calendar as CalendarIcon, List as ListIcon, MapPin, Clock } from 'lucide-react';
import { gradesApi } from '../../api/grades';
import './ProfessorSchedule.css';

const DAYS_OF_WEEK = [
  { id: 'M', name: 'Monday' },
  { id: 'T', name: 'Tuesday' },
  { id: 'W', name: 'Wednesday' },
  { id: 'TH', name: 'Thursday' },
  { id: 'F', name: 'Friday' },
  { id: 'S', name: 'Saturday' }
];

const ProfessorSchedule = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await gradesApi.getProfessorSchedule();
      setSchedules(res.data || []);
    } catch (err) {
      console.error('Failed to fetch schedules:', err);
      setError('Failed to load schedule. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  // Process data for Grid View
  const getBlocksForDay = (dayId) => {
    const blocks = [];
    schedules.forEach(sched => {
      if (sched.days && sched.days.includes(dayId)) {
        blocks.push(sched);
      }
    });
    // Sort by start time
    return blocks.sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  // Generate continuous time slots for the grid (e.g., 7 AM to 9 PM)
  const timeSlots = Array.from({ length: 15 }, (_, i) => i + 7); // 7 to 21 (9 PM)

  const renderGridView = () => {
    return (
      <div className="professor-schedule-container">
        <div className="professor-schedule-grid-wrapper">
          {/* Header Row */}
          <div className="professor-schedule-header">
            <div className="professor-schedule-time-col-header">
              Time
            </div>
            {DAYS_OF_WEEK.map(day => (
              <div key={day.id} className="professor-schedule-day-header">
                {day.name}
              </div>
            ))}
          </div>

          {/* Time Slots & Blocks Container */}
          <div className="professor-schedule-body" style={{ height: `${timeSlots.length * 60}px` }}>
            
            {/* Time Labels Column */}
            <div className="professor-schedule-time-col">
              {timeSlots.map((hour, idx) => (
                <div 
                  key={hour} 
                  className="professor-schedule-time-label"
                  style={{ top: `${idx * 60 - 8}px` }}
                >
                  {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                </div>
              ))}
            </div>

            {/* Background Grid Lines Overlay */}
            <div className="professor-schedule-bg-lines">
              {timeSlots.map((hour, idx) => (
                <div 
                  key={`line-${hour}`} 
                  className="professor-schedule-bg-line"
                  style={{ top: `${idx * 60}px` }}
                />
              ))}
            </div>

            {/* Day Columns containing blocks */}
            <div className="professor-schedule-days-container">
              {DAYS_OF_WEEK.map(day => {
                const dayBlocks = getBlocksForDay(day.id);
                return (
                  <div key={day.id} className="professor-schedule-day-col">
                    {dayBlocks.map((block, idx) => {
                      if (!block.start_time || !block.end_time) return null;
                      
                      // Calculate position based on 7 AM start (each hour is 60px)
                      const [startH, startM] = block.start_time.split(':').map(Number);
                      const [endH, endM] = block.end_time.split(':').map(Number);
                      
                      const startOffset = (startH - 7) * 60 + startM;
                      const duration = ((endH - startH) * 60) + (endM - startM);
                      
                      return (
                        <div 
                          key={`${block.id}-${day.id}-${idx}`}
                          className="professor-schedule-block"
                          style={{ 
                            top: `${startOffset}px`, 
                            height: `${duration}px`,
                          }}
                        >
                          <div className="professor-schedule-block-code">
                            {block.subject?.code}
                          </div>
                          <div className="professor-schedule-block-section">
                            {block.section?.name}
                          </div>
                          <div className="professor-schedule-block-room">
                            <MapPin size={10} className="professor-list-room-icon" style={{marginRight:'2px'}} /> <span>{block.room}</span>
                          </div>
                          
                          {/* Tooltip on hover */}
                          <div className="professor-schedule-tooltip">
                            <p style={{fontWeight:'bold', marginBottom:'4px', margin:0}}>{block.subject?.description}</p>
                            <p style={{fontSize:'10px', marginBottom:'8px', opacity:0.9, margin:0}}>{block.subject?.code} • {block.section?.name}</p>
                            <p style={{display:'flex', alignItems:'center', margin:0}}><Clock size={12} style={{marginRight:'4px'}}/> {formatTime(block.start_time)} - {formatTime(block.end_time)}</p>
                            <p style={{display:'flex', alignItems:'center', marginTop:'4px', margin:0}}><MapPin size={12} style={{marginRight:'4px'}}/> {block.room}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    );
  };

  const renderListView = () => {
    return (
      <div className="professor-list-view">
        {DAYS_OF_WEEK.map(day => {
          const dayBlocks = getBlocksForDay(day.id);
          if (dayBlocks.length === 0) return null;

          return (
            <div key={day.id} className="professor-list-day-card">
              <div className="professor-list-day-header">
                <h3 className="professor-list-day-title">{day.name}</h3>
              </div>
              <div className="professor-list-items">
                {dayBlocks.map((block, idx) => (
                  <div key={`${block.id}-${idx}`} className="professor-list-item">
                    
                    {/* Time Block */}
                    <div className="professor-list-time-block">
                      <Clock className="professor-list-time-icon" size={18} />
                      <div>
                        <div className="professor-list-time-text">
                          {formatTime(block.start_time)}
                        </div>
                        <div className="professor-list-time-subtext">
                          to {formatTime(block.end_time)}
                        </div>
                      </div>
                    </div>

                    {/* Details Block */}
                    <div className="professor-list-details-block">
                      <div className="professor-list-details-header">
                        <span className="professor-list-subject-code">
                          {block.subject?.code}
                        </span>
                        <Badge variant="info" size="sm">{block.section?.name}</Badge>
                      </div>
                      <p className="professor-list-subject-desc">
                        {block.subject?.description}
                      </p>
                      <div className="professor-list-room">
                        <MapPin size={16} className="professor-list-room-icon" />
                        {block.room}
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {schedules.length === 0 && (
          <div className="professor-schedule-empty">
            No classes assigned for the current term.
          </div>
        )}
      </div>
    );
  };

  if (loading) return <LoadingSpinner size="lg" style={{ marginTop: '80px' }} />;

  return (
    <div className="page-container">
      <div className="professor-schedule-header-container" style={{marginBottom:'24px'}}>
        <div className="header-title-section">
          <h2>My Schedule</h2>
          <p>Your assigned classes for the current term.</p>
        </div>
        
        {/* View Toggles */}
        <div className="professor-schedule-toggles">
          <button
            onClick={() => setViewMode('grid')}
            className={`professor-schedule-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
          >
            <CalendarIcon size={16} style={{marginRight:'8px'}} /> Grid View
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`professor-schedule-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
          >
            <ListIcon size={16} style={{marginRight:'8px'}} /> List View
          </button>
        </div>
      </div>

      {error ? (
        <Card style={{padding:'24px', textAlign:'center', color:'var(--color-error)'}}>
          {error}
        </Card>
      ) : (
        <div className="mt-6">
          {viewMode === 'grid' ? renderGridView() : renderListView()}
        </div>
      )}
    </div>
  );
};

export default ProfessorSchedule;
