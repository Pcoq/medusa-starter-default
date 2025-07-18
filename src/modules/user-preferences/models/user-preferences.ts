import { model } from "@medusajs/framework/utils"

const UserPreferences = model
  .define("user_preferences", {
    id: model.id({ prefix: "upref" }).primaryKey(),
    user_id: model.text().searchable(),
    language: model.text().default("en"), // Default to English
    timezone: model.text().nullable(),
    currency: model.text().nullable(),
    date_format: model.text().nullable(),
  })
  .indexes([
    {
      unique: true,
      on: ["user_id"],
      where: "deleted_at IS NULL",
    },
  ])

export default UserPreferences 