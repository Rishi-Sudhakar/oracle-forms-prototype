// =====================================================
// APEX Redwood Region Component
// Visual preview of APEX regions with Redwood styling
// =====================================================

import { useState, ReactNode } from 'react';
import { ChevronDown, ChevronUp, MoreHorizontal, Maximize2 } from 'lucide-react';

interface RedwoodRegionProps {
    title: string;
    regionName: string;
    type: 'form' | 'static' | 'cards' | 'display' | 'accordion';
    columns?: number;
    children: ReactNode;
    isCollapsible?: boolean;
    isSelected?: boolean;
    icon?: ReactNode;
    onClick?: () => void;
}

export function RedwoodRegion({
    title,
    regionName,
    type,
    columns = 2,
    children,
    isCollapsible = true,
    isSelected = false,
    icon,
    onClick
}: RedwoodRegionProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const getRegionStyle = () => {
        switch (type) {
            case 'cards':
                return 'bg-gradient-to-br from-gray-50 to-white';
            case 'accordion':
                return 'bg-white border-l-4 border-l-blue-500';
            default:
                return 'bg-white';
        }
    };

    return (
        <div
            className={`
                ${getRegionStyle()}
                border border-gray-200 rounded-lg overflow-hidden shadow-sm
                transition-all duration-200
                ${isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}
                ${onClick ? 'cursor-pointer' : ''}
            `}
            onClick={onClick}
        >
            {/* Region Header */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {isCollapsible && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsCollapsed(!isCollapsed);
                                }}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                            >
                                {isCollapsed ? (
                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                ) : (
                                    <ChevronUp className="w-4 h-4 text-gray-500" />
                                )}
                            </button>
                        )}
                        {icon && <div className="text-gray-500">{icon}</div>}
                        <div>
                            <h3 className="font-semibold text-gray-900">{title}</h3>
                            <p className="text-xs text-gray-500">
                                {type.charAt(0).toUpperCase() + type.slice(1)} Region • {regionName}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                            <Maximize2 className="w-4 h-4 text-gray-400" />
                        </button>
                        <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                            <MoreHorizontal className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Region Content */}
            {!isCollapsed && (
                <div className={`p-4 ${columns === 2 ? 'grid grid-cols-2 gap-4' : columns === 3 ? 'grid grid-cols-3 gap-4' : ''}`}>
                    {children}
                </div>
            )}
        </div>
    );
}

// =====================================================
// Redwood Button Component
// =====================================================

interface RedwoodButtonProps {
    label: string;
    variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
    icon?: ReactNode;
    position?: string;
    onClick?: () => void;
}

export function RedwoodButton({
    label,
    variant = 'secondary',
    icon,
    onClick
}: RedwoodButtonProps) {
    const variants = {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
        secondary: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300',
        tertiary: 'bg-transparent hover:bg-gray-100 text-gray-600 border-transparent',
        danger: 'bg-red-600 hover:bg-red-700 text-white border-red-600'
    };

    return (
        <button
            className={`
                inline-flex items-center gap-2 px-4 py-2
                text-sm font-medium rounded-md border
                transition-all duration-150
                ${variants[variant]}
            `}
            onClick={onClick}
        >
            {icon}
            {label}
        </button>
    );
}

// =====================================================
// Redwood Page Header Component
// =====================================================

interface RedwoodPageHeaderProps {
    title: string;
    subtitle?: string;
    pageNumber: number;
    buttons?: { label: string; variant?: 'primary' | 'secondary' | 'danger'; icon?: ReactNode }[];
}

export function RedwoodPageHeader({
    title,
    subtitle,
    pageNumber,
    buttons = []
}: RedwoodPageHeaderProps) {
    return (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {pageNumber}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {buttons.map((btn, i) => (
                        <RedwoodButton key={i} label={btn.label} variant={btn.variant} icon={btn.icon} />
                    ))}
                </div>
            </div>
        </div>
    );
}

// =====================================================
// Redwood Tab Container
// =====================================================

interface TabItem {
    id: string;
    label: string;
    content: ReactNode;
}

interface RedwoodTabsProps {
    tabs: TabItem[];
    activeTab?: string;
    onTabChange?: (tabId: string) => void;
}

export function RedwoodTabs({ tabs, activeTab, onTabChange }: RedwoodTabsProps) {
    const [active, setActive] = useState(activeTab || tabs[0]?.id);

    const handleTabChange = (tabId: string) => {
        setActive(tabId);
        onTabChange?.(tabId);
    };

    const activeTabContent = tabs.find(t => t.id === active)?.content;

    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-4">
                <div className="flex gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`
                                px-4 py-3 text-sm font-medium border-b-2 transition-colors
                                ${active === tab.id
                                    ? 'border-blue-500 text-blue-600 bg-white -mb-px'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                                }
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="p-4">
                {activeTabContent}
            </div>
        </div>
    );
}
