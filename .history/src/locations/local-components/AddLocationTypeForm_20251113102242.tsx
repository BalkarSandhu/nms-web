import React, { useState } from "react";
import { Form, InputField } from "@/components/form-components";
import { Button } from "@/components/ui/button";
import { addLocationType } from './add-location-type';



export const AddLocationTypeForm = () => {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [locationType, setLocationType] = useState("");
    const [parentLocation, setParentLocation] = useState("");
    const [area, setArea] = useState("");
    
   
    const [status, setStatus] = useState<{ message: string; type: "error" | "success" | "info" } | undefined>(undefined);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setStatus({ message: "Submitting...", type: "info" });
        
        if (!name || !locationType || !area) {
            setStatus({ message: "Name, Location Type, and Area are required.", type: "error" });
            return;
        }

        try {
            await addLocationType({ name });
            setStatus({ message: "Location added successfully!", type: "success" });
        } catch (error: any) {
            setStatus({ message: error.message || "Failed to add location.", type: "error" });
            return;
        }

        // Close modal and reset form after a delay
        setTimeout(() => {
            setOpen(false);
            setTimeout(() => {
                setStatus(undefined);
                setName("");
                setLocationType("");
                setParentLocation("");
                setArea("");
            }, 500);
        }, 2000);
    };

    return (
        <Form
            title="Add : Location Type"
            open={open}
            setOpen={setOpen}
            onSubmit={handleSubmit}
            statusMessage={status}
            trigger={<Button variant="outline">Add Location Type</Button>}
        >
            <InputField
                label="Name"
                placeholder="e.g. Main Office"
                type="input"
                stateValue={name}
                stateAction={setName}
            />
            
        </Form>

        
    );
};
