# Contributing to Harmony

This guide covers how to run Harmony on your own machine, test the API, and get your changes merged.

## Repo layout

```
server/   Express API (Node.js, Mongoose)
server/bruno/   Bruno collection with API tests
web/      React web client (Vite)
mobile/   React Native app (Expo)
```

## Prerequisites

Install these before you start:

- [Node.js](https://nodejs.org) LTS. Use the version in `.nvmrc` (run `nvm use` in the repo root if you have nvm).
- [Git](https://git-scm.com)
- [Bruno](https://www.usebruno.com) for API testing
- [Expo Go](https://expo.dev/go) on your phone, if you work on mobile

You also need the values for `.env`. The Lead shares them in Discord. Never commit them.

## First-time setup

```bash
git clone https://github.com/<org>/harmony.git
cd harmony
```

Install dependencies in each app:

```bash
cd server && npm install
cd ../web && npm install
cd ../mobile && npm install
```

## Environment variables

Each app has a `.env.example`. Copy it to `.env` and fill in the values from Discord.

**server/.env**

```
PORT=4000
MONGO_URI=<from Discord>
JWT_SECRET=<from Discord>
RESEND_API_KEY=<from Discord, or leave blank>
EMAIL_FROM=Harmony <noreply@harmonyapp.us>
```

If `RESEND_API_KEY` is blank, the server prints verification and reset codes to the terminal instead of sending email. Use this for local work so we don't burn through our email quota.

**mobile/.env**

```
EXPO_PUBLIC_API_URL=http://<your computer's local IP>:4000/api
```

Your phone can't reach `localhost` on your computer, so use your computer's local network IP (for example `192.168.1.25`). Your phone and computer must be on the same Wi-Fi network.

The web app doesn't need a `.env`. Vite forwards `/api` requests to `localhost:4000`.

## Database

We all use the shared MongoDB Atlas cluster. Your `MONGO_URI` points to the `harmony-dev` database, so local testing never touches production data.

If Atlas refuses your connection, ask the Database member to add your IP address to the Atlas network access list.

To create the test accounts:

```bash
cd server
npm run seed
```

This creates an admin account (status 2) and a few regular users. The logins are in the pinned message in Discord.

## Running the apps

Use a separate terminal for each one.

| App | Command | Opens at |
| --- | --- | --- |
| API | `cd server && npm run dev` | http://localhost:4000/api |
| Web | `cd web && npm run dev` | http://localhost:5173 |
| Mobile | `cd mobile && npx expo start` | Scan the QR code with Expo Go |

Start the API first. The web and mobile apps both depend on it.

### Testing biometric unlock

Face ID doesn't work in Expo Go on iOS. Test biometrics with a fingerprint on Android, or ask the Database member for a development build on iOS.

## Testing the API with Bruno

Every endpoint needs at least one Bruno test. This is part of our grade.

1. Open Bruno and choose **Open Collection**.
2. Select the `server/bruno` folder.
3. Pick the **local** environment in the top right.
4. Run **Auth > Login** first. It saves your token, and the other requests use it automatically.
5. Right-click the collection and choose **Run** to run every test.

To run all tests from the terminal:

```bash
npm install -g @usebruno/cli
cd server/bruno
bru run --env local
```

### Writing a test

Add tests in the request's **Tests** tab. For example:

```javascript
test("returns 200", function () {
  expect(res.status).to.equal(200);
});

test("returns a list of friends", function () {
  expect(res.body.friends).to.be.an("array");
});
```

Requests that need a login use `{{token}}` in the `Authorization` header as `Bearer {{token}}`.

## API conventions

- Base URL: `/api`
- Requests and responses are JSON.
- Send the token as `Authorization: Bearer <token>`.
- Errors return a status code and `{ "error": "message" }`.
- Status and type fields are integers. See the legend in the ERD.

If you add or change an endpoint, update the Bruno collection and the SwaggerHub spec in the same pull request.

## Workflow

1. Pick an issue on the GitHub board and assign it to yourself.
2. Pull the latest `main` and create a branch named after your area and the task:
   ```bash
   git checkout main
   git pull
   git checkout -b api/friends-endpoints
   ```
   Use `api/`, `web/`, `mobile/`, `db/` or `admin/` as the prefix.
3. Commit often with short messages that say what changed, like `Add friend request endpoint`.
4. Before opening a pull request:
   - Pull `main` into your branch and fix any conflicts.
   - Run the Bruno tests if you touched the server.
   - Make sure the app still starts.
5. Open a pull request into `main` and link the issue. One teammate must approve it before it can be merged.
6. Never push directly to `main`.

## Deployment

The Lead deploys `main` to https://harmonyapp.us. Don't change anything on the server yourself. If something works locally but not on the live site, post in the deploy channel.

## Getting help

Post in the Discord channel for your area. If you're stuck for more than an hour, ask. We don't have time to lose a day on one bug.
