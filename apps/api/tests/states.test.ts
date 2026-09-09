import { describe, expect, it } from "vitest";
import {
  CAMPAIGN_TRANSITIONS,
  CampaignStatus,
  InvalidTransitionError,
  assertTransition,
} from "@antigravity/shared";

describe("state machine enforcement", () => {
  it("allows a valid transition", () => {
    expect(() =>
      assertTransition("Campaign", CAMPAIGN_TRANSITIONS, CampaignStatus.DRAFT, CampaignStatus.SUBMITTED)
    ).not.toThrow();
  });

  it("rejects skipping required states", () => {
    expect(() =>
      assertTransition("Campaign", CAMPAIGN_TRANSITIONS, CampaignStatus.DRAFT, CampaignStatus.LIVE)
    ).toThrow(InvalidTransitionError);
  });

  it("rejects a terminal state from transitioning further", () => {
    expect(() =>
      assertTransition("Campaign", CAMPAIGN_TRANSITIONS, CampaignStatus.REFUNDED, CampaignStatus.LIVE)
    ).toThrow(InvalidTransitionError);
  });

  it("treats a no-op same-state write as always valid", () => {
    expect(() =>
      assertTransition("Campaign", CAMPAIGN_TRANSITIONS, CampaignStatus.DRAFT, CampaignStatus.DRAFT)
    ).not.toThrow();
  });

  it("never allows LIVE campaigns to reach PAYMENT_PENDING again (can't un-pay)", () => {
    expect(() =>
      assertTransition("Campaign", CAMPAIGN_TRANSITIONS, CampaignStatus.LIVE, CampaignStatus.PAYMENT_PENDING)
    ).toThrow(InvalidTransitionError);
  });
});
