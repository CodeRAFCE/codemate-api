import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../src/app";
import User from "../src/models/user";

// Describe the <name, callback>
describe("test setup", () => {
  it("serves the app and returns 404 handler for unknown routes", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Route not found");
  });

  it("is connected to an empty in-memory database", async () => {
    expect(await User.countDocuments()).toBe(0);
  });
});

//Ignore this file
