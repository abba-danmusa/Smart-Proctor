import { Publisher, Subjects } from '@danmusa/medlink-common'

type UserCreatedEvent = {
  subject: Subjects.UserCreated
  data: {
    id: string
    firstName: string
    lastName: string
    email: string
    role?: 'student' | 'lecturer' | 'admin'
    organization?: string
  }
}

export class UserCreatedPublisher extends Publisher<UserCreatedEvent> {
  subject: Subjects.UserCreated = Subjects.UserCreated
}