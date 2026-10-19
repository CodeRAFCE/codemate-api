import type { CookieOptions } from "express";

export const cookieOptions: CookieOptions = {
  httpOnly: true, //"Browser JavaScript cannot touch or steal this cookie.(Protects from XSS)"
  sameSite: "lax", //"Only send this cookie if the user is actually on my website."
  secure: process.env.NODE_ENV === "production", //"Only send this cookie over encrypted HTTPS connections."
};
