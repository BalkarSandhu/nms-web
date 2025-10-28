"use client"

import * as React from "react"
import { useState,useEffect } from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconDotsVertical,
  IconGripVertical,
  IconLayoutColumns,
  IconLoader,
  IconPlus,
  IconTrash,
  IconTrendingUp,
} from "@tabler/icons-react"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Row,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { toast } from "sonner"
import { z } from "zod"

import { useIsMobile } from "@/hooks/use-mobile"
import { Badge } from "@/components/ui/badge"
import { DeviceInfoDialog } from "@/components/device-info-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { AddDeviceDialog } from "./addDeviceDialog"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

export const schema = z.object({
  id: z.number(),
  device_type: z.string(),
  hostname:z.string(),
  type: z.string(),
  status: z.boolean().nullable(),
  lastCheck: z.string().nullable(),
  limit: z.string().nullable(),
  reviewer: z.string().nullable(),
  last_ping: z.string().nullable(),
  location_id:z.number().nullable()
})

type DeviceInfo = any

async function handleDelete(id: number) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_NMS_API_SOURCE}/api/v1/devices/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
    });
    if (!response.ok) {
      throw new Error('Failed to delete device');
    }
    toast.success(`Device ${id} deleted successfully`);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to delete device');
  }
}

// Create a separate component for the drag handle
function DragHandle({ id }: { id: number }) {
  const { attributes, listeners } = useSortable({
    id,
  })

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="text-muted-foreground size-7 hover:bg-transparent"
    >
      <IconGripVertical className="text-muted-foreground size-3" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}


const columns: ColumnDef<z.infer<typeof schema>>[] = [
  {
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original.id} />,
  },
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "header",
    header: "Device Type",
      cell: ({ row }) => {
        // Show device type as clickable, open dialog on click
        const [dialogOpen, setDialogOpen] = useState(false);
        return (
          <>
            <Button variant="link" className="text-foreground w-fit px-0 text-left" onClick={() => setDialogOpen(true)}>
              {row.original.device_type}
            </Button>
            <DeviceInfoDialog
              id={row.original.id}
              open={dialogOpen}
              onOpenChange={setDialogOpen}
            />
          </>
        );
      },
    enableHiding: false,
  },
  {
    accessorKey: "type",
    header: " Device Name",
    cell: ({ row }) => (
      <div className="w-32">
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {row.original.hostname}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "lastCheck",
    header: () => <div>Last Check</div>,
    cell: ({ row }) => (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
            loading: `Saving ${row.original.last_ping}`,
            success: "Done",
            error: "Error",
          })
        }}
      >
        <Label htmlFor={`${row.original.id}-lastCheck`} className="sr-only">
          Last Check
        </Label>
        <Input
          className="w-2xs"
          defaultValue={row.original.last_ping ?? ""}
          id={`${row.original.id}-lastCheck`}
          
        />
      </form>
    ),
  },
  {
    accessorKey: "location",
    header: "Location",
    cell: ({ row }) => {
      const locationName = row.original.location_id === 1 ? "Lodna" : 
                          row.original.location_id === 2 ? "Kusunda" : 
                          "Unknown"
      return (
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {locationName}
        </Badge>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant="outline" className="text-muted-foreground px-1.5">
        {row.original.status === true ? (
          <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
        ) : row.original.status === false ? (
          <IconCircleCheckFilled className="fill-red-500 dark:fill-red-400"/>
        ) : (
          <IconCircleCheckFilled className="fill-red-500 dark:fill-red-400"/>
        )}
        {String(row.original.status)}
      </Badge>
    ),
  },
  
  
  
  {
    id: "actions",
    cell: ({ row }) => (
      
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
            size="icon"
            onClick={(e) => {
              // prevent the row's onClick from firing (which opens the device info)
              e.stopPropagation()
              // ask for confirmation before deleting
              if (confirm('Are you sure you want to delete this device?')) {
                void handleDelete(row.original.id)
              }
            }}
          >
            <IconTrash />
          </Button>
    ),
  },
]

function DraggableRow({ row, setSelectedDeviceId, onRowClick }: { row: Row<z.infer<typeof schema>>, setSelectedDeviceId: (id: number) => void, onRowClick?: (id: number) => void }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  })
  // no per-row effect here; main click handler will fetch details

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      onClick={() => {
        setSelectedDeviceId(row.original.id)
        onRowClick?.(row.original.id)
      }}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80 cursor-pointer hover:bg-muted/50"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

