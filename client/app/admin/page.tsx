'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Users, DollarSign, TrendingUp, LogOut, Settings, Scissors } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import AdminLogin from '@/components/admin/AdminLogin'
import Dashboard from '@/components/admin/Dashboard'
import AppointmentsList from '@/components/admin/AppointmentsList'
import ServicesManagement from '@/components/admin/ServicesManagement'
import BusinessSettings from '@/components/admin/BusinessSettings'

type AdminTab = 'dashboard' | 'appointments' | 'services' | 'settings'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')
  const [admin, setAdmin] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    // Verificar si hay token guardado
    const token = localStorage.getItem('admin_token')
    if (token) {
      // Verificar token con el servidor
      verifyToken(token)
    }
  }, [])

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAdmin(data.user)
        setIsAuthenticated(true)
      } else {
        localStorage.removeItem('admin_token')
      }
    } catch (error) {
      console.error('Error verifying token:', error)
      localStorage.removeItem('admin_token')
    }
  }

  const handleLogin = (token: string, user: any) => {
    localStorage.setItem('admin_token', token)
    setAdmin(user)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    setAdmin(null)
    setIsAuthenticated(false)
    setActiveTab('dashboard')
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'appointments', label: 'Turnos', icon: Calendar },
    { id: 'services', label: 'Servicios', icon: Scissors },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ]

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Scissors className="h-8 w-8 text-primary-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Bienvenido, {admin?.name}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <nav className="lg:w-64">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <ul className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <li key={tab.id}>
                      <button
                        onClick={() => setActiveTab(tab.id as AdminTab)}
                        className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          activeTab === tab.id
                            ? 'bg-primary-100 text-primary-700'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <Icon className="h-4 w-4 mr-3" />
                        {tab.label}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1">
            <div className="bg-white rounded-lg shadow-sm">
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'appointments' && <AppointmentsList />}
              {activeTab === 'services' && <ServicesManagement />}
              {activeTab === 'settings' && <BusinessSettings />}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
