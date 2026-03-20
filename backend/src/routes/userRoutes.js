import express from "express";
import {
  createAgent,
  createCustomer,
  createFleetCustomers,
  createSupervisor,
  createTicketChecker,
  createUser,
  generateCustomerPaymentLink,
  getPaymentCheckoutDetails,
  submitPaymentCheckout,
  getUserById,
  listUsers,
  sendCustomerPaymentInvoiceEmail,
  updateUserApproval,
  updateUser,
  updateUserStatus,
  searchUserByPhone,
} from "../controllers/userController.js";
import { authorizeRoles, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/payment-checkout/:token", getPaymentCheckoutDetails);
router.post("/payment-checkout/:token/submit", submitPaymentCheckout);

router.use(protect);

router.get("/search", authorizeRoles("ADMIN", "SUPERVISOR", "AGENT"), searchUserByPhone);
router.route("/").post(authorizeRoles("ADMIN"), createUser).get(authorizeRoles("ADMIN", "SUPERVISOR", "AGENT"), listUsers);
router.post("/supervisors", authorizeRoles("ADMIN"), createSupervisor);
router.post("/ticket-checkers", authorizeRoles("ADMIN"), createTicketChecker);
router.post("/ticket-makers", authorizeRoles("ADMIN"), createTicketChecker);
router.post("/agents", authorizeRoles("SUPERVISOR"), createAgent);
router.post("/customers", authorizeRoles("ADMIN", "AGENT"), createCustomer);
router.post("/customers/fleet", authorizeRoles("AGENT"), createFleetCustomers);
router.get("/:id/payment-link", authorizeRoles("ADMIN", "SUPERVISOR", "AGENT"), generateCustomerPaymentLink);
router.post("/:id/payment-link/email", authorizeRoles("ADMIN", "SUPERVISOR", "AGENT"), sendCustomerPaymentInvoiceEmail);
router.route("/:id").get(authorizeRoles("ADMIN", "SUPERVISOR", "AGENT"), getUserById).patch(authorizeRoles("ADMIN", "SUPERVISOR", "AGENT"), updateUser);
router.route("/:id/status").patch(authorizeRoles("ADMIN", "SUPERVISOR", "AGENT"), updateUserStatus);
router.route("/:id/approval").patch(authorizeRoles("ADMIN"), updateUserApproval);

export default router;