export function DataTable({
  data: initialData = [],
}: {
  data?: z.infer<typeof schema>[]
}) {
  const [data, setData] = React.useState(() => initialData || [])
  const [deviceDetails, setDeviceDetails] = React.useState<DeviceInfo | null>(null)
  const [deviceDialogOpen, setDeviceDialogOpen] = React.useState(false)
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [selectedDeviceId, setSelectedDeviceId] = React.useState<number | null>(null)

  const sortableId = React.useId()
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ id }) => id).filter(Boolean) || [],
    [data]
  )
  const [selectedDeviceType, setSelectedDeviceType] = useState<string | null>(null)
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    // getRowId: (row) => row?.id?.toString() ?? String(Math.random()),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id)
        const newIndex = dataIds.indexOf(over.id)
        return arrayMove(data, oldIndex, newIndex)
      })
    }
  }

  async function handleRowClick(id: number) {
    setSelectedDeviceId(id)
    setDeviceDialogOpen(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_NMS_API_SOURCE}/api/v1/devices/${id}`)
      if (!res.ok) throw new Error(`Failed to fetch device ${id}: ${res.status}`)
        const d = await res.json()
        // store the raw response so dialog shows the data exactly as returned
        setDeviceDetails(d)
    } catch (err) {
      console.error('Error fetching device details', err)
      toast.error(err instanceof Error ? err.message : String(err))
      setDeviceDetails(null)
    }
  }

  return (
  <Tabs
    defaultValue="outline"
    className="w-full flex-col justify-start gap-6"
  >
    <div className="flex items-center justify-between px-4 lg:px-6">
      <Label htmlFor="view-selector" className="sr-only">
        View
      </Label>
      <Select defaultValue="outline">
        <SelectTrigger
          className="flex w-fit @4xl/main:hidden"
          size="sm"
          id="view-selector"
        >
          <SelectValue placeholder="Select a view" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="workStation">WorkStation</SelectItem>
          <SelectItem value="camera">Camera</SelectItem>
          <SelectItem value="NVR">NVR</SelectItem>
          <SelectItem value="Server">Server</SelectItem>
          <SelectItem value="Storage">Storage</SelectItem>
        </SelectContent>
      </Select>
      <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
        <TabsTrigger value="workStation">
          WorkStation {table.getFilteredRowModel().rows.filter(row => row.original.type === "WorkStation").length > 0 && 
            <Badge variant="secondary">{table.getFilteredRowModel().rows.filter(row => row.original.type === "WorkStation").length}</Badge>}
        </TabsTrigger>
        <TabsTrigger value="Camera">
          Camera {table.getFilteredRowModel().rows.filter(row => row.original.type === "Camera").length > 0 && 
            <Badge variant="secondary">{table.getFilteredRowModel().rows.filter(row => row.original.type === "Camera").length}</Badge>}
        </TabsTrigger>
        <TabsTrigger value="NVR">
          NVR {table.getFilteredRowModel().rows.filter(row => row.original.type === "NVR").length > 0 && 
            <Badge variant="secondary">{table.getFilteredRowModel().rows.filter(row => row.original.type === "NVR").length}</Badge>}
        </TabsTrigger>
        <TabsTrigger value="Server">
          Server {table.getFilteredRowModel().rows.filter(row => row.original.type === "Server").length > 0 && 
            <Badge variant="secondary">{table.getFilteredRowModel().rows.filter(row => row.original.type === "Server").length}</Badge>}
        </TabsTrigger>
      </TabsList>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuContent align="end" className="w-56">
            {table
              .getAllColumns()
              .filter(
                (column) =>
                  typeof column.accessorFn !== "undefined" &&
                  column.getCanHide()
              )
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setDialogOpen(true)}
        >
          <IconPlus />
          <span className="hidden lg:inline">Add Device</span>
        </Button>
        <AddDeviceDialog 
          data={data} 
          setData={setData} 
          deviceType="Camera"
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </div>
    </div>
    <TabsContent
      value="outline"
      className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
    >
      <div className="overflow-hidden rounded-lg border">
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
          sensors={sensors}
          id={sortableId}
        >
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="**:data-[slot=table-cell]:first:w-8">
              {table.getRowModel().rows?.length ? (
                <SortableContext
                  items={dataIds}
                  strategy={verticalListSortingStrategy}
                >
                  {table.getRowModel().rows.map((row) => (
                    <DraggableRow key={row.id} row={row} setSelectedDeviceId={setSelectedDeviceId} onRowClick={handleRowClick} />
                  ))}
                </SortableContext>
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>
      <div className="flex items-center justify-between px-4">
        <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              Rows per page
            </Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <IconChevronsLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <IconChevronLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <IconChevronRight />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <IconChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </TabsContent>
    <TabsContent
      value="past-performance"
      className="flex flex-col px-4 lg:px-6"
    >
      <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
    </TabsContent>
    <TabsContent value="key-personnel" className="flex flex-col px-4 lg:px-6">
      <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
    </TabsContent>
    <TabsContent
      value="focus-documents"
      className="flex flex-col px-4 lg:px-6"
    >
      <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
    </TabsContent>

    {/* Add Device Dialog */}
    {selectedDeviceType && (
      <AddDeviceDialog
        data={data}
        setData={setData}
        deviceType={selectedDeviceType}
        open={!!selectedDeviceType}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDeviceType(null)
          }
        }}
      />
    )}

    {/* Device details dialog populated from API on row click */}
    <DeviceInfoDialog
      id={selectedDeviceId}
      device={deviceDetails}
      open={deviceDialogOpen}
      onOpenChange={(open) => {
        setDeviceDialogOpen(open)
        if (!open) {
          setDeviceDetails(null)
          setSelectedDeviceId(null)
        }
      }}
    />

    
  </Tabs>
)


}

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
]

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--primary)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--primary)",
  },
} satisfies ChartConfig

function TableCellViewer({ item }: { item: z.infer<typeof schema> }) {
  const isMobile = useIsMobile()

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="text-foreground w-fit px-0 text-left">
          {item.device_type}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.device_type}</DrawerTitle>
          <DrawerDescription>
            {/* Showing total visitors for the last 6 months */}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          {!isMobile && (
            <>
              <ChartContainer config={chartConfig}>
                <AreaChart
                  accessibilityLayer
                  data={chartData}
                  margin={{
                    left: 0,
                    right: 10,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value.slice(0, 3)}
                    hide
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Area
                    dataKey="mobile"
                    type="natural"
                    fill="var(--color-mobile)"
                    fillOpacity={0.6}
                    stroke="var(--color-mobile)"
                    stackId="a"
                  />
                  <Area
                    dataKey="desktop"
                    type="natural"
                    fill="var(--color-desktop)"
                    fillOpacity={0.4}
                    stroke="var(--color-desktop)"
                    stackId="a"
                  />
                </AreaChart>
              </ChartContainer>
              <Separator />
              <div className="grid gap-2">
                <div className="flex gap-2 leading-none font-medium">
                  Trending up by 5.2% this month{" "}
                  <IconTrendingUp className="size-4" />
                </div>
                <div className="text-muted-foreground">
                  {/* Showing total visitors for the last 6 months. This is just
                  some random text to test the layout. It spans multiple lines
                  and should wrap around. */}
                </div>
              </div>
              <Separator />
            </>
          )}
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <Label htmlFor="header">Device</Label>
              <Input id="header" defaultValue={item.device_type} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="type">Type</Label>
                <Select defaultValue={item.type}>
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Camera">
                      Camera
                    </SelectItem>
                    <SelectItem value="Executive Summary">
                      Executive Summary
                    </SelectItem>
                    <SelectItem value="Technical Approach">
                      Technical Approach
                    </SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Capabilities">Capabilities</SelectItem>
                    <SelectItem value="Focus Documents">
                      Focus Documents
                    </SelectItem>
                    <SelectItem value="Narrative">Narrative</SelectItem>
                    <SelectItem value="Cover Page">Cover Page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="status">Status</Label>
                <Select defaultValue={String(item.status)}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Done">Done</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="target">Last Check</Label>
                <Input id="target" defaultValue={item.lastCheck ?? ""} />
              </div>
            </div>
            
          </form>
        </div>
        <DrawerFooter>
          <Button>Submit</Button>
          <DrawerClose asChild>
            <Button variant="outline">Done</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}