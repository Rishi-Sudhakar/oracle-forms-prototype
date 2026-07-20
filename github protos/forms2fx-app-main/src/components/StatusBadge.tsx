import { motion } from 'framer-motion';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusBadgeProps {
    variant: BadgeVariant;
    children: React.ReactNode;
    pulse?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
    success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    error: 'bg-rose-100 text-rose-800 border-rose-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function StatusBadge({ variant, children, pulse }: StatusBadgeProps) {
    return (
        <motion.span
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${variantClasses[variant]}`}
        >
            {pulse && (
                <span className="relative flex h-2 w-2">
                    <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${variant === 'success'
                                ? 'bg-emerald-400'
                                : variant === 'warning'
                                    ? 'bg-amber-400'
                                    : variant === 'error'
                                        ? 'bg-rose-400'
                                        : 'bg-blue-400'
                            }`}
                    />
                    <span
                        className={`relative inline-flex rounded-full h-2 w-2 ${variant === 'success'
                                ? 'bg-emerald-500'
                                : variant === 'warning'
                                    ? 'bg-amber-500'
                                    : variant === 'error'
                                        ? 'bg-rose-500'
                                        : 'bg-blue-500'
                            }`}
                    />
                </span>
            )}
            {children}
        </motion.span>
    );
}

// Pre-built badges for common statuses
export function FullySupportedBadge() {
    return <StatusBadge variant="success">Fully Supported</StatusBadge>;
}

export function ManualReviewBadge() {
    return <StatusBadge variant="warning">Manual Review</StatusBadge>;
}

export function UnsupportedBadge() {
    return <StatusBadge variant="error">Unsupported</StatusBadge>;
}

export function ParsingBadge() {
    return <StatusBadge variant="info" pulse>Parsing...</StatusBadge>;
}

export function ParsedBadge() {
    return <StatusBadge variant="success">Parsed</StatusBadge>;
}

export function TriggerTypeBadge({ type }: { type: string }) {
    const variant: BadgeVariant =
        type === 'pre-render' ? 'info' :
            type === 'validation' ? 'warning' :
                type === 'user-action' ? 'success' :
                    type === 'pre-dml' || type === 'post-dml' ? 'neutral' :
                        type === 'error' ? 'error' :
                            'neutral';

    return <StatusBadge variant={variant}>{type}</StatusBadge>;
}
