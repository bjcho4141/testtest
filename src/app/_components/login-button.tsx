"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";

export function LoginButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        variant="kakao"
        size="lg"
        onClick={handleLogin}
        disabled={loading}
      >
        {loading ? "이동 중…" : "카카오로 로그인"}
      </Button>
      {error && (
        <p className="text-xs text-red-600 max-w-sm text-center">{error}</p>
      )}
    </div>
  );
}
