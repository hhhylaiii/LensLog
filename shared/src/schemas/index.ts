// ============================================================
// LensLog Shared Zod Schemas
//
// Used with React Hook Form on both web and mobile.
// Keep these in sync with backend Pydantic validators.
// ============================================================

import { z } from 'zod'

// --- Auth ---

export const loginSchema = z.object({
  email: z.string().email('請輸入有效的 Email'),
  password: z.string().min(8, '密碼至少 8 個字元'),
})

export const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, '使用者名稱至少 3 個字元')
      .max(50, '使用者名稱最多 50 個字元')
      .regex(/^[a-zA-Z0-9_]+$/, '使用者名稱只能包含英文、數字和底線'),
    email: z.string().email('請輸入有效的 Email'),
    password: z
      .string()
      .min(8, '密碼至少 8 個字元')
      .regex(/[A-Z]/, '密碼需包含至少一個大寫字母')
      .regex(/[0-9]/, '密碼需包含至少一個數字'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '密碼確認不一致',
    path: ['confirmPassword'],
  })

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>

// --- Location ---

export const locationSchema = z.object({
  name: z.string().min(1, '景點名稱不能為空').max(200, '景點名稱最多 200 字元'),
  description: z.string().max(2000).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  tags: z.array(z.string().max(50)).max(10, '最多 10 個標籤'),
})

export type LocationFormValues = z.infer<typeof locationSchema>

// --- Gear ---

const gearTypeValues = [
  'body',
  'lens',
  'flash',
  'tripod',
  'filter',
  'memory_card',
] as const

export const gearSchema = z.object({
  type: z.enum(gearTypeValues, { errorMap: () => ({ message: '請選擇器材類型' }) }),
  brand: z.string().max(100).optional(),
  model: z.string().min(1, '型號不能為空').max(200, '型號最多 200 字元'),
  serial_number: z.string().max(100).optional(),
  purchase_date: z.string().optional(), // ISO date string
  notes: z.string().max(2000).optional(),
  maintenance_interval_days: z.number().int().positive().optional(),
})

export type GearFormValues = z.infer<typeof gearSchema>

// --- Photo ---

export const photoMetadataSchema = z.object({
  s3_key: z.string().min(1),
  caption: z.string().max(2000).optional(),
  location_id: z.string().uuid().optional(),
  is_public: z.boolean().default(true),
})

export type PhotoMetadataFormValues = z.infer<typeof photoMetadataSchema>
