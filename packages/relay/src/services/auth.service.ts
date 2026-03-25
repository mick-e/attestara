import jwt from 'jsonwebtoken'
import type { JWTPayload } from '../middleware/auth.js'

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcrypt')
    return bcrypt.hash(password, 10)
  }

  async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const bcrypt = await import('bcrypt')
    return bcrypt.compare(password, storedHash)
  }

  generateAccessToken(
    payload: Omit<JWTPayload, 'type'>,
    secret: string,
    expiresIn = '15m',
  ): string {
    return jwt.sign({ ...payload, type: 'access' }, secret, { expiresIn: expiresIn as any })
  }

  generateRefreshToken(
    payload: Omit<JWTPayload, 'type'>,
    secret: string,
    expiresIn = '7d',
  ): string {
    return jwt.sign({ ...payload, type: 'refresh' }, secret, { expiresIn: expiresIn as any })
  }

  verifyToken(token: string, secret: string): JWTPayload {
    return jwt.verify(token, secret) as JWTPayload
  }
}
