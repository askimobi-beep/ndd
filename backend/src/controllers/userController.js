import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js";

function mapUploadedFile(file) {
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

const PLAN_PRICES = {
  INDIVIDUAL: 54.99,
  FLEET: 44.99,
};
const PROCESSING_FEE = 0;
const BILLING_CYCLE_MS = 30 * 24 * 60 * 60 * 1000;

const CREATABLE_ROLES = {
  ADMIN: ["SUPERVISOR", "TICKET CHECKER", "LAWYER", "CUSTOMER"],
  "TICKET CHECKER": ["LAWYER"],
  SUPERVISOR: ["AGENT"],
  AGENT: ["CUSTOMER"],
};

const VIEWABLE_ROLES = {
  ADMIN: ["SUPERVISOR", "TICKET CHECKER", "LAWYER", "AGENT", "CUSTOMER"],
  "TICKET CHECKER": ["LAWYER", "CUSTOMER"],
  SUPERVISOR: ["AGENT", "CUSTOMER"],
  AGENT: ["CUSTOMER"],
};

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function normalizeRole(role = "") {
  return String(role).trim().toUpperCase();
}

function normalizeCustomerPlan(plan = "INDIVIDUAL") {
  return normalizeRole(plan) === "FLEET" ? "FLEET" : "INDIVIDUAL";
}

function getPlanPrice(plan = "INDIVIDUAL") {
  return PLAN_PRICES[normalizeCustomerPlan(plan)];
}

function getPlanAmountSummary(plan = "INDIVIDUAL") {
  const planPrice = getPlanPrice(plan);
  const processingFee = PROCESSING_FEE;
  const totalAmount = Number((planPrice + processingFee).toFixed(2));

  return {
    planPrice,
    processingFee,
    totalAmount,
  };
}

function getReferenceId(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    if (value._id) {
      return String(value._id);
    }

    if (typeof value.toString === "function" && value.toString() !== "[object Object]") {
      return String(value);
    }
  }

  return String(value);
}

function getCreatableRoles(actorRole) {
  return CREATABLE_ROLES[normalizeRole(actorRole)] || [];
}

function getViewableRoles(actorRole) {
  return VIEWABLE_ROLES[normalizeRole(actorRole)] || [];
}

function ensureCanCreateRole(req, role) {
  const targetRole = normalizeRole(role);
  const allowedRoles = getCreatableRoles(req.user?.role);

  if (!allowedRoles.includes(targetRole)) {
    const error = new Error("Forbidden: insufficient permissions");
    error.statusCode = 403;
    throw error;
  }
}

function ensureCanViewRole(req, role) {
  const targetRole = normalizeRole(role);
  const allowedRoles = getViewableRoles(req.user?.role);

  if (!allowedRoles.includes(targetRole)) {
    const error = new Error("Forbidden: insufficient permissions");
    error.statusCode = 403;
    throw error;
  }
}

function canAccessUserRecord(req, user, { forWrite = false } = {}) {
  const actorRole = normalizeRole(req.user?.role);
  const actorId = getReferenceId(req.user?._id);
  const recordRole = normalizeRole(user?.role);
  const createdBy = getReferenceId(user?.createdBy);
  const supervisorId = getReferenceId(user?.supervisorId);

  if (actorRole === "ADMIN") {
    return true;
  }

  if (actorRole === "SUPERVISOR") {
    if (recordRole === "AGENT" && createdBy && createdBy === actorId) {
      return true;
    }

    if (!forWrite && recordRole === "CUSTOMER" && supervisorId && supervisorId === actorId) {
      return true;
    }

    return false;
  }

  if (actorRole === "AGENT") {
    if (recordRole !== "CUSTOMER") {
      return false;
    }

    return createdBy && createdBy === actorId;
  }

  if (actorRole === "TICKET CHECKER") {
    if (recordRole === "LAWYER") {
      return forWrite ? Boolean(user?.isApprovedByAdmin) : true;
    }

    return recordRole === "CUSTOMER";
  }

  return false;
}

function canManageCustomerPayment(req, user) {
  const actorRole = normalizeRole(req.user?.role);
  const actorId = getReferenceId(req.user?._id);
  const recordRole = normalizeRole(user?.role);
  const createdBy = getReferenceId(user?.createdBy);

  if (recordRole !== "CUSTOMER") {
    return false;
  }

  if (actorRole === "ADMIN") {
    return true;
  }

  if (actorRole === "SUPERVISOR") {
    return true;
  }

  if (actorRole === "AGENT") {
    return createdBy && createdBy === actorId;
  }

  return false;
}

