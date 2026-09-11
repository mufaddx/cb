import type { Metadata } from "next";
import FaqContent from "./FaqContent";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about payouts, campaign types, Instagram connection, retention, and refunds on Vidlix.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return <FaqContent />;
}
