import React, { useState, useEffect } from "react";
import { Form, InputField } from "@/components/form-components";
import { editDevice } from "./edit-device-form";
import { useRefresh } from "@/contexts/RefreshContext";

export const EditDeviceForm = ({
  deviceId,
  open,
  setOpen,
}: {
  deviceId: number;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { triggerRefresh } = useRefresh();
  const [status, setStatus] = useState<
    { message: string; type: "error" | "success" | "info" } | undefined
  >(undefined);

  // Form fields — mirrors the addDevice payload
  const [display, setDisplay]   = useState("");
  const [ip, setIp]             = useState("");
  const [protocol, setProtocol] = useState("");
  const [hostname, setHostname] = useState("");
  const [checkInterval, setCheckInterval] = useState("");

  // Track what was originally loaded so we can diff
  const [original, setOriginal] = useState<Record<string, string>>({});

  const [protocolOpen, setProtocolOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch current device on open
  useEffect(() => {
    if (!open || !deviceId) return;

    const fetchDevice = async () => {
      setLoading(true);
      try {
        const token = document.cookie
          .split("; ")
          .find((r) => r.startsWith("token="))
          ?.split("=")[1];

        const res = await fetch(
          `${import.meta.env.VITE_NMS_HOST}/devices/${deviceId}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );

        if (!res.ok) throw new Error("Failed to fetch device");
        const data = await res.json();

        const snap = {
          display:       data.display        ?? "",
          ip:            data.ip             ?? "",
          protocol:      data.protocol       ?? "",
          hostname:      data.hostname       ?? "",
          checkInterval: String(data.check_interval ?? data.checkInterval ?? ""),
        };

        // Populate form
        setDisplay(snap.display);
        setIp(snap.ip);
        setProtocol(snap.protocol);
        setHostname(snap.hostname);
        setCheckInterval(snap.checkInterval);

        // Save original for diffing
        setOriginal(snap);
      } catch (err) {
        console.error("Error fetching device:", err);
        setStatus({ message: "Failed to load device details.", type: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchDevice();
  }, [deviceId, open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Build payload from only the fields that actually changed
    const current: Record<string, string> = {
      display,
      ip,
      protocol,
      hostname,
      checkInterval,
    };

    const changed: Record<string, any> = {};
    for (const key of Object.keys(current)) {
      if (current[key] !== original[key] && current[key] !== "") {
        // Map camelCase keys to what the API expects
        const apiKey =
          key === "checkInterval" ? "check_interval" : key;
        changed[apiKey] =
          key === "checkInterval" ? parseInt(current[key], 10) : current[key];
      }
    }

    if (Object.keys(changed).length === 0) {
      setStatus({ message: "No changes detected.", type: "info" });
      return;
    }

    setStatus({ message: "Updating...", type: "info" });

    try {
      await editDevice({ id: deviceId, payload: changed });
      setStatus({ message: "Device updated successfully!", type: "success" });
      triggerRefresh();
      setTimeout(() => {
        setOpen(false);
        setStatus(undefined);
      }, 1500);
    } catch (error: any) {
      setStatus({ message: error.message || "Failed to update device.", type: "error" });
    }
  };

  return (
    <Form
      title="Edit Device"
      open={open}
      setOpen={setOpen}
      onSubmit={handleSubmit}
      statusMessage={status}
      trigger={<></>}
    >
      {loading ? (
        <p className="text-sm text-center py-4" style={{ color: "var(--text-lo)" }}>
          Loading device details…
        </p>
      ) : (
        <>
          <InputField
            label="Display Name"
            placeholder="Enter display name"
            type="input"
            stateValue={display}
            stateAction={setDisplay}
          />
          <div className="flex gap-2">
            <InputField
              label="IP Address"
              placeholder="Enter IP address"
              type="input"
              stateValue={ip}
              stateAction={setIp}
            />
            <InputField
              label="Protocol"
              placeholder="Select protocol"
              type="combobox"
              comboboxOptions={["ICMP", "SNMP", "GPRS"]}
              stateValue={protocol}
              stateAction={setProtocol}
              openState={protocolOpen}
              openStateAction={setProtocolOpen}
            />
          </div>
          <div className="flex gap-2">
            <InputField
              label="Hostname"
              placeholder="Enter hostname"
              type="input"
              stateValue={hostname}
              stateAction={setHostname}
            />
            <InputField
              label="Check Interval (s)"
              placeholder="e.g. 3600"
              type="input"
              stateValue={checkInterval}
              stateAction={setCheckInterval}
            />
          </div>
        </>
      )}
    </Form>
  );
};