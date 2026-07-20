import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    Upload,
    Layers,
    Zap,
    Map,
    ChevronLeft,
    ChevronRight,
    FileCode2,
    Database,
    LayoutGrid,
    MonitorPlay,
    FileText,
    Menu,
    X,
    Package,
    Network,
    Gauge,
    Key,
    Sparkles,
    ListChecks,
    LogOut,
    User,
} from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import { hasApiKey } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import { useApiKeySync } from '../hooks/useApiKeySync';
import { useFormSync } from '../hooks/useFormSync';

const mainNavItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/upload', icon: Upload, label: 'Upload XML' },
];

export default function Layout() {
    useApiKeySync(); // Sync API key
    useFormSync();   // Sync Forms & Code
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { currentFile, currentAnalysis, setShowApiKeyModal } = useAnalysisStore();
    const apiKeyConfigured = hasApiKey();
    const { user, logout } = useAuth();

    const isAnalysisRoute = location.pathname.includes('/analysis/');

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    const analysisNavItems = currentFile
        ? [
            {
                to: `/analysis/${currentFile.id}`,
                icon: FileCode2,
                label: 'Overview',
            },
            {
                to: `/analysis/${currentFile.id}/step-by-step`,
                icon: ListChecks,
                label: 'Step by Step',
                highlight: true,
            },
            {
                to: `/analysis/${currentFile.id}/designer`,
                icon: MonitorPlay,
                label: 'Page Designer',
            },
            {
                to: `/analysis/${currentFile.id}/layout`,
                icon: LayoutGrid,
                label: 'UI Layout',
            },
            {
                to: `/analysis/${currentFile.id}/blueprint`,
                icon: FileText,
                label: 'Blueprints',
            },
            {
                to: `/analysis/${currentFile.id}/triggers`,
                icon: Zap,
                label: 'Triggers',
            },
            {
                to: `/analysis/${currentFile.id}/program-units`,
                icon: Package,
                label: 'Program Units',
            },
            {
                to: `/analysis/${currentFile.id}/plb-explorer`,
                icon: Database,
                label: 'Custom PLB Explorer',
                highlight: true,
            },
            {
                to: `/analysis/${currentFile.id}/generated`,
                icon: Sparkles,
                label: 'Generated Code',
                highlight: true,
            },
            {
                to: `/analysis/${currentFile.id}/business-logic`,
                icon: Network,
                label: 'Business Logic',
            },
            {
                to: `/analysis/${currentFile.id}/migration-readiness`,
                icon: Gauge,
                label: 'Migration Ready',
            },
            {
                to: `/analysis/${currentFile.id}/mapping`,
                icon: Map,
                label: 'APEX Mapping',
            },
        ]
        : [];

    const SidebarContent = () => (
        <>
            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
                {/* Main Navigation */}
                <div>
                    {!collapsed && (
                        <p className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Main
                        </p>
                    )}
                    <ul className="space-y-1">
                        {mainNavItems.map((item) => (
                            <li key={item.to}>
                                <Link
                                    to={item.to}
                                    className={`sidebar-item ${location.pathname === item.to ? 'sidebar-item-active' : ''
                                        } ${collapsed ? 'justify-center' : ''}`}
                                    title={collapsed ? item.label : undefined}
                                >
                                    <item.icon className="w-5 h-5 flex-shrink-0" />
                                    {!collapsed && <span>{item.label}</span>}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Analysis Navigation (shown when file is selected) */}
                {isAnalysisRoute && currentFile && (
                    <div>
                        {!collapsed && (
                            <p className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Analysis
                            </p>
                        )}
                        <ul className="space-y-1">
                            {analysisNavItems.map((item) => (
                                <li key={item.to}>
                                    <Link
                                        to={item.to}
                                        className={`sidebar-item ${location.pathname === item.to ? 'sidebar-item-active' : ''
                                            } ${collapsed ? 'justify-center' : ''}`}
                                        title={collapsed ? item.label : undefined}
                                    >
                                        <item.icon className="w-5 h-5 flex-shrink-0" />
                                        {!collapsed && <span>{item.label}</span>}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Blocks List (shown when analysis is available) */}
                {isAnalysisRoute && currentAnalysis && currentAnalysis.blocks.length > 0 && (
                    <div>
                        {!collapsed && (
                            <p className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Blocks ({currentAnalysis.blocks.length})
                            </p>
                        )}
                        <ul className="space-y-1 max-h-64 overflow-y-auto">
                            {currentAnalysis.blocks.slice(0, 15).map((block) => (
                                <li key={block.name}>
                                    <Link
                                        to={`/analysis/${currentFile?.id}/blocks/${block.name}`}
                                        className={`sidebar-item text-xs ${location.pathname.includes(`/blocks/${block.name}`)
                                            ? 'sidebar-item-active'
                                            : ''
                                            } ${collapsed ? 'justify-center' : ''}`}
                                        title={collapsed ? block.name : undefined}
                                    >
                                        <Layers className="w-4 h-4 flex-shrink-0" />
                                        {!collapsed && (
                                            <span className="truncate">{block.name}</span>
                                        )}
                                    </Link>
                                </li>
                            ))}
                            {currentAnalysis.blocks.length > 15 && !collapsed && (
                                <li className="px-3 py-1 text-xs text-slate-400">
                                    +{currentAnalysis.blocks.length - 15} more
                                </li>
                            )}
                        </ul>
                    </div>
                )}
            </nav>

            {/* AI Settings */}
            <div className={`p-3 border-t border-slate-200 ${collapsed ? 'flex justify-center' : ''}`}>
                <button
                    onClick={() => setShowApiKeyModal(true)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
                        ${apiKeyConfigured
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
                        }
                        ${collapsed ? 'justify-center' : ''}
                    `}
                    title={collapsed ? (apiKeyConfigured ? 'AI Ready' : 'Configure API Key') : undefined}
                >
                    {apiKeyConfigured ? (
                        <>
                            <Sparkles className="w-4 h-4" />
                            {!collapsed && <span className="text-sm font-medium">AI Ready</span>}
                        </>
                    ) : (
                        <>
                            <Key className="w-4 h-4" />
                            {!collapsed && <span className="text-sm font-medium">Setup AI Key</span>}
                        </>
                    )}
                </button>
            </div>

            {/* User Profile */}
            <div className={`p-3 border-t border-slate-200 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
                {user && (
                    <div className={`flex ${collapsed ? 'flex-col items-center gap-2' : 'items-center justify-between'}`}>
                        <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
                            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-white" />
                            </div>
                            {!collapsed && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-slate-700 truncate">
                                        {user.email?.split('@')[0]}
                                    </p>
                                    <p className="text-xs text-slate-400 truncate">
                                        {user.email}
                                    </p>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={logout}
                            className={`p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ${collapsed ? '' : 'ml-2'}`}
                            title="Sign out"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Footer */}
            {!collapsed && (
                <div className="p-4 border-t border-slate-200">
                    <p className="text-xs text-slate-400 text-center">
                        Forms to APEX v0.1
                    </p>
                </div>
            )}
        </>
    );

    return (
        <div className="min-h-screen bg-apex-bg flex">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 flex items-center px-4 z-40">
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                >
                    <Menu className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-2 ml-3">
                    <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                        <Database className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-slate-900">Forms2APEX</span>
                </div>
            </div>

            {/* Mobile Sidebar Overlay */}
            {mobileOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside
                className={`md:hidden fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 flex flex-col z-50 transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Mobile Logo */}
                <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                            <Database className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-semibold text-slate-900">Forms2APEX</span>
                    </div>
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <SidebarContent />
            </aside>

            {/* Desktop Sidebar */}
            <aside
                className={`hidden md:flex ${collapsed ? 'w-16' : 'w-64'
                    } bg-white border-r border-slate-200 flex-col transition-all duration-300 ease-in-out`}
            >
                {/* Logo */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
                    {!collapsed && (
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                                <Database className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-semibold text-slate-900">Forms2APEX</span>
                        </div>
                    )}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        {collapsed ? (
                            <ChevronRight className="w-5 h-5" />
                        ) : (
                            <ChevronLeft className="w-5 h-5" />
                        )}
                    </button>
                </div>
                <SidebarContent />
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
                <Outlet />
            </main>
        </div>
    );
}

