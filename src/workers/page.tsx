import React, {useState} from 'react';

//-- Local Components
import {Form, InputField} from '@/components/form-components';

//-- ShadCN components
import { Button } from '@/components/ui/button';    




export default function WorkersPage() {

      const [open, setOpen] = useState(false);
        const [name, setName] = useState("");
        const [role, setRole] = useState("");
        const [department, setDepartment] = useState("");
        const [email, setEmail] = useState("");
        
        const [roleOpen, setRoleOpen] = useState(false);
        const [departmentOpen, setDepartmentOpen] = useState(false);
        
        const [status, setStatus] = useState<{ message: string; type: "error" | "success" | "info" } | undefined>(undefined);
    
        const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            setStatus({ message: "Submitting...", type: "info" });
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
    
            if (!name || !role || !email) {
                setStatus({ message: "Name, Role, and Email are required.", type: "error" });
                return;
            }
    
            console.log({ name, role, department, email });
            setStatus({ message: "Worker added successfully!", type: "success" });
    
            // Close modal and reset form after a delay
            setTimeout(() => {
                setOpen(false);
                setTimeout(() => {
                    setStatus(undefined);
                    setName("");
                    setRole("");
                    setDepartment("");
                    setEmail("");
                }, 500);
            }, 2000);
        };
    return (
        <div className="p-4 w-full h-full">
            <Form
            title="Add : Worker"
            open={open}
            setOpen={setOpen}
            onSubmit={handleSubmit}
            statusMessage={status}
            trigger={<Button variant="outline">Add Worker</Button>}
        >
            <InputField
                label="Name"
                placeholder="e.g. John Doe"
                type="input"
                stateValue={name}
                stateAction={setName}
            />
            <div className="flex flex-col sm:flex-row gap-4">
                <InputField
                    label="Role"
                    placeholder="Select Role"
                    type="combobox"
                    comboboxOptions={["Technician", "Engineer", "Manager", "Administrator"]}
                    stateValue={role}
                    stateAction={setRole}
                    openState={roleOpen}
                    openStateAction={setRoleOpen}
                />
                <InputField
                    label="Department (Optional)"
                    placeholder="Select Department"
                    type="combobox"
                    comboboxOptions={["IT", "Operations", "Maintenance", "Support"]}
                    stateValue={department}
                    stateAction={setDepartment}
                    openState={departmentOpen}
                    openStateAction={setDepartmentOpen}
                />
            </div>
            <InputField
                label="Email"
                placeholder="e.g. john.doe@example.com"
                type="input"
                stateValue={email}
                stateAction={setEmail}
            />
        </Form>

        </div>
    );
}
