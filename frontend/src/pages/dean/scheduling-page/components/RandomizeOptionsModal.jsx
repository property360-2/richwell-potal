import React, { useState } from 'react';
import Modal from '../../../../components/ui/Modal';
import Button from '../../../../components/ui/Button';
import { Settings, UserCheck, MapPin } from 'lucide-react';

const RandomizeOptionsModal = ({ isOpen, onClose, onConfirm, isRandomizing }) => {
    const [respectProfessor, setRespectProfessor] = useState(true);
    const [respectRoom, setRespectRoom] = useState(true);

    const handleConfirm = () => {
        onConfirm({ respectProfessor, respectRoom });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Smart Randomization"
            size="md"
            footer={
                <div className="flex gap-3 justify-end w-full">
                    <Button variant="ghost" onClick={onClose} disabled={isRandomizing}>
                        Cancel
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={handleConfirm} 
                        loading={isRandomizing}
                        icon={<Settings size={16} />}
                    >
                        Randomize Schedule
                    </Button>
                </div>
            }
        >
            <div className="space-y-6">
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <p className="text-sm text-blue-800 leading-relaxed font-medium">
                        This tool will automatically assign days and time slots for all subjects in this section. 
                        It ensures that subjects fit within the section's session window without overlapping each other.
                    </p>
                </div>

                <div className="space-y-4">
                    <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest">Randomization Rules</h4>
                    
                    <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-400 cursor-pointer transition-colors group">
                        <div className="pt-0.5">
                            <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                checked={respectProfessor}
                                onChange={(e) => setRespectProfessor(e.target.checked)}
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <UserCheck size={16} className={respectProfessor ? "text-blue-500" : "text-slate-400"} />
                                <span className={`font-bold ${respectProfessor ? "text-slate-800" : "text-slate-500"}`}>
                                    Respect Professor Availability
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">
                                If a professor is already assigned, times will be chosen based on their declared weekly availability grid and will avoid conflicts with their other classes.
                            </p>
                        </div>
                    </label>

                    <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-400 cursor-pointer transition-colors group">
                        <div className="pt-0.5">
                            <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                checked={respectRoom}
                                onChange={(e) => setRespectRoom(e.target.checked)}
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <MapPin size={16} className={respectRoom ? "text-green-500" : "text-slate-400"} />
                                <span className={`font-bold ${respectRoom ? "text-slate-800" : "text-slate-500"}`}>
                                    Respect Room Availability
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">
                                If a facility is already assigned, times will be chosen to avoid conflicts with other sections using the same room.
                            </p>
                        </div>
                    </label>
                </div>
            </div>
        </Modal>
    );
};

export default RandomizeOptionsModal;
