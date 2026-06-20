import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("release abandoned checkout reservations", { minutes: 5 }, internal.orders.cleanupExpiredCheckoutIntents);
crons.interval("reconcile captured Razorpay payments", { minutes: 5 }, internal.orders.reconcileCapturedPayments);

export default crons;
