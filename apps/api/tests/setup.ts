// Runs before every test file. Provides the minimum environment
// config/env.ts requires, pointed at the disposable test database
// started by `docker-compose -f docker-compose.test.yml` (see
// package.json test scripts / README "Running tests").
process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "mysql://antigravity:antigravity@localhost:3307/antigravity_test";
process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? "test-session-secret-0123456789abcdef";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret-0123456789abcdef";
process.env.EMAIL_PROVIDER = "console";
process.env.STORAGE_PROVIDER = "local";
process.env.PAYMENT_PROVIDER = "mock";
process.env.INSTAGRAM_PROVIDER = "mock";