function buildScopedFilter(req, role) {
  const actorRole = normalizeRole(req.user?.role);
  const actorId = req.user?._id;
  const targetRole = normalizeRole(role);
  const scope = String(req.query?.scope || "").trim().toLowerCase();

  if (actorRole === "ADMIN") {
    return { role: targetRole };
  }

  if (actorRole === "SUPERVISOR") {
    if (targetRole === "AGENT") {
      return { role: "AGENT", createdBy: actorId };
    }

    if (targetRole === "CUSTOMER") {
      return { role: "CUSTOMER" };
    }

    return null;
  }

  if (actorRole === "AGENT") {
    if (targetRole === "CUSTOMER") {
      if (scope === "claim") {
        return {
          role: "CUSTOMER",
          createdBy: { $ne: actorId },
        };
      }

      return { role: "CUSTOMER", createdBy: actorId };
    }

    return null;
  }

  if (actorRole === "TICKET CHECKER") {
    if (targetRole === "LAWYER") {
      return { role: "LAWYER" };
    }

    if (targetRole === "CUSTOMER") {
      return { role: "CUSTOMER" };
    }

    return null;
  }

  return null;
}

function buildCreationMeta(req, role, body = {}) {
  const actorRole = normalizeRole(req.user?.role);
  const targetRole = normalizeRole(role);

  const meta = {
    createdBy: req.user?._id || null,
    supervisorId: null,
    requiresAdminApproval: false,
    isApprovedByAdmin: true,
    customerPlan: "INDIVIDUAL",
    fleetGroupId: "",
  };

  if (targetRole === "AGENT" && actorRole === "SUPERVISOR") {
    meta.requiresAdminApproval = true;
    meta.isApprovedByAdmin = false;
  }

  if (targetRole === "LAWYER" && actorRole === "TICKET CHECKER") {
    meta.requiresAdminApproval = true;
    meta.isApprovedByAdmin = false;
  }

  if (targetRole === "CUSTOMER") {
    const normalizedPlan = String(body.customerPlan || body.planType || "INDIVIDUAL").trim().toUpperCase();
    meta.customerPlan = normalizedPlan === "FLEET" ? "FLEET" : "INDIVIDUAL";
    meta.fleetGroupId = String(body.fleetGroupId || "").trim();

    if (actorRole === "AGENT") {
      meta.requiresAdminApproval = true;
      meta.isApprovedByAdmin = false;
      meta.supervisorId = req.user?.createdBy || null;
    }
  }

  return meta;
}

function buildUserPayload(body, forcedRole) {
  const targetRole = normalizeRole(forcedRole || body.role || "SUPERVISOR");
  const rawPassword = String(body.password || "").trim();

  // Lawyers can be created from ticket checker portal without manual password input.
  const password = rawPassword || (targetRole === "LAWYER" ? `Lawyer#${Math.random().toString(36).slice(-8)}A1` : "");

  return {
    firstName: String(body.firstName || "").trim(),
    lastName: String(body.lastName || "").trim(),
    email: normalizeEmail(body.email),
    password,
    role: forcedRole || body.role || "SUPERVISOR",
    phone: String(body.phone || "").trim(),
    office: String(body.office || "Lahore Office (LHR)").trim(),
    licenseNo: String(body.licenseNo || "").trim(),
    dot: String(body.dot || "").trim(),
    state: String(body.state || "").trim(),
    address: String(body.address || "").trim(),
  };
}

function getCustomerPlanName(plan = "INDIVIDUAL") {
  return normalizeCustomerPlan(plan) === "FLEET" ? "Fleet Plan" : "Individual Plan";
}

function getCustomerPlanLabel(plan = "INDIVIDUAL") {
  return normalizeCustomerPlan(plan) === "FLEET" ? "Fleet Protection Plan" : "Individual Protection Plan";
}

