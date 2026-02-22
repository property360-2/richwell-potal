import React, { useState } from 'react';
import { Mail, UserCircle, Calendar, Phone, MapPin, Check, AlertCircle } from 'lucide-react';
import { getProvinces, getCities, getBarangays } from '../../../utils/ph_locations';

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

    const provinces = getProvinces();
    const cities = getCities(data.province);
    const barangays = getBarangays(data.province, data.city);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">
                        First Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                        <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                            type="text" 
                            value={data.first_name}
                            onChange={(e) => onChange('first_name', e.target.value)}
                            onBlur={() => checkName(data.first_name, data.last_name)}
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-100 transition-all" 
                            placeholder="Juan" 
                            required
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">
                        Last Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                        <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                            type="text" 
                            value={data.last_name}
                            onChange={(e) => onChange('last_name', e.target.value)}
                            onBlur={() => checkName(data.first_name, data.last_name)}
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-100 transition-all" 
                            placeholder="Dela Cruz" 
                            required
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
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">
                    Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    <input 
                        type="email" 
                        value={data.email}
                        onChange={(e) => onChange('email', e.target.value)}
                        onBlur={(e) => checkEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-100 transition-all" 
                        placeholder="juan@email.com" 
                        required
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
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">
                        Birthdate <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                            type="date" 
                            value={data.birthdate}
                            onChange={(e) => onChange('birthdate', e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-gray-900 font-bold focus:outline-none focus:bg-white focus:border-blue-100 transition-all" 
                            required
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">
                        Contact Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                            type="tel" 
                            value={data.contact_number}
                            onChange={(e) => onChange('contact_number', e.target.value.replace(/[^0-9]/g, ''))}
                            maxLength={11}
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-100 transition-all" 
                            placeholder="0917XXXXXXX" 
                            required
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">
                        Province <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <select 
                            value={data.province}
                            onChange={(e) => {
                                onChange('province', e.target.value);
                                onChange('city', '');
                                onChange('barangay', '');
                            }}
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-gray-900 font-bold focus:outline-none focus:bg-white focus:border-blue-100 transition-all appearance-none" 
                            required
                        >
                            <option value="">Select Province</option>
                            {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">
                        City/Municipality <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <select 
                            value={data.city}
                            disabled={!data.province}
                            onChange={(e) => {
                                onChange('city', e.target.value);
                                onChange('barangay', '');
                            }}
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-gray-900 font-bold focus:outline-none focus:bg-white focus:border-blue-100 transition-all appearance-none disabled:opacity-50" 
                            required
                        >
                            <option value="">Select City</option>
                            {cities.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">
                        Barangay <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <select 
                            value={data.barangay}
                            disabled={!data.city}
                            onChange={(e) => onChange('barangay', e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-gray-900 font-bold focus:outline-none focus:bg-white focus:border-blue-100 transition-all appearance-none disabled:opacity-50" 
                            required
                        >
                            <option value="">Select Barangay</option>
                            {barangays.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">
                        Street / House No. <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                            type="text" 
                            value={data.street}
                            onChange={(e) => onChange('street', e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-100 transition-all" 
                            placeholder="Unit 123, Street Name" 
                            required
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PersonalInfoStep;
