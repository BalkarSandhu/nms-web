import { z } from 'zod';

// Zod Schema for Device Update
export const updateDeviceSchema = z.object({
    data: z.object({
        description: z.string(),
    }),
    field: z.string()
        .max(50, "Field must not exceed 50 characters"),
});

export type updateDeviceType = z.infer<typeof updateDeviceSchema>;

// Zod Schema for Location Update
export const updateLocationSchema = z.object({
    area: z.string()
        .max(50, "Area must not exceed 50 characters"),
    lat: z.number()
        .min(-90, "Latitude must be between -90 and 90")
        .max(90, "Latitude must be between -90 and 90"),
    lng: z.number()
        .min(-180, "Longitude must be between -180 and 180")
        .max(180, "Longitude must be between -180 and 180"),
    location: z.string()
        .max(100, "Location must not exceed 100 characters"),
    location_type_id: z.number()
        .int()
        .positive()
        .optional(),
    project: z.string()
        .max(50, "Project must not exceed 50 characters"),
});

export type updateLocationType = z.infer<typeof updateLocationSchema>;

// Zod Schema for Service Update (placeholder)
export const updateServiceSchema = z.object({
    // Add service update fields here
});

export type updateServiceType = z.infer<typeof updateServiceSchema>;

// Zod Schema for Worker Update (placeholder)
export const updateWorkerSchema = z.object({
    // Add worker update fields here
});

export type updateWorkerType = z.infer<typeof updateWorkerSchema>;
