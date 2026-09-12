// Which half of the split auth card a route visually belongs to — a
// creator continuing on to /verify-otp is still "in the signup
// journey," same for /forgot-password and /reset-password hanging off
// /login, so the brand panel/direction don't reset mid-flow. Shared
// between the layout (which side is the brand panel on right now) and
// AuthNavLink (which way is this particular link heading).
const SIGNUP_SIDE_ROUTES = ["/signup", "/verify-otp"];

export type AuthSide = "login" | "signup";

export function authSideFor(pathname: string): AuthSide {
  return SIGNUP_SIDE_ROUTES.some((r) => pathname.startsWith(r)) ? "signup" : "login";
}
