import React, { useState } from 'react';
import { ShieldCheck, Info, MapPin, Mail, Phone, Calendar, GraduationCap } from 'lucide-react';

const ReviewStep = ({ data, documents, programs }) => {
    const [agreed, setAgreed] = useState(false);
    const selectedProgram = programs.find(p => p.id === data.program_id);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">Review Your Application</h3>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Verify all details before submitting</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Personal Section */}
                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <UserCircle className="w-4 h-4" /> Personal Details
                    </h4>
                    <div className="space-y-3">
                        <DetailItem label="Full Name" value={`${data.first_name} ${data.last_name}`} />
                        <DetailItem label="Email" value={data.email} icon={Mail} />
                        <DetailItem label="Contact" value={data.contact_number} icon={Phone} />
                        <DetailItem label="Birthdate" value={data.birthdate} icon={Calendar} />
                        <DetailItem label="Address" value={data.address} icon={MapPin} />
                    </div>
                </div>

                {/* Program & Payment */}
                <div className="space-y-4">
                    <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-100">
                        <h4 className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <GraduationCap className="w-4 h-4" /> Selected Program
                        </h4>
                        <p className="text-lg font-black leading-tight">{selectedProgram?.name || 'Not Selected'}</p>
                        <p className="text-sm font-bold opacity-60 mt-1 uppercase tracking-widest">{selectedProgram?.code}</p>
                    </div>

                    <div className="bg-gray-900 rounded-3xl p-6 text-white">
                        <div className="flex justify-between items-center">
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Monthly Payment</h4>
                                <p className="text-2xl font-black text-blue-400">₱{data.monthly_commitment.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Semester Total</h4>
                                <p className="text-lg font-bold">₱{(data.monthly_commitment * 6).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Uploaded Documents ({documents.length})</h4>
                <div className="flex flex-wrap gap-2">
                    {documents.map((doc, i) => (
                        <span key={i} className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 truncate max-w-[150px]">
                            {doc.name}
                        </span>
                    ))}
                    {documents.length === 0 && <p className="text-xs font-bold text-red-400 uppercase">No documents uploaded</p>}
                </div>
            </div>

            <div className="p-6 bg-green-50/50 border-2 border-green-100 rounded-[32px] flex items-start gap-4">
                <div className="p-3 bg-green-600 text-white rounded-2xl shadow-lg">
                    <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h4 className="text-sm font-black text-green-900 uppercase tracking-tight mb-2">Data Privacy & Terms</h4>
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <input 
                            type="checkbox" 
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            className="w-5 h-5 rounded-lg border-2 border-green-200 text-green-600 focus:ring-green-500 transition-all mt-0.5"
                        />
                        <p className="text-xs font-bold text-green-800 leading-relaxed">
                            I confirm that all information provided is accurate and I agree to the enrollment terms and conditions of Richwell Colleges. I understand that my application is subject for review and approval skip.
                        </p>
                    </label>
                </div>
            </div>
        </div>
    );
};

const DetailItem = ({ label, value, icon: Icon }) => (
    <div className="flex items-start gap-3">
        {Icon && <Icon className="w-4 h-4 text-gray-400 mt-0.5" />}
        <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{label}</p>
            <p className="text-sm font-bold text-gray-800 leading-tight">{value || '---'}</p>
        </div>
    </div>
);

const UserCircle = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

export default ReviewStep;
