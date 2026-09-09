// Production entry point for hosts that need a plain Node.js file to
// launch the app (e.g. Phusion Passenger on Hostinger), rather than
// running the `next start` CLI directly. Not used by `npm run dev`/
// `npm run start` locally — those still use the Next.js CLI (see
// package.json). Passenger sets PORT; falls back to 3000 otherwise.
const path = require("path");
const { createServer } = require("http");
const next = require("next");

const port = Number(process.env.PORT) || 3000;
const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => handle(req, res)).listen(port, () => {
      console.log(`[web] ready on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("[web] failed to start", err);
    process.exit(1);
  });
