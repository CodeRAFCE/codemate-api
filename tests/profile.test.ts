import { describe, it, expect } from "vitest";
import bcrypt from "bcrypt";
import request from "supertest";
import app from "../src/app";
import User from "../src/models/user";
import { testUser, login, loginAgent } from "./helpers";

describe("authentication on profile routes", () => {
  it.each([
    ["get", "/api/profile/view"],
    ["patch", "/api/profile/edit"],
    ["patch", "/api/profile/password"],
  ] as const)("returns 401 without a cookie", async (method, url) => {
    const res = await request(app)[method](url);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/profile/view", () => {
  it("returns the logged-in user's own data", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/profile/view");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.firstName).toBe(testUser.firstName);
    expect(res.body.data.emailId).toBe(testUser.emailId);
  });

  it("never exposes the password hash or __v", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/profile/view");

    expect(res.body.data).not.toHaveProperty("password");
    expect(res.body.data).not.toHaveProperty("__v");
  });
});

describe("PATCH /api/profile/edit", () => {
  it("updates allowed fields and persists them", async () => {
    const agent = await loginAgent();
    const res = await agent.patch("/api/profile/edit").send({
      firstName: "Rahul",
      age: 25,
      gender: "male",
      about: "Full stack developer who loves Node.",
      skills: ["node", "typescript"],
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("Rahul");

    // Check the database, not just the response
    const user = await User.findOne({ emailId: testUser.emailId });
    expect(user!.firstName).toBe("Rahul");
    expect(user!.age).toBe(25);
    expect(user!.skills).toEqual(["node", "typescript"]);
  });

  it.each(["emailId", "password", "_id", "createdAt"])(
    "rejects a request that tries to change %s",
    async (field) => {
      const agent = await loginAgent();
      const res = await agent
        .patch("/api/profile/edit")
        .send({ [field]: "hacked@example.com" });

      expect(res.status).toBe(400);
      const user = await User.findOne({ emailId: testUser.emailId });
      expect(user!.emailId).toBe(testUser.emailId);
    },
  );

  it("rejects one disallowed field mixed in with valid ones", async () => {
    const agent = await loginAgent();
    const res = await agent
      .patch("/api/profile/edit")
      .send({ firstName: "Rahul", emailId: "hacked@example.com" });

    expect(res.status).toBe(400);
    // Nothing should be saved, not even the valid field
    const user = await User.findOne({ emailId: testUser.emailId });
    expect(user!.firstName).toBe(testUser.firstName);
  });

  it("rejects an about text over 300 characters", async () => {
    const agent = await loginAgent();
    const res = await agent
      .patch("/api/profile/edit")
      .send({ about: "a".repeat(301) });
    expect(res.status).toBe(400);
  });

  it("rejects more than 10 skills", async () => {
    const agent = await loginAgent();
    const skills = Array.from({ length: 11 }, (_, i) => `skill${i}`);
    expect(
      (await agent.patch("/api/profile/edit").send({ skills })).status,
    ).toBe(400);
  });

  it("rejects an invalid photoUrl", async () => {
    const agent = await loginAgent();
    const res = await agent
      .patch("/api/profile/edit")
      .send({ photoUrl: "not a url" });
    expect(res.status).toBe(400);
  });

  // These three are caught by the Mongoose schema, not by validateProfileEditData
  it.each([
    ["age under 18", { age: 17 }],
    ["an unknown gender", { gender: "robot" }],
    ["a firstName shorter than 4 characters", { firstName: "Al" }],
    ["an about text shorter than 10 characters", { about: "short" }],
  ])("rejects %s via schema validation", async (_label, body) => {
    const agent = await loginAgent();
    const res = await agent.patch("/api/profile/edit").send(body);
    expect(res.status).toBe(400);
  });

  it("rejects an empty edit with 400", async () => {
    const agent = await loginAgent();
    const res = await agent.patch("/api/profile/edit").send({});
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/profile/password", () => {
  const newPassword = "N3w@Password!";

  it("changes the password and stores a bcrypt hash", async () => {
    const agent = await loginAgent();
    const res = await agent
      .patch("/api/profile/password")
      .send({ newPassword });
    expect(res.status).toBe(200);

    const user = await User.findOne({ emailId: testUser.emailId });
    expect(user!.password).not.toBe(newPassword);
    expect(await bcrypt.compare(newPassword, user!.password)).toBe(true);
  });

  it("lets the user log in with the new password and not the old one", async () => {
    const agent = await loginAgent();
    await agent.patch("/api/profile/password").send({ newPassword });

    // A fresh client with no cookie, because guestOnly blocks login while a session exists
    const withNew = await login({ password: newPassword });
    const withOld = await login({ password: testUser.password });

    expect(withNew.status).toBe(200);
    expect(withOld.status).toBe(401);
  });

  it("rejects a weak password and keeps the old one", async () => {
    const agent = await loginAgent();
    const res = await agent
      .patch("/api/profile/password")
      .send({ newPassword: "123" });

    expect(res.status).toBe(400);
    expect((await login()).status).toBe(200);
  });

  it("rejects a request with no newPassword", async () => {
    const agent = await loginAgent();
    const res = await agent.patch("/api/profile/password").send({});
    expect(res.status).toBe(400);
  });
});
