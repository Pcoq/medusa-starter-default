import * as zod from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Drawer,
  Heading,
  Label,
  Input,
  Button,
  Select,
  Textarea,
} from "@medusajs/ui"
import {
  FormProvider,
  Controller,
} from "react-hook-form"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { toast } from "@medusajs/ui"
import { useEffect } from "react"

const schema = zod.object({
  brand_id: zod.string().nullable().optional(),
  model_number: zod.string().min(1, "Model number is required"),
  serial_number: zod.string().min(1, "Serial number is required"),
  license_plate: zod.string().nullable().optional(),
  year: zod.number().min(1800, "Year must be valid").max(new Date().getFullYear() + 1, "Year cannot be in the future").nullable().optional(),
  machine_type: zod.string().max(100).nullable().optional(),
  engine_hours: zod.number().min(0, "Engine hours must be positive").nullable().optional(),
  status: zod.enum(["active", "inactive", "maintenance", "sold"]),
  description: zod.string().nullable().optional(),
  notes: zod.string().nullable().optional(),
  customer_id: zod.string().nullable().optional(),
})

type FormData = zod.infer<typeof schema>

interface Brand {
  id: string
  name: string
  code: string
  is_active: boolean
}

interface Machine {
  id: string
  brand_id?: string | null
  model_number: string
  serial_number: string
  license_plate?: string | null
  year?: number | null
  machine_type?: string | null
  engine_hours?: number | null
  status: "active" | "inactive" | "maintenance" | "sold"
  description?: string | null
  notes?: string | null
  customer_id?: string | null
  created_at: string
  updated_at: string
}

interface EditMachineFormProps {
  machine: Machine
  trigger?: React.ReactNode
}

