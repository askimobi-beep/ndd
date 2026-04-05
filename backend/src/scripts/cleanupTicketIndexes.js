import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import Ticket from "../models/Ticket.js";

dotenv.config();

async function cleanupTicketIndexes() {
  await connectDB();

  const indexes = await Ticket.collection.indexes();
  const staleTicketNumberIndex = indexes.find((index) => index.name === "ticketNumber_1");

  if (staleTicketNumberIndex) {
    await Ticket.collection.dropIndex("ticketNumber_1");
    // eslint-disable-next-line no-console
    console.log("Dropped stale index: ticketNumber_1");
  } else {
    // eslint-disable-next-line no-console
    console.log("Stale index ticketNumber_1 not found");
  }

  const cleanupResult = await Ticket.updateMany(
    { ticketNumber: { $exists: true } },
    { $unset: { ticketNumber: "" } },
    { strict: false }
  );

  // eslint-disable-next-line no-console
  console.log(`Removed legacy ticketNumber field from ${cleanupResult.modifiedCount || 0} ticket(s).`);

  process.exit(0);
}

cleanupTicketIndexes().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Ticket cleanup failed:", error.message);
  process.exit(1);
});