import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "utube-shorts-jp",
  description: "한일 쇼츠 변환 SaaS — CC 라이선스 영상 자동 변환·업로드",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
