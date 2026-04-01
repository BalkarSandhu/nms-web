import { Sheet, ArrowLeft, FileDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type HeaderProps = {
    onExport?: () => void;
    exportDisabled?: boolean;
    deviceName?: string;
}

export default function Header({ onExport, exportDisabled, deviceName }: HeaderProps) {
    const navigate = useNavigate();

    return (
        <header className="w-full h-16 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border-b border-gray-800/50 backdrop-blur-md sticky top-0 z-10">
            <div className="h-full px-6 flex items-center justify-between gap-4">
                
                {/* Left Section - Navigation & Title */}
                <div className="flex items-center gap-4 min-w-0">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className={`
                            flex-shrink-0 p-2 rounded-lg
                            border border-gray-700/50 bg-gray-900/50 hover:bg-gray-800/70
                            text-gray-400 hover:text-gray-200
                            transition-all duration-200 
                            hover:border-gray-600/80 hover:shadow-lg hover:shadow-black/20
                        `}
                        aria-label="Go back"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="flex flex-col min-w-0">
                        <h1 className="text-base font-semibold text-gray-100 truncate">
                            Device Information
                        </h1>
                        {deviceName && (
                            <p className="text-xs text-gray-500 truncate">
                                {deviceName}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right Section - Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onExport}
                        disabled={exportDisabled}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg
                            font-medium text-sm
                            border border-transparent
                            transition-all duration-200
                            ${exportDisabled
                                ? 'bg-gray-800/30 text-gray-600 cursor-not-allowed'
                                : `
                                    bg-gradient-to-r from-blue-600 to-blue-700
                                    text-white hover:from-blue-500 hover:to-blue-600
                                    hover:shadow-lg hover:shadow-blue-500/25
                                    active:from-blue-700 active:to-blue-800
                                    border border-blue-500/30 hover:border-blue-400/50
                                `
                            }
                        `}
                    >
                        <FileDown className="w-4 h-4" />
                        <span>Export</span>
                    </button>
                </div>
            </div>
        </header>
    );
}