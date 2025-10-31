const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
require("dotenv").config()

// SuperAdmin Schema
const superAdminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "superadmin",
      enum: ["superadmin"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
)

const SuperAdmin = mongoose.model("SuperAdmin", superAdminSchema)

async function createSuperAdmin() {
  try {
    const mongoUri = process.env.MONGODB_URI
    if (!mongoUri) {
      throw new Error("MONGODB_URI is not set in environment variables")
    }

    console.log("[v0] Connecting to MongoDB...")
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 15000,
    })
    console.log("[v0] Connected to MongoDB")

    // Check if superadmin already exists
    const existingSuperAdmin = await SuperAdmin.findOne({
      email: "admin@viaggio.com",
    })

    if (existingSuperAdmin) {
      console.log("[v0] SuperAdmin already exists with email: admin@viaggio.com")
      console.log("[v0] To create a new superadmin, change the email in this script")
      await mongoose.disconnect()
      return
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("Admin@123456", 10)

    // Create superadmin
    const superAdmin = new SuperAdmin({
      email: "admin@viaggio.com",
      password: hashedPassword,
      role: "superadmin",
      isActive: true,
    })

    await superAdmin.save()
    console.log("[v0] SuperAdmin created successfully!")
    console.log("[v0] Email: admin@viaggio.com")
    console.log("[v0] Password: Admin@123456")
    console.log("[v0] ⚠️  IMPORTANT: Change this password after first login!")

    await mongoose.disconnect()
    console.log("[v0] Database connection closed")
  } catch (error) {
    console.error("[v0] Error creating superadmin:", error.message)
    process.exit(1)
  }
}

createSuperAdmin()
