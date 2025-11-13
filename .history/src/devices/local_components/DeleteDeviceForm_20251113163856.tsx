import React, { useState } from "react";
import { Form, InputField } from "@/components/form-components";
import { Button } from "@/components/ui/button";
import { deleteDevice } from "./delete-device-form";



export const DeleteDeviceForm = () => {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    
   
    const [status, setStatus] = useState<{ message: string; type: "error" | "success" | "info" } | undefined>(undefined);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setStatus({ message: "Submitting...", type: "info" });
        

        try {
            await deleteDevice({ name });
            setStatus({ message: "Device deleteed successfully!", type: "success" });
        } catch (error: any) {
            setStatus({ message: error.message || "Failed to delete Device.", type: "error" });
            return;
        }

        
        setTimeout(() => {
            setOpen(false);
            setTimeout(() => {
                setStatus(undefined);
                setName("");
            }, 500);
        }, 2000);
    };

    return (
        <Form
            title="Are you sure ? This Device Will be Deleted"
            open={open}
            setOpen={setOpen}
            onSubmit={handleSubmit}
            statusMessage={status}
            trigger={<Button variant="outline">Delete Device Type</Button>}
        >
            
            
        </Form>

        
    );
};
