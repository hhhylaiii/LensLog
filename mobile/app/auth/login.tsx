import React from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { router } from 'expo-router'
import { loginSchema, type LoginFormValues } from '@shared/schemas'
import { useAuthStore } from '../../src/store/authStore'
import { api } from '../../src/api'

export default function LoginScreen() {
  const { setTokens } = useAuthStore()
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const response = await api.auth.login(values)
      setTokens(response.data)
      router.replace('/(tabs)/map')
    } catch {
      Alert.alert('登入失敗', '電子郵件或密碼錯誤，請再試一次')
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.form}>
        <Text style={styles.title}>LensLog</Text>
        <Text style={styles.subtitle}>攝影走讀與器材管理社群</Text>

        <View style={styles.field}>
          <Text style={styles.label}>電子郵件</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="email@example.com"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>密碼</Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>{isSubmitting ? '登入中...' : '登入'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/auth/register')}>
          <Text style={styles.linkText}>還沒有帳號？立即註冊</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  form: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { color: '#f8fafc', fontSize: 32, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 8 },
  field: { gap: 6 },
  label: { color: '#cbd5e1', fontSize: 14, fontWeight: '500' },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 16,
  },
  inputError: { borderColor: '#f87171' },
  errorText: { color: '#f87171', fontSize: 12 },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkText: { color: '#3b82f6', textAlign: 'center', fontSize: 14 },
})
