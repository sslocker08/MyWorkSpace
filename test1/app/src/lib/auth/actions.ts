'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createHash, timingSafeEqual } from 'crypto'
import { createSession, SESSION_COOKIE } from './session'

// In-memory rate limiter: 5 attempts per IP per 15 min
const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = attempts.get(ip)
  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (record.count >= MAX_ATTEMPTS) return false
  record.count++
  return true
}

function clearRateLimit(ip: string) {
  attempts.delete(ip)
}

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export type LoginResult =
  | { success: true }
  | { success: false; error: string }

export async function login(formData: FormData): Promise<LoginResult> {
  const headersList = headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0].trim() ??
    headersList.get('x-real-ip') ??
    'unknown'

  if (!checkRateLimit(ip)) {
    return { success: false, error: 'Trop de tentatives. Réessayez dans 15 minutes.' }
  }

  const username = formData.get('username')?.toString().trim() ?? ''
  const password = formData.get('password')?.toString() ?? ''

  const expectedUsername = process.env.ADMIN_USERNAME ?? ''
  const expectedHash = process.env.ADMIN_PASSWORD_HASH ?? ''
  const inputHash = hashPassword(password)

  const usernameOk = safeCompare(username, expectedUsername)
  const passwordOk = safeCompare(inputHash, expectedHash)

  if (!usernameOk || !passwordOk) {
    return { success: false, error: 'Identifiant ou mot de passe incorrect.' }
  }

  clearRateLimit(ip)
  const token = await createSession(username)

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/admin',
    maxAge: 60 * 60 * 8, // 8 hours
  })

  redirect('/admin')
}

export async function logout() {
  cookies().set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/admin',
    maxAge: 0,
  })
  redirect('/admin/login')
}
