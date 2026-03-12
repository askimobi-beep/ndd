import User from "../models/User.js";

const MANAGEABLE_ROLES = {
  ADMIN: ["SUPERVISOR", "TICKET CHECKER", "AGENT", "CUSTOMER"],
  SUPERVISOR: ["AGENT"],
  AGENT: ["CUSTOMER"],
};

function normalizeRole(role = "") {
  return String(role).trim().toUpperCase();
}

function getManageableRoles(actorRole) {
  return MANAGEABLE_ROLES[normalizeRole(actorRole)] || [];
}

function ensureCanManageRole(req, role) {
  const targetRole = normalizeRole(role);
  const allowedRoles = getManageableRoles(req.user?.role);

  if (!allowedRoles.includes(targetRole)) {
    const error = new Error("Forbidden: insufficient permissions");
    error.statusCode = 403;
    throw error;
  }
}

function buildUserPayload(body, forcedRole) {
  return {
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    password: body.password,
    role: forcedRole || body.role || "SUPERVISOR",
    phone: body.phone || "",
    office: body.office || "Lahore Office (LHR)",
  };
}

async function createUserByRole(req, res, next, role, successLabel) {
  try {
    ensureCanManageRole(req, role);

    const payload = buildUserPayload(req.body, role);

    if (!payload.firstName || !payload.lastName || !payload.email || !payload.password) {
      res.status(400);
      throw new Error("firstName, lastName, email, and password are required");
    }

    const normalizedEmail = payload.email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      res.status(409);
      throw new Error("Email already registered");
    }

    payload.email = normalizedEmail;
    const user = await User.create(payload);

    return res.status(201).json({
      message: `${successLabel} created successfully`,
      user,
    });
  } catch (error) {
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

export async function listUsers(req, res, next) {
  try {
    const { role, isActive } = req.query;
    const filter = {};
    const allowedRoles = getManageableRoles(req.user?.role);

    if (!allowedRoles.length) {
      res.status(403);
      throw new Error("Forbidden: insufficient permissions");
    }

    if (role) {
      const normalizedRole = normalizeRole(role);

      if (!allowedRoles.includes(normalizedRole)) {
        res.status(403);
        throw new Error("Forbidden: insufficient permissions");
      }

      filter.role = normalizedRole;
    } else {
      filter.role = { $in: allowedRoles };
    }

    if (typeof isActive !== "undefined") {
      filter.isActive = isActive === "true";
    }

    const users = await User.find(filter).sort({ createdAt: -1 });

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

    ensureCanManageRole(req, user.role);

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

    ensureCanManageRole(req, user.role);

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

    ensureCanManageRole(req, user.role);

    user.isActive = Boolean(isActive);
    await user.save();

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
