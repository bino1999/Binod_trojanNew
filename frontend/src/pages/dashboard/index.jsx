import { useQuery } from '@tanstack/react-query'
import { Package, AlertTriangle, Wrench, ShoppingCart, Search, ClipboardList, PlusCircle, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/authStore'

function StatCard({ icon: Icon, label, value, sub, color = 'text-primary' }) {
  return (
    <div className="bg-card border rounded-lg p-5 flex items-start gap-4">
      <div className={`mt-0.5 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function statusBadge(status) {
  const map = {
    pending: 'warning',
    received: 'success',
    cancelled: 'destructive',
    open: 'info',
    completed: 'success',
  }
  return <Badge variant={map[status] ?? 'secondary'}>{status}</Badge>
}

function QuickActionCard({ icon: Icon, label, description, color, bgColor, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group bg-card border rounded-lg p-5 flex items-start gap-4 text-left hover:border-primary/50 hover:shadow-sm transition-all w-full"
    >
      <div className={`mt-0.5 p-2 rounded-md ${bgColor}`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1 shrink-0" />
    </button>
  )
}

export default function Dashboard() {
  const { role } = useAuthStore()
  const navigate = useNavigate()

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get('/inventory'),
  })
  const { data: purchases = [] } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => api.get('/purchases'),
    enabled: ['admin', 'manager', 'warehouse'].includes(role),
  })
  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => api.get('/sales'),
    enabled: ['admin', 'manager', 'cashier'].includes(role),
  })
  const { data: jobs = [] } = useQuery({
    queryKey: ['service-jobs'],
    queryFn: () => api.get('/service-jobs'),
    enabled: ['admin', 'manager', 'technician'].includes(role),
  })

  const lowStock = inventory.filter((i) => i.qty_in_stock <= i.reorder_level)
  const openJobs = jobs.filter((j) => j.status === 'open')
  const today = new Date().toDateString()
  const todaySales = sales.filter((s) => new Date(s.created_at).toDateString() === today)
  const todayTotal = todaySales.reduce((sum, s) => sum + Number(s.total_amount ?? 0), 0)

  const recentPurchases = [...purchases].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)
  const recentSales = [...sales].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)
  const recentJobs = [...jobs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Inventory & activity overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Package} label="Total Products" value={inventory.length} />
        <StatCard icon={AlertTriangle} label="Low Stock Items" value={lowStock.length} color="text-yellow-600" />
        <StatCard icon={Wrench} label="Open Service Jobs" value={openJobs.length} color="text-blue-600" />
        <StatCard icon={ShoppingCart} label="Today's Sales" value={formatCurrency(todayTotal)} sub={`${todaySales.length} transaction${todaySales.length !== 1 ? 's' : ''}`} color="text-green-600" />
      </div>

      {/* Quick Actions */}
      {(() => {
        const actions = []
        if (['admin', 'manager', 'cashier'].includes(role))
          actions.push(
            <QuickActionCard
              key="sale"
              icon={ShoppingCart}
              label="New Direct Sale"
              description="Create a sale transaction"
              color="text-green-600"
              bgColor="bg-green-50 dark:bg-green-950/40"
              onClick={() => navigate('/sales')}
            />
          )
        if (['admin', 'manager', 'technician'].includes(role))
          actions.push(
            <QuickActionCard
              key="job"
              icon={Wrench}
              label="New Service Job"
              description="Open a service job for a vehicle"
              color="text-blue-600"
              bgColor="bg-blue-50 dark:bg-blue-950/40"
              onClick={() => navigate('/service-jobs')}
            />
          )
        actions.push(
          <QuickActionCard
            key="inventory"
            icon={Search}
            label="Search Inventory"
            description="Find parts and check stock levels"
            color="text-purple-600"
            bgColor="bg-purple-50 dark:bg-purple-950/40"
            onClick={() => navigate('/inventory')}
          />
        )
        if (['admin', 'manager', 'warehouse'].includes(role))
          actions.push(
            <QuickActionCard
              key="purchase"
              icon={ClipboardList}
              label="New Purchase Order"
              description="Order items from a supplier"
              color="text-orange-600"
              bgColor="bg-orange-50 dark:bg-orange-950/40"
              onClick={() => navigate('/purchases')}
            />
          )
        if (actions.length === 0) return null
        return (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              Quick Actions
            </h2>
            <div className={`grid gap-3 ${actions.length === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : actions.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
              {actions}
            </div>
          </div>
        )
      })()}

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {lowStock.length > 0 && (
          <div className="bg-card border rounded-lg p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Low Stock Alerts
            </h2>
            <div className="space-y-2">
              {lowStock.slice(0, 8).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.products?.name ?? '—'}</span>
                  <span className="text-muted-foreground">
                    {item.qty_in_stock} / {item.reorder_level} reorder
                  </span>
                </div>
              ))}
              {lowStock.length > 8 && (
                <p className="text-xs text-muted-foreground mt-2">+{lowStock.length - 8} more</p>
              )}
            </div>
          </div>
        )}

        <div className="bg-card border rounded-lg p-5">
          <h2 className="font-semibold mb-3">Recent Service Jobs</h2>
          {recentJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No service jobs yet.</p>
          ) : (
            <div className="space-y-2">
              {recentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{job.job_number ?? `#${job.id?.slice(0, 6)}`}</span>
                  <div className="flex items-center gap-2">
                    {statusBadge(job.status)}
                    <span className="text-muted-foreground">{formatDate(job.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-lg p-5">
          <h2 className="font-semibold mb-3">Recent Purchases</h2>
          {recentPurchases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchases yet.</p>
          ) : (
            <div className="space-y-2">
              {recentPurchases.map((po) => (
                <div key={po.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{po.po_number ?? `PO-${po.id?.slice(0, 6)}`}</span>
                  <div className="flex items-center gap-2">
                    {statusBadge(po.status)}
                    <span className="text-muted-foreground">{formatCurrency(po.total_amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border rounded-lg p-5">
          <h2 className="font-semibold mb-3">Recent Sales</h2>
          {recentSales.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales yet.</p>
          ) : (
            <div className="space-y-2">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{sale.sale_number ?? `S-${sale.id?.slice(0, 6)}`}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{formatDate(sale.created_at)}</span>
                    <span className="font-medium">{formatCurrency(sale.total_amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
