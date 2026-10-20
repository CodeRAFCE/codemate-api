import request from "supertest";
import jwt from "jsonwebtoken";
import { describe, it, expect } from "vitest";
import app from "../src/app";
import User from "../src/models/user";
import { testUser, login, loginAgent, signUp } from "./helpers";

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

/**
 * * Test if fields are missing
 * * Test if cookie is set
 * * Test if jwt carries user id
 * * Test if creds fail with status 401
 * * Test if status is 400 when no body sent
 */

describe("POST /api/auth/login", () => {
  it("logs in and sets and httpOnly cookie", async () => {
    await signUp();
    const res = await login();

    expect(res.status).toBe(200);
    const cookie = res.headers["set-cookie"]![0];
    expect(cookie).toMatch(/^token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it("issues a JWT that carries the user id", async () => {
    await signUp();
    const res = await login();

    //"From the first Set-Cookie header in the response,
    // find the part after token= and before the next ;,
    // and give me just that value."
    const token = /token=([^;]+)/.exec(res.headers["set-cookie"]![0])![1];

    /**
        "token=eyJhbGci...; Path=/; HttpOnly"
               └──────────┘
                this part → stored in `token`
     */

    const secret = process.env.JWT_SECRET!;

    const payload = (await jwt.verify(token, secret)) as { _id: string };

    const user = await User.findOne({ emailId: testUser.emailId });
    expect(payload._id).toBe(user!._id.toString());
  });

  it("returns 401 for invalid credentials", async () => {
    await signUp();
    const res = await login({
      password: "randomPass",
      emailId: "testuser@gmail.com",
    });

    expect(res.status).toBe(401);
  });

  it("fails with 400 when no password", async () => {
    await signUp();

    const res = await request(app)
      .post("/api/auth/login")
      .send({ emailId: testUser.emailId });

    expect(res.status).toBe(400);
  });

  it("returns 400, not 500, when no body is sent", async () => {
    const res = await request(app).post("/api/auth/login");
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the token cookie", async () => {
    const agent = await loginAgent();
    const res = await agent.post("/api/auth/logout");

    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]![0]).toMatch(/^token=;/);
  });

  it("makes protected routes return 401 afterwards", async () => {
    const agent = await loginAgent();
    await agent.post("/api/auth/logout");
    expect((await agent.get("/api/profile/view")).status).toBe(401);
  });

  it("returns 401 without a cookie", async () => {
    expect((await request(app).post("/api/auth/logout")).status).toBe(401);
  });
});

describe("userAuth middleware", () => {
  it("returns 401 without a cookie", async () => {
    expect((await request(app).get("/api/profile/view")).status).toBe(401);
  });

  it("returns 401 for a garbage token", async () => {
    const res = await request(app)
      .get("/api/profile/view")
      .set("Cookie", "token=not.a.real.jwt");
    expect(res.status).toBe(401);
  });

  it("returns 401 for a token signed with the wrong secret", async () => {
    const forged = jwt.sign(
      { _id: "64b000000000000000000001" },
      "wrong-secret",
    );
    const res = await request(app)
      .get("/api/profile/view")
      .set("Cookie", `token=${forged}`);
    expect(res.status).toBe(401);
  });

  it("returns 401 for an expired token", async () => {
    await signUp();
    const user = await User.findOne({ emailId: testUser.emailId });
    const secret = process.env.JWT_SECRET!;
    const expired = jwt.sign(
      { _id: user!._id, exp: Math.floor(Date.now() / 1000) - 10 },
      secret,
    );
    const res = await request(app)
      .get("/api/profile/view")
      .set("Cookie", `token=${expired}`);
    expect(res.status).toBe(401);
  });

  it("returns 401 if the user was deleted after login", async () => {
    const agent = await loginAgent();
    await User.deleteMany({});
    expect((await agent.get("/api/profile/view")).status).toBe(401);
  });

  it("lets a logged-in user through without exposing the password", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/profile/view");

    expect(res.status).toBe(200);
    expect(res.body.data.emailId).toBe(testUser.emailId);
    expect(res.body.data.password).toBeUndefined();
  });
});

describe("guestOnly middleware", () => {
  it("blocks sign-up when a valid session cookie is sent", async () => {
    const agent = await loginAgent();
    const res = await agent
      .post("/api/auth/sign-up")
      .send({ ...testUser, emailId: "second@example.com" });

    expect(res.status).toBe(403);
    expect(await User.countDocuments()).toBe(1); // no second user was created
  });

  it("blocks login when a valid session cookie is sent", async () => {
    const agent = await loginAgent();
    const res = await agent
      .post("/api/auth/login")
      .send({ emailId: testUser.emailId, password: testUser.password });
    expect(res.status).toBe(403);
  });

  it("allows sign-up with an expired cookie", async () => {
    const secret = process.env.JWT_SECRET!;
    const expired = jwt.sign(
      {
        _id: "64b000000000000000000001",
        exp: Math.floor(Date.now() / 1000) - 10,
      },
      secret,
    );
    const res = await request(app)
      .post("/api/auth/sign-up")
      .set("Cookie", `token=${expired}`)
      .send(testUser);
    expect(res.status).toBe(201);
  });

  it("allows sign-up with a tampered cookie", async () => {
    const res = await request(app)
      .post("/api/auth/sign-up")
      .set("Cookie", "token=not.a.real.jwt")
      .send(testUser);
    expect(res.status).toBe(201);
  });

  it("allows login again after logging out", async () => {
    const agent = await loginAgent();
    await agent.post("/api/auth/logout");
    const res = await agent
      .post("/api/auth/login")
      .send({ emailId: testUser.emailId, password: testUser.password });
    expect(res.status).toBe(200);
  });
});
