import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Sheet } from 'lucide-react';

type HeaderProps = {
    onExport?: () => void;
    exportDisabled?: boolean;
}

export default function Header({ onExport, exportDisabled }: HeaderProps) {

    return (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Workers</h1>
                <p className="text-sm text-gray-500 mt-1">Manage worker nodes and their assignments</p>
            </div>
            
            <div className="flex gap-2 h-fit w-fit">
                <Popover>
                    <PopoverTrigger className="w-fit h-fit gap-2 px-4 py-1 flex bg-(--green) rounded-[10px] items-center">
                        <Plus className="size-4 text-(--contrast)" />
                        <span className='text-(--contrast) h-fit'>Add</span>
                    </PopoverTrigger>
                    <PopoverContent className="w-[500px]" align="end">
                        <div className="space-y-2">
                            <h3 className="font-semibold text-sm">Add Worker</h3>
                            <p className="text-xs text-gray-500">Add worker functionality coming soon...</p>
                        </div>
                    </PopoverContent>
                </Popover>

                <button
                    type="button"
                    onClick={onExport}
                    disabled={exportDisabled}
                    className="w-fit h-fit py-1 gap-2 px-4 flex bg-(--azul) rounded-[10px] items-center disabled:opacity-50 disabled:pointer-events-none"
                >
                    <Sheet className="size-4 text-(--contrast)" />
                    <span className='text-(--contrast) h-fit'>Export</span>
                </button>
            </div>
        </div>
    );
}
