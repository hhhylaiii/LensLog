# LensLog Collaboration Guide

這份文件整理 LensLog 專案在 GitLab issue、branch、commit message 與 PR / MR message 上的命名慣例。

希望達成的效果很簡單：

- 讓每個變更都能快速對回對應 issue
- 讓 reviewer 能在列表頁就理解變更主題
- 讓專案中的命名方式維持一致，降低協作成本

## Quick Reference

| 項目 | 建議格式 | 範例 |
|------|------|------|
| Issue | `[模組] 動詞 + 目標` | `[Backend] 限制 presign 僅接受圖片 Content-Type` |
| Branch | `<type>/<issue-number>-<short-summary>` | `security/24-validate-photo-s3-key` |
| Commit | `<type>(<scope>): #<issue-number> <summary>` | `fix(backend): #24 restrict photo presign uploads to allowed image content types` |
| PR title | `<type>: <short-summary>` | `security: verify photo s3_key ownership before create` |
| PR description | 使用固定模板 | 見下方 `PR / MR Description Template` |

## 1. Issue Naming

### 建議格式

`[模組] 動詞 + 目標`

### 命名原則

- 標題以「要解決的問題」或「要交付的功能」為主。
- 建議用動詞開頭，例如 `新增`、`修正`、`限制`、`重構`、`補上`。
- 模組名稱盡量固定，方便後續搜尋與分類。

### 常用模組

- `Backend`
- `Frontend`
- `Mobile`
- `Infra`
- `Docs`
- `Security`
- `QA`

### 模組定義

| 模組 | 適用範圍 |
|------|------|
| `Backend` | FastAPI API、資料庫模型、schema、service、Celery 任務、後端商業邏輯 |
| `Frontend` | Web 前端介面、頁面流程、地圖互動、React component、前端狀態管理 |
| `Mobile` | Expo / React Native App、行動端 UI、裝置能力整合、App 專屬流程 |
| `Infra` | Docker、CI/CD、部署設定、環境變數、Nginx、資料儲存與外部服務配置 |
| `Docs` | README、API 文件、操作說明、開發規範、非功能性文件更新 |
| `Security` | 驗證授權、權限控管、資料保護、輸入驗證、安全性修補與風險控管 |
| `QA` | 測試案例、驗證流程、測試資料、回歸測試補強與測試策略調整 |

若 issue 同時跨多個模組，建議以主要責任邊界為主；若安全性是主題本身，通常優先使用 `Security`。

### 範例

- `[Backend] 限制 photo presign 僅接受允許的圖片 Content-Type`
- `[Security] 驗證 photo create 的 s3_key ownership 與 one-time use`
- `[Frontend] 新增 photography map 的 marker clustering`
- `[Docs] 補上 presign 上傳流程與錯誤碼說明`

### 不建議的寫法

這類標題通常資訊量較低，後續回頭查找時也不太容易理解：

- `修 bug`
- `照片上傳`
- `issue 24`
- `做 map`

## 2. Issue Description Template

除了 title 之外，issue 內容也建議使用固定結構。這種格式特別適合功能設計、UI/UX 調整、產品需求整理，以及需要跨角色討論的任務。

### 建議結構

```md
## 背景

描述目前的問題、限制、既有行為，或為什麼需要這個調整。

## 目標

說明這個 issue 希望達成的結果。

## 方案方向 / 設計建議

若已有方向，可以整理目前的設計想法、候選方案、限制條件或評估重點。

## Requirements

- 列出這次設計 / 開發必須滿足的需求

## Acceptance Criteria

- [ ] 可驗收條件 1
- [ ] 可驗收條件 2
- [ ] 可驗收條件 3
```

### 各段落說明

