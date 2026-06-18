import { SignJWT, jwtVerify } from 'jose'

const SESSION_COOKIE = 'kanmi-admin-session'
const SESSION_DURATION = '8h'

function getSecret(): Uint8Array {
  const raw = process.env.ADMIN_JWT_SECRET ?? 'dev-only-fallback-secret-32-chars-min'
  return new TextEncoder().encode(raw)
}

export interface SessionPayload {
  username: string
  iat?: number
  exp?: number
}

export async function createSession(username: string): Promise<string> {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecret())
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export { SESSION_COOKIE }
