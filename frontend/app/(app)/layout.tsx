import { Sidebar } from '@/components/sidebar'
import { Topbar } from '@/components/topbar'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen animated-gradient-bg overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden lg:ml-72">
        <Topbar />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
