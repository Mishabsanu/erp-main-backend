import jwt from "jsonwebtoken";
import { config } from "../config/index.js";

export const signAccessToken = (payload) =>
  jwt.sign(payload, config.jwtAccessSecret, {
    expiresIn: config.accessTokenExpires,
  });

export const signRefreshToken = (payload) =>
  jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: config.refreshTokenExpires,
  });

export const verifyAccessToken = (token) =>
  jwt.verify(token, config.jwtAccessSecret);
export const verifyRefreshToken = (token) =>
  jwt.verify(token, config.jwtRefreshSecret);
