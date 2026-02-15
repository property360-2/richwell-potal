import React from 'react';
import { CreditCard, Wallet, CalendarRange, School } from 'lucide-react';

const PaymentStep = ({ data, onChange }) => {
    const totalPayment = data.monthly_commitment * 6;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                    <Wallet className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Payment Commitment</h3>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Plan your semester budget</p>
                </div>
            </div>

            <div className="bg-gray-900 rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl shadow-blue-200">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-3xl -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-600/20 blur-3xl -ml-16 -mb-16"></div>
                
                <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300 mb-2">Monthly Commitment</p>
                    <div className="flex items-baseline gap-2 mb-8">
                        <span className="text-4xl font-black">₱</span>
                        <input 
                            type="number"
                            value={data.monthly_commitment}
                            onChange={(e) => onChange('monthly_commitment', parseFloat(e.target.value) || 0)}
                            className="bg-transparent text-5xl font-black focus:outline-none w-full border-b-2 border-blue-500/30 focus:border-blue-400 transition-colors py-2"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-1">Total Semester</p>
                            <p className="text-2xl font-black">₱{totalPayment.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-1">Duration</p>
                            <p className="text-2xl font-black">6 Months</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[1, 2, 3, 4, 5, 6].map(m => (
                    <div key={m} className="bg-gray-50 border border-gray-100 p-3 rounded-2xl text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">M{m}</p>
                        <p className="text-xs font-black text-gray-900">₱{data.monthly_commitment.toLocaleString()}</p>
                    </div>
                ))}
            </div>

            <div className="pt-8 border-t border-gray-100">
                <label className="flex items-center gap-4 cursor-pointer group">
                    <div className="relative flex items-center">
                        <input 
                            type="checkbox" 
                            id="is_transferee"
                            checked={data.is_transferee}
                            onChange={(e) => onChange('is_transferee', e.target.checked)}
                            className="w-6 h-6 rounded-lg border-2 border-gray-200 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl transition-colors ${data.is_transferee ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                            <School className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-gray-700 group-hover:text-gray-900 transition-colors">I am a transferee from another school</span>
                    </div>
                </label>

                {data.is_transferee && (
                    <div className="mt-8 space-y-6 pl-10 animate-in slide-in-from-left-4 duration-300">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Previous School</label>
                            <input 
                                type="text"
                                value={data.previous_school}
                                onChange={(e) => onChange('previous_school', e.target.value)}
                                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-100 transition-all" 
                                placeholder="Enter school name"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Previous Course</label>
                            <input 
                                type="text"
                                value={data.previous_course}
                                onChange={(e) => onChange('previous_course', e.target.value)}
                                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-100 transition-all" 
                                placeholder="Enter course name"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentStep;