function buildCustomerOnboardingEmail({ customer, password, createdByRole }) {
  const frontendBase = String(process.env.FRONTEND_URL || "http://localhost:3000")
    .split(",")[0]
    .trim()
    .replace(/\/+$/, "");
  const loginUrl = `${frontendBase}/`;
  const planName = getCustomerPlanName(customer.customerPlan);
  const planSummary = getPlanAmountSummary(customer.customerPlan);
  const fullName = `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Customer";
  const creatorLabel = normalizeRole(createdByRole) === "AGENT" ? "agent" : "team";

  return {
    subject: "Welcome to NDD - Your Customer Account Details",
    text: [
      `Hello ${fullName},`,
      "",
      `Thank you for joining NDD through our ${creatorLabel}.`,
      `Plan: ${planName}`,
      `Plan price: $${planSummary.planPrice.toFixed(2)}`,
      `Total due now: $${planSummary.totalAmount.toFixed(2)}`,
      "",
      "Your login credentials:",
      `Email: ${customer.email}`,
      `Password: ${password}`,
      `Login URL: ${loginUrl}`,
      "",
      "Important note:",
      "You can only log in after you complete payment and an admin approves your account.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;">
          <h2 style="margin:0 0 12px;font-size:24px;color:#0b4c8c;">Welcome to NDD</h2>
          <p style="margin:0 0 16px;line-height:1.6;">Hello ${fullName}, thank you for joining NDD through our ${creatorLabel}.</p>
          <div style="border:1px solid #dbeafe;background:#eff6ff;border-radius:12px;padding:16px;margin-bottom:16px;">
            <p style="margin:0 0 8px;font-weight:700;">Plan Details</p>
            <p style="margin:4px 0;">Plan: <strong>${planName}</strong></p>
            <p style="margin:4px 0;">Plan price: <strong>$${planSummary.planPrice.toFixed(2)}</strong></p>
            <p style="margin:4px 0;">Total due now: <strong>$${planSummary.totalAmount.toFixed(2)}</strong></p>
          </div>
          <div style="border:1px solid #e2e8f0;background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:16px;">
            <p style="margin:0 0 8px;font-weight:700;">Login Credentials</p>
            <p style="margin:4px 0;">Email: <strong>${customer.email}</strong></p>
            <p style="margin:4px 0;">Password: <strong>${password}</strong></p>
            <p style="margin:8px 0 0;">Login URL: <a href="${loginUrl}">${loginUrl}</a></p>
          </div>
          <div style="border:1px solid #fde68a;background:#fffbeb;border-radius:12px;padding:16px;">
            <p style="margin:0;font-weight:700;color:#92400e;">Important</p>
            <p style="margin:8px 0 0;line-height:1.6;color:#78350f;">You can only log in after you complete payment and an admin approves your account.</p>
          </div>
        </div>
      </div>
    `,
  };
}

async function sendCustomerOnboardingEmail({ customer, password, createdByRole }) {
  const emailContent = buildCustomerOnboardingEmail({ customer, password, createdByRole });
  await sendEmail({
    to: customer.email,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html,
  });
}

async function createUserByRole(req, res, next, role, successLabel) {
  try {
    ensureCanCreateRole(req, role);

    const payload = buildUserPayload(req.body, role);

    if (!payload.firstName || !payload.lastName || !payload.email || !payload.password) {
      res.status(400);
      throw new Error("firstName, lastName, email, and password are required");
    }

    const normalizedEmail = payload.email;
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      res.status(409);
      throw new Error("Email already registered");
    }

    payload.email = normalizedEmail;
    const creationMeta = buildCreationMeta(req, role, req.body);
    const uploadedLicenses = Array.isArray(req.files?.licenseDocuments)
      ? req.files.licenseDocuments.map(mapUploadedFile).filter(Boolean)
      : [];
    const user = await User.create({
      ...payload,
      ...creationMeta,
      licenseFiles: uploadedLicenses,
    });

    let message = creationMeta.requiresAdminApproval
      ? `${successLabel} created and sent for admin approval`
      : `${successLabel} created successfully`;

    if (normalizeRole(role) === "CUSTOMER" && normalizeRole(req.user?.role) === "AGENT") {
      try {
        await sendCustomerOnboardingEmail({
          customer: user,
          password: payload.password,
          createdByRole: req.user?.role,
        });
        message = `${message}. Customer email sent successfully`;
      } catch (mailError) {
        console.error("Customer onboarding email failed:", mailError?.message || mailError);
        message = `${message}. Customer created but email delivery failed`;
      }
    }

    return res.status(201).json({
      message,
      user,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Email already registered" });
    }

    return next(error);
  }
}

export async function createUser(req, res, next) {
  const role = req.body.role || "SUPERVISOR";
  return createUserByRole(req, res, next, role, role);
}

export async function createSupervisor(req, res, next) {
  return createUserByRole(req, res, next, "SUPERVISOR", "Supervisor");
}

export async function createTicketChecker(req, res, next) {
  return createUserByRole(req, res, next, "TICKET CHECKER", "Ticket Checker");
}

export async function createLawyer(req, res, next) {
  return createUserByRole(req, res, next, "LAWYER", "Lawyer");
}

export async function createAgent(req, res, next) {
  return createUserByRole(req, res, next, "AGENT", "Agent");
}

export async function createCustomer(req, res, next) {
  return createUserByRole(req, res, next, "CUSTOMER", "Customer");
}

