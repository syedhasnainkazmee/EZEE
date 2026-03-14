import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// Read at call-time (not module load) so Edge/middleware runtime always gets the live value
function getJwtSecret() { return process.env.JWT_SECRET ?? 'dev-secret-change-in-production-please' }
const JWT_EXPIRES_IN = '7d'
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10)

export type JwtPayload = {
  sub: string         // user_id
  jti: string         // session id (for revocation)
  org: string | null  // org_id
  role: 'admin' | 'member'
  name: string
  email: string
  iat: number
  exp: number
}

// ── Password utilities ─────────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

// ── JWT utilities ──────────────────────────────────────────────────────────

export function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions)
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JwtPayload
  } catch {
    return null
  }
}

// ── Session management ─────────────────────────────────────────────────────

export function createSessionToken(user: {
  id: string; org_id: string | null; role: 'admin' | 'member'; name: string; email: string
}): { token: string; jti: string; expiresAt: Date } {
  const jti = randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const token = signJwt({
    sub:   user.id,
    jti,
    org:   user.org_id,
    role:  user.role,
    name:  user.name,
    email: user.email,
  })

  return { token, jti, expiresAt }
}

// ── Cookie helpers (used in API routes) ───────────────────────────────────

export const COOKIE_NAME = 'process-session'

export function buildCookieHeader(token: string, expiresAt: Date): string {
  const isProd = process.env.NODE_ENV === 'production'
  const parts = [
    `${COOKIE_NAME}=${token}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Expires=${expiresAt.toUTCString()}`,
  ]
  if (isProd) parts.push('Secure')
  return parts.join('; ')
}

export function buildClearCookieHeader(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

// ── Extract JWT from request headers ──────────────────────────────────────

export function getJwtFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`))
  return match ? match[1] : null
}
