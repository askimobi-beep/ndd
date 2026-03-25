import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { createHash, randomBytes } from "node:crypto";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    office: {
      type: String,
      default: "Lahore Office (LHR)",
      trim: true,
    },
    licenseNo: {
      type: String,
      default: "",
      trim: true,
    },
    dot: {
      type: String,
      default: "",
      trim: true,
    },
    state: {
      type: String,
      default: "",
      trim: true,
    },
    role: {
      type: String,
      enum: ["ADMIN", "SUPERVISOR", "TICKET CHECKER", "LAWYER", "AGENT", "CUSTOMER"],
      default: "SUPERVISOR",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    requiresAdminApproval: {
      type: Boolean,
      default: false,
      index: true,
    },
    isApprovedByAdmin: {
      type: Boolean,
      default: true,
      index: true,
    },
    customerPlan: {
      type: String,
      enum: ["INDIVIDUAL", "FLEET"],
      default: "INDIVIDUAL",
    },
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "UNDER_REVIEW", "PAID_APPROVED"],
      default: "UNPAID",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["NONE", "CREDIT_CARD", "BANK_TRANSFER"],
      default: "NONE",
    },
    paymentSubmittedAt: {
      type: Date,
      default: null,
    },
    paymentConfirmedAt: {
      type: Date,
      default: null,
    },
    subscriptionStartAt: {
      type: Date,
      default: null,
    },
    subscriptionEndAt: {
      type: Date,
      default: null,
    },
    invoices: [
      {
        invoiceNumber: {
          type: String,
          required: true,
          trim: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        status: {
          type: String,
          enum: ["UNPAID", "UNDER_REVIEW", "PAID"],
          default: "UNPAID",
        },
        paymentMethod: {
          type: String,
          enum: ["NONE", "CREDIT_CARD", "BANK_TRANSFER"],
          default: "NONE",
        },
        issuedAt: {
          type: Date,
          default: Date.now,
        },
        paidAt: {
          type: Date,
          default: null,
        },
      },
    ],
    fleetGroupId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    resetPasswordToken: {
      type: String,
      default: undefined,
    },
    resetPasswordExpire: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, returnedObject) => {
        delete returnedObject.password;
        delete returnedObject.resetPasswordToken;
        delete returnedObject.resetPasswordExpire;
        return returnedObject;
      },
    },
  }
);

userSchema.virtual("fullName").get(function fullName() {
  return `${this.firstName} ${this.lastName}`.trim();
});

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.createPasswordResetToken = function createPasswordResetToken() {
  const rawToken = randomBytes(32).toString("hex");
  this.resetPasswordToken = createHash("sha256").update(rawToken).digest("hex");
  this.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);
  return rawToken;
};

const User = mongoose.model("User", userSchema);

export default User;
