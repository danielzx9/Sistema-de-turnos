'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { X, Calendar, Clock, User, Phone, Mail, MessageSquare } from 'lucide-react'
import { format, addDays, isAfter, isBefore, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { createAppointment, getAvailableSlots } from '@/lib/api'

interface Service {
  id: number
  name: string
  description: string
  duration: number
  price: number
}

interface BusinessConfig {
  business_name: string
  business_phone: string
  business_address: string
  business_email: string
  open_time: string
  close_time: string
}

interface BookingFormProps {
  service: Service
  businessConfig: BusinessConfig | null
  onSuccess: () => void
  onCancel: () => void
}

interface FormData {
  clientName: string
  clientPhone: string
  clientEmail: string
  appointmentDate: string
  appointmentTime: string
  notes: string
}

interface TimeSlot {
  time: string
  available: boolean
}

export default function BookingForm({ service, businessConfig, onSuccess, onCancel }: BookingFormProps) {
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = form

  const form = useForm<FormData>({
    defaultValues: {
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      appointmentDate: '',
      appointmentTime: '',
      notes: ''
    }
  })

  const watchedDate = watch('appointmentDate')

  // Generar fechas disponibles (próximos 30 días)
  const generateAvailableDates = () => {
    const dates = []
    const today = startOfDay(new Date())
    
    for (let i = 1; i <= 30; i++) {
      const date = addDays(today, i)
      dates.push({
        value: format(date, 'yyyy-MM-dd'),
        label: format(date, 'EEEE, dd MMMM', { locale: es }),
        date: date
      })
    }
    
    return dates
  }

  // Cargar slots disponibles cuando cambie la fecha
  useEffect(() => {
    if (watchedDate) {
      setSelectedDate(watchedDate)
      loadAvailableSlots(watchedDate)
    }
  }, [watchedDate, service.id])

  const loadAvailableSlots = async (date: string) => {
    setLoadingSlots(true)
    try {
      const slots = await getAvailableSlots(date, service.id)
      setAvailableSlots(slots.availableSlots || [])
    } catch (error) {
      console.error('Error al cargar slots:', error)
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      await createAppointment({
        ...data,
        serviceId: service.id
      })
      onSuccess()
    } catch (error) {
      console.error('Error al crear turno:', error)
      alert('Error al crear el turno. Por favor, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const availableDates = generateAvailableDates()

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-900">Reservar Turno</h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Información del servicio */}
      <div className="bg-primary-50 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-primary-900 mb-2">{service.name}</h4>
        <div className="flex items-center justify-between text-sm text-primary-700">
          <span>Duración: {service.duration} minutos</span>
          <span>Precio: ${service.price}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Información del cliente */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Información del Cliente
          </h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre completo *
            </label>
            <input
              {...register('clientName', { required: 'El nombre es requerido' })}
              className="input"
              placeholder="Tu nombre completo"
            />
            {errors.clientName && (
              <p className="text-red-600 text-sm mt-1">{errors.clientName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono *
            </label>
            <input
              {...register('clientPhone', { 
                required: 'El teléfono es requerido',
                pattern: {
                  value: /^[+]?[\d\s-()]+$/,
                  message: 'Formato de teléfono inválido'
                }
              })}
              className="input"
              placeholder="+1234567890"
            />
            {errors.clientPhone && (
              <p className="text-red-600 text-sm mt-1">{errors.clientPhone.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              {...register('clientEmail', {
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Email inválido'
                }
              })}
              type="email"
              className="input"
              placeholder="tu@email.com"
            />
            {errors.clientEmail && (
              <p className="text-red-600 text-sm mt-1">{errors.clientEmail.message}</p>
            )}
          </div>
        </div>

        {/* Selección de fecha y hora */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Fecha y Hora
          </h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha *
            </label>
            <select
              {...register('appointmentDate', { required: 'La fecha es requerida' })}
              className="input"
            >
              <option value="">Selecciona una fecha</option>
              {availableDates.map((date) => (
                <option key={date.value} value={date.value}>
                  {date.label}
                </option>
              ))}
            </select>
            {errors.appointmentDate && (
              <p className="text-red-600 text-sm mt-1">{errors.appointmentDate.message}</p>
            )}
          </div>

          {selectedDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora *
              </label>
              {loadingSlots ? (
                <div className="input flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                  <span className="ml-2">Cargando horarios...</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => setValue('appointmentTime', slot.time)}
                      className={`p-3 text-sm rounded-md border ${
                        slot.available
                          ? 'border-gray-300 hover:border-primary-500 hover:bg-primary-50'
                          : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                      disabled={!slot.available}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
              {errors.appointmentTime && (
                <p className="text-red-600 text-sm mt-1">{errors.appointmentTime.message}</p>
              )}
            </div>
          )}
        </div>

        {/* Notas adicionales */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notas adicionales
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className="input"
            placeholder="Alguna preferencia especial o comentario..."
          />
        </div>

        {/* Botones */}
        <div className="flex space-x-4 pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary flex-1"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1"
          >
            {loading ? 'Reservando...' : 'Confirmar Reserva'}
          </button>
        </div>
      </form>
    </div>
  )
}
