import AddDeviceForm from "./local_components/AddDeviceForm";
import { AddDeviceTypeForm } from "./local_components/AddDeviceTypeForm";
import { updateDevice } from "./local_components/updateDevice";
import { UpdateDeviceTypeForm }from "./local_components/UpdateDeviceTypeForm";




export default function DevicesPage() {
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4 w-full h-full bg-(--base)">Devices</h1>
            <AddDeviceForm />
            <AddDeviceTypeForm />
            <UpdateDeviceTypeForm/>
        </div>
    );
}