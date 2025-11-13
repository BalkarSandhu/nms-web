import React, { useState } from "react";
import { Form, InputField } from "@/components/form-components";
import { Button } from "@/components/ui/button";


export default function AddDeviceTypeForm() {
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
  const [location, setLocation] = useState("");
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
    setStatus(undefined);
    try {
      const apiUrl = `${import.meta.env.VITE_NMS_HOST}/api/v1/devices`;
      const body = {
        protocol,
        ipAddress,
        deviceType,
        checkInterval,
        displayName,
        area,
        location,
        ...(protocol === "SNMP" ? {
          community,
          snmpVersion,
          snmpAuthProtocol,
          snmpUsername,
          snmpPassword,
          snmpPrivProtocol,
          snmpPrivPassword,
        } : {}),
        ...(protocol === "GPRS" ? {
          imei: username,
          port: password,
        } : {}),
        ...(protocol !== "SNMP" && protocol !== "GPRS" ? {
          username,
          password,
        } : {}),
      };
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setStatus({ message: "Device added successfully!", type: "success" });
        setOpen(false);
      } else {
        setStatus({ message: "Failed to add device.", type: "error" });
      }
    } catch {
      setStatus({ message: "Network error.", type: "error" });
    }
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
        label="Location"
        placeholder="Enter Location for Device"
        type="input"
        stateValue={location}
        stateAction={setLocation}
      />
    </Form>
  );
}
