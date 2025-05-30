'use client'
import React, { useState } from 'react'
import { signIn } from 'next-auth/react'
import Image from 'next/image'
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from 'lucide-react'
import axios from 'axios'
import { setCookie } from 'cookies-next'
import { useRouter } from 'next/navigation'
/**
 * Login-Register-Screen
 * @return {jsx}
 */
export default function LoginRegisterScreen() {
    const [registerForm, setRegisterForm] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        name: ''
    })
    const [errors, setErrors] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        name: ''
    })

    const handleGoogleAuth = () => {
        signIn('google')
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
        if (errors[name as keyof typeof errors]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }))
        }
    }

    const validateForm = () => {
        const newErrors = {
            email: '',
            password: '',
            confirmPassword: '',
            name: ''
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!formData.email) {
            newErrors.email = 'Email is required'
        } else if (!emailRegex.test(formData.email)) {
            newErrors.email = 'Please enter a valid email'
        }

        if (!formData.password) {
            newErrors.password = 'Password is required'
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters'
        }

        if (registerForm) {
            if (!formData.name) {
                newErrors.name = 'Name is required'
            }
            if (!formData.confirmPassword) {
                newErrors.confirmPassword = 'Please confirm your password'
            } else if (formData.password !== formData.confirmPassword) {
                newErrors.confirmPassword = 'Passwords do not match'
            }
        }

        setErrors(newErrors)
        return Object.values(newErrors).every(error => error === '')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validateForm()) return

        setIsLoading(true)
        try {
            if (registerForm) {
                const result = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/user-account-manager/register-account`, {
                    userName: formData.name,
                    userEmail: formData.email,
                    password: formData.password
                })

                if (result.data.userSessionToken) {
                    setCookie('authjs.session-token', result.data.userSessionToken, {
                        maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
                        httpOnly: false,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'strict',
                        path: '/'
                    })
                }
                router.push('/account')
            } else {
                console.log('Login:', formData)
                const result = await signIn('credentials', {
                    email: formData.email,
                    password: formData.password,
                    redirect: false
                })

                if (result?.error) {
                    setErrors(prev => ({
                        ...prev,
                        password: "Incorrect email or password"
                    }))
                    return
                }
                router.push('/account')

            }
        } catch (error) {
            console.error('Authentication error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const toggleForm = () => {
        setRegisterForm(!registerForm)
        setFormData({
            email: '',
            password: '',
            confirmPassword: '',
            name: ''
        })
        setErrors({
            email: '',
            password: '',
            confirmPassword: '',
            name: ''
        })
    }

    return (
        <div className="flex h-full flex-col justify-center">
            <div className="w-full max-w-md self-center">
                <div className="rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
                    <div className="mb-8 text-center">
                        <h1 className="mb-2 text-3xl font-bold text-white">{registerForm ? 'Create Account' : 'Welcome Back'}</h1>
                        <p className="text-gray-300">{registerForm ? 'Sign up to get started' : 'Sign in to your account'}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {registerForm && (
                            <div>
                                <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-300">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <User className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="w-full rounded-lg border border-white/20 bg-white/10 py-3 pr-4 pl-10 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none"
                                        placeholder="Enter your full name"
                                    />
                                </div>
                                {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-300">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="w-full rounded-lg border border-white/20 bg-white/10 py-3 pr-4 pl-10 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none"
                                    placeholder="Enter your email"
                                />
                            </div>
                            {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
                        </div>

                        <div>
                            <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-300">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="w-full rounded-lg border border-white/20 bg-white/10 py-3 pr-12 pl-10 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none"
                                    placeholder="Enter your password"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-300">
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
                        </div>

                        {registerForm && (
                            <div>
                                <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-gray-300">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        className="w-full rounded-lg border border-white/20 bg-white/10 py-3 pr-12 pl-10 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none"
                                        placeholder="Confirm your password"
                                    />
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-300">
                                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                                {errors.confirmPassword && <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 font-semibold text-white transition-all duration-200 hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-400/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center">
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    {registerForm ? 'Creating Account...' : 'Signing In...'}
                                </div>
                            ) : registerForm ? (
                                'Create Account'
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="my-6 flex items-center">
                        <div className="flex-1 border-t border-white/20"></div>
                        <span className="px-4 text-sm text-gray-400">or continue with</span>
                        <div className="flex-1 border-t border-white/20"></div>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={handleGoogleAuth}
                            className="flex w-full cursor-pointer items-center justify-center rounded-lg bg-white px-4 py-3 font-semibold text-gray-900 transition-all duration-200 hover:bg-gray-100 focus:ring-2 focus:ring-white/20 focus:outline-none"
                        >
                            <Image src="/AccountIcons/google.png" alt="Google Logo" width={20} height={20} />
                            <span className="ml-3">Continue with Google</span>
                        </button>
                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-gray-400">
                            {registerForm ? 'Already have an account?' : "Don't have an account?"}{' '}
                            <button type="button" onClick={toggleForm} className="cursor-pointer font-semibold text-blue-400 transition-colors hover:text-blue-300">
                                {registerForm ? 'Sign In' : 'Sign Up'}
                            </button>
                        </p>
                    </div>

                    {!registerForm && (
                        <div className="mt-4 text-center">
                            <button type="button" className="text-sm text-gray-400 transition-colors hover:text-gray-300">
                                Forgot your password?
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
