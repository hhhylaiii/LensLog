# TypeScript & ESLint

## 版本

```json
// 共用版本（frontend / mobile / shared）
"typescript": "^5.2.2",
"eslint": "^8.57.0",
"@typescript-eslint/eslint-plugin": "^7.13.0",
"@typescript-eslint/parser": "^7.13.0",
"eslint-plugin-react-hooks": "^4.6.2",
"eslint-plugin-react-refresh": "^0.4.7"   // Web only

// Python（backend）
mypy>=1.10.0
ruff>=0.5.0
black>=24.4.0
```

## TypeScript

### 在此專案中的用途

TypeScript 覆蓋所有 JavaScript 程式碼（frontend、mobile、shared），提供：
- 編譯時型別檢查，捕捉型別錯誤
- `@lenslog/shared` 的型別定義自動同步至 Web 與 Mobile
- IDE 自動補全與重構支援

### 關鍵設定

**Frontend（`frontend/tsconfig.json`）**：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",   // Vite 模式
    "strict": true,
    "paths": {
      "@shared/*": ["../shared/src/*"]
    }
  }
}
```

**Shared（`shared/tsconfig.json`）**：

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "skipLibCheck": true   // 避免 peer dep 型別衝突
  }
}
```

### 型別檢查指令

```bash
# 各套件型別檢查（不輸出編譯結果）
npm run typecheck          # tsc --noEmit

# Web 建置前也會執行型別檢查
npm run build              # tsc && vite build
```

## ESLint（前端）

### 設定重點

所有前端套件使用一致的 ESLint 設定：

```javascript
// 啟用的 plugin
'@typescript-eslint'        // TypeScript 規則
'react-hooks'               // Hooks 規則（deps 陣列驗證）
'react-refresh'             // Fast Refresh 相容性（Web only）
```

### 關鍵規則

- `react-hooks/rules-of-hooks`：禁止在條件式中呼叫 hooks
- `react-hooks/exhaustive-deps`：確保 `useEffect`、`useCallback` 等的依賴陣列完整
- `@typescript-eslint/no-explicit-any`：禁止使用 `any` 型別

```bash
# 執行 lint 檢查（最多允許 0 個 warning）
npm run lint
```

## Python 型別與程式碼品質工具（Backend）

### mypy

Python 靜態型別檢查工具，搭配 FastAPI 的型別標注使用：

```bash
cd backend
mypy app/
```

### Ruff

超快速的 Python linter（以 Rust 編寫），取代 flake8、isort 等多個工具：

```bash
cd backend
ruff check app/         # 檢查
ruff check app/ --fix   # 自動修正
```

### Black

Python 程式碼格式化工具，確保一致的縮排與風格：

```bash
cd backend
black app/
```

## 共同規範

- 所有新程式碼必須通過 TypeScript strict 模式（前端）或 mypy（後端）
- 禁止使用 `// @ts-ignore` 或 `# type: ignore`（除非有明確原因並加上說明）
- 函式參數與回傳值必須明確標注型別（不依賴推斷）
- 命名規範：TypeScript 使用 camelCase（變數/函式）/ PascalCase（型別/元件），Python 使用 snake_case

## 相關資源

- [TypeScript 文件](https://www.typescriptlang.org/docs/)
- [ESLint 文件](https://eslint.org/)
- [@typescript-eslint](https://typescript-eslint.io/)
- [mypy 文件](https://mypy.readthedocs.io/)
- [Ruff 文件](https://docs.astral.sh/ruff/)
- [Black 文件](https://black.readthedocs.io/)
