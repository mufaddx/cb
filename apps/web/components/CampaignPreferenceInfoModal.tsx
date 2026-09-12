"use client";

import { useState } from "react";
import { Button } from "./Button";

type CampaignPreferenceType = "CLIPPING" | "CREATOR_CONTENT";
type Lang = "hi" | "en" | "hinglish";

const LANG_LABEL: Record<Lang, string> = { hi: "हिंदी", en: "English", hinglish: "Hinglish" };

// Written out per-language rather than machine-translated at render
// time — this explains what the creator is agreeing to before they
// pick it, so it needs to actually read naturally in each language,
// not just be technically correct.
const COPY: Record<CampaignPreferenceType, Record<Lang, { heading: string; body: string }>> = {
  CLIPPING: {
    hi: {
      heading: "Clipping में क्या करना होगा?",
      body:
        "Clipping में ब्रांड आपको खुद अपना बनाया हुआ वीडियो देगा। आपको बस वही वीडियो अपने Instagram पर ज्यों का त्यों पोस्ट करना है। कोई एडिटिंग नहीं, अपना चेहरा दिखाना ज़रूरी नहीं — जो वीडियो मिलेगा, वही पोस्ट कर देना है।",
    },
    en: {
      heading: "What does Clipping involve?",
      body:
        "In Clipping, the brand gives you a ready-made video. You just post that exact video on your Instagram, as-is. No editing, and you don't need to show your own face — whatever video you're given, that's what you post.",
    },
    hinglish: {
      heading: "Clipping mein kya karna hoga?",
      body:
        "Clipping mein brand aapko khud ka banaya hua video dega. Aapko bas wahi video apne Instagram par jaise ka waisa post karna hai. Koi editing nahi, apna face dikhana zaroori nahi — jo video milega, wahi post kar dena hai.",
    },
  },
  CREATOR_CONTENT: {
    hi: {
      heading: "Creator Content में क्या करना होगा?",
      body:
        "Creator Content में ब्रांड आपको प्रोडक्ट की पूरी डिटेल, स्क्रिप्ट और डिस्क्रिप्शन देगा। आपको उस प्रोडक्ट को खुद इस्तेमाल करके, अपने चेहरे के साथ एक वीडियो बनाकर पोस्ट करना है — जैसे एक असली रिव्यू।",
    },
    en: {
      heading: "What does Creator Content involve?",
      body:
        "In Creator Content, the brand gives you the full product details, a script, and a description. You need to actually use the product, record a video showing your own face, and post it — like a real review.",
    },
    hinglish: {
      heading: "Creator Content mein kya karna hoga?",
      body:
        "Creator Content mein brand aapko product ki puri detail, script aur description dega. Aapko us product ko khud use karke, apne face ke saath ek video banake post karna hai — jaise ek real review.",
    },
  },
};

export function CampaignPreferenceInfoModal({
  type,
  onClose,
}: {
  type: CampaignPreferenceType;
  onClose: () => void;
}) {
  const [lang, setLang] = useState<Lang>("hinglish");
  const copy = COPY[type][lang];

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(24,24,27,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div className="card" style={{ maxWidth: 420, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {(Object.keys(LANG_LABEL) as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className="badge"
              style={{
                border: "none",
                cursor: "pointer",
                background: lang === l ? "var(--color-primary)" : "var(--color-bg-subtle)",
                color: lang === l ? "#fff" : "var(--color-text-secondary)",
                fontWeight: 600,
              }}
            >
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>

        <h3 style={{ marginBottom: 10 }}>{copy.heading}</h3>
        <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6, marginBottom: 20 }}>{copy.body}</p>

        <Button onClick={onClose} style={{ width: "100%" }}>
          {lang === "hi" ? "समझ गया" : lang === "hinglish" ? "Samajh gaya" : "Got it"}
        </Button>
      </div>
    </div>
  );
}
