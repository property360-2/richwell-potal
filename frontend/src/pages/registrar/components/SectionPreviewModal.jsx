import React, { useState, useEffect } from 'react';
import { Users, LayoutGrid, Info } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { sectionsApi } from '../../../api/sections';

const SectionPreviewModal = ({ isOpen, onClose, onConfirm, params }) => {
  const [preview, setPreview] = useState(null);
  const [desiredSections, setDesiredSections] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (isOpen && params) {
      fetchPreview();
    }
  }, [isOpen, params, desiredSections]);

  const fetchPreview = async () => {
    try {
      setLoading(true);
      const res = await sectionsApi.previewGeneration({
        ...params,
        desired_sections: desiredSections || undefined
      });
      setPreview(res.data);
    } catch (error) {
      console.error('Preview failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    try {
      setGenerating(true);
      await onConfirm(desiredSections || preview?.num_sections);
      onClose();
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Section Generation Preview"
    >
      <div className="space-y-6">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary p-2 rounded-lg">
                    <Users size={20} />
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Students</p>
                    <p className="text-xl font-bold text-slate-900">{preview?.total_students || 0}</p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Year Level</p>
                <p className="text-sm font-bold text-slate-700">Year {params?.year_level}</p>
            </div>
        </div>

        <div className="space-y-4">
            <Input 
                label="How many sections do you want?"
                type="number"
                placeholder={preview?.num_sections ? `Example: ${preview.num_sections}` : "Enter number..."}
                value={desiredSections}
                onChange={(e) => setDesiredSections(e.target.value)}
                min="1"
            />

            {loading ? (
                <div className="flex justify-center py-4">
                    <LoadingSpinner size="sm" />
                </div>
            ) : preview && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-4 bg-primary-light/5 border border-primary-light/20 rounded-xl">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-primary">Preview Calculation</span>
                            <Info size={14} className="text-primary" />
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="font-bold text-slate-700">{preview.total_students}</span>
                            <span className="text-slate-400">Total</span>
                            <span className="text-slate-400">/</span>
                            <span className="font-bold text-slate-700">{preview.num_sections}</span>
                            <span className="text-slate-400">Sections</span>
                            <span className="mx-1 text-slate-400">=</span>
                            <span className="font-bold text-primary text-base">{preview.students_per_section}</span>
                            <span className="text-[10px] font-black text-primary uppercase mt-1">avg. per section</span>
                        </div>
                        {preview.total_students % preview.num_sections !== 0 && (
                            <p className="text-[10px] text-primary/60 mt-2 italic font-medium">
                                * Note: Student counts may vary slightly across sections (Max {preview.students_per_section}).
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>

        <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 flex gap-3">
            <Info size={16} className="text-amber-600 shrink-0" />
            <p className="text-[10px] font-bold text-amber-700 uppercase leading-relaxed">
                GENERATING SECTIONS WILL AUTOMATICALLY ATTACH ALL CURRICULUM SUBJECTS AS UNASSIGNED SCHEDULE SLOTS.
            </p>
        </div>

        <div className="flex gap-3 justify-end mt-8">
            <Button variant="ghost" onClick={onClose} disabled={generating}>Cancel</Button>
            <Button 
                variant="primary" 
                onClick={handleConfirm} 
                loading={generating}
                disabled={!preview || preview.num_sections === 0}
            >
                Generate Now
            </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SectionPreviewModal;
