# DevTinder API

[![CI](https://github.com/CodeRAFCE/devtinder-api/actions/workflows/ci.yml/badge.svg)]
(https://github.com/CodeRAFCE/devtinder-api/actions/workflows/ci.yml)

A REST API for a developer-matching app. Developers sign up, browse a feed of other developers, send connection requests, and accept or reject the ones they receive.

**Live API:** https://devtinder-api-wyxa.onrender.com
**Note:** hosted on Render's free tier, the first request after a period of inactivity can take a while while the instance wakes up.

---

## Features

- JWT authentication stored in an `httpOnly` cookie, with bcrypt password hashing
- Profile view, edit (whitelisted fields only), and password change
- Connection-request workflow: send (`interested` / `ignore`), then review (`accepted` / `rejected`)
- Discovery feed that excludes yourself and anyone you have already interacted with, with capped pagination
- Connections list and received-requests list
- Centralized error handling with consistent JSON error responses
- Automated test suite and CI pipeline

## Tech stack

| Area                | Tools                                            |
| ------------------- | ------------------------------------------------ |
| Runtime / framework | Node.js 24, Express 5                            |
| Database            | MongoDB, Mongoose                                |
| Auth and security   | jsonwebtoken, bcrypt, cookie-parser, validator   |
| Testing             | Vitest or Jest, Supertest, mongodb-memory-server |
| CI/CD               | GitHub Actions, deployed on Render               |

---

## API endpoints

All routes are prefixed with `/api`. Routes marked **Auth** need the `token` cookie from login.

### Auth

| Method | Endpoint        | Auth | Description                        |
| ------ | --------------- | ---- | ---------------------------------- |
| POST   | `/auth/sign-up` | No   | Create an account                  |
| POST   | `/auth/login`   | No   | Log in and receive the auth cookie |
| POST   | `/auth/logout`  | Yes  | Clear the auth cookie              |

### Profile

| Method | Endpoint            | Auth | Description                   |
| ------ | ------------------- | ---- | ----------------------------- |
| GET    | `/profile/view`     | Yes  | Get your own profile          |
| PATCH  | `/profile/edit`     | Yes  | Update allowed profile fields |
| PATCH  | `/profile/password` | Yes  | Change your password          |

### Connection requests

| Method | Endpoint                          | Auth | Description                                                         |
| ------ | --------------------------------- | ---- | ------------------------------------------------------------------- |
| POST   | `/request/send/:status/:toUserId` | Yes  | Send a request. `status` is `interested` or `ignore`                |
| PATCH  | `/request/review/:status/:reqId`  | Yes  | Respond to a received request. `status` is `accepted` or `rejected` |

### Users

| Method | Endpoint                     | Auth | Description                                                     |
| ------ | ---------------------------- | ---- | --------------------------------------------------------------- |
| GET    | `/user/requests/received`    | Yes  | Pending requests sent to you                                    |
| GET    | `/user/connections`          | Yes  | Your accepted connections                                       |
| GET    | `/user/feed?page=1&limit=10` | Yes  | Developers you have not interacted with (limit is capped at 30) |

TODO: add any routes or query parameters you added later (for example skill filtering on `/user/feed`).

### Error format

Errors return JSON with the matching HTTP status code:

```json
{ "status": "fail", "message": "Invalid credentials" }
```

| Status | When                                                                              |
| ------ | --------------------------------------------------------------------------------- |
| 400    | Validation failed, invalid ID, malformed JSON                                     |
| 401    | Missing, invalid, or expired token; wrong credentials                             |
| 404    | Resource or route not found                                                       |
| 409    | Duplicate resource (for example email already registered, request already exists) |
| 500    | Unexpected server error (details are logged, not returned)                        |

---

## Getting started

### Prerequisites

- Node.js 24
- A MongoDB database (local or Atlas)

### Setup

```bash
git clone https://github.com/CodeRAFCE/devtinder-api.git
cd devtinder-api
npm install
cp .env.example .env   # then fill in the values
npm run dev
```

### Environment variables

| Variable      | Description                                                        |
| ------------- | ------------------------------------------------------------------ |
| `MONGODB_URI` | MongoDB connection string                                          |
| `JWT_SECRET`  | Long random string used to sign tokens                             |
| `NODE_ENV`    | Set to `production` in deployment so cookies use the `secure` flag |
| `PORT`        | TODO: if your app reads it, otherwise remove this row              |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Testing

```bash
npm test
```

The suite has **130 tests** across six files:

| File              | Covers                                               |
| ----------------- | ---------------------------------------------------- |
| `auth.test.ts`    | Sign-up, login, logout, validation and failure cases |
| `profile.test.ts` | View, edit, and password change                      |
| `request.test.ts` | Sending and reviewing connection requests            |
| `user.test.ts`    | Received requests, connections, and the feed         |
| `flow.test.ts`    | End-to-end user journeys across several endpoints    |
| `smoke.test.ts`   | Basic checks that the app boots and routes respond   |

TODO: add one line on how tests get a database (for example an in-memory MongoDB or a separate test database) and how data is reset between tests.

## CI/CD

- **CI:** a GitHub Actions workflow runs the full test suite on every push and pull request.
- **Branch protection:** `main` requires the CI check to pass before merging. I verified this by deliberately breaking tests on a branch and confirming the pull request was blocked.
- **Deployment:** TODO: describe exactly how it works. For example, "Render redeploys from `main`" or "deploys only after CI passes".

---

## Project structure

```
src/
  app.js              # Express setup, middleware, and server start
  config/             # Database connection
  middlewares/        # Authentication and error handling
  models/             # Mongoose schemas (User, ConnectionRequest)
  routes/             # auth, profile, request, and user routers
  utils/              # Validation helpers and the AppError class
tests/                # Integration tests
```

TODO: adjust file extensions and folders if they differ.

---

## Design decisions

- **JWT in an `httpOnly` cookie, not localStorage.** JavaScript cannot read the token, which limits damage from XSS. Cookies also use `sameSite` and, in production, `secure`.
- **One error-handling middleware.** Routes throw an `AppError` with a status code, and a single handler maps it, along with known Mongoose and JWT errors, to a JSON response. Unexpected errors return a generic 500 and are logged server-side only.
- **Unique compound index on `(fromUserId, toUserId)`.** The database itself prevents duplicate requests in the same direction. The route also checks the reverse direction.
- **Whitelisted profile edits.** Only a fixed set of fields can be changed, which prevents mass-assignment.
- **Safe populate.** User data in responses includes only public fields, never the password hash.
- **Capped pagination.** The feed limits page size to 30 instead of rejecting large values.

## Known limitations and next steps

- The send-request check is not atomic: two simultaneous requests could race, and only same-direction duplicates are guaranteed by the unique index.
- The feed uses `skip`/`limit`, which gets slower on deep pages. Cursor-based pagination would scale better.
- The feed loads the user's request history into memory and filters with `$nin`, which will not scale to very large histories.
- Not implemented yet: TODO: remove any you have added. Rate limiting on login, Helmet security headers, real-time chat, and profile image upload.

---

## Author

Built by Seshan A. Questions or feedback: seshh.coderafce@gmail.com
