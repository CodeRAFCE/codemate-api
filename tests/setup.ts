import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { beforeAll, afterAll, afterEach } from "vitest";
import User from "../src/models/user";
import ConnectionRequest from "../src/models/connectionRequest";

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([User.init(), ConnectionRequest.init()]);
});

// empties every collection after each test, so tests don't depend on each other's data.
// That's what lets any test run alone or in any order.
afterEach(async () => {
  for (const collection of Object.values(mongoose.connection.collections)) {
    await collection.deleteMany({});
  }
});

// disconnects and shuts the temporary database down so the process can exit cleanly.
afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
