import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app";
import {
  createUser,
  loginAgent,
  reviewRequest,
  sendRequest,
  testUser,
  userB,
  userC,
} from "./helpers";
import ConnectionRequest, {
  ConnectionStatusType,
} from "../src/models/connectionRequest";

const randomId = () => new mongoose.Types.ObjectId().toString();

describe("authentication on request routes", () => {
  it.each([
    ["post", `/api/request/send/interested/${randomId()}`],
    ["patch", `/api/request/review/accepted/${randomId()}`],
  ] as const)("%s %s returns 401 without a cookie", async (method, url) => {
    expect((await request(app)[method](url)).status).toBe(401);
  });
});

describe("POST /api/request/send/:status/:toUserId", () => {
  const setup = async () => {
    const a = await createUser(testUser);
    const b = await createUser(userB);
    const agent = await loginAgent(testUser);
    return { a, b, agent };
  };

  it.each([
    ["interested", "Seshan is interested in Ananya"],
    ["ignore", "Seshan ignored Ananya"],
  ])("creates a '%s' request", async (status, message) => {
    const { a, b, agent } = await setup();
    const res = await sendRequest(agent, status, b.id);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(message);
    // Sender comes from the cookie, receiver from the URL
    expect(res.body.data).toMatchObject({
      fromUserId: a.id,
      toUserId: b.id,
      status,
    });

    const saved = await ConnectionRequest.find();
    expect(saved).toHaveLength(1);
    expect(saved[0].status).toBe(status);
  });

  it.each(["accepted", "rejected", "blocked", "banana"])(
    "rejects '%s' as a send status",
    async (status) => {
      const { b, agent } = await setup();
      const res = await sendRequest(agent, status, b.id);

      expect(res.status).toBe(400);
      expect(await ConnectionRequest.countDocuments()).toBe(0);
    },
  );

  it("validates the status before looking up the user", async () => {
    await createUser(testUser);
    const agent = await loginAgent(testUser);
    const res = await sendRequest(agent, "banana", randomId());
    expect(res.status).toBe(400);
  });

  it("returns 400 for a malformed user id", async () => {
    const { agent } = await setup();
    const res = await sendRequest(agent, "interested", "123");
    expect(res.status).toBe(400);
  });

  it("returns 404 when the target user does not exist", async () => {
    const { agent } = await setup();
    const res = await sendRequest(agent, "interested", randomId());
    expect(res.status).toBe(404);
    expect(await ConnectionRequest.countDocuments()).toBe(0);
  });

  it("cannot send a request to yourself", async () => {
    const { a, agent } = await setup();
    const res = await sendRequest(agent, "interested", a.id);

    expect(res.status).toBe(400);
    expect(await ConnectionRequest.countDocuments()).toBe(0);
  });

  it("returns 409 for a duplicate request in the same direction", async () => {
    const { b, agent } = await setup();
    await sendRequest(agent, "interested", b.id);
    const res = await sendRequest(agent, "interested", b.id);

    expect(res.status).toBe(409);
    expect(await ConnectionRequest.countDocuments()).toBe(1);
  });

  it("returns 409 when the other user already sent one (B -> A exists)", async () => {
    const { a, b, agent } = await setup();
    await ConnectionRequest.create({
      fromUserId: b._id,
      toUserId: a._id,
      status: "interested",
    });

    const res = await sendRequest(agent, "interested", b.id);
    expect(res.status).toBe(409);
    expect(await ConnectionRequest.countDocuments()).toBe(1);
  });

  // Documents the current rule: an "ignore" blocks the other side too.
  // If you change that design, update this test on purpose.
  it("blocks B from sending to A after A ignored B", async () => {
    const a = await createUser(testUser);
    const b = await createUser(userB);
    const agentA = await loginAgent(testUser);
    const agentB = await loginAgent(userB);

    await sendRequest(agentA, "ignore", b.id);
    const res = await sendRequest(agentB, "interested", a.id);

    expect(res.status).toBe(409);
    expect(await ConnectionRequest.countDocuments()).toBe(1);
  });

  it("creates only one document when the same request is sent twice at once", async () => {
    const { b, agent } = await setup();
    const results = await Promise.all([
      sendRequest(agent, "interested", b.id),
      sendRequest(agent, "interested", b.id),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await ConnectionRequest.countDocuments()).toBe(1);
  });
});

describe("PATCH /api/request/review/:status/:reqId", () => {
  const seed = async (status: ConnectionStatusType = "interested") => {
    const a = await createUser(testUser);
    const b = await createUser(userB);
    const c = await createUser(userC);
    const connection = await ConnectionRequest.create({
      fromUserId: a._id,
      toUserId: b._id,
      status,
    });
    return { a, b, c, connection };
  };

  const statusInDb = async (id: unknown) =>
    (await ConnectionRequest.findById(id))!.status;

  it.each(["accepted", "rejected"])(
    "lets the receiver set the status to '%s'",
    async (status) => {
      const { connection } = await seed();
      const agentB = await loginAgent(userB);

      const res = await reviewRequest(agentB, status, connection.id);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe(`Connection request ${status}`);
      expect(res.body.data.status).toBe(status);
      expect(await statusInDb(connection._id)).toBe(status);
    },
  );

  it.each(["interested", "ignore", "blocked", "banana"])(
    "rejects '%s' as a review status",
    async (status) => {
      const { connection } = await seed();
      const agentB = await loginAgent(userB);

      const res = await reviewRequest(agentB, status, connection.id);

      expect(res.status).toBe(400);
      expect(await statusInDb(connection._id)).toBe("interested");
    },
  );

  it("returns 400 for a malformed request id", async () => {
    await seed();
    const agentB = await loginAgent(userB);
    const res = await reviewRequest(agentB, "review", "123");
    expect(res.status).toBe(400);
  });

  it("returns 404 for a request id that does not exist", async () => {
    await seed();
    const agentB = await loginAgent(userB);
    const res = await reviewRequest(agentB, "accepted", randomId());
    expect(res.status).toBe(404);
  });

  it("does not let the sender accept their own request", async () => {
    const { connection } = await seed();
    const agentA = await loginAgent(testUser);

    const res = await reviewRequest(agentA, "accepted", connection.id);

    expect(res.status).toBe(404);
    expect(await statusInDb(connection._id)).toBe("interested");
  });

  it("does not let an unrelated user review someone else's request", async () => {
    const { connection } = await seed();
    const agentC = await loginAgent(userC);

    const res = await reviewRequest(agentC, "accepted", connection.id);

    expect(res.status).toBe(404);
    expect(await statusInDb(connection._id)).toBe("interested");
  });

  it.each(["ignore", "accepted", "rejected"] as const)(
    "cannot review a request that is already '%s'",
    async (current) => {
      const { connection } = await seed(current);
      const agentB = await loginAgent(userB);

      const res = await reviewRequest(agentB, "accepted", connection.id);

      expect(res.status).toBe(404);
      expect(await statusInDb(connection._id)).toBe(current);
    },
  );
});

describe("ConnectionRequest model", () => {
  it("refuses a request from a user to themselves (pre-save hook)", async () => {
    const a = await createUser(testUser);
    await expect(
      ConnectionRequest.create({
        fromUserId: a._id,
        toUserId: a._id,
        status: "interested",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("enforces one document per (from, to) pair with the unique index", async () => {
    const a = await createUser(testUser);
    const b = await createUser(userB);
    const data = {
      fromUserId: a._id,
      toUserId: b._id,
      status: "interested",
    } as const;

    await ConnectionRequest.create(data);
    await expect(ConnectionRequest.create(data)).rejects.toMatchObject({
      code: 11000,
    });
  });

  it("rejects a status outside the enum", async () => {
    const a = await createUser(testUser);
    const b = await createUser(userB);
    await expect(
      ConnectionRequest.create({
        fromUserId: a._id,
        toUserId: b._id,
        // @ts-expect-error
        status: "banana",
      }),
    ).rejects.toMatchObject({ name: "ValidationError" });
  });
});
