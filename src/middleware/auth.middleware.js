import { verifyAccessToken } from "../utils/jwt.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;
    if (!token) {
      return res.status(401).json({ message: "Access token not found" });
    } else {
      const decoded = verifyAccessToken(token);
      req.user = decoded;
      next();
    }
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
