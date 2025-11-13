import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export default function Header() {
    const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);

    return (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Workers</h1>
                <p className="text-sm text-gray-500 mt-1">Manage worker nodes and their assignments</p>
            </div>
            
            <div className="flex gap-2">
                {/* Add Worker Button */}
                <Popover open={isAddWorkerOpen} onOpenChange={setIsAddWorkerOpen}>
                    <PopoverTrigger asChild>
                        <Button>Add Worker</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[500px]" align="end">
                        <div className="space-y-2">
                            <h3 className="font-semibold text-sm">Add Worker</h3>
                            <p className="text-xs text-gray-500">Add worker functionality coming soon...</p>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Export Button */}
                <Popover open={isExportOpen} onOpenChange={setIsExportOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline">Export</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px]" align="end">
                        <div className="space-y-2">
                            <h3 className="font-semibold text-sm">Export Workers</h3>
                            <p className="text-xs text-gray-500">Export functionality coming soon...</p>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}
