import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { UploadWorkspace } from "@/components/photos/upload-workspace";

export default function UploadPage() {
  return <><SiteHeader /><main className="workspace"><div className="workspace-head"><div><div className="eyebrow">New frame</div><h1>留下一個地方的代表畫面。</h1></div><Link className="button ghost" href="/">回到首頁</Link></div><UploadWorkspace /></main></>;
}
