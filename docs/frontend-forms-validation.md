# React Hook Form & Zod

## 版本

```json
"react-hook-form": "^7.51.5",
"@hookform/resolvers": "^3.6.0",
"zod": "^3.23.8"
```

（Web 與 Mobile 使用相同版本；Zod schema 定義於 `@lenslog/shared` 中共用）

## 在此專案中的用途與角色

- **React Hook Form**：表單狀態管理與驗證觸發，以非受控元件（uncontrolled）方式管理表單，效能優於受控模式。
- **Zod**：Schema 驗證函式庫，定義欄位規則並與 React Hook Form 整合。
- **@hookform/resolvers**：橋接層，讓 React Hook Form 使用 Zod schema 作為驗證規則。

Zod schema 定義於 `@lenslog/shared/src/schemas/index.ts`，Web 與 Mobile **共用同一套驗證規則**，確保前後端、跨平台驗證一致。

## Shared Zod Schema（`@lenslog/shared/src/schemas/`）

```typescript
// 登入表單
export const loginSchema = z.object({
  email: z.string().email('請輸入有效的 Email'),
  password: z.string().min(8, '密碼至少 8 個字元'),
})

// 註冊表單（含跨欄位驗證）
export const registerSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8)
    .regex(/[A-Z]/, '需包含大寫字母')
    .regex(/[0-9]/, '需包含數字'),
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: '密碼確認不一致', path: ['confirmPassword'] }
)

// 景點表單
export const locationSchema = z.object({
  name: z.string().min(1).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  tags: z.array(z.string().max(50)).max(10),
})

// 器材表單
export const gearSchema = z.object({
  type: z.enum(['body', 'lens', 'flash', 'tripod', 'filter', 'memory_card']),
  brand: z.string().max(100).optional(),
  model: z.string().min(1).max(200),
  maintenance_interval_days: z.number().int().positive().optional(),
})

// 照片 metadata 表單
export const photoMetadataSchema = z.object({
  s3_key: z.string().min(1),
  caption: z.string().max(2000).optional(),
  location_id: z.string().uuid().optional(),
  is_public: z.boolean().default(true),
})

// 自動推斷 TypeScript 型別
export type LoginFormValues = z.infer<typeof loginSchema>
export type GearFormValues = z.infer<typeof gearSchema>
```

## 使用方式

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { gearSchema, type GearFormValues } from '@lenslog/shared'

function AddGearForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GearFormValues>({
    resolver: zodResolver(gearSchema),
    defaultValues: { is_public: true },
  })

  const onSubmit = async (data: GearFormValues) => {
    await api.gear.create(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('model')} />
      {errors.model && <span>{errors.model.message}</span>}
      <button type="submit" disabled={isSubmitting}>
        新增器材
      </button>
    </form>
  )
}
```

## 前後端驗證對應關係

Zod schema 的驗證規則應與後端 Pydantic schema 保持一致：

| Zod (前端) | Pydantic (後端) |
|---|---|
| `z.string().min(1).max(200)` | `str` + `max_length=200` |
| `z.string().email()` | `EmailStr` |
| `z.string().uuid()` | `uuid.UUID` |
| `z.number().int().positive()` | `int = Field(gt=0)` |
| `z.boolean().default(true)` | `bool = True` |

## 在 Mobile 上的使用

React Hook Form 在 React Native 上需搭配 `Controller` 元件（因 RN 沒有原生 `input` DOM 元素）：

```tsx
import { Controller } from 'react-hook-form'
import { TextInput } from 'react-native'

<Controller
  control={control}
  name="model"
  render={({ field: { onChange, value } }) => (
    <TextInput onChangeText={onChange} value={value} />
  )}
/>
```

## 相關資源

- [React Hook Form 文件](https://react-hook-form.com/)
- [Zod 文件](https://zod.dev/)
- [@hookform/resolvers](https://github.com/react-hook-form/resolvers)
