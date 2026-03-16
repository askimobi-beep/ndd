import express from "express";
import {
  createAgent,
  createCustomer,
  createFleetCustomers,
  createSupervisor,
  createTicketChecker,
  createUser,
  getUserById,
  listUsers,
  updateUserApproval,
  updateUser,
  updateUserStatus,
} from "../controllers/userController.js";
import { authorizeRoles, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/").post(authorizeRoles("ADMIN"), createUser).get(authorizeRoles("ADMIN", "SUPERVISOR", "AGENT"), listUsers);
router.post("/supervisors", authorizeRoles("ADMIN"), createSupervisor);
router.post("/ticket-checkers", authorizeRoles("ADMIN"), createTicketChecker);
router.post("/ticket-makers", authorizeRoles("ADMIN"), createTicketChecker);
router.post("/agents", authorizeRoles("SUPERVISOR"), createAgent);
router.post("/customers", authorizeRoles("ADMIN", "AGENT"), createCustomer);
router.post("/customers/fleet", authorizeRoles("AGENT"), createFleetCustomers);
router.route("/:id").get(authorizeRoles("ADMIN", "SUPERVISOR", "AGENT"), getUserById).patch(authorizeRoles("ADMIN", "SUPERVISOR", "AGENT"), updateUser);
router.route("/:id/status").patch(authorizeRoles("ADMIN", "SUPERVISOR", "AGENT"), updateUserStatus);
router.route("/:id/approval").patch(authorizeRoles("ADMIN"), updateUserApproval);

export default router;
