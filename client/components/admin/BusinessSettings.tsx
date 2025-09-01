'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Building, Clock, Phone, Mail, MapPin, Save } from 'lucide-react'

interface BusinessConfig {
  id: number
  business_name: string
  business_phone?: string
  business_address?: string
  business_email?: string
  open_time: string
  close_time: string
  slot_duration: number
  working_days: string
}

interface BusinessForm {
  business_name: string
  business_phone: string
  business_address: string
  business_email: string
  open_time: string
  close_time: string
  slot_duration: number
  working_days: string
}

export default function BusinessSettings() {
  const [config, setConfig] = useState<BusinessConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<BusinessForm>()

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/business/config`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
        reset({
          business_name: data.business_name || '',
          business_phone: data.business_phone || '',
          business_address: data.business_address || '',
          business_email: data.business_email || '',
          open_time: data.open_time || '09:00',
          close_time: data.close_time || '18:00',
          slot_duration: data.slot_duration || 30,
          working_days: data.working_days || '1,2,3,4,5'
        })
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: BusinessForm) => {
    setSaving(true)
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/business/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      })
      
      if (response.ok) {
        await fetchConfig()
        alert('Configuración guardada exitosamente')
      }
    } catch (error) {
      console.error('Error al guardar configuración:', error)
      alert('Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  const workingDaysOptions = [
    { value: '1', label: 'Lunes' },
    { value: '2', label: 'Martes' },
    { value: '3', label: 'Miércoles' },
    { value: '4', label: 'Jueves' },
    { value: '5', label: 'Viernes' },
    { value: '6', label: 'Sábado' },
    { value: '7', label: 'Domingo' }
  ]

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-12"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Configuración del Negocio</h2>
        <p className="text-gray-600 mt-1">Configura la información y horarios de tu negocio</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Información del negocio */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Building className="h-5 w-5 mr-2" />
              Información del Negocio
            </h3>
          </div>
          <div className="card-body space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Negocio *
              </label>
              <input
                {...register('business_name', { required: 'El nombre es requerido' })}
                className="input"
                placeholder="Mi Barbería"
              />
              {errors.business_name && (
                <p className="text-red-600 text-sm mt-1">{errors.business_name.message}</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  {...register('business_phone')}
                  className="input"
                  placeholder="+1234567890"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  {...register('business_email', {
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Email inválido'
                    }
                  })}
                  type="email"
                  className="input"
                  placeholder="contacto@mibarberia.com"
                />
                {errors.business_email && (
                  <p className="text-red-600 text-sm mt-1">{errors.business_email.message}</p>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
              </label>
              <input
                {...register('business_address')}
                className="input"
                placeholder="Calle Principal 123, Ciudad"
              />
            </div>
          </div>
        </div>

        {/* Horarios */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Horarios de Atención
            </h3>
          </div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora de Apertura *
                </label>
                <input
                  {...register('open_time', { required: 'La hora de apertura es requerida' })}
                  type="time"
                  className="input"
                />
                {errors.open_time && (
                  <p className="text-red-600 text-sm mt-1">{errors.open_time.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora de Cierre *
                </label>
                <input
                  {...register('close_time', { required: 'La hora de cierre es requerida' })}
                  type="time"
                  className="input"
                />
                {errors.close_time && (
                  <p className="text-red-600 text-sm mt-1">{errors.close_time.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duración de Slots (min) *
                </label>
                <select
                  {...register('slot_duration', { required: 'La duración es requerida' })}
                  className="input"
                >
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>60 minutos</option>
                </select>
                {errors.slot_duration && (
                  <p className="text-red-600 text-sm mt-1">{errors.slot_duration.message}</p>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Días de Trabajo
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {workingDaysOptions.map((day) => (
                  <label key={day.value} className="flex items-center">
                    <input
                      type="checkbox"
                      value={day.value}
                      {...register('working_days')}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{day.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Selecciona los días de la semana en que atiendes (1=Lunes, 7=Domingo)
              </p>
            </div>
          </div>
        </div>

        {/* Botón de guardar */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </form>
    </div>
  )
}
