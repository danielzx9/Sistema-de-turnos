'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, Phone, Scissors, Star } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import BookingForm from '@/components/BookingForm'
import ServiceCard from '@/components/ServiceCard'
import { getServices, getBusinessConfig } from '@/lib/api'

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

export default function Home() {
  const [services, setServices] = useState<Service[]>([])
  const [businessConfig, setBusinessConfig] = useState<BusinessConfig | null>(null)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesData, configData] = await Promise.all([
          getServices(),
          getBusinessConfig()
        ])
        setServices(servicesData)
        setBusinessConfig(configData)
      } catch (error) {
        console.error('Error al cargar datos:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service)
    setShowBookingForm(true)
  }

  const handleBookingSuccess = () => {
    setShowBookingForm(false)
    setSelectedService(null)
    // Aquí podrías mostrar un mensaje de éxito
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Scissors className="h-8 w-8 text-primary-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">
                {businessConfig?.business_name || 'Mi Barbería'}
              </h1>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-1" />
                {businessConfig?.business_phone}
              </div>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {businessConfig?.business_address}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">
              Reserva tu turno fácilmente
            </h2>
            <p className="text-xl mb-8 text-primary-100">
              Servicios profesionales de barbería con la mejor atención
            </p>
            <div className="flex justify-center space-x-8 text-sm">
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                {businessConfig?.open_time} - {businessConfig?.close_time}
              </div>
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Lunes a Viernes
              </div>
              <div className="flex items-center">
                <Star className="h-5 w-5 mr-2" />
                4.9/5 Estrellas
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Nuestros Servicios
            </h3>
            <p className="text-lg text-gray-600">
              Selecciona el servicio que necesitas y reserva tu turno
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onSelect={() => handleServiceSelect(service)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Booking Form Modal */}
      {showBookingForm && selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <BookingForm
              service={selectedService}
              businessConfig={businessConfig}
              onSuccess={handleBookingSuccess}
              onCancel={() => setShowBookingForm(false)}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-lg font-semibold mb-4">Contacto</h4>
              <div className="space-y-2 text-gray-300">
                <p>{businessConfig?.business_phone}</p>
                <p>{businessConfig?.business_email}</p>
                <p>{businessConfig?.business_address}</p>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Horarios</h4>
              <div className="space-y-2 text-gray-300">
                <p>Lunes - Viernes: {businessConfig?.open_time} - {businessConfig?.close_time}</p>
                <p>Sábado: {businessConfig?.open_time} - {businessConfig?.close_time}</p>
                <p>Domingo: Cerrado</p>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Síguenos</h4>
              <div className="space-y-2 text-gray-300">
                <p>Facebook</p>
                <p>Instagram</p>
                <p>WhatsApp</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 {businessConfig?.business_name}. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
