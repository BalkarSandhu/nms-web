import { z } from 'zod';

// Zod Schema for Device Read
export const readDeviceSchema = z.object({
    check_interval: z.number(),
    consecutive_failures: z.number().int().nonnegative(),
    created_at: z.string().datetime(),
    device_type_id: z.number().int().positive(),
    disabled: z.boolean(),
    display: z.string(),
    hostname: z.string(),
    id: z.number().int().positive(),
    imei: z.string(),
    ip: z.string(),
    last_ping: z.string().datetime(),
    last_ping_time_taken: z.number().nonnegative(),
    location_id: z.number().int().positive(),
    port: z.number().int().min(1).max(65535),
    protocol: z.string(),
    snmp_community: z.string(),
    snmp_username: z.string(),
    snmp_version: z.string(),
    status: z.boolean(),
    status_reason: z.string(),
    timeout: z.number(),
    updated_at: z.string().datetime(),
    worker_id: z.string(),
});

export type readDeviceType = z.infer<typeof readDeviceSchema>;

// Zod Schema for Location Read
export const readLocationSchema = z.object({
    area: z.string(),
    id: z.number().int().positive(),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    location: z.string(),
    location_type_id: z.number().int().positive(),
    project: z.string(),
});

export type readLocationType = z.infer<typeof readLocationSchema>;

// Zod Schema for Service Read (placeholder)
export const readServiceSchema = z.object({
    // Add service fields here
});

export type readServiceType = z.infer<typeof readServiceSchema>;

// Zod Schema for Worker Read (placeholder)
export const readWorkerSchema = z.object({
    // Add worker fields here
});

export type readWorkerType = z.infer<typeof readWorkerSchema>;
