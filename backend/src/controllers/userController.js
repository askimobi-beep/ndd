import User from "../models/User.js";

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

function buildScopedFilter(req, role) {
  const actorRole = normalizeRole(req.user?.role);
  const actorId = req.user?._id;
  const targetRole = normalizeRole(role);

  if (actorRole === "ADMIN") {
    return { role: targetRole };
  }

  if (actorRole === "SUPERVISOR") {
    if (targetRole === "AGENT") {
      return { role: "AGENT", createdBy: actorId };
    }

    if (targetRole === "CUSTOMER") {
      return { role: "CUSTOMER", supervisorId: actorId };
    }

    return null;
  }

  if (actorRole === "AGENT") {
    if (targetRole === "CUSTOMER") {
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
