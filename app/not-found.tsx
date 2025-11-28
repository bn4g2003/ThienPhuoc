import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    default: "404",
    template: ``,
  },
};

const Page = () => {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 560 }}>
        <h1 style={{ fontSize: "clamp(2rem, 6vw, 4rem)", margin: "1rem 0" }}>
          404 — Trang không tồn tại
        </h1>
        <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
          Xin lỗi, chúng tôi không thể tìm thấy trang bạn đang tìm kiếm.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "0.6rem 1rem",
            background: "#111827",
            color: "#fff",
            borderRadius: 6,
            textDecoration: "none",
          }}
        >
          Quay về trang chủ
        </Link>
      </div>
    </main>
  );
};

export default Page;
