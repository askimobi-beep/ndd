import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

async function seedAdmin() {
  await connectDB();

  const adminEmail = (process.env.ADMIN_EMAIL || "admin@ndd.local").toLowerCase().trim();

  const existingAdmin = await User.findOne({ email: adminEmail });

  if (existingAdmin) {
    existingAdmin.firstName = process.env.ADMIN_FIRST_NAME || existingAdmin.firstName;
    existingAdmin.lastName = process.env.ADMIN_LAST_NAME || existingAdmin.lastName;
    existingAdmin.phone = process.env.ADMIN_PHONE || existingAdmin.phone;
    existingAdmin.office = process.env.ADMIN_OFFICE || existingAdmin.office;
    existingAdmin.role = "ADMIN";
    existingAdmin.isActive = true;

    if (process.env.ADMIN_PASSWORD) {
      existingAdmin.password = process.env.ADMIN_PASSWORD;
    }

    await existingAdmin.save();
    // eslint-disable-next-line no-console
    console.log("Admin user updated:", adminEmail);
    process.exit(0);
  }

  await User.create({
    firstName: process.env.ADMIN_FIRST_NAME || "System",
    lastName: process.env.ADMIN_LAST_NAME || "Admin",
    email: adminEmail,
    password: process.env.ADMIN_PASSWORD || "Admin@123456",
    role: "ADMIN",
    phone: process.env.ADMIN_PHONE || "",
    office: process.env.ADMIN_OFFICE || "Lahore Office (LHR)",
    isActive: true,
  });

  // eslint-disable-next-line no-console
  console.log("Admin user created:", adminEmail);
  process.exit(0);
}

seedAdmin().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Seed admin failed:", error.message);
  process.exit(1);
});
