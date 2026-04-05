import Ticket from "../models/Ticket.js";
import TicketCounter from "../models/TicketCounter.js";
import User from "../models/User.js";

function normalizeRole(role = "") {
  return String(role).trim().toUpperCase();
}

function toNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function mapFile(file) {
  if (!file) {
    return null;
  }

  const folder = file.destination?.split("uploads").pop()?.replace(/\\/g, "/") || "";
  const filePath = `${folder}/${file.filename}`.replace(/^\/+/, "");

  return {
    originalName: file.originalname || "",
    fileName: file.filename || "",
    mimeType: file.mimetype || "",
    size: Number(file.size || 0),
    url: `/uploads/${filePath}`,
  };
}

function extractTicketSequence(ticketId) {
  const match = String(ticketId || "").match(/(\d+)/);
  return match ? Number(match[1]) || 0 : 0;
}

async function getHighestTicketSequence() {
  const existingTickets = await Ticket.find({}, "ticketId").lean();
  return existingTickets.reduce((maxValue, ticket) => {
    return Math.max(maxValue, extractTicketSequence(ticket.ticketId));
  }, 0);
}

function applyTicketPopulations(ticketQuery) {
  return ticketQuery
    .populate("memberId", "firstName lastName email phone office")
    .populate("assignedLawyer", "firstName lastName email")
    .populate("createdBy", "firstName lastName email");
}

async function populateTicketDocument(ticket) {
  await ticket.populate("memberId", "firstName lastName email phone office");
  await ticket.populate("assignedLawyer", "firstName lastName email");
  await ticket.populate("createdBy", "firstName lastName email");
}

async function syncTicketCounter() {
  const highestSequence = await getHighestTicketSequence();
  let counter = await TicketCounter.findById("ticket");

  if (!counter) {
    try {
      counter = await TicketCounter.create({ _id: "ticket", sequence: highestSequence });
    } catch {
      counter = await TicketCounter.findById("ticket");
    }
  }

  if (!counter) {
    counter = await TicketCounter.findByIdAndUpdate(
      "ticket",
      { $set: { sequence: highestSequence } },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );
  }

  if (Number(counter.sequence || 0) < highestSequence) {
    counter = await TicketCounter.findByIdAndUpdate(
      "ticket",
      { $set: { sequence: highestSequence } },
      { returnDocument: "after" }
    );
  }

  return Number(counter?.sequence || highestSequence || 0);
}

async function getNextTicketId() {
  await syncTicketCounter();

  const updatedCounter = await TicketCounter.findByIdAndUpdate(
    "ticket",
    { $inc: { sequence: 1 } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  );

  return String(updatedCounter.sequence);
}

async function createTicketWithGeneratedId(payload, maxAttempts = 5) {
  let lastDuplicateError = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const ticket = await Ticket.create({
        ...payload,
        ticketId: await getNextTicketId(),
      });

      await populateTicketDocument(ticket);
      return ticket;
    } catch (error) {
      const isTicketIdDuplicate =
        error?.code === 11000 &&
        (error?.keyPattern?.ticketId || String(error?.message || "").includes("ticketId"));

      if (!isTicketIdDuplicate) {
        throw error;
      }

      lastDuplicateError = error;
      await syncTicketCounter();
    }
  }

  if (lastDuplicateError) {
    lastDuplicateError.message = "Unable to generate a unique ticket ID";
    throw lastDuplicateError;
  }

  throw new Error("Unable to generate a unique ticket ID");
}

async function getMemberFallbackDetails(memberId) {
  if (!memberId) {
    return null;
  }

  return User.findById(memberId).select("firstName lastName email phone office").lean();
}