export async function createFleetCustomers(req, res, next) {
  try {
    ensureCanCreateRole(req, "CUSTOMER");

    const customers = Array.isArray(req.body?.customers) ? req.body.customers : [];

    if (customers.length < 2) {
      res.status(400);
      throw new Error("Fleet plan requires at least 2 customers");
    }

    const normalizedEmails = customers.map((entry) => normalizeEmail(entry?.email));
    const hasInvalidCustomer = customers.some((entry, index) => {
      const payload = buildUserPayload(entry, "CUSTOMER");
      return !payload.firstName || !payload.lastName || !payload.email || !payload.password || !normalizedEmails[index];
    });

    if (hasInvalidCustomer) {
      res.status(400);
      throw new Error("Each fleet customer requires firstName, lastName, email, and password");
    }

    if (new Set(normalizedEmails).size !== normalizedEmails.length) {
      res.status(409);
      throw new Error("Fleet customer emails must be unique");
    }

    const existingUsers = await User.find({ email: { $in: normalizedEmails } }).select("email");
    if (existingUsers.length) {
      res.status(409);
      throw new Error(`Email already registered: ${existingUsers[0].email}`);
    }

    const fleetGroupId = `FLEET-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const userDocs = customers.map((entry) => {
      const payload = buildUserPayload(entry, "CUSTOMER");
      const creationMeta = buildCreationMeta(req, "CUSTOMER", {
        ...entry,
        customerPlan: "FLEET",
        fleetGroupId,
      });

      return {
        ...payload,
        ...creationMeta,
      };
    });

    const createdUsers = await User.create(userDocs);

    let message = "Fleet customers created and sent for admin approval";

    if (normalizeRole(req.user?.role) === "AGENT") {
      await Promise.all(
        createdUsers.map(async (customer, index) => {
          try {
            await sendCustomerOnboardingEmail({
              customer,
              password: customers[index]?.password,
              createdByRole: req.user?.role,
            });
          } catch (mailError) {
            console.error("Fleet customer onboarding email failed:", mailError?.message || mailError);
          }
        })
      );

      message = "Fleet customers created and onboarding emails processed";
    }

    return res.status(201).json({
      message,
      count: createdUsers.length,
      users: createdUsers,
      fleetGroupId,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "One or more customer emails are already registered" });
    }

    return next(error);
  }
}

export async function listUsers(req, res, next) {
  try {
    const { role, isActive } = req.query;
    const filter = {};
    const allowedRoles = getViewableRoles(req.user?.role);

    if (!allowedRoles.length) {
      res.status(403);
      throw new Error("Forbidden: insufficient permissions");
    }

    if (role) {
      const normalizedRole = normalizeRole(role);
      ensureCanViewRole(req, normalizedRole);
      const scopedFilter = buildScopedFilter(req, normalizedRole);

      if (!scopedFilter) {
        res.status(403);
        throw new Error("Forbidden: insufficient permissions");
      }

      Object.assign(filter, scopedFilter);
    } else {
      const scopedFilters = allowedRoles.map((allowedRole) => buildScopedFilter(req, allowedRole)).filter(Boolean);

      if (!scopedFilters.length) {
        res.status(403);
        throw new Error("Forbidden: insufficient permissions");
      }

      filter.$or = scopedFilters;
    }

    if (typeof isActive !== "undefined") {
      filter.isActive = isActive === "true";
    }

    const users = await User.find(filter)
      .populate("createdBy", "firstName lastName email role")
      .populate("supervisorId", "firstName lastName email role")
      .sort({ createdAt: -1 });

    await Promise.all(
      users.map(async (user) => {
        if (normalizeRole(user.role) !== "CUSTOMER") {
          return;
        }

        if (ensureRecurringCustomerInvoices(user)) {
          await user.save();
        }
      })
    );

    return res.json({
      count: users.length,
      users,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getUserById(req, res, next) {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    ensureCanViewRole(req, user.role);

    if (!canAccessUserRecord(req, user)) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    return res.json({ user });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const { firstName, lastName, email, phone, office, licenseNo, dot, state, address } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    ensureCanViewRole(req, user.role);

    if (!canAccessUserRecord(req, user, { forWrite: true })) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    if (normalizeRole(req.user?.role) === "ADMIN" && ["AGENT", "CUSTOMER"].includes(normalizeRole(user.role))) {
      return res.status(403).json({ message: "Admin can only approve or block agents and customers" });
    }

    if (typeof firstName !== "undefined") {
      user.firstName = String(firstName).trim();
    }

    if (typeof lastName !== "undefined") {
      user.lastName = String(lastName).trim();
    }

    if (typeof phone !== "undefined") {
      user.phone = String(phone).trim();
    }

    if (typeof office !== "undefined") {
      user.office = String(office).trim();
    }

    if (typeof licenseNo !== "undefined") {
      user.licenseNo = String(licenseNo).trim();
    }

    if (typeof dot !== "undefined") {
      user.dot = String(dot).trim();
    }

    if (typeof state !== "undefined") {
      user.state = String(state).trim();
    }

    if (typeof address !== "undefined") {
      user.address = String(address).trim();
    }

    if (typeof email !== "undefined") {
      const normalizedEmail = String(email).trim().toLowerCase();
      const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });

      if (existingUser) {
        res.status(409);
        throw new Error("Email already registered");
      }

      user.email = normalizedEmail;
    }

    const uploadedLicenses = Array.isArray(req.files?.licenseDocuments)
      ? req.files.licenseDocuments.map(mapUploadedFile).filter(Boolean)
      : [];

    if (uploadedLicenses.length) {
      user.licenseFiles = [...(user.licenseFiles || []), ...uploadedLicenses];
    }

    await user.save();

    return res.json({
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return next(error);
  }
}

export async function updateUserStatus(req, res, next) {
  try {
    const { isActive } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    ensureCanViewRole(req, user.role);

    if (!canAccessUserRecord(req, user, { forWrite: true })) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    const nextIsActive = Boolean(isActive);
    user.isActive = nextIsActive;

    if (!nextIsActive && normalizeRole(user.role) === "CUSTOMER") {
      const now = new Date();
      user.subscriptionEndAt = now;
      user.subscriptionCancelledAt = now;
    }

    await user.save();

    await user.populate("createdBy", "firstName lastName email role");
    await user.populate("supervisorId", "firstName lastName email role");

    return res.json({
      message: "User status updated",
      user,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return next(error);
  }
}

export async function updateUserApproval(req, res, next) {
  try {
    const { isApprovedByAdmin } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    if (!user.requiresAdminApproval) {
      res.status(400);
      throw new Error("This user does not require admin approval");
    }

    if (normalizeRole(user.role) === "CUSTOMER" && user.paymentStatus !== "PAID_APPROVED") {
      res.status(400);
      throw new Error("Customer payment must be confirmed before admin approval");
    }

    user.isApprovedByAdmin = Boolean(isApprovedByAdmin);
    await user.save();

    await user.populate("createdBy", "firstName lastName email role");
    await user.populate("supervisorId", "firstName lastName email role");

    return res.json({
      message: user.isApprovedByAdmin ? "User approved successfully" : "User marked as pending approval",
      user,
    });
  } catch (error) {
    return next(error);
  }
}

export async function searchUserByPhone(req, res, next) {
  try {
    const phone = String(req.query?.phone || "").trim();
    const email = normalizeEmail(req.query?.email || "");

    if (!phone && !email) {
      res.status(400);
      throw new Error("Phone or email is required");
    }

    const query = phone ? { phone } : { email };

    const user = await User.findOne(query)
      .populate("createdBy", "firstName lastName email role")
      .populate("supervisorId", "firstName lastName email role");

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    return res.json({
      message: "User found",
      user,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return next(error);
  }
}

export async function claimCustomer(req, res, next) {
  try {
    const customer = await User.findById(req.params.id)
      .populate("createdBy", "firstName lastName email role")
      .populate("supervisorId", "firstName lastName email role");

    if (!customer || normalizeRole(customer.role) !== "CUSTOMER") {
      res.status(404);
      throw new Error("Customer not found");
    }

    const createdAtTime = new Date(customer.createdAt).getTime();
    const ageInDays = (Date.now() - createdAtTime) / (1000 * 60 * 60 * 24);
    const paymentStatus = normalizeRole(customer.paymentStatus);

    if (!customer.isActive || customer.isApprovedByAdmin || paymentStatus === "UNDER_REVIEW" || paymentStatus === "PAID_APPROVED") {
      res.status(400);
      throw new Error("This customer cannot be claimed");
    }

    if (ageInDays <= 7) {
      res.status(400);
      throw new Error("Customer is still reserved and cannot be claimed yet");
    }

    if (String(customer.createdBy?._id || customer.createdBy || "") === String(req.user?._id || "")) {
      res.status(400);
      throw new Error("Customer is already assigned to you");
    }

    customer.createdBy = req.user._id;
    customer.supervisorId = req.user?.createdBy || null;
    await customer.save();

    await customer.populate("createdBy", "firstName lastName email role");
    await customer.populate("supervisorId", "firstName lastName email role");

    return res.json({
      message: "Customer claimed successfully",
      user: customer,
    });
  } catch (error) {
    return next(error);
  }
}

function getFrontendBaseUrl(req) {
  const configured = String(process.env.FRONTEND_URL || "http://localhost:3000")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (configured.length) {
    return configured[0].replace(/\/+$/, "");
  }

  const protocol = req.protocol || "http";
  const host = req.get("host") || "localhost:3000";
  return `${protocol}://${host}`;
}

function createPaymentToken(customerId) {
  return jwt.sign(
    {
      type: "payment_checkout",
      customerId: String(customerId),
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.PAYMENT_LINK_EXPIRES_IN || "14d",
    }
  );
}

function createInvoiceNumber(customerId) {
  const stamp = Date.now();
  const suffix = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `INV-${String(customerId).slice(-6).toUpperCase()}-${stamp}-${suffix}`;
}

function getLatestOpenInvoice(customer) {
  if (!Array.isArray(customer?.invoices) || !customer.invoices.length) {
    return null;
  }

  return [...customer.invoices]
    .reverse()
    .find((entry) => ["UNPAID", "UNDER_REVIEW"].includes(String(entry?.status || "").toUpperCase())) || null;
}

function ensureCurrentInvoice(customer) {
  const existing = getLatestOpenInvoice(customer);
  const planSummary = getPlanAmountSummary(customer?.customerPlan);

  if (existing) {
    existing.amount = planSummary.totalAmount;
    return existing;
  }

  customer.invoices.push({
    invoiceNumber: createInvoiceNumber(customer._id),
    amount: planSummary.totalAmount,
    status: "UNPAID",
    paymentMethod: "NONE",
    issuedAt: new Date(),
    paidAt: null,
  });

  return customer.invoices[customer.invoices.length - 1];
}

function ensureRecurringCustomerInvoices(customer, referenceDate = new Date()) {
  const paymentStatus = normalizeRole(customer?.paymentStatus);
  if (!customer || !["PAID_APPROVED", "UNDER_REVIEW"].includes(paymentStatus)) {
    return false;
  }

  if (customer.subscriptionCancelledAt) {
    return false;
  }

  const startedAt = customer.subscriptionStartAt ? new Date(customer.subscriptionStartAt) : null;
  if (!startedAt || Number.isNaN(startedAt.getTime())) {
    return false;
  }

  if (!Array.isArray(customer.invoices)) {
    customer.invoices = [];
  }

  let changed = false;
  let cycleEndAt = customer.subscriptionEndAt ? new Date(customer.subscriptionEndAt) : null;

  if (!cycleEndAt || Number.isNaN(cycleEndAt.getTime()) || cycleEndAt.getTime() <= startedAt.getTime()) {
    cycleEndAt = new Date(startedAt.getTime() + BILLING_CYCLE_MS);
    customer.subscriptionEndAt = cycleEndAt;
    changed = true;
  }

  const now = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const planSummary = getPlanAmountSummary(customer?.customerPlan);
  let safetyCounter = 0;

  while (now.getTime() >= cycleEndAt.getTime() && safetyCounter < 24) {
    const cycleBoundaryTime = cycleEndAt.getTime();
    const hasInvoiceForCycleBoundary = customer.invoices.some((entry) => {
      const issuedTime = new Date(entry?.issuedAt || 0).getTime();
      return Number.isFinite(issuedTime) && Math.abs(issuedTime - cycleBoundaryTime) < 60 * 1000;
    });

    if (!hasInvoiceForCycleBoundary) {
      customer.invoices.push({
        invoiceNumber: createInvoiceNumber(customer._id),
        amount: planSummary.totalAmount,
        status: "UNPAID",
        paymentMethod: "NONE",
        issuedAt: new Date(cycleBoundaryTime),
        paidAt: null,
      });
      changed = true;
    }

    const nextCycleStart = new Date(cycleBoundaryTime);
    const nextCycleEnd = new Date(cycleBoundaryTime + BILLING_CYCLE_MS);
    customer.subscriptionStartAt = nextCycleStart;
    customer.subscriptionEndAt = nextCycleEnd;
    cycleEndAt = nextCycleEnd;
    changed = true;
    safetyCounter += 1;
  }

  return changed;
}

function normalizePaymentMethod(value = "") {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "CREDIT_CARD" || normalized === "BANK_TRANSFER") {
    return normalized;
  }

  return "CREDIT_CARD";
}

