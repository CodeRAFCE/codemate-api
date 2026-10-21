// tests/flow.test.ts
import { describe, it, expect } from "vitest";
import {
  testUser,
  userB,
  userC,
  userD,
  createUser,
  loginAgent,
  sendRequest,
  reviewRequest,
} from "./helpers";

type Agent = Awaited<ReturnType<typeof loginAgent>>;
const ids = (list: { _id: string }[]) => list.map((u) => u._id).sort();

const feed = async (agent: Agent) =>
  ids((await agent.get("/api/user/feed")).body.data);
const received = async (agent: Agent) =>
  (await agent.get("/api/user/requests/received")).body.data as {
    _id: string;
    fromUserId: { _id: string };
  }[];
const connections = async (agent: Agent) =>
  ids((await agent.get("/api/user/connections")).body.data);

describe("full connection flow: feed -> request -> review -> connections", () => {
  it("keeps all three endpoints consistent as requests move through their states", async () => {
    const a = await createUser(testUser);
    const b = await createUser(userB);
    const c = await createUser(userC);
    const d = await createUser(userD);
    const agentA = await loginAgent(testUser);
    const agentB = await loginAgent(userB);
    const agentC = await loginAgent(userC);
    const agentD = await loginAgent(userD);

    // 1. Strangers: A sees everyone, with no requests and no connections
    expect(await feed(agentA)).toEqual([b.id, c.id, d.id].sort());
    expect(await received(agentA)).toEqual([]);
    expect(await connections(agentA)).toEqual([]);

    // 2. A shows interest in B
    const sent = await agentA.post(`/api/request/send/interested/${b.id}`);
    expect(sent.status).toBe(200);

    //    B sees it, A does not, and the two are hidden from each other's feed
    const pendingForB = await received(agentB);
    expect(pendingForB).toHaveLength(1);
    expect(pendingForB[0].fromUserId._id).toBe(a.id);
    expect(await received(agentA)).toEqual([]);
    expect(await feed(agentA)).toEqual([c.id, d.id].sort());
    expect(await feed(agentB)).toEqual([c.id, d.id].sort());
    expect(await connections(agentA)).toEqual([]); // not connected yet

    // 3. B accepts, using the request id the API gave back
    const accepted = await agentB.patch(
      `/api/request/review/accepted/${pendingForB[0]._id}`,
    );
    expect(accepted.status).toBe(200);

    expect(await received(agentB)).toEqual([]); // no longer pending
    expect(await connections(agentA)).toEqual([b.id]);
    expect(await connections(agentB)).toEqual([a.id]); // both directions work
    expect(await feed(agentA)).toEqual([c.id, d.id].sort()); // still hidden

    // 4. C sends to A, and A accepts: A now has two connections
    await agentC.post(`/api/request/send/interested/${a.id}`);
    const pendingForA = await received(agentA);
    expect(pendingForA.map((r) => r.fromUserId._id)).toEqual([c.id]);

    await agentA.patch(`/api/request/review/accepted/${pendingForA[0]._id}`);
    expect(await connections(agentA)).toEqual([b.id, c.id].sort());
    expect(await connections(agentC)).toEqual([a.id]);

    // 5. D sends to A, and A rejects: D never becomes a connection
    await agentD.post(`/api/request/send/interested/${a.id}`);
    const fromD = await received(agentA);
    expect(fromD).toHaveLength(1);

    await agentA.patch(`/api/request/review/rejected/${fromD[0]._id}`);
    expect(await received(agentA)).toEqual([]);
    expect(await connections(agentA)).toEqual([b.id, c.id].sort());
    expect(await connections(agentD)).toEqual([]);

    // 6. Everyone A has interacted with stays out of A's feed, and D is not told apart
    expect(await feed(agentA)).toEqual([]);
    expect(await feed(agentD)).toEqual([b.id, c.id].sort());

    // 7. A rejected request can't be replayed
    const replay = await agentA.patch(
      `/api/request/review/accepted/${fromD[0]._id}`,
    );
    expect(replay.status).toBe(404);
    expect(await connections(agentA)).toEqual([b.id, c.id].sort());
  });
});

describe("other flows", () => {
  it("'ignore' is silent: no notification, hidden both ways, and B can't reach back", async () => {
    const a = await createUser(testUser);
    const b = await createUser(userB);
    const agentA = await loginAgent(testUser);
    const agentB = await loginAgent(userB);

    await sendRequest(agentA, "ignore", b.id);

    expect(await received(agentB)).toEqual([]);
    expect(await feed(agentA)).toEqual([]);
    expect(await feed(agentB)).toEqual([]);
    expect(await connections(agentA)).toEqual([]);
    expect((await sendRequest(agentB, "interested", a.id)).status).toBe(409);
  });

  it("a stranger cannot accept someone else's request", async () => {
    const a = await createUser(testUser);
    const b = await createUser(userB);
    await createUser(userC);
    const agentA = await loginAgent(testUser);
    const agentB = await loginAgent(userB);
    const agentC = await loginAgent(userC);

    await sendRequest(agentA, "interested", b.id);
    const [pending] = await received(agentB);

    const res = await reviewRequest(agentC, "accepted", pending._id);

    expect(res.status).toBe(404);
    expect(await received(agentB)).toHaveLength(1); // still pending
    expect(await connections(agentA)).toEqual([]);
    expect(await connections(agentC)).toEqual([]);
    void a;
  });

  it("connected users can't send requests to each other again", async () => {
    const a = await createUser(testUser);
    const b = await createUser(userB);
    const agentA = await loginAgent(testUser);
    const agentB = await loginAgent(userB);

    await sendRequest(agentA, "interested", b.id);
    const [pending] = await received(agentB);
    await reviewRequest(agentB, "accepted", pending._id);

    expect((await sendRequest(agentA, "interested", b.id)).status).toBe(409);
    expect((await sendRequest(agentB, "interested", a.id)).status).toBe(409);
    expect(await connections(agentA)).toEqual([b.id]);
  });
});
