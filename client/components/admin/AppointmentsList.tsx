'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, User, Phone, Mail, MoreVertical, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { sendConfirmation, sendCancelled } from '@/lib/api'

interface Appointment {
  id: number
  client_name: string
  client_phone: string
  client_email?: string
  service_name: string
  service_duration: number
  service_price: number
  appointment_date: string
  appointment_time: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
  created_at: string
}

export default function AppointmentsList() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    date: '',
    status: ''
  })

  useEffect(() => {
    fetchAppointments()
  }, [filters])

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const params = new URLSearchParams()

      if (filters.date) params.append('date', filters.date)
      if (filters.status) params.append('status', filters.status)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/appointments?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setAppointments(data)
      }
    } catch (error) {
      console.error('Error al cargar turnos:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateAppointmentStatus = async (id: number, phoneNumber: string, status: string) => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/appointments/${id}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        }
      )
      console.log(id);

      if (response.ok) {
        // Actualizar el estado local
        
        setAppointments(prev =>
          prev.map(apt =>
            apt.id === id ? { ...apt, status: status as any } : apt
          )
        )

        if (status === 'confirmed') {

          await sendConfirmation(id, phoneNumber)
          console.log('✅ Mensaje de confirmación enviado a WhatsApp')
  
        }
        if (status === 'cancelled') {

          await sendCancelled(id, phoneNumber)
          console.log('✅ Mensaje de cancelacion enviado a WhatsApp')
  
        }
      }

      
    } catch (error) {
      console.error('Error al actualizar turno:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente'
      case 'confirmed':
        return 'Confirmado'
      case 'completed':
        return 'Completado'
      case 'cancelled':
        return 'Cancelado'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-20"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Gestión de Turnos</h2>

        <div className="flex space-x-4">
          <input
            type="date"
            value={filters.date}
            onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
            className="input"
            placeholder="Filtrar por fecha"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="input"
          >
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="confirmed">Confirmado</option>
            <option value="completed">Completado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </div>

      {appointments.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No hay turnos para mostrar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <div className="flex items-center">
                        {getStatusIcon(appointment.status)}
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                          {getStatusLabel(appointment.status)}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(new Date(appointment.appointment_date), 'dd/MM/yyyy', { locale: es })}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-1" />
                        {appointment.appointment_time}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          {appointment.client_name}
                        </h4>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <Phone className="h-3 w-3 mr-1" />
                          {appointment.client_phone}
                        </div>
                        {appointment.client_email && (
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <Mail className="h-3 w-3 mr-1" />
                            {appointment.client_email}
                          </div>
                        )}
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-900">{appointment.service_name}</h5>
                        <p className="text-sm text-gray-600">
                          Duración: {appointment.service_duration} min
                        </p>
                        <p className="text-sm text-gray-600">
                          Precio: ${appointment.service_price}
                        </p>
                      </div>

                      {appointment.notes && (
                        <div>
                          <h5 className="font-medium text-gray-900">Notas</h5>
                          <p className="text-sm text-gray-600">{appointment.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {appointment.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, appointment.client_phone, 'confirmed')}
                          className="btn-success text-xs px-3 py-1"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, appointment.client_phone, 'cancelled')}
                          className="btn-danger text-xs px-3 py-1"
                        >
                          Cancelar
                        </button>
                      </>
                    )}

                    {appointment.status === 'confirmed' && (
                      <button
                        onClick={() => updateAppointmentStatus(appointment.id, appointment.client_phone, 'completed')}
                        className="btn-success text-xs px-3 py-1"
                      >
                        Completar
                      </button>
                    )}

                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
