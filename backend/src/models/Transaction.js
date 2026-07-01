import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    planName: {
      type: String,
      required: true,
      trim: true,
    },
    baseAmountInCents: {
      type: Number,
      required: true,
    },
    processingFeeInCents: {
      type: Number,
      required: true,
    },
    totalChargedInCents: {
      type: Number,
      required: true,
    },
    gatewayStatus: {
      type: String,
      enum: ["pending", "succeeded", "failed"],
      default: "pending",
      index: true,
    },
    cardFlightChargeId: {
      type: String,
      default: "",
    },
    cardBrand: {
      type: String,
      default: "",
    },
    cardLast4: {
      type: String,
      default: "",
    },
    failReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;
