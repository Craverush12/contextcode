import { v4 as uuidv4 } from "uuid";

export const requestIdMiddleware = (req, res, next) => {
  // Generate a 16-character UUID-based request ID
  const fullUuid = uuidv4().replace(/-/g, "");
  const reqId = `req-${fullUuid.substring(0, 16)}`;

  // Attach to request object
  req.requestId = reqId;

  // Also set as response header for debugging (optional)
  res.setHeader("X-Request-ID", reqId);

  next();
};
