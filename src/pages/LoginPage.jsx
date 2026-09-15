import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'

export default function LoginPage() {
  const navigate = useNavigate()
  function handleSubmit(event) {
    event.preventDefault()
    // UI demo only. Replace with an authentication API before production.
    navigate('/dashboard')
  }
  return (
    <main className="flex min-h-dvh items-start justify-center bg-sidebar px-5 pb-16 pt-[clamp(64px,13vh,140px)]">
      <section className="w-full max-w-[400px] rounded-md border border-slate-200 bg-white p-10 shadow-[0_16px_35px_-12px_rgba(0,0,0,0.4)]">
        <h1 className="text-xl font-bold tracking-tight">Involens</h1>
        <p className="mt-1.5 text-xs text-slate-500">
          Đăng nhập để tiếp tục xử lý tài liệu
        </p>
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs text-slate-500"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="hoang.nguyen@company.vn"
              className="h-10 w-full rounded border border-slate-200 px-3 text-xs outline-none placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs text-slate-500"
            >
              Mật khẩu
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="h-10 w-full rounded border border-slate-200 px-3 text-xs outline-none placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </div>
          <Button type="submit" className="mt-3 h-10 w-full">
            Đăng nhập
          </Button>
        </form>
      </section>
    </main>
  )
}
