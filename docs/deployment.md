# AtlasFrame Alpha deployment

## 1. Supabase

1. 依序執行 `db/migrations/0000_atlasframe_foundation.sql` 至最新 migration。
2. 在 Authentication → URL Configuration 設定 Site URL 為 `https://atlasframe.1888atch25.workers.dev`，並加入：
   - `https://atlasframe.1888atch25.workers.dev/auth/callback`
   - `https://atlasframe.1888atch25.workers.dev/auth/reset-password`
3. 在 Authentication → Providers 啟用 Email，開啟 Confirm email；Alpha 期間不要提供公開 sign-up UI。
4. 在 Google Cloud OAuth Client 加入 Supabase 提供的 callback URI：`https://wkocqkuunffscbxtzhxa.supabase.co/auth/v1/callback`。接著在 Authentication → Providers → Google 啟用 Provider，填入同一組 Client ID 與 Client Secret。保留既有 external API 的 redirect URI，不要移除。
5. 在 `alpha_allowlist` 新增受邀 email：

```sql
insert into alpha_allowlist (email, note) values ('you@example.com', 'Alpha owner');
```

6. 在 Authentication → Users 為帳密使用者建立或邀請帳號；既有外部帳密無法讀取時，改由使用者用「忘記密碼」完成重設。Google 使用者首次完成 Supabase 登入時，AtlasFrame 會以已驗證 email 連結既有 Profile。
7. 將 Project URL、Publishable key、Secret key 設為 Worker secrets。Secret key 僅可在 Worker server route 使用，不能設定為 `NEXT_PUBLIC_*`。

## 2. Cloudflare

1. 建立私有 R2 bucket `atlasframe-originals`，不要設定 public domain 或 r2.dev public URL。
2. 使用 `docs/r2-cors.json` 設定 CORS；將 `YOUR-WORKER.workers.dev` 換成正式網域，僅保留實際需要的 origins、`PUT` 與 `HEAD`。
3. 在 Images 啟用 transformation，維持兩個固定 URL variant：`thumbnail`、`display`。應用程式不接受任意寬高、品質或格式參數。
4. 設定 Worker secrets：`SUPABASE_URL`、`SUPABASE_PUBLISHABLE_KEY`、`SUPABASE_SECRET_KEY`、`R2_ACCOUNT_ID`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`。
5. 以 `wrangler.jsonc` 綁定真實的私有 R2 bucket，將 `APP_ORIGIN` 更新為正式 URL；部署前重新執行 `pnpm cf-typegen`。

## 3. 驗收順序

1. `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
2. `pnpm start` 驗證 Workers runtime。
3. Google OAuth、帳密登入、忘記密碼 → allowlist → Profile → JPEG direct upload → R2 object head → complete。
4. 建立 Place，指定給照片，確認第二張指定同 Place 得到 HTTP 409；確認取代後舊照片失去 Place 關聯。
5. 以未登入瀏覽器驗證公開照片和精確位置地圖可見；確認 R2 object key 及原始檔 URL 無法直接存取。

## 成本保護

- 資料庫函式會以 500 MB user quota、8 GB platform hard limit 與 reservation transaction 拒絕新上傳。
- R2 保持 private；原圖只由 `/images/{photoId}/{variant}` 經授權判斷後讀取。
- Cloudflare Images 固定只用兩種 transformation。免費額度耗盡時由 Cloudflare 回傳錯誤，不會自動升級方案。
- OpenFreeMap 是可替換的底圖供應商，沒有 SLA；地圖 style URL 集中在 `components/maps/atlas-map.tsx`。
