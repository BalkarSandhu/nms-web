export type DeviceInfoRowProps = {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    highlight?: boolean;
}

export default function DeviceInfoRow({ label, value, icon, highlight }: DeviceInfoRowProps) {
    return (
        <div className={`
            flex items-center justify-between gap-3 px-4 py-3.5 rounded-lg
            backdrop-blur-sm transition-all duration-300
            border border-gray-700/50 hover:border-gray-600/80
            ${highlight 
                ? 'bg-gradient-to-r from-blue-500/15 to-blue-500/5 hover:from-blue-500/25 hover:to-blue-500/10' 
                : 'bg-gray-900/30 hover:bg-gray-900/50'
            }
            hover:shadow-lg hover:shadow-black/20 group
        `}>
            <div className="flex items-center gap-3 min-w-0">
                {icon && (
                    <div className="flex-shrink-0 text-gray-500 group-hover:text-gray-400 transition-colors">
                        {icon}
                    </div>
                )}
                <span className="text-xs font-semibold tracking-wider text-gray-400 group-hover:text-gray-300 transition-colors uppercase">
                    {label}
                </span>
            </div>
            <span className={`
                font-mono text-sm font-medium text-right truncate
                ${highlight 
                    ? 'text-blue-300 group-hover:text-blue-200' 
                    : 'text-gray-200 group-hover:text-gray-100'
                } transition-colors
            `}>
                {value}
            </span>
        </div>
    );
}