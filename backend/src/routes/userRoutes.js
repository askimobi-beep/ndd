import express from "express";
import {
  createAgent,
  createCustomer,
  createSupervisor,
  createTicketChecker,
  createUser,
  getUserById,
  listUsers,
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
router.post("/agents", authorizeRoles("ADMIN", "SUPERVISOR"), createAgent);
router.post("/customers", authorizeRoles("ADMIN", "AGENT"), createCustomer);
router.route("/:id").get(authorizeRoles("ADMIN", "SUPERVISOR", "AGENT"), getUserById).patch(authorizeRoles("ADMIN", "SUPERVISOR", "AGENT"), updateUser);
router.route("/:id/status").patch(authorizeRoles("ADMIN", "SUPERVISOR", "AGENT"), updateUserStatus);

export default router;
