export {}

declare global {
  var signin: (options?: {
    id?: string
    email?: string
    role?: 'student' | 'lecturer' | 'admin'
    fullName?: string
    institution?: string
  }) => Promise<string[]>
}