| 區塊 | 用途 |
|------|------|
| `背景` | 交代現況、限制、問題來源，讓閱讀者先建立共同脈絡 |
| `目標` | 說明這次調整希望達成的結果，避免只描述問題、不定義終點 |
| `方案方向 / 設計建議` | 放候選解法、設計方向、已知限制、評估重點；若 issue 還在探索階段，這段特別有用 |
| `Requirements` | 列出必須滿足的需求或實作邊界 |
| `Acceptance Criteria` | 列出驗收條件，讓設計、開發、QA 對完成標準有一致理解 |

### 建議寫法

- `背景` 盡量描述具體行為與限制，不只寫「目前不好用」。
- `目標` 聚焦在成果，而不是直接跳到實作細節。
- `Requirements` 描述「必須支援什麼」。
- `Acceptance Criteria` 描述「完成後應該能確認什麼」。
- 若 issue 是設計導向，`Acceptance Criteria` 也可以包含：
  - 已完成設計稿
  - 已與前端確認可實作性
  - 已完成 handoff

### UI / UX 類 Issue 範例格式

下面這種格式可以直接作為地圖、卡片、表單、Dashboard 等設計型 issue 的模板：

```md
## 背景

目前地圖上的景點 Popup 在資訊呈現上僅覆蓋部分資料欄位，但後端已提供更多可用資訊。若直接塞入現有版面，會造成資訊擁擠，並影響地圖操作體驗。

## 目標

重新設計地圖景點的資訊呈現方式，讓較完整的地點、天氣與天文資訊能被清楚呈現，同時維持良好的地圖操作體驗。

## 方案方向 / 設計建議

- 可評估側滑面板（Side Panel / Drawer）
- 可評估可拖曳懸浮卡片（Draggable Floating Card）
- 可評估底部抽屜（Bottom Sheet）

## Requirements

- 決定採用何種資訊載體，並合理配置新增欄位
- 區分主要資訊與次要資訊，建立清楚的視覺層級
- 日出 / 日落時間需容易辨識
- 需考慮 Light Mode 與 Dark Mode
- 需提出對應的行動裝置 / RWD 方案

## Acceptance Criteria

- [ ] 完成地圖地點詳細資訊的 UI 設計稿
- [ ] 確認新的資訊載體，並涵蓋所有後端提供的天氣欄位
- [ ] 提出對應的 Mobile / RWD 佈局方案
- [ ] 已與前端工程師確認可實作性
- [ ] 設計定案並完成 handoff
```

## 3. Branch Naming

### 建議格式

`<type>/<issue-number>-<short-summary>`

### 範例

- `feat/34-photography-map`
- `fix/32-location-tags-serialization`
- `chore/27-ops-minio-lifecycle-policy`
- `security/24-validate-photo-s3-key`

### Branch Type

| Type | 用途 |
|------|------|
| `feat` | 新功能 |
| `fix` | 一般 bug 修正 |
| `security` | 安全性修補 |
| `refactor` | 不改變行為的重構 |
| `docs` | 文件調整 |
| `test` | 測試補強 |
| `chore` | 設定、CI、依賴、維運雜項 |
| `hotfix` | 緊急修補 |

### 命名原則

- `issue-number` 建議直接使用 GitLab issue number。
- `short-summary` 建議使用英文 `kebab-case`。
- `short-summary` 以功能或問題主題為主，不需要放太多實作細節。
- 一個 branch 原則上對應一個 issue，後續追蹤會比較清楚。

### 目前 repo 中可一起收斂的格式

目前已經出現過一些不同寫法，例如：

- `bug/24-security-presigned-put-url-contenttype`
- `feat/issue-35-gear-library-page`
- `feature/issue-10-photo-upload`
- `feat/Celery-Worker`

如果後續統一，會比較建議改成：

- `fix/24-security-presigned-put-url-contenttype`
- `feat/35-gear-library-page`
- `feat/10-photo-upload`
- `feat/xx-celery-worker`

## 4. Commit Message

### 建議格式

`<type>(<scope>): #<issue-number> <summary>`

### 範例

