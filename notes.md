# Express `.use()`

`.use()` applies middleware to a path and all of its subroutes.

- Middleware mounted at `/health-check` runs for routes such as `/health-check/status`.
- The same prefix-matching behavior applies to any path passed to `.use()`.

# Older route techniques

```JS
app.get("/use?r", (req, res) => {
res.send({ firstName: "Seshan", lastName: "A" });
});
```

# Express 5 completely upgraded its route parsing engine

- You cannot use regex quantifiers directly inside route path strings anymore.
- To fix this pass a real JavaScript RegExp literal instead of a string:

```JS
app.get(/^\/use?r$/, (req, res) => {
res.send({ firstName: "Seshan", lastName: "A" });
});
```

```JS
 app.use("/", (req, res) => {
 res.send("Any route with prefix / will execute depending on the order");
 });
```

# This code will execute the first route handler and 2nd route as well but:

1. When the client sends a request the route handler should send a response always `res.send()`
2. Now since the 1st Route handler has `next()` this will go to the next route handler and execute but does not send the respose back again
3. Because The TCP connection is closed during the first `res.send()` in the first route handler
4. Basic thing which we need to understand is that when a client requests for a data the TCP handshake happens and once you get back a response from the server the connection is closed and cannot send anymore response from server.

5) So never try the below code in production per connection you can only send one response
6) `next()` always expects a route handler if there is no futher `(req, res) => {}` to execute with `res.send()` it will throw an error `Cannot get /user`.
7) If there is no response the requst will leave hanging in a loop without any response sent back.

```JS
app.use(
  "/user",
  (req, res, next) => {
    console.log("Handling 1st request");
    res.send("1st method");
    next();
  },
  (req, res) => {
    console.log("2nd method");
    res.send("2nd Response"); // ERROR: Cannot set headers after they are sent to the client
  },
);
```

# OUTPUT: for /user

- 1st method

# How express handles request behind the scene

1. Client send a request to the server and the server has to respond back with a data
2. So during Req-Res Cycle a TCP handshake is established created a socket for sending-receiveing packets of data.
3. Once the req has reached the server Node HTTP-server, Express processes that behind the scene and expose that as req, res & next() as our handler functions.
4. And expressjs will process all our middlewares and route handler untill the response is sent back to client
5. Only after all the middlewares are executed the response is sent back and that in developers control
   [REQ] <-> [VerifyUser Middleware] - [`VERIFY YES/NO`] <-> [RES]

# List of APIs for DevTinder

# STATUS: ignore, interested, accepted, rejected, blocked

## Auth Router

- POST /signup
- POST /login
- POST /logout

## Profile Router

- GET /profile/view
- PATCH /profile/edit
- PATCH /profile/password

## Connection Request Router

- POST /request/send/interested/:userId
- POST /request/send/ignore/:userId
- POST /request/review/accepted/:requestId
- POST /request/review/rejected/:requestId

## User Router

- GET /user/connections
- GET /user/requests/recived
- GET /user/feed

# Express Router express.router()

# What a Mongoose ValidationError looks like:

```JS
{
  name: 'ValidationError',
  message: 'User validation failed: email: Path `email`is required.',
  errors: {
    email: {
      name: 'ValidatorError',
      message: 'Path`email` is required.',
      properties: { ... },
      kind: 'required',
      path: 'email',
      value: undefined
    }
  }
}
```

# How express.json() shows error when JSON body is Invalid

```JS
{
  expose: true,
  statusCode: 400,
  status: 400,
  type: 'entity.parse.failed',  // <--- This identifier
  body: '{\n  "firstName": "John",\n}',
  message: 'Unexpected token } in JSON at position 29'
}
```

# How JWT throws error for Invalid and Expired token

## JsonWebTokenError (err.name === "JsonWebTokenError")

```JS
{
  name: 'JsonWebTokenError',
  message: 'invalid signature' // or 'jwt malformed', 'jwt must be provided'
}
```

## TokenExpiredError (err.name === "TokenExpiredError")

```JS
{
  name: 'TokenExpiredError',
  message: 'jwt expired',
  expiredAt: 2026-10-17T20:30:00.000Z
}
```

# Cookie Options

```JS
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};
```

# 1. httpOnly: true => "Browser JavaScript cannot touch or steal this cookie."

- What it does: It completely hides the cookie from client-side scripts. Running document.cookie in the browser console will not show this cookie.
- Why it matters: It protects you from XSS (Cross-Site Scripting) attacks. If a hacker manages to run malicious JavaScript on your frontend, they still cannot steal your authentication token.

# 2. sameSite: "lax" => "Only send this cookie if the user is actually on my website."

- What it does: It tells the browser whether to send the cookie along when a request originates from an external site:
  - If a user is on evil-site.com and that site tries to make a hidden background request (like a fetch or POST) to your backend, the browser blocks the cookie.
  - If a user clicks a regular link (navigating to your site), the browser allows the cookie.
- Why it matters: It protects against CSRF (Cross-Site Request Forgery), preventing other websites from making unauthorized actions on your user's behalf.

# 3. secure: process.env.NODE_ENV === "production" => "Only send this cookie over encrypted HTTPS connections."

- What it does:
  - In Production (true): The browser will only send the cookie if the website uses https://. If someone tries to access your API over unencrypted http://, the cookie is withheld.
  - In Local Development (false): When testing on http://localhost:3000, HTTPS is usually not set up. If this were set to true locally, the browser would refuse to store or send the cookie.
- Why it matters: It prevents hackers from sniffing or intercepting the auth token over public Wi-Fi.

# Math.max(minimum, value) → Sets a FLOOR (The number cannot drop below this).

# Math.min(maximum, value) → Sets a CEILING (The number cannot go above this).
