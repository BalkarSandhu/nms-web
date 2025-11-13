import AddDeviceForm from "./local_components/AddDeviceForm";
import { AddDeviceTypeForm } from "./local_components/AddDeviceTypeForm";




export default function DevicesPage() {
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4 w-full h-full bg-(--base)">Devices</h1>
            <AddDeviceForm />
            <AddDeviceTypeForm />
        </div>
    );
}