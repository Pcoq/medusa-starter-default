import React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Plus, Eye, PencilSquare, Trash, Tools } from "@medusajs/icons"
import { 
  Container, 
  Heading, 
  Button, 
  Badge, 
  Text,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  createDataTableFilterHelper,
  toast
} from "@medusajs/ui"
import type { DataTableFilteringState } from "@medusajs/ui"
import { useSearchParams, useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { CreateMachineForm } from "../../components/machines/create-machine-form"
import { EditMachineForm } from "../../components/edit-machine-form"

// Types for our machine data - matching what EditMachineForm expects
interface Machine {
  id: string
  brand_id?: string | null
  brand_name?: string | null
  brand_code?: string | null
  model_number: string
  serial_number: string
  year?: number | null
  engine_hours?: number | null
  fuel_type?: string | null
  horsepower?: number | null
  weight?: number | null
  purchase_date?: string | null
  purchase_price?: number | null
  current_value?: number | null
  status: "active" | "inactive" | "maintenance" | "sold"
  location?: string | null
  notes?: string | null
  customer_id?: string | null
  created_at: string
  updated_at: string
}

const PAGE_SIZE = 20

// Create filter helper
const filterHelper = createDataTableFilterHelper<Machine>()

// Machine filters following native Medusa pattern
const useMachineFilters = () => {
  return [
    filterHelper.accessor("status", {
      label: "Status",
      type: "select",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
        { label: "Maintenance", value: "maintenance" },
      ],
    }),
    filterHelper.accessor("fuel_type", {
      label: "Fuel Type",
      type: "select",
      options: [
        { label: "Diesel", value: "diesel" },
        { label: "Gasoline", value: "gasoline" },
        { label: "Electric", value: "electric" },
        { label: "Hybrid", value: "hybrid" },
      ],
    }),
    filterHelper.accessor("created_at", {
      label: "Created At",
      type: "date",
      format: "date",
      options: [],
    }),
    filterHelper.accessor("purchase_date", {
      label: "Purchase Date",
      type: "date",
      format: "date",
      options: [],
    }),
  ]
}

// Data fetching hook
const useMachines = () => {
  return useQuery({
    queryKey: ["machines"],
    queryFn: async () => {
      const response = await fetch(`/admin/machines`)
      if (!response.ok) {
        throw new Error("Failed to fetch machines")
      }
      const data = await response.json()
      return {
        machines: data.machines || [],
        count: data.count || 0
      }
    },
  })
}

// Delete machine mutation
const useDeleteMachine = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/admin/machines/${id}`, {
        method: "DELETE",
      })
      
      if (!response.ok) {
        throw new Error("Failed to delete machine")
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast.success("Machine deleted successfully")
      queryClient.invalidateQueries({ queryKey: ["machines"] })
    },
    onError: () => {
      toast.error("Failed to delete machine")
    },
  })
}

// Machine actions component
const MachineActions = ({ machine }: { machine: Machine }) => {
  const navigate = useNavigate()
  const deleteMachineMutation = useDeleteMachine()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (window.confirm(`Are you sure you want to delete machine "${machine.brand_name || 'Unknown'} ${machine.model_number}"?`)) {
      deleteMachineMutation.mutate(machine.id)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="small"
        variant="transparent"
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/machines/${machine.id}`)
        }}
      >
        <Eye className="h-4 w-4" />
      </Button>
      <EditMachineForm machine={machine} trigger={
        <Button 
          size="small"
          variant="transparent"
        >
          <PencilSquare className="h-4 w-4" />
        </Button>
      } />
      <Button
        size="small"
        variant="transparent"
        onClick={handleDelete}
        disabled={deleteMachineMutation.isPending}
      >
        <Trash className="h-4 w-4" />
      </Button>
    </div>
  )
}

// Route config
export const config = defineRouteConfig({
  label: "Machines",
  icon: Tools,
})

// Machines list table component - following official DataTable pattern
const MachinesListTable = () => {
  const navigate = useNavigate()
  const { data, isLoading, error } = useMachines()
  const filters = useMachineFilters()
  
  // Filter state management
  const [search, setSearch] = React.useState("")
  const [filtering, setFiltering] = React.useState<DataTableFilteringState>({})
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  })

  // Data processing (move before conditional returns)
  const machines = data?.machines || []
  const count = data?.count || 0

  // Status badge helper (move before conditional returns)
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: "green", label: "Active" },
      inactive: { color: "red", label: "Inactive" },
      maintenance: { color: "orange", label: "Maintenance" },
    } as const

    const config = statusConfig[status as keyof typeof statusConfig] || { color: "grey", label: status }
    
    return (
      <Badge size="2xsmall" color={config.color as any}>
        {config.label}
      </Badge>
    )
  }

  // Column helper and definitions (move before conditional returns)
  const columnHelper = createDataTableColumnHelper<Machine>()

  const columns = [
    columnHelper.accessor("brand_name", {
      header: "Brand",
      enableSorting: true,
      cell: ({ getValue }) => (
        <Text className="font-medium">{getValue() || 'Unknown'}</Text>
      ),
    }),
    columnHelper.accessor("model_number", {
      header: "Model",
      enableSorting: true,
      cell: ({ getValue }) => (
        <Text>{getValue()}</Text>
      ),
    }),
    columnHelper.accessor("serial_number", {
      header: "Serial Number",
      cell: ({ getValue }) => (
        <Text className="font-mono text-sm">{getValue()}</Text>
      ),
    }),
    columnHelper.accessor("fuel_type", {
      header: "Fuel Type",
      cell: ({ getValue }) => (
        <Text className="capitalize">{getValue()}</Text>
      ),
    }),
    columnHelper.accessor("year", {
      header: "Year",
      enableSorting: true,
      cell: ({ getValue }) => (
        <Text>{getValue()}</Text>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ getValue }) => getStatusBadge(getValue()),
    }),
    columnHelper.accessor("location", {
      header: "Location",
      cell: ({ getValue }) => (
        <Text>{getValue() || "—"}</Text>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => <MachineActions machine={row.original} />,
    }),
  ]

  // Table instance setup (move before conditional returns)
  const table = useDataTable({
    data: machines,
    columns,
    filters,
    rowCount: count,
    getRowId: (row) => row.id,
    search: {
      state: search,
      onSearchChange: setSearch,
    },
    filtering: {
      state: filtering,
      onFilteringChange: setFiltering,
    },
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
  })

  // NOW we can have conditional returns after all hooks are called
  if (error) {
    throw error
  }

  // Show loading state
  if (isLoading) {
    return (
      <Container className="p-6">
        <div className="flex items-center justify-center h-32">
          <Text className="text-ui-fg-subtle">Loading machines...</Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>Machines</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Manage your equipment and machinery ({count} machines)
          </Text>
        </div>
        <CreateMachineForm />
      </div>
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <DataTable.FilterMenu />
          </div>
          <div className="flex items-center gap-2">
            <DataTable.Search placeholder="Search machines..." />
          </div>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </Container>
  )
}

// Main machines page component
const MachinesPage = () => {
  return <MachinesListTable />
}

export default MachinesPage
