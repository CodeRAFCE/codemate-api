export const required = ["MONGODB_URI", "JWT_SECRET"] as const;
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing env var: ${key}`);
}
