import express from "express";
import {
  createAgent,
  createCustomer,
  createFleetCustomers,
  createSupervisor,
  createTicketChecker,
  createLawyer,
  createUser,
  claimCustomer,
  confirmCustomerPayment,
  generateCustomerPaymentLink,
  getCustomerInvoices,
  getPaymentCheckoutDetails,
  submitPaymentCheckout,
  cancelCustomerSubscription,
  getUserById,
  listUsers,
  sendCustomerPaymentInvoiceEmail,
  updateUserApproval,
  updateUser,
  updateUserStatus,
  searchUserByPhone,
} from "../controllers/userController.js";
import { authorizeRoles, protect } from "../middleware/authMiddleware.js";
import { uploadLicenseFiles } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.get("/payment-checkout/:token", getPaymentCheckoutDetails);
router.post("/payment-checkout/:token/submit", submitPaymentCheckout);

router.use(protect);

router.get("/search", authorizeRoles("ADMIN", "SUPERVISOR", "AGENT", "TICKET CHECKER"), searchUserByPhone);
router.route("/").post(authorizeRoles("ADMIN"), createUser).get(authorizeRoles("ADMIN", "SUPERVISOR", "AGENT", "TICKET CHECKER"), listUsers);
router.post("/supervisors", authorizeRoles("ADMIN"), createSupervisor);
router.post("/ticket-checkers", authorizeRoles("ADMIN"), createTicketChecker);
router.post("/ticket-makers", authorizeRoles("ADMIN"), createTicketChecker);
router.post("/lawyers", authorizeRoles("TICKET CHECKER"), uploadLicenseFiles, createLawyer);
router.post("/agents", authorizeRoles("SUPERVISOR"), createAgent);
router.post("/customers", authorizeRoles("ADMIN", "AGENT"), uploadLicenseFiles, createCustomer);
router.post("/customers/fleet", authorizeRoles("AGENT"), createFleetCustomers);
router.post("/:id/claim", authorizeRoles("AGENT"), claimCustomer);
router.get("/:id/payment-link", authorizeRoles("ADMIN", "SUPERVISOR", "AGENT"), generateCustomerPaymentLink);
router.post("/:id/payment-link/email", authorizeRoles("ADMIN", "SUPERVISOR", "AGENT"), sendCustomerPaymentInvoiceEmail);
router
  .route("/:id")
  .get(authorizeRoles("ADMIN", "SUPERVISOR", "AGENT", "TICKET CHECKER"), getUserById)
  .patch(
    authorizeRoles("ADMIN", "SUPERVISOR", "AGENT", "TICKET CHECKER"),
    uploadLicenseFiles,
    updateUser
  );
router.route("/:id/status").patch(authorizeRoles("ADMIN", "SUPERVISOR", "AGENT", "TICKET CHECKER"), updateUserStatus);
router.route("/:id/approval").patch(authorizeRoles("ADMIN"), updateUserApproval);
router.route("/:id/payment-confirmation").patch(authorizeRoles("ADMIN"), confirmCustomerPayment);
router.route("/:id/invoices").get(authorizeRoles("ADMIN", "SUPERVISOR", "AGENT", "TICKET CHECKER"), getCustomerInvoices);
router.route("/:id/cancel-subscription").patch(authorizeRoles("ADMIN"), cancelCustomerSubscription);

export default router;
