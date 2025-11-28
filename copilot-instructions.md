# 1. **General Framework Rules**

1. **Do NOT wrap any component or page with `<App>` from Ant Design.** The
   global wrapper is already provided in: `src/providers/AppThemeProvider.tsx`

2. **Do NOT use static AntD APIs**, including:

   - `message.success()`
   - `notification.error()`
   - `Modal.confirm()`
   - or any other static call.

3. Copilot must always use:

```tsx
"use client";
import { App } from "antd";
const { message, notification, modal } = App.useApp();
```

4. All AntD components used inside the App Router must be **client components**.

5. Only use **AntD v6 APIs**. No deprecated props or legacy components.

6. Never import or generate:

```
@ant-design/nextjs-registry
```

7. All styling and UI must follow theme tokens defined in:

```
src/providers/AppThemeProvider.tsx
```

8. New pages must follow the layout and structural style of:

```
src/app/(dashboard)/admin/users/page.tsx
```

9. Always use existing shared components whenever possible (e.g., `CommonTable`,
   `FilterList`, form components, layout wrappers).

---

# 2. **Next.js App Router Rules**

1. Every file that uses AntD, filters, TanStack Query, or client-side UI must
   start with `"use client"`.
2. Do NOT manually push filter parameters into the URL unless explicitly
   required.
3. Routing and dialogs must follow the App Router conventions only.

---

# 3. **TanStack Query Rules (Mandatory)**

All data fetching must use TanStack Query.

### Fetching example:

```tsx
const { data, isLoading } = useQuery({
  queryKey: ["customers", query],
  queryFn: () => api.customers.list(query),
});
```

### Mutation example:

```tsx
const mutation = useMutation({
  mutationFn: api.customers.update,
  onSuccess() {
    message.success("Updated successfully");
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  },
});
```

Forbidden:

- `fetch()` inside component bodies
- SWR
- Axios directly in UI files
- React Query v3 syntax

---

# 4. **Global Filtering Rules (`useFilter`)**

Copilot must always use **the existing filtering system**:

```
src/hooks/useFilter.ts
```

Copilot may NOT rewrite or replace any part of the filtering logic.

### Required imports:

```tsx
const {
  query,
  pagination,
  updateQuery,
  updateQueries,
  reset,
  applyFilter,
  handlePageChange,
} = useFilter();
```

### Required behaviors:

- `updateQuery(key, value)` for single-filter updates
- `updateQueries([{ key, value }])` for batch updates
- `reset()` to clear filters
- `handlePageChange(page, pageSize)` for pagination
- `applyFilter(data)` for client-side filtering

Forbidden:

- Manual `.filter()` logic
- Custom filter state
- Custom search logic
- Custom pagination code
- Adding debounce manually

---

# 5. **Query Serialization Rules (`buildQueryParams`)**

Copilot must always use:

```
src/utils/buildQuery.ts
```

### Usage:

```tsx
import { buildQueryParams } from "@/utils/buildQuery";

const qs = buildQueryParams(query);
await fetch(`/api/customers?${qs}`);
```

### Required serialization:

- Arrays must be joined using **commas**, e.g.:

  ```
  status=active,inactive
  group=A,B,C
  ```

Forbidden:

- `status=active&status=inactive`
- Multiple URLSearchParams append for arrays
- JSON.stringify
- Custom serializers

---

# 6. **WrapperContent Rules (MANDATORY)**

All search, filtering, refreshing, column settings, and mobile option UI **must
be rendered exclusively via**:

```
src/components/WrapperContent.tsx
```

Copilot must NEVER implement custom UI for:

- Search input
- Filter forms
- Filter modals
- Reset filter buttons
- Column visibility settings
- Mobile options menu
- Reload button

### Required WrapperContent structure:

