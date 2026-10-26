"use client";

import * as React from "react";
import Header from "@/components/navigation/header";
import Footer from "@/components/navigation/footer";
import ClientFeedbackSection from "@/components/client-feedback-section";

export default function PublicFeedbackPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-primary)]">
      <Header />
      <main className="flex-1 pt-24">
        <ClientFeedbackSection limit={0} showAllLink={false} />
      </main>
      <Footer />
    </div>
  );
}
