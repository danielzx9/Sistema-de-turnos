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

  // const { register, handleSubmit, watch, setValue, formState: { errors } } = form

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

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form
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

 /* const onSubmit = async (data: FormData) => {
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
  }*/

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

      
    </div>
  )
}
