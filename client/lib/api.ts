import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'


const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 🔒 Interceptor para agregar el token automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

// Servicios
export const getServices = async () => {
  const response = await api.get('/services')
  return response.data
}

export const getService = async (id: number) => {
  const response = await api.get(`/services/${id}`)
  return response.data
}

// Configuración del negocio
export const getBusinessConfig = async () => {
  const response = await api.get('/business/config')
  return response.data
}

// Turnos
export const getAvailableSlots = async (date: string, serviceId: number) => {
  const response = await api.get('/appointments/available', {
    params: { date, serviceId }
  })
  return response.data
}

export const createAppointment = async (appointmentData: {
  clientName: string
  clientPhone: string
  clientEmail?: string
  serviceId: number
  appointmentDate: string
  appointment_time: string
  notes?: string
}) => {
  const response = await api.post('/appointments', appointmentData)
  return response.data
}

export const getAppointment = async (id: number) => {
  const response = await api.get(`/appointments/${id}`)
  return response.data
}

// WhatsApp
export const sendConfirmation = async (appointmentId: number, phoneNumber: string) => {
  const response = await api.post('/whatsapp/send-confirmation', {
    appointmentId,
    phoneNumber
  })
  return response.data
}

export const sendCancelled = async (appointmentId: number, phoneNumber: string) => {
  const response = await api.post('/whatsapp/send-cancelled', {
    appointmentId,
    phoneNumber
  })
  return response.data
}

export const sendReminder = async (appointmentId: number, phoneNumber: string) => {
  const response = await api.post('/whatsapp/send-reminder', {
    appointmentId,
    phoneNumber
  })
  return response.data
}

export default api
