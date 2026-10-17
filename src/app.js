require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const { connectDB } = require("./config/database");
const apiRouter = require("./routes/index");
const errorHandler = require("./middlewares/errorHandler");

const app = express();
const PORT = 3000;

// middleware to covert your all json data to JS object so req.body is not undefined
// req.body will log undefined if you don't use express.json()
app.use(express.json());

// Middleware to read the cookie similar to express.json()
app.use(cookieParser());

// APIs list
app.use("/api", apiRouter);
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// Always last we need to hit apiRouter to actually get these errors
app.use(errorHandler);

// * Always connect to DB and then listen to the server
connectDB()
  .then(() => {
    console.log("Database connection established");
    app.listen(PORT, () => {
      console.log(`Server starting in port => ${PORT}`);
    });
  })
  .catch((err) => console.error("Database cannot be connected", err));
