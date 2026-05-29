import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil } from 'lucide-react'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import PageHeader from '@/components/shared/PageHeader'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

const ROLES = ['admin', 'manager', 'cashier', 'technician', 'warehouse']

const ROLE_COLORS = {
  admin: 'destructive',
  manager: 'info',
  cashier: 'success',
  technician: 'warning',
  warehouse: 'secondary',
}

function InviteModal({ open, onOpenChange, onSave, saving }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('cashier')

  function handleOpen(isOpen) {
    if (isOpen) { setEmail(''); setRole('cashier') }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Invite User</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ email, role }) }} className="space-y-3">
          <div>
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" />
          </div>
          <div>
            <Label>Role *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Inviting…' : 'Send Invite'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditRoleModal({ open, onOpenChange, user, onSave, saving }) {
  const [role, setRole] = useState(user?.role ?? 'cashier')

  function handleOpen(isOpen) {
    if (isOpen) setRole(user?.role ?? 'cashier')
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Edit Role — {user?.email}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ role }) }} className="space-y-3">
          <div>
            <Label>Role *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Role'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function Users() {
  const qc = useQueryClient()
  const [inviteModal,       setInviteModal]       = useState(false)
  const [editTarget,        setEditTarget]        = useState(null)
  const [deactivateTarget,  setDeactivateTarget]  = useState(null)
  const [roleFilter,        setRoleFilter]        = useState('all')
  const [statusFilter,      setStatusFilter]      = useState('all')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users'),
  })

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (statusFilter === 'active'   && u.is_active === false) return false
      if (statusFilter === 'inactive' && u.is_active !== false) return false
      return true
    })
  }, [users, roleFilter, statusFilter])

  const inviteMutation = useMutation({
    mutationFn: (data) => api.post('/users/invite', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setInviteModal(false)
      toast({ title: 'Invite sent', variant: 'success' })
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const editMutation = useMutation({
    mutationFn: (data) => api.put(`/users/${editTarget.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setEditTarget(null)
      toast({ title: 'Role updated', variant: 'success' })
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setDeactivateTarget(null)
      toast({ title: 'User deactivated', variant: 'success' })
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const columns = [
    { key: 'email', label: 'Email', render: (r) => <span className="font-medium">{r.email}</span> },
    {
      key: 'role', label: 'Role',
      render: (r) => <Badge variant={ROLE_COLORS[r.role] ?? 'secondary'}>{r.role}</Badge>,
    },
    {
      key: 'is_active', label: 'Status',
      render: (r) => <Badge variant={r.is_active !== false ? 'success' : 'muted'}>{r.is_active !== false ? 'Active' : 'Inactive'}</Badge>,
    },
    { key: 'created_at', label: 'Joined', render: (r) => formatDate(r.created_at) },
    {
      key: 'actions', label: '', headerClass: 'w-24',
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <Button size="icon" variant="ghost" onClick={() => setEditTarget(r)}>
            <Pencil className="h-4 w-4" />
          </Button>
          {r.is_active !== false && (
            <Button
              size="sm" variant="ghost"
              className="text-destructive hover:text-destructive text-xs px-2"
              onClick={() => setDeactivateTarget(r)}
            >
              Deactivate
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="User Management"
        description="Manage staff accounts and roles (Admin only)"
        action={
          <Button onClick={() => setInviteModal(true)}>
            <Plus className="h-4 w-4 mr-2" /> Invite User
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          data={filteredUsers}
          searchPlaceholder="Search by email…"
          searchKeys={['email']}
          emptyMessage="No users found."
          filterSlot={
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="all">All Roles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              {(roleFilter !== 'all' || statusFilter !== 'all') && (
                <button
                  onClick={() => { setRoleFilter('all'); setStatusFilter('all') }}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
          }
        />
      )}

      <InviteModal
        open={inviteModal}
        onOpenChange={setInviteModal}
        onSave={(d) => inviteMutation.mutate(d)}
        saving={inviteMutation.isPending}
      />

      {editTarget && (
        <EditRoleModal
          open
          onOpenChange={(open) => !open && setEditTarget(null)}
          user={editTarget}
          onSave={(d) => editMutation.mutate(d)}
          saving={editMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title="Deactivate user?"
        description={`${deactivateTarget?.email} will lose access immediately.`}
        onConfirm={() => deactivateMutation.mutate(deactivateTarget.id)}
        loading={deactivateMutation.isPending}
        confirmLabel="Deactivate"
      />
    </div>
  )
}
