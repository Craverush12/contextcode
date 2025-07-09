import { AsyncLocalStorage } from "async_hooks";

// Create async local storage for request context
const asyncLocalStorage = new AsyncLocalStorage();

export const requestContextMiddleware = (req, res, next) => {
  // Store request context that can be accessed throughout the request lifecycle
  const context = {
    requestId: req.requestId,
    userId: req.userID,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  };

  asyncLocalStorage.run(context, () => {
    next();
  });
};

export const getRequestContext = () => {
  return asyncLocalStorage.getStore() || {};
};
