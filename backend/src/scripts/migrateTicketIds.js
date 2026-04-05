import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import Ticket from "../models/Ticket.js";
import TicketCounter from "../models/TicketCounter.js";
import User from "../models/User.js";

dotenv.config();

async function migrateTicketIds() {
  await connectDB();

  const tickets = await Ticket.find({}).sort({ createdAt: 1, _id: 1 });

  if (!tickets.length) {
    await TicketCounter.findByIdAndUpdate(
      "ticket",
      { $set: { sequence: 0 } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    // eslint-disable-next-line no-console
    console.log("No tickets found. Counter reset to 0.");
    process.exit(0);
  }

  const memberIds = [...new Set(tickets.map((ticket) => String(ticket.memberId || "")).filter(Boolean))];
  const members = await User.find({ _id: { $in: memberIds } }).select("firstName lastName email phone office").lean();
  const memberById = members.reduce((accumulator, member) => {
    accumulator[String(member._id)] = member;
    return accumulator;
  }, {});

  const temporaryBulkOperations = tickets.map((ticket) => ({
    updateOne: {
      filter: { _id: ticket._id },
      update: {
        $set: {
          ticketId: `legacy-${ticket._id}`,
        },
      },
    },
  }));

  if (temporaryBulkOperations.length) {
    await Ticket.bulkWrite(temporaryBulkOperations, { ordered: true });
  }

  const finalBulkOperations = tickets.map((ticket, index) => {
    const nextTicketId = String(index + 1);
    const member = memberById[String(ticket.memberId || "")] || null;
    const fallbackName = `${member?.firstName || ""} ${member?.lastName || ""}`.trim() || null;

    const update = {
      ticketId: nextTicketId,
    };

    if (!ticket.customerName && fallbackName) {
      update.customerName = fallbackName;
    }

    if (!ticket.customerEmail && member?.email) {
      update.customerEmail = member.email;
    }

    if (!ticket.customerPhone && member?.phone) {
      update.customerPhone = member.phone;
    }

    if (!ticket.office && member?.office) {
      update.office = member.office;
    }

    return {
      updateOne: {
        filter: { _id: ticket._id },
        update: { $set: update },
      },
    };
  });

  if (finalBulkOperations.length) {
    await Ticket.bulkWrite(finalBulkOperations, { ordered: true });
  }

  await TicketCounter.findByIdAndUpdate(
    "ticket",
    { $set: { sequence: tickets.length } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  // eslint-disable-next-line no-console
  console.log(`Migrated ${tickets.length} tickets. Ticket IDs now run from 1 to ${tickets.length}.`);
  process.exit(0);
}

migrateTicketIds().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Ticket ID migration failed:", error.message);
  process.exit(1);
});