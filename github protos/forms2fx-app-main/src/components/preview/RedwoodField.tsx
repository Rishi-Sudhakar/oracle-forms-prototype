// =====================================================
// APEX Redwood Form Field Component
// Visual preview of APEX form items with Redwood styling
// =====================================================

import { useState } from 'react';

interface RedwoodFieldProps {
    name: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'display' | 'hidden' | 'popup-lov';
    required?: boolean;
    readOnly?: boolean;
    placeholder?: string;
    value?: string;
    options?: { label: string; value: string }[];
    colSpan?: number;
    isSelected?: boolean;
    onClick?: () => void;
}

export function RedwoodField({
    name,
    label,
    type,
    required = false,
    readOnly = false,
    placeholder,
    value = '',
    options = [],
    colSpan = 1,
    isSelected = false,
    onClick
}: RedwoodFieldProps) {
    const [focused, setFocused] = useState(false);

    if (type === 'hidden') return null;

    const baseInputClass = `
        w-full px-3 py-2 
        bg-white border rounded-md
        text-sm text-gray-900
        transition-all duration-150
        ${readOnly ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'}
        ${focused ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-300'}
    `;

    const renderInput = () => {
        switch (type) {
            case 'textarea':
                return (
                    <textarea
                        className={`${baseInputClass} min-h-[80px] resize-none`}
                        placeholder={placeholder || label}
                        readOnly={readOnly}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        defaultValue={value}
                    />
                );

            case 'select':
            case 'popup-lov':
                return (
                    <div className="relative">
                        <select
                            className={`${baseInputClass} appearance-none pr-10`}
                            disabled={readOnly}
                            onFocus={() => setFocused(true)}
                            onBlur={() => setFocused(false)}
                        >
                            <option value="">-- Select --</option>
                            {options.map((opt, i) => (
                                <option key={i} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                        {type === 'popup-lov' && (
                            <button className="absolute right-8 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </button>
                        )}
                    </div>
                );

            case 'checkbox':
                return (
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            disabled={readOnly}
                        />
                        <span className="text-sm text-gray-700">{label}</span>
                    </label>
                );

            case 'date':
                return (
                    <div className="relative">
                        <input
                            type="text"
                            className={baseInputClass}
                            placeholder="DD-MON-YYYY"
                            readOnly={readOnly}
                            onFocus={() => setFocused(true)}
                            onBlur={() => setFocused(false)}
                            defaultValue={value}
                        />
                        <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </button>
                    </div>
                );

            case 'display':
                return (
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
                        {value || '--'}
                    </div>
                );

            default:
                return (
                    <input
                        type={type === 'number' ? 'number' : 'text'}
                        className={baseInputClass}
                        placeholder={placeholder || label}
                        readOnly={readOnly}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        defaultValue={value}
                    />
                );
        }
    };

    return (
        <div
            className={`
                ${colSpan === 2 ? 'col-span-2' : 'col-span-1'}
                group relative
                ${isSelected ? 'ring-2 ring-blue-500 rounded-lg p-2 -m-2 bg-blue-50/50' : ''}
                ${onClick ? 'cursor-pointer' : ''}
            `}
            onClick={onClick}
        >
            {type !== 'checkbox' && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
            )}
            {renderInput()}
            <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] bg-gray-800 text-white px-1.5 py-0.5 rounded">
                    {name}
                </span>
            </div>
        </div>
    );
}
