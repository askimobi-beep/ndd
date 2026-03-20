import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js";

const PLAN_PRICE = 49.99;
const PROCESSING_FEE = 1.85;
const TOTAL_AMOUNT = Number((PLAN_PRICE + PROCESSING_FEE).toFixed(2));

const CREATABLE_ROLES = {
  ADMIN: ["SUPERVISOR", "TICKET CHECKER", "CUSTOMER"],
  SUPERVISOR: ["AGENT"],
  AGENT: ["CUSTOMER"],
};

const VIEWABLE_ROLES = {
  ADMIN: ["SUPERVISOR", "TICKET CHECKER", "AGENT", "CUSTOMER"],
  SUPERVISOR: ["AGENT", "CUSTOMER"],
  AGENT: ["CUSTOMER"],
};

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function normalizeRole(role = "") {
  return String(role).trim().toUpperCase();
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
  const actorId = String(req.user?._id || "");
  const recordRole = normalizeRole(user?.role);
  const createdBy = String(user?.createdBy || "");
  const supervisorId = String(user?.supervisorId || "");

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

  return false;
}

function canManageCustomerPayment(req, user) {
  const actorRole = normalizeRole(req.user?.role);
  const actorId = String(req.user?._id || "");
  const recordRole = normalizeRole(user?.role);
  const createdBy = String(user?.createdBy || "");

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
        return { role: "CUSTOMER" };
      }

      return { role: "CUSTOMER", createdBy: actorId };
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
  return {
    firstName: String(body.firstName || "").trim(),
    lastName: String(body.lastName || "").trim(),
    email: normalizeEmail(body.email),
    password: body.password,
    role: forcedRole || body.role || "SUPERVISOR",
    phone: String(body.phone || "").trim(),
    office: String(body.office || "Lahore Office (LHR)").trim(),
    licenseNo: String(body.licenseNo || "").trim(),
    dot: String(body.dot || "").trim(),
    state: String(body.state || "").trim(),
  };
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
    const user = await User.create({
      ...payload,
      ...creationMeta,
    });

    return res.status(201).json({
      message: creationMeta.requiresAdminApproval
        ? `${successLabel} created and sent for admin approval`
        : `${successLabel} created successfully`,
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

    return res.status(201).json({
      message: "Fleet customers created and sent for admin approval",
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
    const { firstName, lastName, email, phone, office } = req.body;
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

    if (typeof email !== "undefined") {
      const normalizedEmail = String(email).trim().toLowerCase();
      const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });

      if (existingUser) {
        res.status(409);
        throw new Error("Email already registered");
      }

      user.email = normalizedEmail;
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

    user.isActive = Boolean(isActive);
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
    const { phone } = req.query;

    if (!phone) {
      res.status(400);
      throw new Error("Phone number is required");
    }

    const user = await User.findOne({ phone: String(phone).trim() })
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

function buildInvoiceHtml({ customer, paymentUrl }) {
  const fullName = `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Customer";
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
      <div style="font-size:26px;font-weight:700;margin-top:4px;">Individual Protection Plan</div>
      <div style="font-size:13px;color:#475569;margin-top:4px;">Full coverage protection with 24/7 support for USA</div>

      <div style="margin-top:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;">
        <table style="width:100%;font-size:14px;color:#0f172a;border-collapse:collapse;">
          <tr><td style="padding:4px 0;">Plan Price</td><td style="padding:4px 0;text-align:right;font-weight:600;">$${PLAN_PRICE.toFixed(2)}</td></tr>
          <tr><td style="padding:4px 0;">Processing Fee</td><td style="padding:4px 0;text-align:right;font-weight:600;">$${PROCESSING_FEE.toFixed(2)}</td></tr>
          <tr><td colspan="2" style="border-top:1px solid #e2e8f0;padding-top:8px;"></td></tr>
          <tr><td style="font-weight:700;">Total Amount</td><td style="text-align:right;font-weight:800;font-size:20px;color:#0b4c8c;">$${TOTAL_AMOUNT.toFixed(2)}</td></tr>
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
        <a href="${paymentUrl}" style="display:inline-block;background:#0b4c8c;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;">Pay $${TOTAL_AMOUNT.toFixed(2)}</a>
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

    const token = createPaymentToken(customer._id);
    const paymentUrl = `${getFrontendBaseUrl(req)}/payment/${token}`;

    return res.json({
      message: "Payment link generated",
      paymentUrl,
      amount: TOTAL_AMOUNT,
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

    const token = createPaymentToken(customer._id);
    const paymentUrl = `${getFrontendBaseUrl(req)}/payment/${token}`;
    const html = buildInvoiceHtml({ customer, paymentUrl });

    await sendEmail({
      to: customer.email,
      subject: "NDD Payment Invoice - Individual Protection Plan",
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

    const customer = await User.findById(payload.customerId).select("firstName lastName email phone office createdAt paymentStatus paymentSubmittedAt");

    if (!customer) {
      res.status(404);
      throw new Error("Customer not found");
    }

    return res.json({
      customer,
      invoice: {
        planName: "Individual Protection Plan",
        planPrice: PLAN_PRICE,
        processingFee: PROCESSING_FEE,
        totalAmount: TOTAL_AMOUNT,
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

    if (customer.paymentStatus !== "UNDER_REVIEW") {
      customer.paymentStatus = "UNDER_REVIEW";
      customer.paymentSubmittedAt = new Date();
      customer.requiresAdminApproval = true;
      customer.isApprovedByAdmin = false;
      await customer.save();
    }

    return res.json({
      message: "Payment submitted successfully. Your account is now under review.",
      user: customer,
    });
  } catch (error) {
    if (error?.name === "TokenExpiredError" || error?.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Payment link is invalid or expired" });
    }

    return next(error);
  }
}
