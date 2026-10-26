import request from "supertest";
import app from "../src/app";
import User from "../src/models/user";

export const testUser = {
  firstName: "Seshan",
  lastName: "A",
  emailId: "seshan@test.com",
  password: "Seshan@123",
};

export const userB = {
  firstName: "Ananya",
  lastName: "Sharma",
  emailId: "priya@example.com",
  password: "Str0ng@Pass!",
};

export const userC = {
  firstName: "Arjun",
  lastName: "Nair",
  emailId: "arjun@example.com",
  password: "Str0ng@Pass!",
};

export const userD = {
  firstName: "Meera",
  lastName: "Iyer",
  emailId: "meera@example.com",
  password: "Str0ng@Pass!",
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

export const loginAgent = async (user = testUser) => {
  await signUp(user);
  const agent = request.agent(app);

  await agent.post("/api/auth/login").send({
    emailId: user.emailId,
    password: user.password,
  });

  return agent;
};

type Agent = ReturnType<typeof request.agent>;

export const sendRequest = (agent: Agent, status: string, toUserId: string) =>
  agent.post(`/api/request/send/${status}/${toUserId}`);

export const reviewRequest = (agent: Agent, status: string, reqId: string) =>
  agent.patch(`/api/request/review/${status}/${reqId}`);

export const withdrawRequest = (agent: Agent, reqId: string) =>
  agent.patch(`/api/request/withdraw/${reqId}`);

// Sign up through the API and return the saved document
export const createUser = async (user = testUser) => {
  await signUp(user);
  return (await User.findOne({ emailId: user.emailId }))!;
};

export const createUsers = (count: number) =>
  User.insertMany(
    Array.from({ length: count }, (_, i) => ({
      firstName: `Person${i}`,
      emailId: `person${i}@example.com`,
      password: testUser.password,
    })),
  );
