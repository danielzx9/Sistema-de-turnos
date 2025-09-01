'use client'

import { useState, useEffect } from 'react'
import { Calendar, Users, DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'

interface BusinessStats {
  totalAppointments: number
  completedAppointments: number
  pendingAppointments: number
  totalRevenue: number
  popularServices: Array<{
    name: string
    count: number
  }>
}

export default function Dashboard() {
  const [stats, setStats] = useState<BusinessStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  })

  useEffect(() => {
    fetchStats()
  }, [dateRange])

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/business/stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Total Turnos',
      value: stats?.totalAppointments || 0,
      icon: Calendar,
      color: 'bg-blue-500',
      change: '+12%'
    },
    {
      title: 'Completados',
      value: stats?.completedAppointments || 0,
      icon: CheckCircle,
      color: 'bg-green-500',
      change: '+8%'
    },
    {
      title: 'Pendientes',
      value: stats?.pendingAppointments || 0,
      icon: Clock,
      color: 'bg-yellow-500',
      change: '+3%'
    },
    {
      title: 'Ingresos',
      value: `$${stats?.totalRevenue || 0}`,
      icon: DollarSign,
      color: 'bg-purple-500',
      change: '+15%'
    }
  ]

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        
        <div className="flex space-x-4">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="input"
          />
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="input"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <div className={`p-3 rounded-full ${stat.color} text-white`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-sm text-green-600 font-medium">{stat.change}</span>
                  <span className="text-sm text-gray-500 ml-1">vs mes anterior</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Popular Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Servicios Populares</h3>
          </div>
          <div className="card-body">
            {stats?.popularServices && stats.popularServices.length > 0 ? (
              <div className="space-y-4">
                {stats.popularServices.map((service, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-primary-600">{index + 1}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{service.name}</span>
                    </div>
                    <span className="text-sm text-gray-600">{service.count} turnos</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No hay datos disponibles</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Acciones Rápidas</h3>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              <button className="w-full btn-primary text-left">
                <Calendar className="h-4 w-4 mr-2 inline" />
                Ver Turnos de Hoy
              </button>
              <button className="w-full btn-secondary text-left">
                <Users className="h-4 w-4 mr-2 inline" />
                Gestionar Servicios
              </button>
              <button className="w-full btn-secondary text-left">
                <TrendingUp className="h-4 w-4 mr-2 inline" />
                Ver Reportes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Actividad Reciente</h3>
          </div>
          <div className="card-body">
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hay actividad reciente para mostrar</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