```tsx
<WrapperContent
  title="Customers"
  header={{
    buttonBackTo: "/dashboard",
    searchInput: {
      placeholder: "Search customers",
      filterKeys: ["name", "email"],
    },
    filters: {
      fields: FILTER_FIELDS,
      query,
      onApplyFilter: updateQueries,
      onReset: reset,
    },
    columnSettings: {
      columns: columnSettings,
      onChange: setColumnSettings,
      onReset: resetColumnSettings,
    },
    refetchDataWithKeys: ["customers"],
  }}
  isLoading={customersLoading}
  isRefetching={customersRefetching}
  isNotAccessible={false}
  isEmpty={!customers?.length}
>
```

WrapperContent handles:

- Desktop inline filters
- Mobile filter modal
- Search debounce
- Column settings popover
- Reset button
- Data refetch
- Empty state
- Permission denied state

Copilot must **not** rebuild these.

---

# 7. **Table Rules (STRICT)**

Copilot must follow these rules when generating AntD tables:

### Required column properties:

- `title`
- `dataIndex`
- `key`
- **`width` is required**
- `align`
- optional: `render`

### Fixed columns (mandatory):

- **First TWO columns:** `fixed: "left"`
- **Last TWO columns:** `fixed: "right"`

### Numeric fields:

```ts
align: "left";
```

### Table component must include:

```tsx
<Table columns={columns} dataSource={data} scroll={{ x: true }} bordered />
```

Forbidden:

- Columns without width
- No fixed columns
- Tables without scroll
- Custom manual table components

---

# 8. **List Page Required Structure**

Every list page must follow this exact template:

```tsx
"use client";

import useFilter from "@/hooks/useFilter";
import WrapperContent from "@/components/WrapperContent";
import CommonTable from "@/components/CommonTable";
import { buildQueryParams } from "@/utils/buildQuery";

export default function Page() {
  const {
    query,
    pagination,
    updateQuery,
    updateQueries,
    reset,
    applyFilter,
    handlePageChange,
  } = useFilter();

  const { data, isLoading } = useQuery({
    queryKey: ["customers", query],
    queryFn: () => api.customers.list(query),
  });

  const customers = applyFilter(data ?? []);

  return (
    <WrapperContent
      title="Customers"
      header={{
        searchInput: { placeholder: "Search...", filterKeys: ["name", "code"] },
        filters: {
          fields: FILTER_FIELDS,
          query,
          onApplyFilter: updateQueries,
          onReset: reset,
        },
        columnSettings: {
          columns: columnSettings,
          onChange: setColumnSettings,
          onReset: resetColumnSettings,
        },
        refetchDataWithKeys: ["customers"],
      }}
      isLoading={isLoading}
      isEmpty={!customers?.length}
    >
      <CommonTable
        pagination={{ ...pagination, onChange: handlePageChange }}
        columns={columns}
        dataSource={customers}
        pagination={{ ...pagination, onChange: handlePageChange }}
        loading={isLoading}
        paging
      />
    </WrapperContent>
  );
}
```

Forbidden:

- Custom filter/search UI
- Custom pagination
- Custom layout structure
- Using Table directly without WrapperContent

---

# 9. **Reporting / Analytics Rules**

- Use AntD `Statistic` for KPIs.
- Use **Recharts** for charts.
- Chart colors must follow AntD theme tokens.
- Layout must follow existing dashboard/report styling.

---

# 10. **Forbidden Patterns (Global)**

Copilot must NEVER generate:

- Static AntD APIs
- Deprecated AntD props
- fetch() in components
- Custom filtering logic
- Custom pagination
- Manual query string building
- URL appending filters manually
- Tables without width
- Tables without fixed first and last columns
- Filter UI outside WrapperContent
- Layouts inconsistent with Admin Users page
- Theme overrides outside AppThemeProvider
- Custom column setting UI

# **11. QueryKey Normalization Rule (TanStack Query)**

