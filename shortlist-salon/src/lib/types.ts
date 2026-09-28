export interface Book {
  id: string
  title: string
  author: string
  pages: number
  assigned: string[]
}
export interface Member {
  id: string
  name: string
  speed: number
  predicted: string | null
}
export interface Log {
  id: string
  memberId: string
  bookId: string
  date: string
  page: number
}
export interface Settings {
  prize: string
  announce: string
}
export interface State {
  books: Book[]
  members: Member[]
  logs: Log[]
  settings: Settings
}
