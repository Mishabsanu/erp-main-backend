import { Role } from "../models/Role.model.js";

export const allowRoles = (permission) => async (req, res, next) => {
  try {
    const [module, action] = permission.split(":");
    if (!module || !action) {
      return res.status(400).json({ message: "Invalid permission format" });
    }

    const userRole = await Role.findById(req.user.role);
    if (!userRole) {
      return res.status(403).json({ message: "Access Denied: Role not found" });
    }

    if (
      userRole.isSuperAdmin ||
      (userRole.permissions &&
        userRole.permissions[module] &&
        userRole.permissions[module][action])
    ) {
      return next();
    }

    return res.status(403).json({ message: "Access Denied" });
  } catch (error) {
    next(error);
  }
};
