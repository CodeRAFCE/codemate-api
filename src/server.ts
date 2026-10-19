import "dotenv/config";
import "./config/env";

import app from "./app";
import { connectDB } from "./config/database";

const PORT = 3000;

connectDB()
  .then(() => {
    console.log("Database connection established");
    app.listen(PORT, () => {
      console.log(`Server starting in port => ${PORT}`);
    });
  })
  .catch((err: Error) => console.error("Database cannot be connected", err));