Copilot must **never** use raw objects inside `queryKey`. Objects break
referential stability and cause infinite refetch loops. Instead, all filter
parameters must be converted into a **stable primitive** before being used in
the `queryKey`.

### ❌ Forbidden

```ts
useQuery({
  queryKey: ["debts-summary", query], // DO NOT PUT OBJECTS IN QUERY KEY
  queryFn: async () => { ... },
});
```

### ✔ Required

```ts
useQuery({
  queryKey: ["debts-summary", SuperJSON.stringify(query)],
  queryFn: async () => {
    const res = await fetch(`/api/reports/debts?type=summary&${qs}`);
    const body = await res.json();
    return body.success ? body.data : null;
  },
});
```

### ✔ Extended requirements

- Always serialize filter params to a stable primitive:

  - `SuperJSON.stringify(query)` (preferred)
  - `JSON.stringify(query)` (fallback)

- Never place nested objects, arrays, or spread objects into the query key.

- If multiple query groups exist, Copilot must combine them as:

  ```ts
  queryKey: [
    "report-customer",
    Object.values(customerQuery).join(","),
    Object.values(dateQuery).join(","),
  ];
  ```

- When using `useFilter`, the query key must depend **only** on `filter.query`
  after being serialized.

# **12. Multi-Value Query Parameter Rule (Comma-Separated Params)**

Whenever the client sends any query parameter whose value contains **commas**,
Copilot must treat this as **multiple values for filtering**, not a single
string. The API must always detect this pattern and convert it into an array
before performing database queries.

---

## ✔ Required API Behavior

Whenever a query param contains a comma:

```ts
?status=active,inactive
?branchId=1,2,3
?category=shoes,hats
```

The API **must always**:

1. **Split the value by comma**
2. **Trim whitespace**
3. **Filter out empty values**
4. **Use array filtering logic in Prisma/SQL**

### Required server-side helper:

```ts
function parseMultiValue(param?: string | string[]) {
  if (!param) return [];

  if (Array.isArray(param)) {
    return param
      .flatMap((v) => v.split(","))
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return param
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
```

### Required usage inside API route:

```ts
const statuses = parseMultiValue(searchParams.status);

const data = await db.orders.findMany({
  where: statuses.length > 0 ? { status: { in: statuses } } : {},
});
```

---

## ❌ Forbidden

Copilot must **not** treat comma-separated string as a single raw value:

```ts
// NEVER do this
const status = req.query.status; // "active,inactive"
db.orders.findMany({ where: { status } });
```

This produces incorrect results.

---

## ✔ Required Client Behavior

Copilot must always serialize multi-select filters as comma-separated strings:

```ts
SuperJSON.stringify(query);
```

Examples:

```ts
filter.query = {
  status: ["active", "inactive"],      // client state
}

// must serialize to:
?status=active,inactive
```

---

## ✔ Required Rule Summary for Copilot

**If a query parameter contains commas, it must be parsed as multiple tokens on
the server. If a filter contains multiple values, the client must serialize it
using commas. Every API endpoint must check for commas and split them into an
array before querying.**

# **13. Statistic Style Rule (Ant Design v6 Only)**

Copilot must **never** use deprecated styling props from Ant Design v4/v5 when
generating `<Statistic />` components.

### ❌ Forbidden (v4/v5 APIs)

```tsx
<Statistic
  title="Overdue Debts"
  value={summary?.overdueDebts || 0}
  prefix={<ExclamationCircleOutlined />}
  valueStyle={{ color: "#cf1322" }} // ❌ DO NOT USE valueStyle
/>
```

- `valueStyle`, `titleStyle`, `prefixStyle`, and `suffixStyle` are **removed**
  in AntD v6.
- Copilot must not generate these props under any circumstance.

---

## ✔ Required (Ant Design v6)

Copilot must always use the **new `styles` API** introduced in Ant Design v6:

