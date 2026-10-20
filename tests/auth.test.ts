import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../src/app";
import User from "../src/models/user";
import { testUser, login, loginAgent, signUp } from "./helpers";
import test from "node:test";

/**
 * * Test if User is created
 * * Test if the user is storing Hashed password
 * * Test if sign-up api fails when a property is empty in the body or missing fields
 * * Test if duplicate email sign-up fails with 409
 * * Test if invaild emails are rejected
 * * Test for weak password
 * * Test if api ignores extra fields like age
 * * Test if Malformed body return 400 status
 */

describe("POST /api/auth/sign-up", () => {
  it("Creates a User returns 201", async () => {
    const res = await signUp();
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("success");
  });

  it("Check if the stored password is hashed", async () => {
    await signUp();

    const user = await User.findOne({ emailId: testUser.emailId });
    // user.password !== testUser.password
    // * ! => Non null assertion operator
    expect(user!.password).not.toBe(testUser.password);
    expect(user!.password).toMatch(/^\$2[aby]\$/);
  });

  it("Api fail on missing fields in the body", async () => {
    const res = await signUp({ lastName: "" });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe("fail");
  });

  it("rejects invalid email with 400", async () => {
    const res = await signUp({ emailId: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("rejects duplicate emails with 409", async () => {
    await signUp();
    expect((await signUp()).status).toBe(409);
  });

  it("rejects weak password with 400", async () => {
    expect((await signUp({ password: "weakPass" })).status).toBe(400);
  });

  it("ignores extra fields", async () => {
    await signUp({ age: 80, _id: "6b723sad4328sad76234asd1" });
    const user = await User.findOne({ emailId: testUser.emailId });
    expect(user!.age).toBeUndefined();
    expect(user!._id.toString()).not.toBe("6b723sad4328sad76234asd1");
  });

  it("rejects with 400 when no body is sent", async () => {
    const res = await request(app).post("/api/auth/sign-up");
    expect(res.status).toBe(400);
  });

  it("rejects with 400 status when Malformed body sent", async () => {
    const res = await request(app)
      .post("/api/auth/sign-up")
      .set("Content-Type", "application/json")
      .send('{ "emailId": '); // Malformed JSON body

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("fail");
  });
});