function normalizeCardBrand(value = "") {
  const brand = String(value || "").trim().toUpperCase();
  const allowed = ["VISA", "MASTERCARD", "AMEX", "DISCOVER"];
  return allowed.includes(brand) ? brand : "";
}

function normalizeCardType(value = "") {
  const cardType = String(value || "").trim().toUpperCase();
  return ["CREDIT", "DEBIT"].includes(cardType) ? cardType : "";
}

function extractCardLast4(value = "") {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.slice(-4);
}

function normalizePaymentCard(payload = {}) {
  return {
    brand: normalizeCardBrand(payload.brand),
    cardType: normalizeCardType(payload.cardType),
    last4: extractCardLast4(payload.last4 || payload.cardNumber),
  };
}

function buildInvoiceHtml({ customer, paymentUrl }) {
  const fullName = `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Customer";
  const planLabel = getCustomerPlanLabel(customer?.customerPlan);
  const planSummary = getPlanAmountSummary(customer?.customerPlan);
  const frontendBase = String(process.env.FRONTEND_URL || "http://localhost:3000")
    .split(",")[0]
    .trim()
    .replace(/\/+$/, "");
  const logoUrl = `${frontendBase}/ndd%20logo%20without%20bg.webp`;

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>NDD Payment Invoice</title>
</head>
<body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#0f172a;">
  <div style="max-width:640px;margin:0 auto;padding:20px 16px;">
    <div style="text-align:center;padding:8px 0 18px;">
      <img src="${logoUrl}" alt="NDD" style="height:56px;object-fit:contain;" />
      <div style="font-size:12px;color:#94a3b8;margin-top:6px;">Secure Checkout</div>
    </div>

    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
      <div style="font-size:12px;color:#64748b;">Order for ${fullName}</div>
      <div style="font-size:26px;font-weight:700;margin-top:4px;">${planLabel}</div>
      <div style="font-size:13px;color:#475569;margin-top:4px;">Full coverage protection with 24/7 support for USA</div>

      <div style="margin-top:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;">
        <table style="width:100%;font-size:14px;color:#0f172a;border-collapse:collapse;">
          <tr><td style="padding:4px 0;">Plan Price</td><td style="padding:4px 0;text-align:right;font-weight:600;">$${planSummary.planPrice.toFixed(2)}</td></tr>
          <tr><td style="padding:4px 0;">Processing Fee</td><td style="padding:4px 0;text-align:right;font-weight:600;">$${planSummary.processingFee.toFixed(2)}</td></tr>
          <tr><td colspan="2" style="border-top:1px solid #e2e8f0;padding-top:8px;"></td></tr>
          <tr><td style="font-weight:700;">Total Amount</td><td style="text-align:right;font-weight:800;font-size:20px;color:#0b4c8c;">$${planSummary.totalAmount.toFixed(2)}</td></tr>
        </table>
      </div>

      <div style="margin-top:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:8px;">Customer Information</div>
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr><td style="padding:4px 0;color:#64748b;">Name</td><td style="padding:4px 0;text-align:right;font-weight:600;">${fullName}</td></tr>
          <tr><td style="padding:4px 0;color:#64748b;">Email</td><td style="padding:4px 0;text-align:right;font-weight:600;">${customer.email || "-"}</td></tr>
          <tr><td style="padding:4px 0;color:#64748b;">Phone</td><td style="padding:4px 0;text-align:right;font-weight:600;">${customer.phone || "-"}</td></tr>
        </table>
      </div>

      <div style="margin-top:16px;">
        <a href="${paymentUrl}" style="display:inline-block;background:#0b4c8c;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;">Pay $${planSummary.totalAmount.toFixed(2)}</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function generateCustomerPaymentLink(req, res, next) {
  try {
    const customer = await User.findById(req.params.id).populate("createdBy", "firstName lastName email role");

    if (!customer || normalizeRole(customer.role) !== "CUSTOMER") {
      res.status(404);
      throw new Error("Customer not found");
    }

    if (!canManageCustomerPayment(req, customer)) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    ensureCurrentInvoice(customer);
    await customer.save();
    const planSummary = getPlanAmountSummary(customer.customerPlan);

    const token = createPaymentToken(customer._id);
    const paymentUrl = `${getFrontendBaseUrl(req)}/payment/${token}`;

    return res.json({
      message: "Payment link generated",
      paymentUrl,
      amount: planSummary.totalAmount,
    });
  } catch (error) {
    return next(error);
  }
}

export async function sendCustomerPaymentInvoiceEmail(req, res, next) {
  try {
    const customer = await User.findById(req.params.id).populate("createdBy", "firstName lastName email role");

    if (!customer || normalizeRole(customer.role) !== "CUSTOMER") {
      res.status(404);
      throw new Error("Customer not found");
    }

    if (!canManageCustomerPayment(req, customer)) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    ensureCurrentInvoice(customer);
    await customer.save();

    const token = createPaymentToken(customer._id);
    const paymentUrl = `${getFrontendBaseUrl(req)}/payment/${token}`;
    const html = buildInvoiceHtml({ customer, paymentUrl });
    const planLabel = getCustomerPlanLabel(customer.customerPlan);

    await sendEmail({
      to: customer.email,
      subject: `NDD Payment Invoice - ${planLabel}`,
      text: `Please complete your payment using this secure link: ${paymentUrl}`,
      html,
    });

    return res.json({
      message: "Payment invoice sent successfully",
      paymentUrl,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getPaymentCheckoutDetails(req, res, next) {
  try {
    const { token } = req.params;
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload?.type !== "payment_checkout" || !payload?.customerId) {
      res.status(400);
      throw new Error("Invalid payment token");
    }

    const customer = await User.findById(payload.customerId).select(
      "firstName lastName email phone office createdAt customerPlan paymentStatus paymentMethod paymentCard paymentSubmittedAt subscriptionStartAt subscriptionEndAt subscriptionCancelledAt invoices"
    );

    if (!customer) {
      res.status(404);
      throw new Error("Customer not found");
    }

    if (ensureRecurringCustomerInvoices(customer)) {
      await customer.save();
    }

    const planSummary = getPlanAmountSummary(customer.customerPlan);

    const latestInvoice = getLatestOpenInvoice(customer) || [...(customer.invoices || [])].reverse()[0] || null;

    return res.json({
      customer,
      invoice: {
        invoiceNumber: latestInvoice?.invoiceNumber || "",
        status: latestInvoice?.status || "UNPAID",
        planName: getCustomerPlanLabel(customer.customerPlan),
        planPrice: planSummary.planPrice,
        processingFee: planSummary.processingFee,
        totalAmount: planSummary.totalAmount,
        billingCycle: "monthly",
      },
    });
  } catch (error) {
    if (error?.name === "TokenExpiredError" || error?.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Payment link is invalid or expired" });
    }

    return next(error);
  }
}

export async function submitPaymentCheckout(req, res, next) {
  try {
    const { token } = req.params;
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload?.type !== "payment_checkout" || !payload?.customerId) {
      res.status(400);
      throw new Error("Invalid payment token");
    }

    const customer = await User.findById(payload.customerId);

    if (!customer || normalizeRole(customer.role) !== "CUSTOMER") {
      res.status(404);
      throw new Error("Customer not found");
    }

    const paymentMethod = normalizePaymentMethod(req.body?.paymentMethod);
    const paymentCard = normalizePaymentCard(req.body?.paymentCard || {});
    const now = new Date();

    customer.paymentStatus = "UNDER_REVIEW";
    customer.paymentMethod = paymentMethod;
    customer.paymentCard = paymentMethod === "CREDIT_CARD" ? paymentCard : { brand: "", cardType: "", last4: "" };
    customer.paymentSubmittedAt = now;
    customer.paymentConfirmedAt = null;
    customer.requiresAdminApproval = true;
    customer.isApprovedByAdmin = false;
    customer.subscriptionStartAt = now;
    customer.subscriptionEndAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    customer.subscriptionCancelledAt = null;

    const openInvoice = ensureCurrentInvoice(customer);
    openInvoice.status = "UNDER_REVIEW";
    openInvoice.paymentMethod = paymentMethod;
    openInvoice.paidAt = null;

    await customer.save();

    return res.json({
      message: "Payment submitted successfully. Your payment is under review.",
      user: customer,
    });
  } catch (error) {
    if (error?.name === "TokenExpiredError" || error?.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Payment link is invalid or expired" });
    }

    return next(error);
  }
}

export async function confirmCustomerPayment(req, res, next) {
  try {
    const customer = await User.findById(req.params.id)
      .populate("createdBy", "firstName lastName email role")
      .populate("supervisorId", "firstName lastName email role");

    if (!customer || normalizeRole(customer.role) !== "CUSTOMER") {
      res.status(404);
      throw new Error("Customer not found");
    }

    if (customer.paymentStatus !== "UNDER_REVIEW") {
      res.status(400);
      throw new Error("Customer payment is not under review");
    }

    const now = new Date();
    customer.paymentStatus = "PAID_APPROVED";
    customer.paymentConfirmedAt = now;
    customer.requiresAdminApproval = true;
    customer.isApprovedByAdmin = false;

    const openInvoice = getLatestOpenInvoice(customer) || ensureCurrentInvoice(customer);
    openInvoice.status = "PAID";
    openInvoice.paymentMethod = customer.paymentMethod || "NONE";
    openInvoice.paidAt = now;

    await customer.save();

    await customer.populate("createdBy", "firstName lastName email role");
    await customer.populate("supervisorId", "firstName lastName email role");

    return res.json({
      message: "Payment confirmed. Customer is now ready for admin approval.",
      user: customer,
    });
  } catch (error) {
    return next(error);
  }
}

export async function cancelCustomerSubscription(req, res, next) {
  try {
    const customer = await User.findById(req.params.id)
      .populate("createdBy", "firstName lastName email role")
      .populate("supervisorId", "firstName lastName email role");

    if (!customer || normalizeRole(customer.role) !== "CUSTOMER") {
      res.status(404);
      throw new Error("Customer not found");
    }

    const now = new Date();
    customer.subscriptionEndAt = now;
    customer.subscriptionCancelledAt = now;

    await customer.save();

    await customer.populate("createdBy", "firstName lastName email role");
    await customer.populate("supervisorId", "firstName lastName email role");

    return res.json({
      message: "Subscription cancelled successfully",
      user: customer,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getCustomerInvoices(req, res, next) {
  try {
    const customer = await User.findById(req.params.id)
      .populate("createdBy", "firstName lastName email role")
      .populate("supervisorId", "firstName lastName email role");

    if (!customer || normalizeRole(customer.role) !== "CUSTOMER") {
      res.status(404);
      throw new Error("Customer not found");
    }

    if (!canManageCustomerPayment(req, customer) && !["ADMIN", "TICKET CHECKER"].includes(normalizeRole(req.user?.role))) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    if (ensureRecurringCustomerInvoices(customer)) {
      await customer.save();
    }

    const invoices = Array.isArray(customer.invoices) ? [...customer.invoices].reverse() : [];

    return res.json({
      count: invoices.length,
      invoices,
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    if (normalizeRole(req.user?.role) !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden: only admins can delete members" });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    if (normalizeRole(user.role) === "ADMIN") {
      return res.status(400).json({ message: "Admin accounts cannot be deleted" });
    }

    if (normalizeRole(user.role) === "CUSTOMER") {
      return res.status(400).json({ message: "Members cannot be deleted once they are added" });
    }

    await user.deleteOne();

    return res.json({ message: "Member deleted successfully" });
  } catch (error) {
    return next(error);
  }
}
