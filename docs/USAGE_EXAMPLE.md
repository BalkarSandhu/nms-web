# Zod Validation Usage Examples

## How to use the validation schemas

### 1. Parse and validate data (throws error if invalid)
```typescript
import { updateDeviceSchema, updateLocationSchema } from './update-types'

// This will validate and throw an error if invalid
try {
  const validDevice = updateDeviceSchema.parse({
    data: { description: "My device" },
    field: "status"
  })
  // Use validDevice - it's guaranteed to be valid
} catch (error) {
  console.error("Validation failed:", error)
}
```

### 2. Safe parse (returns result object, doesn't throw)
```typescript
const result = updateLocationSchema.safeParse({
  area: "Zone A",
  lat: 45.5,
  lng: -122.6,
  location: "Portland Office",
  project: "Main Project"
})

if (result.success) {
  // result.data contains the valid data
  console.log("Valid location:", result.data)
} else {
  // result.error contains validation errors
  console.error("Validation errors:", result.error.errors)
}
```

### 3. Partial validation (all fields optional)
```typescript
const partialSchema = updateLocationSchema.partial()

// Now all fields are optional
const result = partialSchema.safeParse({
  lat: 45.5,
  lng: -122.6
  // other fields are optional
})
```

### 4. Form validation with error messages
```typescript
const validateLocationForm = (formData: unknown) => {
  const result = updateLocationSchema.safeParse(formData)
  
  if (!result.success) {
    // Get user-friendly error messages
    const errors = result.error.flatten()
    return {
      success: false,
      errors: errors.fieldErrors
      // Example: { lat: ["Latitude must be at least -90"], area: ["Area is required"] }
    }
  }
  
  return {
    success: true,
    data: result.data
  }
}
```

### 5. API request validation
```typescript
const updateLocation = async (data: unknown) => {
  // Validate before sending to API
  const validated = updateLocationSchema.parse(data)
  
  const response = await fetch('/api/locations', {
    method: 'POST',
    body: JSON.stringify(validated),
    headers: { 'Content-Type': 'application/json' }
  })
  
  return response.json()
}
```

## Validation Rules Applied

### updateDeviceSchema
- `description`: Must be a string, max 50 characters
- `field`: Must be a string

### updateLocationSchema
- `area`: String, max 50 characters
- `lat`: Number between -90 and 90
- `lng`: Number between -180 and 180
- `location`: String, max 100 characters
- `location_type_id`: Number (optional)
- `project`: String, max 50 characters

## Benefits over plain TypeScript types

1. ✅ **Runtime validation** - Catches errors at runtime, not just compile time
2. ✅ **Automatic type inference** - TypeScript types derived from schemas
3. ✅ **Custom error messages** - User-friendly validation messages
4. ✅ **Transform data** - Can coerce types, trim strings, etc.
5. ✅ **Composable** - Can combine, extend, and reuse schemas
6. ✅ **Similar to Pydantic** - Same validation approach as Python backend
