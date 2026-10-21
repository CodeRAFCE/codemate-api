import request from "supertest";
import type { Types } from "mongoose";
import { describe, it, expect } from "vitest";
import app from "../src/app";
import User from "../src/models/user";
import ConnectionRequest, {
  type ConnectionStatusType,
} from "../src/models/connectionRequest";
import {
  testUser,
  userB,
  userC,
  userD,
  createUser,
  loginAgent,
  createUsers,
} from "./helpers";

// Write a request straight to the DB so these tests don't depend on /send
const link = (
  from: { _id: Types.ObjectId },
  to: { _id: Types.ObjectId },
  status: ConnectionStatusType,
) =>
  ConnectionRequest.create({ fromUserId: from._id, toUserId: to._id, status });

const fourUsers = async () => ({
  a: await createUser(testUser),
  b: await createUser(userB),
  c: await createUser(userC),
  d: await createUser(userD),
});

const ids = (list: { _id: string }[]) => list.map((u) => u?._id).sort();

// The feed currently returns { users }. If you rename it to `data`, change it here only.
const feedOf = (res: request.Response) => res.body.data as { _id: string }[];

describe("authentication on user routes", () => {
  it.each([
    "/api/user/requests/received",
    "/api/user/connections",
    "/api/user/feed",
  ])("GET %s returns 401 without a cookie", async (url) => {
    expect((await request(app).get(url)).status).toBe(401);
  });
});

