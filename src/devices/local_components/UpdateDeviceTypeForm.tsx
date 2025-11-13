import React, { useState, useEffect } from "react";
import { Form, InputField } from "../../components/form-components";
import { Button } from "../../components/ui/button";
import { updateDeviceType } from "./UpdateDeviceType";
import { getDeviceTypes } from "./add-device-form"

export const UpdateDeviceTypeForm = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [deviceTypeOptions, setDeviceTypeOptions] = useState<{ id: number; name: string }[]>([]);
  const [deviceTypeOpen, setDeviceTypeOpen] = useState(false);
  const [deviceType, setDeviceType] = useState<string>("");
  const [status, setStatus] = useState<
    { message: string; type: "error" | "success" | "info" } | undefined
  >(undefined);

  useEffect(() => {
      const fetchDeviceTypes = async () => {
        try {
          const types = await getDeviceTypes();
          setDeviceTypeOptions(types);
          if (types.length > 0 && !deviceType) {
            setDeviceType(types[0].name);
          }
        } catch (error) {
          console.error("Error fetching device types:", error);
          setDeviceTypeOptions([]);
        }
      };
      fetchDeviceTypes();
    }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus({ message: "Submitting...", type: "info" });

    if (!name) {
      setStatus({ message: "Name is required", type: "error" });
      return;
    }

    try {
      await updateDeviceType({ id: deviceType, name });
      setStatus({ message: "Device updated successfully!", type: "success" });
    } catch (error: any) {
      setStatus({ message: error.message || "Failed to update Device.", type: "error" });
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
      title="Update : Device Type"
      open={open}
      setOpen={setOpen}
      onSubmit={handleSubmit}
      statusMessage={status}
      trigger={<Button variant="outline">Update Device Type</Button>}
    >
      <InputField
        label="Device Type"
        placeholder="Select Type"
        type="combobox"
        comboboxOptions={deviceTypeOptions.map((t) => t.name)}
        stateValue={deviceType}
        stateAction={setDeviceType}
        openState={deviceTypeOpen}
        openStateAction={setDeviceTypeOpen}
      />

    
      <InputField
        label="Name"
        placeholder="e.g. Camera"
        type="input"
        stateValue={name}
        stateAction={setName}
      />
    </Form>
  );
};
