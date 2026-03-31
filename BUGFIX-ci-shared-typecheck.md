# Bugfix: CI Pipeline 全面失敗 — Shared Typecheck 與 Mobile 建置錯誤

## 問題描述

GitHub Actions CI 在所有 Node.js 相關 job 中完全無法通過。`shared-typecheck` job 在執行 `tsc --noEmit` 時立即失敗，錯誤訊息為 `TS2307: Cannot find module '@tanstack/react-query'`，同時伴隨多個 `TS7006: Parameter implicitly has an 'any' type` 錯誤。`mobile-lint` job 因 `mobile/package-lock.json` 不存在而導致 `npm ci` 直接報錯。此外，整條 CI 只能手動觸發，無法在 push 或 PR 時自動執行。

---

## 根本原因分析

### Bug 1：`shared` 套件缺少 `@tanstack/react-query` devDependency

`shared/src/hooks/` 下的四個 hook 檔案（`useGear.ts`、`useLocations.ts`、`usePhotos.ts`、`useStats.ts`）均直接 import `@tanstack/react-query`：

```
shared/src/hooks/useGear.ts
  └─ import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
```

`@tanstack/react-query` 只存在於 `frontend/package.json` 與 `mobile/package.json` 的 dependencies 中，`shared/package.json` 完全沒有宣告它。CI 在 `shared` 目錄單獨執行 `npm ci` 時，不會安裝前端或 mobile 的依賴，導致 TypeScript 找不到模組定義。

**因果鏈：**
```
tsc --noEmit 失敗
  └─ Cannot find module '@tanstack/react-query'
       └─ shared/node_modules 中不存在此套件
            └─ npm ci 只讀取 shared/package.json，其中無此 dependency
                 └─ shared/package.json 的 devDependencies 從未宣告它
```

### Bug 2：`mobile/package-lock.json` 不存在，`npm ci` 無法執行

`npm ci` 嚴格要求 lock file 存在，否則直接以非零 exit code 退出。`mobile/` 目錄從未提交 `package-lock.json`，因此 `mobile-lint` job 必然失敗。

### Bug 3：CI 只能手動觸發，缺乏自動化

原始 `on:` 區段只有 `workflow_dispatch`，這意味著每次 push 或開 PR 都不會自動執行 CI 檢查，失去 CI 保護的意義。

---

## 修改內容

### 1. `shared/package.json`

```diff
   "devDependencies": {
+    "@tanstack/react-query": "^5.40.0",
     "typescript": "^5.2.2"
   },
```

**說明：**
- `shared` 的 hooks 使用 `@tanstack/react-query` 的型別與 API，但從未在自身的 `devDependencies` 中宣告。在獨立執行 `npm install`（或 `npm ci`）時，TypeScript 無法解析此模組，導致 `TS2307` 錯誤與衍生的 `TS7006`（因為 callback 參數型別推導依賴 react-query 的泛型）。加入 devDependency 後，`tsc --noEmit` 可正確取得型別定義。
- 版本 `^5.40.0` 與 `frontend` 和 `mobile` 保持一致，避免型別版本不匹配。

> **注意：** 因本機 `shared/node_modules` 目前由 root 擁有（舊的 `sudo npm` 造成），需先執行以下指令修復後，再 `npm install` 更新 lock file：
> ```bash
> sudo chown -R $USER:$USER /home/eric3/LensLog/shared/node_modules
> cd shared && npm install
> ```
> 更新後可將 CI 中的 `npm install` 改回 `npm ci` 以取得嚴格的可重現性。

---

### 2. `.github/workflows/ci.yml`

```diff
 on:
-  workflow_dispatch:  # 只能手動觸發，push 不會自動執行
+  push:
+    branches: [main, develop, "feature/**", "feat/**"]
+  pull_request:
+    branches: [main, develop]
+  workflow_dispatch:
```

**說明：**
- 新增 `push` 與 `pull_request` 觸發條件，涵蓋 `main`、`develop` 及所有 `feature/**`、`feat/**` 分支（對應 `feature/issue-10-photo-upload` 與 `feat/logout-blacklist` 等命名規範）。保留 `workflow_dispatch` 供手動觸發。

```diff
   shared-typecheck:
     steps:
       - uses: actions/setup-node@v4
         with:
           node-version: "20"
-          cache: npm
-          cache-dependency-path: shared/package-lock.json

       - name: Install dependencies
         run: |
           cd shared
-          npm ci
+          npm install
```

**說明：**
- 移除 `cache: npm`：在 lock file 尚未同步更新前，npm cache 以 lock file 為 key，快取會因內容不符而失效，移除避免誤導。
- 從 `npm ci` 改為 `npm install`：`npm ci` 要求 `package-lock.json` 與 `package.json` 完全一致，否則報錯退出。由於 `@tanstack/react-query` 已加入 `package.json` 但 lock file 尚未更新（本機有權限問題），改用 `npm install` 讓 CI 可正常安裝並解析最新依賴。

```diff
   frontend-lint:
       - name: Install shared dependencies
         run: |
           cd shared
-          npm ci
+          npm install
```

**說明：**
- `frontend-lint` job 中也需要先安裝 `shared` 的依賴（因為 `frontend` 透過 `file:../shared` 引用它）。同樣改為 `npm install` 以確保 `@tanstack/react-query` 被正確安裝。

```diff
   mobile-lint:
     steps:
       - uses: actions/setup-node@v4
         with:
           node-version: "20"
-          cache: npm
-          cache-dependency-path: mobile/package-lock.json

       - name: Install shared dependencies
         run: |
           cd shared
-          npm ci
+          npm install

       - name: Install mobile dependencies
         run: |
           cd mobile
-          npm ci
+          npm install --legacy-peer-deps
```

**說明：**
- 移除 `cache-dependency-path: mobile/package-lock.json`：`mobile/package-lock.json` 從未提交，此路徑不存在，`cache: npm` 會直接失敗。
- `npm ci` → `npm install --legacy-peer-deps`：`mobile/` 沒有 lock file，`npm ci` 無法執行。`--legacy-peer-deps` 是必要的，因為 Expo SDK（`expo ~51.0.0`）與 React Native（`0.74.0`）的 peer dependency 樹複雜，npm 7+ 的嚴格 peer dep 解析會產生衝突錯誤。

---

## 修改檔案清單

| 檔案 | Bug | 說明 |
|------|-----|------|
| `shared/package.json` | Bug 1 | 新增 `@tanstack/react-query ^5.40.0` 至 devDependencies，修復 shared standalone typecheck |
| `.github/workflows/ci.yml` | Bug 1, 2, 3 | 新增 push/PR 觸發；shared 與 mobile 改用 `npm install`；mobile 加 `--legacy-peer-deps`；移除無效 npm cache 設定 |

---

## 相關 Commits

> 本次修改尚未 commit，屬於 `feature/issue-10-photo-upload` 分支上的工作變更。
