'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Edit, Trash2, Scissors, Clock, DollarSign } from 'lucide-react'

interface Service {
  id: number
  name: string
  description: string
  duration: number
  price: number
  is_active: boolean
}

interface ServiceForm {
  name: string
  description: string
  duration: number
  price: number
}

export default function ServicesManagement() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ServiceForm>()

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/admin`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setServices(data)
      }
    } catch (error) {
      console.error('Error al cargar servicios:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: ServiceForm) => {
    try {
      const token = localStorage.getItem('admin_token')
      const url = editingService 
        ? `${process.env.NEXT_PUBLIC_API_URL}/services/${editingService.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/services`
      
      const method = editingService ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      })
      
      if (response.ok) {
        await fetchServices()
        reset()
        setShowForm(false)
        setEditingService(null)
      }
    } catch (error) {
      console.error('Error al guardar servicio:', error)
    }
  }

  const handleEdit = (service: Service) => {
    setEditingService(service)
    reset({
      name: service.name,
      description: service.description,
      duration: service.duration,
      price: service.price
    })
    setShowForm(true)
  }

// 1. Lógica para desactivar el servicio (Soft Delete)
const handleDeactivate = async (id: number) => {
  if (!confirm('¿Estás seguro de que quieres desactivar este servicio? No se mostrará a los clientes, pero se mantendrá en el sistema.')) {
    return;
  }

  try {
    const token = localStorage.getItem('admin_token');
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/${id}/deactivate`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      await fetchServices(); // Recarga la lista de servicios
      alert('Servicio desactivado exitosamente.');
    } else {
      const errorData = await response.json();
      alert(`Error: ${errorData.error}`);
    }
  } catch (error) {
    console.error('Error al desactivar servicio:', error);
    alert('Ocurrió un error al desactivar el servicio.');
  }
};

// 2. Lógica para eliminar el servicio permanentemente (Hard Delete)
const handleDestroy = async (id: number) => {
  if (!confirm('ADVERTENCIA: ¿Estás seguro de que quieres ELIMINAR PERMANENTEMENTE este servicio? Esta acción no se puede deshacer y borrará todo su historial.')) {
    return;
  }

  try {
    const token = localStorage.getItem('admin_token');
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/${id}/destroy`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      await fetchServices(); // Recarga la lista de servicios
      alert('Servicio eliminado permanentemente.');
    } else {
      const errorData = await response.json();
      alert(`Error: ${errorData.error}`);
    }
  } catch (error) {
    console.error('Error al eliminar servicio permanentemente:', error);
    alert('Ocurrió un error al eliminar el servicio.');
  }
};

  const toggleServiceStatus = async (service: Service) => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/${service.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...service,
          is_active: !service.is_active
        })
      })
      
      if (response.ok) {
        await fetchServices()
      }
    } catch (error) {
      console.error('Error al actualizar servicio:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-24"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Gestión de Servicios</h2>
        <button
          onClick={() => {
            setEditingService(null)
            reset()
            setShowForm(true)
          }}
          className="btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Servicio
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="card mb-6">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
            </h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Servicio *
                  </label>
                  <input
                    {...register('name', { required: 'El nombre es requerido' })}
                    className="input"
                    placeholder="Ej: Corte de cabello"
                  />
                  {errors.name && (
                    <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duración (minutos) *
                  </label>
                  <input
                    {...register('duration', { 
                      required: 'La duración es requerida',
                      min: { value: 1, message: 'Mínimo 1 minuto' }
                    })}
                    type="number"
                    className="input"
                    placeholder="30"
                  />
                  {errors.duration && (
                    <p className="text-red-600 text-sm mt-1">{errors.duration.message}</p>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="input"
                  placeholder="Descripción del servicio..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio *
                </label>
                <input
                  {...register('price', { 
                    required: 'El precio es requerido',
                    min: { value: 0, message: 'El precio debe ser positivo' }
                  })}
                  type="number"
                  step="0.01"
                  className="input"
                  placeholder="15.00"
                />
                {errors.price && (
                  <p className="text-red-600 text-sm mt-1">{errors.price.message}</p>
                )}
              </div>
              
              <div className="flex space-x-4">
                <button type="submit" className="btn-primary">
                  {editingService ? 'Actualizar' : 'Crear'} Servicio
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingService(null)
                    reset()
                  }}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de servicios */}
      <div className="space-y-4">
        {services.map((service) => (
          <div key={service.id} className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <div className="bg-primary-100 p-2 rounded-full mr-3">
                      <Scissors className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">
                        {service.name}
                        {!service.is_active && (
                          <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                            Inactivo
                          </span>
                        )}
                      </h4>
                      {service.description && (
                        <p className="text-gray-600 text-sm">{service.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {service.duration} minutos
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />
                      ${service.price}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleServiceStatus(service)}
                    className={`px-3 py-1 text-xs rounded-full ${
                      service.is_active
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    {service.is_active ? 'Activo' : 'Inactivo'}
                  </button>
                  
                  <button
                    onClick={() => handleEdit(service)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDestroy(service.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {services.length === 0 && (
        <div className="text-center py-12">
          <Scissors className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No hay servicios configurados</p>
          <p className="text-gray-400 text-sm">Crea tu primer servicio para comenzar</p>
        </div>
      )}
    </div>
  )
}