export async function listTickets(req, res, next) {
  try {
    const filter = {};
    const requesterRole = normalizeRole(req.user?.role);

    if (requesterRole === "CUSTOMER") {
      filter.$or = [
        { memberId: req.user._id },
        { customerEmail: String(req.user.email || "").toLowerCase() },
      ];
    }

    if (req.query.status && req.query.status !== "All Tickets") {
      filter.status = String(req.query.status);
    }

    if (req.query.office) {
      filter.office = String(req.query.office);
    }

    if (req.query.memberId) {
      filter.memberId = String(req.query.memberId);
    }

    const tickets = await applyTicketPopulations(Ticket.find(filter).sort({ createdAt: -1 }));

    return res.json({
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createTicket(req, res, next) {
  try {
    const ticketFiles = req.files?.ticketDocuments || [];
    const mappedDocs = ticketFiles.map(mapFile).filter(Boolean);
    const memberId = toNullableString(req.body.memberId);
    const memberDetails = await getMemberFallbackDetails(memberId);
    const fallbackName = `${memberDetails?.firstName || ""} ${memberDetails?.lastName || ""}`.trim() || null;

    const payload = {
      memberId,
      customerName: toNullableString(req.body.customerName) || fallbackName,
      customerEmail: toNullableString(req.body.customerEmail) || memberDetails?.email || null,
      customerPhone: toNullableString(req.body.customerPhone) || memberDetails?.phone || null,
      office: toNullableString(req.body.office) || memberDetails?.office || null,
      courtName: toNullableString(req.body.courtName),
      courtDate: req.body.courtDate ? new Date(req.body.courtDate) : null,
      courtDateType: toNullableString(req.body.courtDateType),
      caseType: toNullableString(req.body.caseType),
      ticketType: toNullableString(req.body.ticketType) || "Ticket",
      status: toNullableString(req.body.status) || "New",
      paymentStatus: toNullableString(req.body.paymentStatus) || "Unpaid",
      assignedLawyer: toNullableString(req.body.assignedLawyer),
      customerNotes: toNullableString(req.body.customerNotes),
      teamNotes: toNullableString(req.body.teamNotes),
      description: toNullableString(req.body.description),
      ticketDocuments: mappedDocs,
      caseResultFile: mapFile((req.files?.caseResultPdf || [])[0]),
      paymentSlipFile: mapFile((req.files?.paymentSlip || [])[0]),
      createdBy: req.user?._id || null,
    };

    const ticket = await createTicketWithGeneratedId(payload);

    return res.status(201).json({
      message: "Ticket created successfully",
      ticket,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: error.message || "Ticket ID already exists" });
    }

    return next(error);
  }
}

export async function updateTicket(req, res, next) {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const memberDetails = await getMemberFallbackDetails(ticket.memberId);
    const fallbackName = `${memberDetails?.firstName || ""} ${memberDetails?.lastName || ""}`.trim() || null;
    const patch = {
      customerName: toNullableString(req.body.customerName),
      customerEmail: toNullableString(req.body.customerEmail),
      customerPhone: toNullableString(req.body.customerPhone),
      office: toNullableString(req.body.office),
      courtName: toNullableString(req.body.courtName),
      courtDateType: toNullableString(req.body.courtDateType),
      caseType: toNullableString(req.body.caseType),
      ticketType: toNullableString(req.body.ticketType),
      status: toNullableString(req.body.status),
      paymentStatus: toNullableString(req.body.paymentStatus),
      assignedLawyer: toNullableString(req.body.assignedLawyer),
      customerNotes: toNullableString(req.body.customerNotes),
      teamNotes: toNullableString(req.body.teamNotes),
      description: toNullableString(req.body.description),
    };

    if (req.body.courtDate !== undefined) {
      patch.courtDate = req.body.courtDate ? new Date(req.body.courtDate) : null;
    }

    Object.entries(patch).forEach(([key, value]) => {
      if (value !== undefined) {
        ticket[key] = value;
      }
    });

    if (!ticket.customerName && fallbackName) {
      ticket.customerName = fallbackName;
    }

    if (!ticket.customerEmail && memberDetails?.email) {
      ticket.customerEmail = memberDetails.email;
    }

    if (!ticket.customerPhone && memberDetails?.phone) {
      ticket.customerPhone = memberDetails.phone;
    }

    if (!ticket.office && memberDetails?.office) {
      ticket.office = memberDetails.office;
    }

    const newDocs = (req.files?.ticketDocuments || []).map(mapFile).filter(Boolean);
    if (newDocs.length) {
      ticket.ticketDocuments = [...(ticket.ticketDocuments || []), ...newDocs];
    }

    const caseResult = mapFile((req.files?.caseResultPdf || [])[0]);
    if (caseResult) {
      ticket.caseResultFile = caseResult;
    }

    const paymentSlip = mapFile((req.files?.paymentSlip || [])[0]);
    if (paymentSlip) {
      ticket.paymentSlipFile = paymentSlip;
    }

    await ticket.save();
    await populateTicketDocument(ticket);

    return res.json({
      message: "Ticket updated successfully",
      ticket,
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteTicket(req, res, next) {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    await ticket.deleteOne();

    return res.json({
      message: "Ticket deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
}

export async function getTicketById(req, res, next) {
  try {
    const ticket = await applyTicketPopulations(Ticket.findById(req.params.id));

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (normalizeRole(req.user?.role) === "CUSTOMER") {
      const ownsTicket =
        String(ticket.memberId?._id || ticket.memberId || "") === String(req.user._id) ||
        String(ticket.customerEmail || "").toLowerCase() === String(req.user.email || "").toLowerCase();

      if (!ownsTicket) {
        return res.status(403).json({ message: "Forbidden: insufficient permissions" });
      }
    }

    return res.json({ ticket });
  } catch (error) {
    return next(error);
  }
}