- `fix(backend): #24 restrict photo presign uploads to allowed image content types`
- `test(api): #24 add coverage for presign content type validation`
- `security(backend): #24 verify s3_key ownership on photo creation`
- `docs(backend): #24 document presign ownership validation flow`

### Commit Type

- `feat`
- `fix`
- `security`
- `refactor`
- `docs`
- `test`
- `chore`
- `ci`

### 常用 Scope

- `backend`
- `frontend`
- `mobile`
- `api`
- `auth`
- `photos`
- `locations`
- `gear`
- `infra`
- `docs`

### 撰寫原則

- `#<issue-number>` 建議直接放在 summary 前面，方便在 GitLab、`git log` 與 squash 前後都能快速對回 issue。
- `summary` 建議使用英文，描述清楚這個 commit 做了什麼。
- 一個 commit 盡量只表達一件事。
- 比起 `update`、`fix bug`、`modify code` 這類標題，具體描述會更容易閱讀與追查。

若 commit 需要明確連回 issue，可以在 body 或 footer 補上：

```text
Refs: #24
```

若該 commit 或 PR / MR 會直接完成 issue，也可以使用：

```text
Closes: #24
```

### 實務建議

- 小而清楚的 commit，通常比一次塞很多內容的大 commit 更容易 review。
- 同一個 branch 可以有多個 commit，但每個 commit title 最好都能獨立被理解。
- 若整個 branch 都對應同一個 issue，commit title 仍建議保留 issue number，查詢與追蹤會更直接。

## 5. PR / MR Title

### 建議格式

`<type>: <short-summary>`

### 範例

- `security: verify photo s3_key ownership before create`
- `fix: require allowed image content types for photo presign upload`
- `feat: add marker clustering to photography map`

### 撰寫原則

- title 以 reviewer 在列表頁能快速理解主題為主。
- 若 PR / MR 對應單一 issue，建議在 description 內補上 `Closes: #24`。

## 6. PR / MR Description Template

PR / MR description 建議固定沿用同一個結構，閱讀上會比較穩定，也方便 reviewer 快速抓重點。

```md
## 背景

說明目前問題、風險或使用情境。

嚴重性：高 / 中 / 低

## 修正目標

- 列出這次希望保證的行為

## 解法

說明高層設計與主要驗證方式。

## 行為變更

列出使用者或 API 行為上有什麼差異。

## 主要變更

### 新增

- 新檔案 / 新模組 / 新測試

### 修改

- 重要檔案與行為變更

## 測試

列出新增或更新的測試情境。

## 驗證方式

```bash
填入 reviewer 可直接執行的驗證指令
```

## 部署注意事項

- 需要的環境變數
- 需要的 migration / cache / queue / storage 調整

## 風險與權衡

- 說明相容性影響與已知限制

## Checklist

- [ ] 功能完成
- [ ] 測試完成
- [ ] 文件更新
```

### 補充建議

- 安全性修補可以明確寫出攻擊面、阻擋方式與回傳行為。
- API 行為有變更時，建議寫清楚 status code 與相容性影響。
- 若有 rollout 風險，建議補上監控指標或部署注意事項。

## 7. Recommended Workflow

1. 先建立 GitLab issue，標題依照 issue 命名方式撰寫。
2. 依 issue number 建立 branch：`<type>/<issue-number>-<short-summary>`。
3. 開發過程中的 commit 採用一致的 commit message 格式。
4. 發 PR / MR 時，title 使用一句話總結主題，description 使用固定模板。
5. 合併前再檢查 branch、commit 與 PR / MR 內容是否一致。

## 8. Recommended Baseline

如果之後希望維持最簡潔的一套規則，可以固定使用下面這組：

- Issue: `[模組] 動詞 + 目標`
- Branch: `<type>/<issue-number>-<short-summary>`
- Commit: `<type>(<scope>): #<issue-number> <summary>`
- PR title: `<type>: <short-summary>`
- PR description: 使用本文件模板

若沒有特別需求，建議後續都沿用這套格式，整體會比較穩定。
