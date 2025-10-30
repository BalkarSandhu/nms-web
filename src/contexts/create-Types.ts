

import { z } from 'zod';

// Zod Schema for Device Creation
export const createDeviceSchema = z.object({
    attributes: z.any(), // JSON type - can be refined further based on actual structure
    check_interval: z.number()
        .min(30, "Check interval must be at least 30 seconds")
        .max(3600, "Check interval must not exceed 3600 seconds (1 hour)"),
    device_type_id: z.number().int().positive(),
    display: z.string().min(1, "Display name is required"),
    hostname: z.string().min(1, "Hostname is required"),
    imei: z.string(),
    ip: z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, "Invalid IP address format"),
    location_id: z.number().int().positive(),
    port: z.number()
        .int()
        .min(1, "Port must be at least 1")
        .max(65535, "Port must not exceed 65535")
        .optional(),
    protocol: z.enum(['ICMP', 'SNMP', 'GPRS'], {
        message: "Protocol must be one of: ICMP, SNMP, GPRS"
    }),
    snmp_auth_protocol: z.enum(['MD5', 'SHA'], {
        message: "SNMP auth protocol must be MD5 or SHA"
    }).optional(),
    snmp_community: z.string().optional(),
    snmp_password: z.string().optional(),
    snmp_priv_password: z.string().optional(),
    snmp_priv_protocol: z.enum(['DES', 'AES'], {
        message: "SNMP privacy protocol must be DES or AES"
    }).optional(),
    snmp_username: z.string().optional(),
    snmp_version: z.enum(['1', '2c', '3'], {
        message: "SNMP version must be 1, 2c, or 3"
    }).optional(),
    timeout: z.number()
        .int()
        .min(1, "Timeout must be at least 1 second")
        .max(30, "Timeout must not exceed 30 seconds"),
    worker_id: z.string().min(1, "Worker ID is required"),
});

// Infer TypeScript type from Zod schema
export type createDeviceType = z.infer<typeof createDeviceSchema>;

// Zod Schema for Location Creation
export const createLocationSchema = z.object({
    area: z.string()
        .max(50, "Area must not exceed 50 characters"),
    lat: z.number()
        .min(-90, "Latitude must be between -90 and 90")
        .max(90, "Latitude must be between -90 and 90"),
    lng: z.number()
        .min(-180, "Longitude must be between -180 and 180")
        .max(180, "Longitude must be between -180 and 180"),
    location: z.string()
        .max(100, "Location must not exceed 100 characters")
        .min(1, "Location is required"),
    location_type_id: z.number()
        .int()
        .positive("Must reference a valid LocationType"),
    project: z.string()
        .max(50, "Project must not exceed 50 characters"),
});

// Infer TypeScript type from Zod schema
export type createLocationType = z.infer<typeof createLocationSchema>;

// Zod Schema for Service Creation (placeholder - add fields as needed)
export const createServiceSchema = z.object({
    // Add service fields here
});

export type createServiceType = z.infer<typeof createServiceSchema>;

// Zod Schema for Worker Creation (placeholder - add fields as needed)
export const createWorkerSchema = z.object({
    // Add worker fields here
});

export type createWorkerType = z.infer<typeof createWorkerSchema>;