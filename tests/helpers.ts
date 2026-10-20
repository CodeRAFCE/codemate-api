import request from "supertest";
import app from "../src/app";

export const testUser = {
  firstName: "Seshan",
  lastName: "A",
  emailId: "seshan@test.com",
  password: "Seshan@123",
};

export const signUp = (overrides = {}) =>
  request(app)
    .post("/api/auth/sign-up")
    .send({ ...testUser, ...overrides });

export const login = (overrides = {}) =>
  request(app)
    .post("/api/auth/login")
    .send({
      emailId: testUser.emailId,
      password: testUser.password,
      ...overrides,
    });

export const loginAgent = async () => {
  await signUp();
  const agent = request.agent(app);

  await agent.post("/api/auth/login").send({
    emailId: testUser.emailId,
    password: testUser.password,
  });

  return agent;
};
