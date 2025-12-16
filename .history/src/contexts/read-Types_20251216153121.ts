import { z } from 'zod';

// Zod Schema for Device Type (nested in device response)
export const readDeviceTypeSchema = z.object({
    id: z.number().int().positive(),
    name: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
});

// Zod Schema for Location (nested in device response)
export const readDeviceLocationSchema = z.object({
    id: z.number().int().positive(),
    name: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    status: z.string(),
    status_reason: z.string(),
    location_type_id: z.number().int().positive(),
    project: z.string(),
    area: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
});

// Zod Schema for Worker (nested in device response)
export const readDeviceWorkerSchema = z.object({
    id: z.string(),
    name: z.string(),
    ip_address: z.string(),
    version: z.string(),
    capabilities: z.array(z.string()).nullable(),
    status: z.string(),
    max_devices: z.number().int().nonnegative(),
    metadata: z.record(z.string(), z.any()).nullable(),
    approval_status: z.string(),
    approved_by: z.string(),
    approved_at: z.string(),
    registered_at: z.string(),
    last_seen: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
});

// Zod Schema for Device Read
export const readDeviceSchema = z.object({
    id: z.number().int().positive(),
    ip: z.string(),
    imei: z.string(),
    hostname: z.string(),
    protocol: z.string(),
    port: z.number().int().min(0).max(65535),
    display: z.string(),
    status_reason: z.string(),
    is_reachable:z.boolean(),
    status: z.boolean(),
    has_power:z.boolean(),
    disabled: z.boolean(),
    ignore: z.boolean(),
    last_check: z.string(),
    last_ping_time_taken: z.number(),
    check_interval: z.number(),
    latency_ms:z.number(),
    timeout: z.number(),
    snmp_community: z.string().optional(),
    snmp_version: z.string().optional(),
    snmp_username: z.string().optional(),
    snmp_password: z.string().optional(),
    snmp_auth_protocol: z.string().optional(),
    snmp_priv_protocol: z.string().optional(),
    snmp_priv_password: z.string().optional(),
    consecutive_failures: z.number().int().nonnegative(),
    device_type_id: z.number().int().positive(),
    location_id: z.number().int().positive(),
    worker_id: z.string(),
    attributes: z.record(z.string(), z.any()).nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    device_type: readDeviceTypeSchema,
    location: readDeviceLocationSchema,
    worker: readDeviceWorkerSchema,
});

export type readDeviceType = z.infer<typeof readDeviceSchema>;

// Zod Schema for Device Response metadata
export const readDeviceMetaSchema = z.object({
    current_page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    total_pages: z.number().int().nonnegative(),
    total_records: z.number().int().nonnegative(),
    has_next: z.boolean(),
    has_prev: z.boolean(),
});

// Zod Schema for Device Response (wrapper with devices array and meta)
export const readDeviceResponseSchema = z.object({
    devices: z.array(readDeviceSchema),
    meta: readDeviceMetaSchema,
});

export type readDeviceResponseType = z.infer<typeof readDeviceResponseSchema>;

// Zod Schema for Location Read
export const readLocationSchema = z.object({
    id: z.number().int().positive(),
    name: z.string(),
    lat: z.number(),
    lng: z.number(),
    status: z.string(),
    status_reason: z.string(),
    location_type_id: z.number().int().positive(),
    project: z.string(),
    area: z.string(),
    worker_id: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
});

export type readLocationType = z.infer<typeof readLocationSchema>;

// Zod Schema for Service Read (placeholder)
export const readServiceSchema = z.object({
    // Add service fields here
});

export type readServiceType = z.infer<typeof readServiceSchema>;

// Zod Schema for Worker Response metadata
export const readWorkerMetaSchema = z.object({
    total_count: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    total_pages: z.number().int().nonnegative(),
});

// Zod Schema for Worker Read
export const readWorkerSchema = z.object({
    id: z.string(),
    name: z.string(),
    ip_address: z.string(),
    version: z.string(),
    capabilities: z.array(z.string()).nullable(),
    status: z.string(),
    max_devices: z.number().int().nonnegative(),
    metadata: z.record(z.string(), z.any()).nullable(),
    approval_status: z.string(),
    approved_by: z.string(),
    approved_at: z.string(),
    registered_at: z.string(),
    last_seen: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
});

export type readWorkerType = z.infer<typeof readWorkerSchema>;

// Zod Schema for Worker Response (wrapper with workers array and meta)
export const readWorkerResponseSchema = z.object({
    workers: z.array(readWorkerSchema),
    total_count: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    total_pages: z.number().int().nonnegative(),
});

export type readWorkerResponseType = z.infer<typeof readWorkerResponseSchema>;
