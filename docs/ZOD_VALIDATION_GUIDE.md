# Zod Validation Guide

This guide explains how to use the Zod schemas for data validation in the NMS Frontend application.

## Overview

All type definitions have been converted to Zod schemas for runtime validation. This provides:
- **Type safety** at compile time (TypeScript)
- **Data validation** at runtime (Zod)
- **Automatic type inference** from schemas
- **Better error messages** for validation failures

## Available Schemas

### Create Types (`src/contexts/create-Types.ts`)

#### `createDeviceSchema`
Validates device creation with constraints:
- `check_interval`: 30-3600 seconds
- `port`: 1-65535 (optional)
- `protocol`: ICMP, SNMP, or GPRS
- `timeout`: 1-30 seconds
- `ip`: Valid IPv4 address format
- SNMP fields with enum validation

#### `createLocationSchema`
Validates location creation:
- `lat`: -90 to 90
- `lng`: -180 to 180
- `area`: max 50 characters
- `location`: max 100 characters
- `project`: max 50 characters

### Read Types (`src/contexts/read-Types.ts`)

#### `readDeviceSchema`
Validates device data from API responses with proper types for all fields.

#### `readLocationSchema`
Validates location data from API responses.

### Update Types (`src/contexts/update-Types.ts`)

#### `updateDeviceSchema`
Validates device update operations.

#### `updateLocationSchema`
Validates location update operations with the same constraints as creation.

## Usage Examples

### 1. Validating Form Input

```typescript
import { createDeviceSchema } from '@/contexts/create-Types';

function handleSubmit(formData: unknown) {
  try {
    // Validate and parse the data
    const validDevice = createDeviceSchema.parse(formData);
    
    // validDevice is now typed and validated
    await api.createDevice(validDevice);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Handle validation errors
      console.error(error.errors);
      // Show user-friendly error messages
      error.errors.forEach(err => {
        console.log(`${err.path.join('.')}: ${err.message}`);
      });
    }
  }
}
```

### 2. Safe Parsing (Non-throwing)

```typescript
import { createLocationSchema } from '@/contexts/create-Types';

function validateLocation(data: unknown) {
  const result = createLocationSchema.safeParse(data);
  
  if (result.success) {
    // Data is valid
    const location = result.data;
    return { success: true, data: location };
  } else {
    // Data is invalid
    return { success: false, errors: result.error.errors };
  }
}
```

### 3. Validating API Responses

```typescript
import { readDeviceSchema } from '@/contexts/read-Types';

async function fetchDevices() {
  const response = await fetch('/api/devices');
  const data = await response.json();
  
  // Validate array of devices
  const devices = readDeviceSchema.array().parse(data);
  return devices;
}
```

### 4. Partial Validation

```typescript
import { updateLocationSchema } from '@/contexts/update-Types';

// Allow partial updates
const partialSchema = updateLocationSchema.partial();

function updateLocation(id: number, updates: unknown) {
  const validUpdates = partialSchema.parse(updates);
  // Only validated fields are sent
  return api.updateLocation(id, validUpdates);
}
```

### 5. Custom Validation Messages

The schemas already include custom error messages. When validation fails:

```typescript
// Example validation error:
{
  path: ['check_interval'],
  message: 'Check interval must be at least 30 seconds'
}

{
  path: ['protocol'],
  message: 'Protocol must be one of: ICMP, SNMP, GPRS'
}
```

### 6. Extending Schemas

You can extend existing schemas for specific use cases:

```typescript
import { createDeviceSchema } from '@/contexts/create-Types';
import { z } from 'zod';

// Add additional fields or refinements
const extendedDeviceSchema = createDeviceSchema.extend({
  custom_field: z.string().optional(),
}).refine(
  (data) => {
    // Custom validation logic
    if (data.protocol === 'SNMP' && !data.snmp_community) {
      return false;
    }
    return true;
  },
  {
    message: 'SNMP protocol requires snmp_community',
    path: ['snmp_community'],
  }
);
```

### 7. Form Integration with React Hook Form

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createDeviceSchema } from '@/contexts/create-Types';

function DeviceForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createDeviceSchema),
  });

  const onSubmit = (data) => {
    // data is automatically validated
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('hostname')} />
      {errors.hostname && <span>{errors.hostname.message}</span>}
      {/* More fields... */}
    </form>
  );
}
```

## Type Inference

All TypeScript types are automatically inferred from the Zod schemas:

```typescript
import type { createDeviceType } from '@/contexts/create-Types';

// This type is equivalent to z.infer<typeof createDeviceSchema>
function createDevice(device: createDeviceType) {
  // TypeScript knows all the fields and their types
}
```

## Best Practices

1. **Always validate external data**: API responses, form inputs, localStorage, etc.
2. **Use `safeParse` in production**: Prevents throwing errors and allows graceful error handling
3. **Provide user-friendly error messages**: Transform Zod errors into messages users understand
4. **Validate early**: Check data at the boundary (API calls, form submissions)
5. **Use partial schemas for updates**: Allow optional fields when updating resources
6. **Keep schemas in sync**: When API changes, update schemas accordingly

## Error Handling Pattern

```typescript
import { z } from 'zod';

function handleZodError(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    const field = err.path.join('.');
    fieldErrors[field] = err.message;
  });
  
  return fieldErrors;
}

// Usage
try {
  createDeviceSchema.parse(data);
} catch (error) {
  if (error instanceof z.ZodError) {
    const errors = handleZodError(error);
    setFormErrors(errors);
  }
}
```

## Testing with Zod

```typescript
import { describe, it, expect } from 'vitest';
import { createDeviceSchema } from '@/contexts/create-Types';

describe('Device Schema Validation', () => {
  it('should validate correct device data', () => {
    const validDevice = {
      hostname: 'device-1',
      ip: '192.168.1.1',
      protocol: 'ICMP',
      check_interval: 60,
      timeout: 5,
      // ... other required fields
    };
    
    expect(() => createDeviceSchema.parse(validDevice)).not.toThrow();
  });
  
  it('should reject invalid IP address', () => {
    const invalidDevice = {
      ip: 'invalid-ip',
      // ... other fields
    };
    
    expect(() => createDeviceSchema.parse(invalidDevice)).toThrow();
  });
});
```

## Schemas Status

- ✅ `createDeviceSchema` - Complete with all validations
- ✅ `createLocationSchema` - Complete with all validations
- ⚠️ `createServiceSchema` - Placeholder (add fields as needed)
- ⚠️ `createWorkerSchema` - Placeholder (add fields as needed)
- ✅ `readDeviceSchema` - Complete
- ✅ `readLocationSchema` - Complete
- ⚠️ `readServiceSchema` - Placeholder (add fields as needed)
- ⚠️ `readWorkerSchema` - Placeholder (add fields as needed)
- ✅ `updateDeviceSchema` - Complete
- ✅ `updateLocationSchema` - Complete
- ⚠️ `updateServiceSchema` - Placeholder (add fields as needed)
- ⚠️ `updateWorkerSchema` - Placeholder (add fields as needed)

## Next Steps

1. Add validation to API calls in `API-Context.tsx` (already implemented for devices)
2. Integrate with form components
3. Add remaining Service and Worker schema fields
4. Consider adding custom refinements for business logic validation
5. Add Zod error translation for internationalization
