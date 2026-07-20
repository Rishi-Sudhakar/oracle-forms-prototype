import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: number | string;
    icon: LucideIcon;
    color: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'indigo';
    subtitle?: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
}

const colorClasses = {
    blue: {
        bg: 'bg-blue-50',
        icon: 'bg-blue-100 text-blue-600',
        text: 'text-blue-600',
    },
    emerald: {
        bg: 'bg-emerald-50',
        icon: 'bg-emerald-100 text-emerald-600',
        text: 'text-emerald-600',
    },
    amber: {
        bg: 'bg-amber-50',
        icon: 'bg-amber-100 text-amber-600',
        text: 'text-amber-600',
    },
    rose: {
        bg: 'bg-rose-50',
        icon: 'bg-rose-100 text-rose-600',
        text: 'text-rose-600',
    },
    purple: {
        bg: 'bg-purple-50',
        icon: 'bg-purple-100 text-purple-600',
        text: 'text-purple-600',
    },
    indigo: {
        bg: 'bg-indigo-50',
        icon: 'bg-indigo-100 text-indigo-600',
        text: 'text-indigo-600',
    },
};

export default function StatCard({
    title,
    value,
    icon: Icon,
    color,
    subtitle,
}: StatCardProps) {
    const colors = colorClasses[color];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-5"
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
                    {subtitle && (
                        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
                    )}
                </div>
                <div className={`p-3 rounded-xl ${colors.icon}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </motion.div>
    );
}
