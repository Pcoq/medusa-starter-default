import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MACHINES_MODULE, MachinesModuleService } from "../../../modules/machines"
import { BRANDS_MODULE } from "../../../modules/brands"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createMachineWorkflow } from "../../../modules/machines/workflows"
import { CreateMachineDTO } from "../../../modules/machines/types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const brandsService = req.scope.resolve(BRANDS_MODULE)
    
    const { 
      limit = 50, 
      offset = 0,
      q,
      status,
      customer_id,
      brand_id,
      machine_type,
      ...filters 
    } = req.query
    
    // Build filters
    const queryFilters: any = { ...filters }
    
    if (status) queryFilters.status = status
    if (customer_id) queryFilters.customer_id = customer_id
    if (brand_id) queryFilters.brand_id = brand_id
    if (machine_type) queryFilters.machine_type = { $ilike: `%${machine_type}%` }
    
    // Add search functionality
    if (q) {
      queryFilters.$or = [
        { model_number: { $ilike: `%${q}%` } },
        { serial_number: { $ilike: `%${q}%` } },
        { machine_type: { $ilike: `%${q}%` } },
        { description: { $ilike: `%${q}%` } },
        { notes: { $ilike: `%${q}%` } },
      ]
    }

    // Use Query to get machines
    const { data: machines } = await query.graph({
      entity: "machine",
      fields: ["*"],
      filters: queryFilters,
      pagination: {
        take: Number(limit),
        skip: Number(offset),
      },
    })
    
    // Get count using the machines service
    const machinesService = req.scope.resolve(MACHINES_MODULE) as MachinesModuleService
    const [, count] = await machinesService.listAndCountMachines(queryFilters, {
      take: Number(limit),
      skip: Number(offset),
    })

    // Populate brand information for each machine
    const machinesWithBrands = await Promise.all(
      machines.map(async (machine: any) => {
        if (machine.brand_id) {
          try {
            const brand = await brandsService.retrieveBrand(machine.brand_id)
            return {
              ...machine,
              brand_name: brand.name,
              brand_code: brand.code
            }
          } catch (error) {
            console.warn(`Failed to fetch brand ${machine.brand_id}:`, error)
            return {
              ...machine,
              brand_name: null,
              brand_code: null
            }
          }
        }
        return {
          ...machine,
          brand_name: null,
          brand_code: null
        }
      })
    )
    
    res.json({
      machines: machinesWithBrands,
      count,
      offset: Number(offset),
      limit: Number(limit),
    })
  } catch (error) {
    console.error("Error fetching machines:", error)
    res.status(500).json({ 
      error: "Failed to fetch machines",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const machineData = req.body as CreateMachineDTO
    
    // Run the create machine workflow
    const { result } = await createMachineWorkflow(req.scope).run({
      input: {
        machines: [machineData]
      }
    })
    
    res.status(201).json({
      machine: result.machines[0],
    })
  } catch (error) {
    console.error("Error creating machine:", error)
    
    // Handle specific error types
    if (error.type === "duplicate_error") {
      return res.status(409).json({ 
        error: "Duplicate machine",
        details: error.message
      })
    }
    
    if (error.type === "invalid_data") {
      return res.status(400).json({ 
        error: "Invalid data",
        details: error.message
      })
    }
    
    res.status(500).json({ 
      error: "Failed to create machine",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
} 