export const EditMachineForm = ({ machine, trigger }: EditMachineFormProps) => {
  const queryClient = useQueryClient()
  
  // Fetch brands for the dropdown
  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const response = await fetch("/admin/brands?limit=100")
      if (!response.ok) {
        throw new Error("Failed to fetch brands")
      }
      const data = await response.json()
      return data.brands || []
    },
  })
  
  // Fetch customers for the dropdown
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["edit-machine-customers"],
    queryFn: async () => {
      const response = await fetch("/admin/customers?limit=100")
      if (!response.ok) {
        throw new Error("Failed to fetch customers")
      }
      const data = await response.json()
      return data.customers || []
    },
  })
  
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      brand_id: "",
      model_number: "",
      serial_number: "",
      license_plate: "",
      year: undefined,
      machine_type: "",
      engine_hours: undefined,
      status: "active",
      description: "",
      notes: "",
      customer_id: "",
    },
  })

  // Update form values when machine data changes
  useEffect(() => {
    if (machine) {
      form.reset({
        brand_id: machine.brand_id || "",
        model_number: machine.model_number || "",
        serial_number: machine.serial_number || "",
        license_plate: machine.license_plate || "",
        year: machine.year || undefined,
        machine_type: machine.machine_type || "",
        engine_hours: machine.engine_hours || undefined,
        status: machine.status || "active",
        description: machine.description || "",
        notes: machine.notes || "",
        customer_id: machine.customer_id || "",
      })
    }
  }, [machine, form])

  const updateMachineMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch(`/admin/machines/${machine.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        throw new Error("Failed to update machine")
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast.success("Machine updated successfully!")
      queryClient.invalidateQueries({ queryKey: ["machines"] })
      queryClient.invalidateQueries({ queryKey: ["machine", machine.id] })
    },
    onError: (error) => {
      toast.error("Failed to update machine. Please try again.")
      console.error("Error updating machine:", error)
    },
  })

  const handleSubmit = form.handleSubmit((data) => {
    updateMachineMutation.mutate(data)
  })

  return (
    <Drawer>
      <Drawer.Trigger asChild>
        {trigger || <Button>Edit Machine</Button>}
      </Drawer.Trigger>
      <Drawer.Content>
        <FormProvider {...form}>
          <form
            onSubmit={handleSubmit}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <Drawer.Header>
              <Heading className="capitalize">
                Edit Machine
              </Heading>
            </Drawer.Header>
            <Drawer.Body className="flex max-w-full flex-1 flex-col gap-y-8 overflow-y-auto">
              
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  control={form.control}
                  name="brand_id"
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col space-y-2">
                      <Label size="small" weight="plus">
                        Brand *
                      </Label>
                      <Select value={field.value || undefined} onValueChange={field.onChange} disabled={brandsLoading}>
                        <Select.Trigger>
                          <Select.Value placeholder="Select brand" />
                        </Select.Trigger>
                        <Select.Content>
                          {brands.map((brand: any) => (
                            <Select.Item key={brand.id} value={brand.id}>
                              {brand.name}
                            </Select.Item>
                          ))}
                          {brands.length === 0 && !brandsLoading && (
                            <div className="px-2 py-1 text-sm text-ui-fg-subtle">
                              No brands available
                            </div>
                          )}
                        </Select.Content>
                      </Select>
                      {fieldState.error && (
                        <span className="text-red-500 text-sm">
                          {fieldState.error.message}
                        </span>
                      )}
                    </div>
                  )}
                />
                
                <Controller
                  control={form.control}
                  name="model_number"
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col space-y-2">
                      <Label size="small" weight="plus">
                        Model Number *
                      </Label>
                      <Input {...field} />
                      {fieldState.error && (
                        <span className="text-red-500 text-sm">
                          {fieldState.error.message}
                        </span>
                      )}
                    </div>
                  )}
                />
                
                <Controller
                  control={form.control}
                  name="serial_number"
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col space-y-2">
                      <Label size="small" weight="plus">
                        Serial Number *
                      </Label>
                      <Input {...field} />
                      {fieldState.error && (
                        <span className="text-red-500 text-sm">
                          {fieldState.error.message}
                        </span>
                      )}
                    </div>
                  )}
                />
                
                <Controller
                  control={form.control}
                  name="license_plate"
                  render={({ field }) => (
                    <div className="flex flex-col space-y-2">
                      <Label size="small" weight="plus">
                        License Plate
                      </Label>
                      <Input 
                        value={field.value || ""} 
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    </div>
                  )}
                />
                
                <Controller
                  control={form.control}
                  name="year"
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col space-y-2">
                      <Label size="small" weight="plus">
                        Year
                      </Label>
                      <Input 
                        type="number" 
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                      {fieldState.error && (
                        <span className="text-red-500 text-sm">
                          {fieldState.error.message}
                        </span>
                      )}
                    </div>
                  )}
                />
                
                <Controller
                  control={form.control}
                  name="machine_type"
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col space-y-2">
                      <Label size="small" weight="plus">
                        Machine Type
                      </Label>
                      <Input 
                        value={field.value || ""} 
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                      {fieldState.error && (
                        <span className="text-red-500 text-sm">
                          {fieldState.error.message}
                        </span>
                      )}
                    </div>
                  )}
                />
                
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col space-y-2">
                      <Label size="small" weight="plus">
                        Status *
                      </Label>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <Select.Trigger>
                          <Select.Value placeholder="Select status" />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="active">Active</Select.Item>
                          <Select.Item value="inactive">Inactive</Select.Item>
                          <Select.Item value="maintenance">Maintenance</Select.Item>
                          <Select.Item value="sold">Sold</Select.Item>
                        </Select.Content>
                      </Select>
                      {fieldState.error && (
                        <span className="text-red-500 text-sm">
                          {fieldState.error.message}
                        </span>
                      )}
                    </div>
                  )}
                />
              </div>
              
              {/* Technical Specifications */}
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  control={form.control}
                  name="engine_hours"
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col space-y-2">
                      <Label size="small" weight="plus">
                        Engine Hours
                      </Label>
                      <Input 
                        {...field} 
                        type="number" 
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                      {fieldState.error && (
                        <span className="text-red-500 text-sm">
                          {fieldState.error.message}
                        </span>
                      )}
                    </div>
                  )}
                />
                
                <Controller
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <div className="flex flex-col space-y-2">
                      <Label size="small" weight="plus">
                        Customer
                      </Label>
                      <Select value={field.value || "none"} onValueChange={(value) => field.onChange(value === "none" ? "" : value)} disabled={customersLoading}>
                        <Select.Trigger>
                          <Select.Value placeholder="Select customer (optional)" />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="none">No customer assigned</Select.Item>
                          {customers.map((customer: any) => (
                            <Select.Item key={customer.id} value={customer.id}>
                              {customer.first_name} {customer.last_name}
                              {customer.email && ` (${customer.email})`}
                            </Select.Item>
                          ))}
                          {customers.length === 0 && !customersLoading && (
                            <div className="px-2 py-1 text-sm text-ui-fg-subtle">
                              No customers available
                            </div>
                          )}
                        </Select.Content>
                      </Select>
                    </div>
                  )}
                />
              </div>
              
              {/* Description and Notes */}
              <div className="grid grid-cols-1 gap-4">
                <Controller
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <div className="flex flex-col space-y-2">
                      <Label size="small" weight="plus">
                        Description
                      </Label>
                      <Textarea 
                        value={field.value || ""} 
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    </div>
                  )}
                />
                
                <Controller
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <div className="flex flex-col space-y-2">
                      <Label size="small" weight="plus">
                        Notes
                      </Label>
                      <Textarea 
                        value={field.value || ""} 
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    </div>
                  )}
                />
              </div>
            </Drawer.Body>
            <Drawer.Footer>
              <div className="flex items-center justify-end gap-x-2">
                <Drawer.Close asChild>
                  <Button size="small" variant="secondary">
                    Cancel
                  </Button>
                </Drawer.Close>
                <Button 
                  size="small" 
                  type="submit"
                  disabled={updateMachineMutation.isPending}
                >
                  {updateMachineMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </Drawer.Footer>
          </form>
        </FormProvider>
      </Drawer.Content>
    </Drawer>
  )
} 