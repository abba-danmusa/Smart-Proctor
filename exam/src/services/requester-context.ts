import { BadRequestError, NotAuthorizedError } from '@danmusa/medlink-common'
import { Request } from 'express'

export type UserRole = 'student' | 'lecturer' | 'admin'

export interface RequesterContext {
  id: string
  email: string
  role: UserRole
  institution?: string
  fullName?: string
}

type RawCurrentUser = {
  id?: string
  email?: string
  role?: string
  institution?: string
  fullName?: string
}

const USER_ROLES: ReadonlySet<UserRole> = new Set(['student', 'lecturer', 'admin'])

function asNonEmptyString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function parseRole(value: unknown) {
  const parsed = asNonEmptyString(value)
  if (!parsed || !USER_ROLES.has(parsed as UserRole)) {
    return undefined
  }

  return parsed as UserRole
}

export function getRequesterContext(req: Request): RequesterContext {
  const currentUser = (req.currentUser ?? {}) as RawCurrentUser

  const id = asNonEmptyString(currentUser.id)
  const email = asNonEmptyString(currentUser.email)

  if (!id || !email) {
    throw new NotAuthorizedError()
  }

  const role = parseRole(currentUser.role ?? req.get('x-user-role'))

  if (!role) {
    throw new BadRequestError('Requester role is missing from authenticated context')
  }

  return {
    id,
    email,
    role,
    institution: asNonEmptyString(currentUser.institution ?? req.get('x-user-institution')),
    fullName: asNonEmptyString(currentUser.fullName ?? req.get('x-user-full-name')),
  }
}