describe("GET /api/user/requests/received", () => {
  it("returns only 'interested' requests addressed to me", async () => {
    const { a, b, c, d } = await fourUsers();
    await link(b, a, "interested"); // counts
    await link(c, a, "ignore"); // not interested
    await link(d, a, "accepted"); // already handled
    await link(a, b, "interested").catch(() => {}); // sent BY me, B->A exists so skip
    const agent = await loginAgent(testUser);

    const res = await agent.get("/api/user/requests/received");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].fromUserId._id).toBe(b.id);
    expect(res.body.data[0].toUserId).toBe(a.id);
  });

  it("does not show requests I sent, or requests between other people", async () => {
    const { a, b, c, d } = await fourUsers();
    await link(a, b, "interested"); // I sent it
    await link(c, d, "interested"); // none of my business
    await link(c, a, "interested");
    const agent = await loginAgent(testUser);

    const res = await agent.get("/api/user/requests/received");

    expect(res.body.data).toHaveLength(1);
  });

  it("populates the sender with safe fields only", async () => {
    const { a, b } = await fourUsers();
    await link(b, a, "interested");
    const agent = await loginAgent(testUser);

    const sender = (await agent.get("/api/user/requests/received")).body.data[0]
      .fromUserId;

    expect(sender.firstName).toBe(userB.firstName);
    expect(sender).not.toHaveProperty("password");
    expect(sender).not.toHaveProperty("emailId");
  });

  it("returns an empty list when nothing is pending", async () => {
    await createUser(testUser);
    const agent = await loginAgent(testUser);
    const res = await agent.get("/api/user/requests/received");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe("GET /api/user/connections", () => {
  it("returns the other person, whichever direction the request went", async () => {
    const { a, b, c } = await fourUsers();
    await link(a, b, "accepted"); // I sent, they accepted
    await link(c, a, "accepted"); // they sent, I accepted
    const agent = await loginAgent(testUser);

    const res = await agent.get("/api/user/connections");

    expect(res.status).toBe(200);
    expect(ids(res.body.data)).toEqual([b.id, c.id].sort());
  });

  it("never lists me as my own connection", async () => {
    const { a, b } = await fourUsers();
    await link(a, b, "accepted");
    const agent = await loginAgent(testUser);

    const res = await agent.get("/api/user/connections");
    expect(ids(res.body.data)).not.toContain(a.id);
  });

  it.each(["interested", "ignore", "rejected", "blocked"] as const)(
    "does not list a '%s' request as a connection",
    async (status) => {
      const { a, b } = await fourUsers();
      await link(a, b, status);
      const agent = await loginAgent(testUser);

      expect((await agent.get("/api/user/connections")).body.data).toEqual([]);
    },
  );

  it("does not list connections between other people", async () => {
    const { c, d } = await fourUsers();
    await link(c, d, "accepted");
    const agent = await loginAgent(testUser);

    expect((await agent.get("/api/user/connections")).body.data).toEqual([]);
  });

  it("returns safe fields only", async () => {
    const { a, b } = await fourUsers();
    await link(a, b, "accepted");
    const agent = await loginAgent(testUser);

    const [person] = (await agent.get("/api/user/connections")).body.data;
    expect(person.firstName).toBe(userB.firstName);
    expect(person).not.toHaveProperty("password");
    expect(person).not.toHaveProperty("emailId");
  });

  // Fails until you filter out null populates (see "Run it")
  it("survives a connection whose user was deleted", async () => {
    const { a, b, c } = await fourUsers();
    await link(a, b, "accepted");
    await link(a, c, "accepted");
    await User.deleteOne({ _id: b._id });
    const agent = await loginAgent(testUser);

    const res = await agent.get("/api/user/connections");

    expect(res.status).toBe(200);
    expect(ids(res.body.data)).toEqual([c.id]);
  });
});

describe("GET /api/user/feed", () => {
  it("shows other users and never the logged-in user", async () => {
    const { a, b, c, d } = await fourUsers();
    const agent = await loginAgent(testUser);

    const res = await agent.get("/api/user/feed");

    expect(res.status).toBe(200);
    expect(ids(feedOf(res))).toEqual([b.id, c.id, d.id].sort());
    expect(ids(feedOf(res))).not.toContain(a.id);
  });

  const statuses = [
    "interested",
    "ignore",
    "accepted",
    "rejected",
    "blocked",
  ] as const;

  it.each(statuses)(
    "hides someone I sent a '%s' request to",
    async (status) => {
      const { a, b, c } = await fourUsers();
      await link(a, b, status);
      const agent = await loginAgent(testUser);

      const res = await agent.get("/api/user/feed");
      expect(ids(feedOf(res))).not.toContain(b.id);
      expect(ids(feedOf(res))).toContain(c.id);
    },
  );

  it.each(statuses)(
    "hides someone who sent me a '%s' request",
    async (status) => {
      const { a, b, c } = await fourUsers();
      await link(b, a, status);
      const agent = await loginAgent(testUser);

      const res = await agent.get("/api/user/feed");
      expect(ids(feedOf(res))).not.toContain(b.id);
      expect(ids(feedOf(res))).toContain(c.id);
    },
  );

  it("still shows people who only have requests with someone else", async () => {
    const { c, d, b } = await fourUsers();
    await link(c, d, "accepted");
    const agent = await loginAgent(testUser);

    const res = await agent.get("/api/user/feed");
    expect(ids(feedOf(res))).toEqual([c.id, d.id, b.id].sort());
  });

  it("returns safe fields only", async () => {
    await fourUsers();
    const agent = await loginAgent(testUser);

    const [person] = feedOf(await agent.get("/api/user/feed")) as Record<
      string,
      unknown
    >[];
    expect(person).toHaveProperty("firstName");
    expect(person).not.toHaveProperty("password");
    expect(person).not.toHaveProperty("emailId");
  });

  it("returns an empty list when there is nobody left", async () => {
    await createUser(testUser);
    const agent = await loginAgent(testUser);
    const res = await agent.get("/api/user/feed");
    expect(res.status).toBe(200);
    expect(feedOf(res)).toEqual([]);
  });

  describe("pagination", () => {
    it("defaults to 10 results", async () => {
      await createUser(testUser);
      await createUsers(15);
      const agent = await loginAgent(testUser);
      expect(feedOf(await agent.get("/api/user/feed"))).toHaveLength(10);
    });

    it.each([
      ["limit=5", 5],
      ["limit=100", 30], // capped at 30, not an error
      ["limit=0", 10], // 0 is falsy, falls back to the default
      ["limit=-3", 1], // clamped up to 1
      ["limit=abc", 10], // not a number, default
    ])("?%s returns %i users", async (query, expected) => {
      await createUser(testUser);
      await createUsers(35);
      const agent = await loginAgent(testUser);

      const res = await agent.get(`/api/user/feed?${query}`);

      expect(res.status).toBe(200);
      expect(feedOf(res)).toHaveLength(expected);
    });

    it("walks through pages in order with no overlap and no gaps", async () => {
      await createUser(testUser);
      const others = (await createUsers(12)).map((u) => u.id);
      const agent = await loginAgent(testUser);

      const page = async (n: number) =>
        feedOf(await agent.get(`/api/user/feed?page=${n}&limit=5`)).map(
          (u) => u._id,
        );

      expect(await page(1)).toEqual(others.slice(0, 5));
      expect(await page(2)).toEqual(others.slice(5, 10));
      expect(await page(3)).toEqual(others.slice(10, 12)); // last, partial page
      expect(await page(4)).toEqual([]); // past the end
    });

    it.each(["0", "-2", "abc"])("treats ?page=%s as page 1", async (page) => {
      await createUser(testUser);
      const others = (await createUsers(8)).map((u) => u.id);
      const agent = await loginAgent(testUser);

      const res = await agent.get(`/api/user/feed?page=${page}&limit=5`);
      expect(feedOf(res).map((u) => u._id)).toEqual(others.slice(0, 5));
    });

    it("applies the hide rules before paginating", async () => {
      const a = await createUser(testUser);
      const others = await createUsers(6);
      // Hide the first two, so page 1 (limit 3) must start at the third
      await link(a, others[0], "interested");
      await link(others[1], a, "ignore");
      const agent = await loginAgent(testUser);

      const res = await agent.get("/api/user/feed?limit=3");
      expect(feedOf(res).map((u) => u._id)).toEqual(
        others.slice(2, 5).map((u) => u.id),
      );
    });
  });
});
