import DeviceInfoRow from "./device-info-row";
import { type DeviceInfoRowProps } from "./device-info-row";

import DeviceStatusBar from "./device-status-bar";
import { type DeviceStatusBarProps } from "./device-status-bar";


interface DeviceContentProps {
    deviceData: DeviceInfoRowProps[];
    deviceStatusData: DeviceStatusBarProps[];
}

export default function DeviceContent(content: DeviceContentProps) {



    return (
        <div className="flex flex-col md:flex-row w-full h-full min-w-full gap-2">
            <div className="flex flex-col gap-2 p-2 w-full h-fit max-w-[400px] max-h-[50vh]  overflow-y-scroll border-b-2 border-(--base)/50 pb-2">
                {
                    content.deviceData.map((item, key) => {
                        return <DeviceInfoRow key={key} label={item.label} value={item.value} />
                    })
                }
            </div>
            <div className="flex flex-col gap-2 max-w-[1000px] w-full border-l-2 border-(--dark)/50 p-2">
                {
                    content.deviceStatusData.map((item, key) => {
                        return <DeviceStatusBar key={key} status={item.status} message={item.message} timestamp={item.timestamp} />
                    })
                }
            </div>
        </div>
    );
}