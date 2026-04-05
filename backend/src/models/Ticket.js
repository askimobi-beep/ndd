import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      default: "",
      trim: true,
    },
    fileName: {
      type: String,
      default: "",
      trim: true,
    },
    mimeType: {
      type: String,
      default: "",
      trim: true,
    },
    size: {
      type: Number,
      default: 0,
    },
    url: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    customerName: {
      type: String,
      default: null,
      trim: true,
    },
    customerEmail: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    customerPhone: {
      type: String,
      default: null,
      trim: true,
    },
    office: {
      type: String,
      default: null,
      trim: true,
    },
    courtName: {
      type: String,
      default: null,
      trim: true,
    },
    courtDate: {
      type: Date,
      default: null,
    },
    courtDateType: {
      type: String,
      default: null,
      trim: true,
    },
    caseType: {
      type: String,
      default: null,
      trim: true,
    },
    ticketType: {
      type: String,
      default: "Ticket",
      trim: true,
    },
    status: {
      type: String,
      enum: ["New", "Pending", "In Progress", "Self Pay", "Closed", "Cancelled"],
      default: "New",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Paid", "Pending"],
      default: "Unpaid",
      index: true,
    },
    assignedLawyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    customerNotes: {
      type: String,
      default: null,
      trim: true,
    },
    teamNotes: {
      type: String,
      default: null,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    ticketDocuments: {
      type: [fileSchema],
      default: [],
    },
    caseResultFile: {
      type: fileSchema,
      default: null,
    },
    paymentSlipFile: {
      type: fileSchema,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Ticket = mongoose.model("Ticket", ticketSchema);

export default Ticket;
