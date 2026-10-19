import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import apiRouter from "./routes/index";
import errorHandler from "./middlewares/errorHandler";

const app = express();

app.use(helmet());
// middleware to covert your all json data to JS object so req.body is not undefined
// req.body will log undefined if you don't use express.json()
app.use(express.json());

// Middleware to read the cookie similar to express.json()
app.use(cookieParser());

// APIs list
app.use("/api", apiRouter);
app.use((_req, res) => res.status(404).json({ message: "Route not found" }));

// Always last we need to hit apiRouter to actually get these errors
app.use(errorHandler);

export default app;
