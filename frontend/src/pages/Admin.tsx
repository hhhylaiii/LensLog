import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

interface AdminUser {
  id: string
  username: string
  email: string
  is_admin: boolean
  created_at: string
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '32px',
    minHeight: '100vh',
    background: '#0a0a0f',
    fontFamily: "'Inter', system-ui, sans-serif",
    color: '#e8e8f0',
  },
  header: {
    marginBottom: '28px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#e8e8f0',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#555',
  },
  card: {
    background: '#13131a',
    border: '1px solid #2a2a38',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left' as const,
    fontSize: '11px',
    fontWeight: 600,
    color: '#555',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    borderBottom: '1px solid #2a2a38',
    background: '#0f0f17',
  },
  td: {
    padding: '12px 16px',
    fontSize: '13px',
    color: '#bbb',
    borderBottom: '1px solid #1e1e2a',
    verticalAlign: 'middle' as const,
  },
  usernameCell: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#e8e8f0',
  },
  badgeAdmin: {
    display: 'inline-block',
    background: '#312e81',
    color: '#a5b4fc',
    border: '1px solid #4338ca',
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: 600,
  },
  badgeUser: {
    display: 'inline-block',
    background: '#1e1e2a',
    color: '#555',
    border: '1px solid #2a2a38',
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '11px',
  },
  actionsCell: {
    display: 'flex',
    gap: '8px',
  },
  btnToggle: {
    background: 'transparent',
    border: '1px solid #4338ca',
    borderRadius: '6px',
    padding: '5px 10px',
    color: '#a5b4fc',
    fontSize: '12px',
    cursor: 'pointer',
  },
  btnDelete: {
    background: 'transparent',
    border: '1px solid #7f1d1d',
    borderRadius: '6px',
    padding: '5px 10px',
    color: '#f87171',
    fontSize: '12px',
    cursor: 'pointer',
  },
  empty: {
    padding: '48px',
    textAlign: 'center' as const,
    color: '#555',
    fontSize: '14px',
  },
  loading: {
    padding: '48px',
    textAlign: 'center' as const,
    color: '#555',
    fontSize: '14px',
  },
  errorBox: {
    background: '#2a1515',
    border: '1px solid #7f1d1d',
    borderRadius: '8px',
    padding: '16px',
    color: '#f87171',
    fontSize: '14px',
  },
}

const Admin: React.FC = () => {
  const queryClient = useQueryClient()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const { data: users, isLoading, error } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then((r) => r.data),
    retry: false,
  })

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/admin/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setConfirmDeleteId(null)
    },
  })

  const toggleAdminMutation = useMutation({
    mutationFn: (userId: string) => api.patch(`/admin/users/${userId}/toggle-admin`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  const isAxios403 = (err: unknown) => {
    return (err as any)?.response?.status === 403
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.title}>Admin Panel</div>
        <div style={styles.subtitle}>User management</div>
      </div>

      {error && isAxios403(error) && (
        <div style={styles.errorBox}>You do not have permission to access this page.</div>
      )}

      {error && !isAxios403(error) && (
        <div style={styles.errorBox}>Failed to load users. Please try again.</div>
      )}

      {!error && (
        <div style={styles.card}>
          {isLoading ? (
            <div style={styles.loading}>Loading users…</div>
          ) : !users || users.length === 0 ? (
            <div style={styles.empty}>No users found.</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Username</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Joined</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ ...styles.td, ...styles.usernameCell }}>{u.username}</td>
                    <td style={styles.td}>{u.email}</td>
                    <td style={styles.td}>
                      {u.is_admin ? (
                        <span style={styles.badgeAdmin}>Admin</span>
                      ) : (
                        <span style={styles.badgeUser}>User</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionsCell}>
                        <button
                          style={styles.btnToggle}
                          onClick={() => toggleAdminMutation.mutate(u.id)}
                          disabled={toggleAdminMutation.isPending}
                        >
                          {u.is_admin ? 'Revoke admin' : 'Make admin'}
                        </button>
                        {confirmDeleteId === u.id ? (
                          <>
                            <button
                              style={styles.btnDelete}
                              onClick={() => deleteMutation.mutate(u.id)}
                              disabled={deleteMutation.isPending}
                            >
                              Confirm
                            </button>
                            <button
                              style={{ ...styles.btnToggle, border: '1px solid #2a2a38', color: '#666' }}
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            style={styles.btnDelete}
                            onClick={() => setConfirmDeleteId(u.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

export default Admin