```tsx
<Statistic
  title="Overdue Debts"
  value={summary?.overdueDebts || 0}
  prefix={<ExclamationCircleOutlined />}
  styles={{
    content: { color: "#cf1322" },
  }}
/>
```

### ✔ Notes for Copilot

- All custom styling for Statistic must use `styles={{ ... }}` (AntD v6
  pattern).
- `content` controls the number/value color.
- Every style-related change must follow the new v6 structure.

---

## ✔ Extended Requirements

Copilot must follow these constraints:

- Use:

  ```ts
  styles={{
    content: { ... },
    title: { ... },
    prefix: { ... },
    suffix: { ... },
  }}
  ```

  when necessary.

- **Never generate**:

  - `valueStyle`
  - `titleStyle`
  - `prefixStyle`
  - `suffixStyle`

- All Statistic components **must use the v6 API exclusively**.

# **14. Backend-Filtered Data Rule (Do NOT Re-filter on Client)**

When data has **already been filtered by the backend**, Copilot must **never**
apply any additional client-side filtering using `applyFilter()`.

`applyFilter()` is only allowed for **purely client-side data**, not for data
returned from API endpoints.

---

### ❌ Forbidden

```ts
// Data already filtered by backend
const data = await fetch(...);

// ❌ Copilot must NOT do this:
const finalData = applyFilter(data);
```

This causes:

- double filtering
- incorrect results
- broken pagination
- inconsistent UI
- unnecessary performance overhead

---

### ✔ Required

```ts
// Use backend-filtered data directly
const finalData = data;
```

---

## **Copilot Must Follow These Rules**

### 1. If the API request includes filters (e.g., `?page=1&limit=10&status=active`)

→ The backend owns all filtering logic. → Client **must not** apply
`applyFilter()`.

### 2. `applyFilter()` is only allowed for:

- local static arrays
- dropdown options
- small client-only datasets
- preview data
- non-paginated, non-API lists

### 3. When using `<CommonTable

          pagination={{ ...pagination, onChange: handlePageChange }} paging={true} />`

→ Copilot must assume backend pagination → Client-side filtering is **strictly
forbidden**.

### 4. When using `useFilter` with backend queries:

- Copilot must use `query` only to build query string
- **Do not apply `applyFilter()`** to the fetched data

---

## ✔ Rule Summary for Copilot

> **If data comes from the backend with filters applied, Copilot must never call
> `applyFilter()` on that data. `applyFilter()` is strictly for client-side only
> datasets.**

# **15. Table Action Column Rule**

For any Ant Design Table (or custom CommonTable) that requires an “Actions”
column, Copilot must **always** use the shared component:

```tsx
import TableActions from "@/components/TableActions";
```

Copilot must never manually build action buttons inside table columns.

---

## ❌ Forbidden

Copilot must NOT generate any of the following patterns:

```tsx
// ❌ Manually creating buttons
<Button icon={<EditOutlined />} onClick={...} />

// ❌ Creating inline action toolbars
<Space>
  <Tooltip title="Edit"><Button ... /></Tooltip>
  <Tooltip title="Delete"><Button ... /></Tooltip>
</Space>

