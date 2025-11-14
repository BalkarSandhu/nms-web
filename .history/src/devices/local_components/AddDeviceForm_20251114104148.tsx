import React, { useState, useEffect } from "react";
import { Form, InputField } from "@/components/form-components";
import { Button } from "@/components/ui/button";
import { addDevice, getDeviceTypes, getWorkerTypes } from './add-device-form';

export default function AddDeviceForm() {
  const [open, setOpen] = useState(false);
  const [protocol, setProtocol] = useState("ICMP");
  const [protocolOpen, setProtocolOpen] = useState(false);
  const [ipAddress, setIpAddress] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [checkInterval, setCheckInterval] = useState("3600");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [area, setArea] = useState("");
  const [device, setDevice] = useState("");
  const [status, setStatus] = useState<{ message: string; type: "error" | "success" | "info" } | undefined>(undefined);
  const [workerType, setWorkerType] = useState<string>("");
  const [workerTypeOptions, setWorkerTypeOptions] = useState<{ id: string; hostname: string }[]>([]);
  const [deviceTypeOptions, setDeviceTypeOptions] = useState<{ id: number; name: string }[]>([]);
  const [deviceTypeOpen, setDeviceTypeOpen] = useState(false);
  const [workerTypeOpen, setWorkerTypeOpen] = useState(false);
  const [community, setCommunity] = useState("");
  const [snmpVersion, setSnmpVersion] = useState("2");
  const [snmpAuthProtocol, setSnmpAuthProtocol] = useState("MD5");
  const [snmpUsername, setSnmpUsername] = useState("");
  const [snmpPassword, setSnmpPassword] = useState("");
  const [snmpPrivProtocol, setSnmpPrivProtocol] = useState("DES");
  const [snmpPrivPassword, setSnmpPrivPassword] = useState("");

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

  useEffect(() => {
    const fetchWorkersTypes = async () => {
      try {
        const types = await getWorkerTypes();
        setWorkerTypeOptions(types);
        if (types.length > 0 && !workerType) {
          setWorkerType(types[0].hostname);
        }
      } catch (error) {
        console.error("Error fetching workers:", error);
        setWorkerTypeOptions([]);
      }
    };
    fetchWorkersTypes();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus({ message: "Submitting...", type: "info" });
    
    if (!ipAddress || !deviceType) {
      setStatus({
        message: "IP Address and Device Type are required.",
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
    const workerId = selectedWorker ? selectedWorker.id : "";

    if (!workerId) {
      setStatus({
        message: "Invalid worker selected.",
        type: "error",
      });
      return;
    }

    try {
      await addDevice({
        protocol,
        ipAddress,
        deviceTypeId,
        checkInterval: parseInt(checkInterval),
        displayName,
        username,
        password,
        area,
        device,
        workerId,
        community,
        snmpVersion,
        snmpAuthProtocol,
        snmpUsername,
        snmpPassword,
        snmpPrivProtocol,
        snmpPrivPassword,
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
        setProtocol("ICMP");
        setIpAddress("");
        setDeviceType("");
        setCheckInterval("3600");
        setDisplayName("");
        setUsername("");
        setPassword("");
        setArea("");
        setDevice("");
        setCommunity("");
        setSnmpVersion("2");
        setSnmpAuthProtocol("MD5");
        setSnmpUsername("");
        setSnmpPassword("");
        setSnmpPrivProtocol("DES");
        setSnmpPrivPassword("");
        setStatus(undefined);
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
          placeholder="Select Type"
          type="combobox"
          comboboxOptions={deviceTypeOptions.map((t) => t.name)}
          stateValue={deviceType}
          stateAction={setDeviceType}
          openState={deviceTypeOpen}
          openStateAction={setDeviceTypeOpen}
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
        label="Worker"
        placeholder="Select Worker"
        type="combobox"
        comboboxOptions={workerTypeOptions.map((w) => w.hostname)}
        stateValue={workerType}
        stateAction={setWorkerType}
        openState={workerTypeOpen}
        openStateAction={setWorkerTypeOpen}
      />
      <InputField
        label="Location"
        placeholder="Select Location"
        type="combobox"
        comboboxOptions={workerTypeOptions.map((w) => w.hostname)}
        stateValue={locationId}
        stateAction={setLocationId}
        openState={workerTyp}
        openStateAction={setWorkerTypeOpen}
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