import React from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"


//-- Lucide Icons
import { Plus, Sheet } from 'lucide-react';

//-- Local Components
import AddDeviceForm from './AddDeviceForm';
import {UpdateDeviceTypeForm} from './UpdateDeviceTypeForm';



export default function Header() {

    return (
        <div className="flex w-full h-9 overflow-auto bg-(--contrast) items-center justify-between">
            <span className="text-(--base) text-[24px] font-semibold">Devices</span>


            <div className="flex gap-2 h-fit w-fit">
                <Popover>
                    <PopoverTrigger className="w-fit h-fit gap-2 px-4 py-1 flex bg-(--green) rounded-[10px] items-center">
                        <Plus className="size-4 text-(--contrast)" />
                        <span className='text-(--contrast) h-fit'>Add</span>
                    </PopoverTrigger>
                    <PopoverContent>
                        <AddDeviceForm />
                    </PopoverContent>
                </Popover>

                <Popover>
                    <PopoverTrigger className="w-fit h-fit py-1 gap-2 px-4 flex bg-(--azul) rounded-[10px] items-center">
                        <Sheet className="size-4 text-(--contrast)" />
                        <span className='text-(--contrast) h-fit'>Export</span>
                    </PopoverTrigger>
                    <PopoverContent>

                    </PopoverContent>
                </Popover>

            </div>



        </div>
    )
}
