export type DeviceInfoRowProps = {
    label: string;
    value: string | number;
}


export default function DeviceInfoRow({ label, value }: DeviceInfoRowProps) {
    return (
        <div className="flex items-center justify-between bg-(--contrast) p-2 rounded-md border-b-2 border-(--base)/20">
            <span className="text-(--dark) text-[12px] w-full">{label.toUpperCase()}</span>
            <span className="font-medium text-(--dark) text-[12px] w-full border-l-2 \
                            border-(--base)/50 text-end p-auto">{value}</span>
        </div>
    );
}