// ❌ Hard-coding Eye/Delete/Plus buttons directly in column.render
render: (_, record) => (
  <Space>
    <EyeOutlined onClick={...} />
    <DeleteOutlined onClick={...} />
  </Space>
)
```

These are strictly prohibited.

---

## ✔ Required

Copilot must always generate action columns using `TableActions`:

```tsx
{
  title: "Actions",
  key: "actions",
  width: 150,
  fixed: "right",
  render: (_, record) => (
    <TableActions
      onView={() => onView(record)}
      onEdit={() => onEdit(record)}
      onDelete={() => onDelete(record)}
      onPrint={() => onPrint(record)}
      onAdd={() => onAdd(record)}
      onApprove={() => onApprove(record)}
      extraActions={[
        {
          title: "Custom",
          icon: <SomeIcon />,
          onClick: () => handleCustom(record),
          can: true,
        },
      ]}
    />
  ),
}
```

---

## ✔ Extended Rules Copilot must follow

### 1. Action column must always have:

- `width` defined
- `fixed: "right"`
- Correct `title` and `key`

### 2. TableActions props must follow the component interface:

- `onView`, `onPrint`, `onAdd`, `onEdit`, `onApprove`, `onDelete`
- `canView`, `canEdit`, etc. (optional)
- `extraActions` array (optional)

### 3. Buttons must never be recreated manually

Copilot must rely 100% on `TableActions`.

### 4. No inline icons or inline styles inside the column

TableActions already handles all styling, tooltips, colors, icons.

---

# **15. Table Action Column Rule**

For any Ant Design Table (or custom CommonTable) that requires an “Actions”
column, Copilot must **always** use the shared component:

```tsx
import TableActions from "@/components/TableActions";
```

Copilot must never manually build action buttons inside table columns.

---

## ❌ Forbidden

Copilot must NOT generate any of the following patterns:

```tsx
// ❌ Manually creating buttons
<Button icon={<EditOutlined />} onClick={...} />

// ❌ Creating inline action toolbars
<Space>
  <Tooltip title="Edit"><Button ... /></Tooltip>
  <Tooltip title="Delete"><Button ... /></Tooltip>
</Space>

// ❌ Hard-coding Eye/Delete/Plus buttons directly in column.render
render: (_, record) => (
  <Space>
    <EyeOutlined onClick={...} />
    <DeleteOutlined onClick={...} />
  </Space>
)
```

These are strictly prohibited.

---

## ✔ Required

Copilot must always generate action columns using `TableActions`:

```tsx
{
  title: "Actions",
  key: "actions",
  width: 150,
  fixed: "right",
  render: (_, record) => (
    <TableActions
      onView={() => onView(record)}
      onEdit={() => onEdit(record)}
      onDelete={() => onDelete(record)}
      onPrint={() => onPrint(record)}
      onAdd={() => onAdd(record)}
      onApprove={() => onApprove(record)}
      extraActions={[
        {
          title: "Custom",
          icon: <SomeIcon />,
          onClick: () => handleCustom(record),
          can: true,
        },
      ]}
    />
  ),
}
```

---

## ✔ Extended Rules Copilot must follow

### 1. Action column must always have:

- `width` defined
- `fixed: "right"`
- Correct `title` and `key`

### 2. TableActions props must follow the component interface:

- `onView`, `onPrint`, `onAdd`, `onEdit`, `onApprove`, `onDelete`
- `canView`, `canEdit`, etc. (optional)
- `extraActions` array (optional)

### 3. Buttons must never be recreated manually

Copilot must rely 100% on `TableActions`.

### 4. No inline icons or inline styles inside the column

TableActions already handles all styling, tooltips, colors, icons.

---

# **16. Auto-Generated File Naming Rule**

Whenever Copilot generates a new file (TypeScript, JSON, Markdown, config,
etc.), the filename must always follow this strict naming format:

```
data_<DD_MM_YYYY>.<ext>
```

### ✔ Required Format

- Prefix: `data_`
- Separator: underscore
- Date format: `DD_MM_YYYY` (day first, zero-padded)
- Example for **12 January 2025**:

```
data_12_01_2025.ts
data_12_01_2025.md
data_12_01_2025.json
```

### ✔ Required Behavior for Copilot

- Copilot must **always** use the current real-world date.
- Copilot must never guess or invent a different date format.
- Copilot must never output names like:

  - `data-12-01-2025`
  - `12_01_2025_data`
  - `data20250112`
  - `file_12_01_2025`

- The prefix **must always be `data_`**.

### ❌ Forbidden naming patterns

Copilot must NOT generate:

```txt
report_12_01_2025.ts
log_2025_01_12.json
output.ts
newfile.ts
```


