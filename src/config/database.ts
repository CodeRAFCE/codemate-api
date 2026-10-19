import mongoose from "mongoose";

// * Remove for production
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const uri = process.env.MONGODB_URI;

export const connectDB = async (): Promise<typeof mongoose> =>
  await mongoose.connect(uri);

// Call this only when your application terminates
export async function disconnectFromMongoDB(): Promise<void> {
  await mongoose.connection.close();
}
