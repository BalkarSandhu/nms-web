//-- Lucide Icons
import {  Sheet } from 'lucide-react';


type HeaderProps = {
    onExport?: () => void;
    exportDisabled?: boolean;
}

export default function Header({ onExport, exportDisabled }: HeaderProps) {

    return (
        <div className="flex w-full h-9 overflow-auto bg-(--contrast) items-center justify-between">
           
            <div>
            <span className="font-semibold text-[24px] text-(--base)">Device Info</span>
            </div>


            <div className="flex gap-2 h-fit w-fit">

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
    )
}
