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
git clone https://github.com/cray12399/harmonyapp.us.git
cd harmonyapp.us
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
MONGO_URI=
JWT_SECRET=
RESEND_API_KEY=
EMAIL_FROM=Harmony <noreply@harmonyapp.us>
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
SEED_USER_PASSWORD=
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
 
This creates an admin account (status 2) and a few regular users. The admin logs in with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from `server/.env`, and the regular users all use `SEED_USER_PASSWORD`.
 
## Running the apps
 
Use a separate terminal for each one.
 
| App | Command | Opens at |
| --- | --- | --- |
| API | `cd server && npm run dev` | http://localhost:4000/api |
| Web | `cd web && npm run dev` | http://localhost:5173 |
| Mobile | `cd mobile && npx expo start` | Scan the QR code with Expo Go |
 
Start the API first. The web and mobile apps both depend on it.
 
### Testing biometric unlock
 
Face ID doesn't work in Expo Go on iOS. Test biometrics with a fingerprint on Android.

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
