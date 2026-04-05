import mongoose from "mongoose";

const ticketCounterSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
      trim: true,
    },
    sequence: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    versionKey: false,
  }
);

const TicketCounter = mongoose.model("TicketCounter", ticketCounterSchema);

export default TicketCounter;
