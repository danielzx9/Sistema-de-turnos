'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Lock, User, Eye, EyeOff } from 'lucide-react'

interface LoginForm {
  username: string
  password: string
}

interface AdminLoginProps {
  onLogin: (token: string, user: any) => void
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      const result = await response.json()
      
      if (response.ok) {
        onLogin(result.token, result.user)
      } else {
        setError(result.error || 'Error al iniciar sesión')
      }
    } catch (error) {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100">
            <Lock className="h-6 w-6 text-primary-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Panel de Administración
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Inicia sesión para acceder al panel
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Usuario
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('username', { required: 'El usuario es requerido' })}
                  type="text"
                  className="input pl-10"
                  placeholder="Tu usuario"
                />
                <User className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
              </div>
              {errors.username && (
                <p className="text-red-600 text-sm mt-1">{errors.username.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('password', { required: 'La contraseña es requerida' })}
                  type={showPassword ? 'text' : 'password'}
                  className="input pl-10 pr-10"
                  placeholder="Tu contraseña"
                />
                <Lock className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Credenciales por defecto: <br />
              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                admin / admin123
              </span>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
