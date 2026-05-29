import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutDashboard,
  Package,
  Truck,
  Warehouse,
  ShoppingCart,
  Wrench,
  ClipboardList,
  ReceiptText,
  RotateCcw,
  AlertTriangle,
  BarChart2,
  Users,
  UserCircle,
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'cashier', 'technician', 'warehouse'] },
  { to: '/products', label: 'Products', icon: Package, roles: ['admin', 'manager', 'cashier', 'warehouse'] },
  { to: '/suppliers', label: 'Suppliers', icon: Truck, roles: ['admin', 'manager', 'warehouse'] },
  { to: '/inventory', label: 'Inventory', icon: Warehouse, roles: ['admin', 'manager', 'cashier', 'technician', 'warehouse'] },
  { to: '/purchases', label: 'Purchase Orders', icon: ShoppingCart, roles: ['admin', 'manager', 'warehouse'] },
  { to: '/customers', label: 'Customers', icon: UserCircle, roles: ['admin', 'manager', 'cashier', 'technician'] },
  { to: '/internal-use', label: 'Internal Use', icon: Wrench, roles: ['admin', 'manager', 'warehouse', 'technician'] },
  { to: '/service-jobs', label: 'Service Jobs', icon: ClipboardList, roles: ['admin', 'manager', 'technician'] },
  { to: '/sales', label: 'Direct Sales', icon: ReceiptText, roles: ['admin', 'manager', 'cashier'] },
  { to: '/returns', label: 'Returns', icon: RotateCcw, roles: ['admin', 'manager', 'cashier'] },
  { to: '/adjustments', label: 'Adjustments', icon: AlertTriangle, roles: ['admin', 'manager', 'warehouse'] },
  { to: '/reports', label: 'Reports', icon: BarChart2, roles: ['admin', 'manager'] },
  { to: '/users', label: 'Users', icon: Users, roles: ['admin'] },
]

export default function Sidebar() {
  const { role } = useAuthStore()

  const visible = navItems.filter((item) => item.roles.includes(role))

  return (
    <aside className="w-60 border-r bg-card flex flex-col">
      <div className="h-16 flex items-center px-6 border-b">
        <span className="font-semibold text-lg tracking-tight">AutoService IMS</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {visible.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
