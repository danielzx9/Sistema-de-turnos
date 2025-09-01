'use client'

import { Clock, DollarSign, Scissors } from 'lucide-react'

interface Service {
  id: number
  name: string
  description: string
  duration: number
  price: number
}

interface ServiceCardProps {
  service: Service
  onSelect: () => void
}

export default function ServiceCard({ service, onSelect }: ServiceCardProps) {
  return (
    <div className="card hover:shadow-lg transition-shadow duration-300">
      <div className="card-body">
        <div className="flex items-center mb-4">
          <div className="bg-primary-100 p-3 rounded-full mr-4">
            <Scissors className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h4 className="text-xl font-semibold text-gray-900">{service.name}</h4>
            <p className="text-gray-600">{service.description}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center text-gray-600">
            <Clock className="h-4 w-4 mr-1" />
            <span className="text-sm">{service.duration} min</span>
          </div>
          <div className="flex items-center text-primary-600 font-semibold">
            <DollarSign className="h-4 w-4 mr-1" />
            <span>${service.price}</span>
          </div>
        </div>
        
        <button
          onClick={onSelect}
          className="btn-primary w-full"
        >
          Reservar Turno
        </button>
      </div>
    </div>
  )
}
