DataTable (common)
===================

This folder contains shared components used across the app.

DataTable
---------

Usage example:

```tsx
import { DataTable } from 'components/common';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'actions', label: 'Actions', render: (row) => <button>Edit</button> },
];

<DataTable columns={columns} data={myData} rowKey="id" />
```

API helper
----------

The helper lives in `lib/api` and exports small functions to fetch JSON from the Next.js API routes.
