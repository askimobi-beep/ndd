import express from "express";
import {
  createTicket,
  deleteTicket,
  getTicketById,
  listTickets,
  updateTicket,
} from "../controllers/ticketController.js";
import { authorizeRoles, protect } from "../middleware/authMiddleware.js";
import { uploadTicketFiles } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.use(protect);

router
  .route("/")
  .get(authorizeRoles("ADMIN", "TICKET CHECKER", "SUPERVISOR", "AGENT", "CUSTOMER"), listTickets)
  .post(authorizeRoles("ADMIN", "TICKET CHECKER"), uploadTicketFiles, createTicket);

router
  .route("/:id")
  .get(authorizeRoles("ADMIN", "TICKET CHECKER", "SUPERVISOR", "AGENT", "CUSTOMER"), getTicketById)
  .patch(authorizeRoles("ADMIN", "TICKET CHECKER"), uploadTicketFiles, updateTicket)
  .delete(authorizeRoles("ADMIN", "TICKET CHECKER"), deleteTicket);

export default router;
