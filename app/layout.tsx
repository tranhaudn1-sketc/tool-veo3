import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Veo3 AI Studio - Trình tạo Video & Ảnh AI Cá Nhân",
  description: "Web app cá nhân tạo ảnh và video bằng Google Veo & Imagen 3",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <body className="min-h-screen bg-[#07080d] text-slate-100 antialiased selection:bg-purple-600 selection:text-white">
        {/* Subtle background ambient mesh glow */}
        <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-[128px]" />
          <div className="absolute top-1/3 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-[128px]" />
          <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-[128px]" />
        </div>

        {children}

        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "#121524",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#f8fafc",
            },
          }}
        />
      </body>
    </html>
  );
}
