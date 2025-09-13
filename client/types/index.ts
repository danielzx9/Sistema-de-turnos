export interface Service {
  id: number
  name: string
  description: string
  duration: number
  price: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Client {
  id: number
  name: string
  phone: string
  email?: string
  whatsapp?: string
  created_at: string
  updated_at: string
}


export interface Appointment {
  id: number
  client_id: number
  service_id: number
  appointment_date: string
  appointment_time: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
  created_at: string
  updated_at: string
  // Campos relacionados
  client_name?: string
  client_phone?: string
  client_email?: string
  service_name?: string
  service_duration?: number
  service_price?: number
}
//t22222222222222
export interface BusinessConfig {
  id: number
  business_name: string
  business_phone?: string
  business_address?: string
  business_email?: string
  open_time: string
  close_time: string
  slot_duration: number
  working_days: string
  created_at: string
  updated_at: string
}

export interface TimeSlot {
  time: string
  available: boolean
}

export interface SpecialSchedule {
  id: number
  date: string
  is_closed: boolean
  open_time?: string
  close_time?: string
  notes?: string
  created_at: string
}

export interface BusinessStats {
  totalAppointments: number
  completedAppointments: number
  pendingAppointments: number
  totalRevenue: number
  popularServices: Array<{
    name: string
    count: number
  }>
}

export interface Admin {
  id: number
  username: string
  email: string
  name: string
  created_at: string
  updated_at: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
  name: string
}

export interface ApiResponse<T = any> {
  data?: T
  message?: string
  error?: string
  errors?: Array<{
    field: string
    message: string
  }>
}
