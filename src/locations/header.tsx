//-- Lucide Icons
import {  Sheet, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';


type HeaderProps = {
    onExport?: () => void;
    exportDisabled?: boolean;
}

export default function Header({ onExport, exportDisabled }: HeaderProps) {
    const navigate = useNavigate();

    return (
        <div className="flex w-full h-9 overflow-auto bg-(--contrast) items-center justify-between">
           
            <div className="flex w-fit h-fit items-center justify-left gap-2">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="p-1 hover border-2 border-(--base)/50 rounded-full bg-(--contrast) hover:bg-(--dark)/20 transition-colors ease-in-out"
                >
                    <ArrowLeft className="size-4 text-(--base)" />
                </button>
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
