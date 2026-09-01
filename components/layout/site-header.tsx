import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="AtlasFrame 首頁">
        <span className="brand-mark">◈</span>
        <span>AtlasFrame</span>
      </Link>
      <nav aria-label="主要導覽">
        <Link href="/#manifesto">理念</Link>
        <Link href="/login" className="nav-cta">開始記錄</Link>
      </nav>
    </header>
  );
}
