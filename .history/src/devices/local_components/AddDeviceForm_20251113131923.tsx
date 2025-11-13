import React, { useState } from "react";
import { Form, InputField } from "@/components/form-components";
import { Button } from "@/components/ui/button";
import {addDevice,getDeviceTypes} from './add-device-form';
import { getWorkerTypes } from "./add-device-form";


export default function AddDeviceForm() {
  // State for each field
  const [open, setOpen] = useState(false);
  const [protocol, setProtocol] = useState("ICMP");
  const [protocolOpen, setProtocolOpen] = useState(false);
  const [ipAddress, setIpAddress] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [checkInterval, setCheckInterval] = useState("3600");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState(""); // Used for IMEI in GPRS
  const [password, setPassword] = useState(""); // Used for Port in GPRS
  const [area, setArea] = useState("");
  const [device, setDevice] = useState("");
  const [status, setStatus] = useState<{ message: string; type: "error" | "success" | "info" } | undefined>(undefined);

  // SNMP-specific fields
  const [community, setCommunity] = useState("");
  const [snmpVersion, setSnmpVersion] = useState("2");
  const [snmpAuthProtocol, setSnmpAuthProtocol] = useState("MD5");
  const [snmpUsername, setSnmpUsername] = useState("");
  const [snmpPassword, setSnmpPassword] = useState("");
  const [snmpPrivProtocol, setSnmpPrivProtocol] = useState("DES");
  const [snmpPrivPassword, setSnmpPrivPassword] = useState("");

  // Submit handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setStatus({ message: "Submitting...", type: "info" });
      if (protocol||!ipAddress||!deviceType||!checkInterval||!displayName||!area||!device) {
        setStatus({
          message: "Name, Device Type, and Area are required.",
          type: "error",
        });
        return;
      }
  
      const selectedDeviceType = deviceTypeOptions.find((t: any) => t.name === deviceType);
      const deviceTypeId = selectedDeviceType ? selectedDeviceType.id : null;
  
      if (!deviceTypeId) {
        setStatus({
          message: "Invalid device type selected.",
          type: "error",
        });
        return;
      }
  
      const selectedWorker = workerTypeOptions.find((w: any) => w.hostname === workerType);
      const selectedWorkerId = selectedWorker ? selectedWorker.id : "";
  
      try {
        await addDevice({
          area,
          lat: Number(lat),
          lng: Number(lng),
          deviceTypeId: deviceTypeId,
          name,
          parentDevice,
          project,
          statusI,
          statusReason,
          workerId: selectedWorkerId,
        });
        setStatus({ message: "Device added successfully!", type: "success" });
      } catch (error: any) {
        setStatus({
          message: error.message || "Failed to add device.",
          type: "error",
        });
        return;
      }
      setTimeout(() => {
        setOpen(false);
        setTimeout(() => {
          setStatus(undefined);
          setName("");
          setLat("");
          setLng("");
          setDeviceType("");
          setParentDevice("");
          setArea("");
          setProject("");
          setStatusI("");
          setStatusReason("");
          setWorkerType("");
        }, 500);
      }, 2000);
    };

  return (
    <Form
      title="Add : Device"
      open={open}
      setOpen={setOpen}
      onSubmit={handleSubmit}
      statusMessage={status}
      trigger={<Button variant="outline">Add Device</Button>}
    >
      <InputField
        label="Protocol"
        placeholder="Select Protocol"
        type="combobox"
        comboboxOptions={["ICMP", "SNMP", "GPRS"]}
        stateValue={protocol}
        stateAction={setProtocol}
        openState={protocolOpen}
        openStateAction={setProtocolOpen}
      />
      <div className="flex gap-2">
        <InputField
          label="IP Address"
          placeholder="Enter IP Address"
          type="input"
          stateValue={ipAddress}
          stateAction={setIpAddress}
        />
        <InputField
          label="Device Type"
          placeholder="Enter Device Type"
          type="input"
          stateValue={deviceType}
          stateAction={setDeviceType}
        />
        <InputField
          label="Check Interval"
          placeholder="3600"
          type="input"
          stateValue={checkInterval}
          stateAction={setCheckInterval}
        />
      </div>
      <InputField
        label="Display Name"
        placeholder="Enter Display Name"
        type="input"
        stateValue={displayName}
        stateAction={setDisplayName}
      />
      {protocol === "SNMP" && (
        <>
          <div className="flex gap-2">
            <InputField
              label="SNMP Community"
              placeholder="Enter Community"
              type="input"
              stateValue={community}
              stateAction={setCommunity}
            />
            <InputField
              label="SNMP Version"
              placeholder="2"
              type="input"
              stateValue={snmpVersion}
              stateAction={setSnmpVersion}
            />
            <InputField
              label="SNMP Auth Protocol"
              placeholder="MD5"
              type="input"
              stateValue={snmpAuthProtocol}
              stateAction={setSnmpAuthProtocol}
            />
          </div>
          <div className="flex gap-2">
            <InputField
              label="SNMP Username"
              placeholder="Enter SNMP Username"
              type="input"
              stateValue={snmpUsername}
              stateAction={setSnmpUsername}
            />
            <InputField
              label="SNMP Password"
              placeholder="Enter SNMP Password"
              type="password"
              stateValue={snmpPassword}
              stateAction={setSnmpPassword}
            />
          </div>
          <div className="flex gap-2">
            <InputField
              label="SNMP Priv Protocol"
              placeholder="DES"
              type="input"
              stateValue={snmpPrivProtocol}
              stateAction={setSnmpPrivProtocol}
            />
            <InputField
              label="SNMP Priv Password"
              placeholder="Enter Priv Password"
              type="password"
              stateValue={snmpPrivPassword}
              stateAction={setSnmpPrivPassword}
            />
          </div>
        </>
      )}
      {protocol === "GPRS" && (
        <div className="flex gap-2">
          <InputField
            label="IMEI"
            placeholder="Enter Device Username"
            type="input"
            stateValue={username}
            stateAction={setUsername}
          />
          <InputField
            label="Port"
            placeholder="Enter Device Password"
            type="input"
            stateValue={password}
            stateAction={setPassword}
          />
        </div>
      )}
      {protocol !== "SNMP" && protocol !== "GPRS" && (
        <div className="flex gap-2">
          <InputField
            label="Username"
            placeholder="Enter Device Username"
            type="input"
            stateValue={username}
            stateAction={setUsername}
          />
          <InputField
            label="Password"
            placeholder="Enter Device Password"
            type="password"
            stateValue={password}
            stateAction={setPassword}
          />
        </div>
      )}
      <InputField
        label="Area (Worker)"
        placeholder="Enter Area/ Worker for Device"
        type="input"
        stateValue={area}
        stateAction={setArea}
      />
      <InputField
        label="Device"
        placeholder="Enter Device for Device"
        type="input"
        stateValue={device}
        stateAction={setDevice}
      />
    </Form>
  );
}
