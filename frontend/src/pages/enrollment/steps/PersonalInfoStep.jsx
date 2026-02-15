import React, { useState, useEffect } from 'react';
import { Mail, UserCircle, Calendar, Phone, MapPin, Check, AlertCircle } from 'lucide-react';

const PersonalInfoStep = ({ data, onChange }) => {
    const [emailStatus, setEmailStatus] = useState({ type: 'none', message: '' });
    const [nameStatus, setNameStatus] = useState({ type: 'none', message: '' });

    const checkEmail = async (email) => {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
        
        setEmailStatus({ type: 'loading', message: 'Checking...' });
        try {
            const res = await fetch(`/api/v1/admissions/check-email/?email=${encodeURIComponent(email)}`);
            const json = await res.json();
            if (json.available) {
                setEmailStatus({ type: 'success', message: 'Email is available' });
            } else {
                setEmailStatus({ type: 'error', message: 'Email already registered' });
            }
        } catch (err) {
            setEmailStatus({ type: 'none', message: '' });
        }
    };

    const checkName = async (fName, lName) => {
        if (!fName || !lName) return;
        
        setNameStatus({ type: 'loading', message: 'Checking...' });
        try {
            const res = await fetch(`/api/v1/admissions/check-name/?first_name=${encodeURIComponent(fName)}&last_name=${encodeURIComponent(lName)}`);
            const json = await res.json();
            if (json.available) {
                setNameStatus({ type: 'success', message: 'Name is valid' });
            } else {
                setNameStatus({ type: 'warning', message: json.message || 'Possible duplicate found' });
            }
        } catch (err) {
            setNameStatus({ type: 'none', message: '' });
        }
    };

    const statusIcon = (type) => {
        if (type === 'success') return <Check className="w-4 h-4 text-green-500" />;
        if (type === 'error' || type === 'warning') return <AlertCircle className="w-4 h-4 text-red-500" />;
        return null;
    };

    const statusColor = (type) => {
        if (type === 'success') return 'text-green-600';
        if (type === 'error') return 'text-red-600';
        if (type === 'warning') return 'text-amber-600';
        return 'text-gray-400';
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">First Name</label>
                    <div className="relative group">
                        <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                            type="text" 
                            value={data.first_name}
                            onChange={(e) => onChange('first_name', e.target.value)}
                            onBlur={() => checkName(data.first_name, data.last_name)}
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-100 transition-all" 
                            placeholder="Juan" 
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Last Name</label>
                    <div className="relative group">
                        <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                            type="text" 
                            value={data.last_name}
                            onChange={(e) => onChange('last_name', e.target.value)}
                            onBlur={() => checkName(data.first_name, data.last_name)}
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-100 transition-all" 
                            placeholder="Dela Cruz" 
                        />
                    </div>
                </div>
            </div>

            {nameStatus.message && (
                <div className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-gray-50 border border-gray-100 ${statusColor(nameStatus.type)}`}>
                    {statusIcon(nameStatus.type)}
                    {nameStatus.message}
                </div>
            )}

            <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    <input 
                        type="email" 
                        value={data.email}
                        onChange={(e) => onChange('email', e.target.value)}
                        onBlur={(e) => checkEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-100 transition-all" 
                        placeholder="juan@email.com" 
                    />
                </div>
                {emailStatus.message && (
                    <div className={`flex items-center gap-2 text-xs font-bold mt-1 ml-2 ${statusColor(emailStatus.type)}`}>
                        {statusIcon(emailStatus.type)}
                        {emailStatus.message}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Birthdate</label>
                    <div className="relative group">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                            type="date" 
                            value={data.birthdate}
                            onChange={(e) => onChange('birthdate', e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-gray-900 font-bold focus:outline-none focus:bg-white focus:border-blue-100 transition-all" 
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Contact Number</label>
                    <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                            type="tel" 
                            value={data.contact_number}
                            onChange={(e) => onChange('contact_number', e.target.value.replace(/[^0-9]/g, ''))}
                            maxLength={11}
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-100 transition-all" 
                            placeholder="0917XXXXXXX" 
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Complete Address</label>
                <div className="relative group">
                    <MapPin className="absolute left-4 top-6 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    <textarea 
                        value={data.address}
                        onChange={(e) => onChange('address', e.target.value)}
                        rows="3"
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-100 transition-all" 
                        placeholder="Barangay, City, Province" 
                    />
                </div>
            </div>
        </div>
    );
};

export default PersonalInfoStep;
