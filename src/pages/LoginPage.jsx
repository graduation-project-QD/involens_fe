import { useState } from 'react'
import { Check, Eye, EyeOff, Search } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import extractionIllustration from '../../Hóa đơn giấy → dữ liệu@1x.png'

/** Checks the approved public registration password requirements without logging credentials. */
function isRegistrationPasswordValid(password) {
  const special = `!@#$%^&*()_+-=[]{};':"\\|,.<>/?`
  const valid =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    !/\s/.test(password) &&
    [...password].some((character) => special.includes(character))
  console.debug('[Registration] Password validation completed', { valid })
  return valid
}

/** Presents login and registration, validates public account details and displays backend failures. */
export default function LoginPage() {
  console.debug('[Login] Rendering login form')
  const { user, loading, error: sessionError, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const { state } = useLocation()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [mode, setMode] = useState('login')
  const isRegistering = mode === 'register'
  /** Switches authentication forms and clears the previous form's feedback and password visibility. */
  function changeMode() {
    if (busy) return
    console.debug('[Login] Switching authentication form', { mode })
    setMode(isRegistering ? 'login' : 'register')
    setError('')
    setShowPassword(false)
  }
  /** Toggles password visibility so the user can check the entered credentials. */
  function togglePasswordVisibility() {
    console.debug('[Login] Toggling password visibility')
    setShowPassword(!showPassword)
  }
  /** Validates and submits login or registration details, then resumes the requested protected screen. */
  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return
    console.info('[Login] Submitting authentication form', { mode })
    setError('')
    const form = new FormData(event.currentTarget)
    const credentials = {
      email: form.get('email').trim(),
      password: form.get('password'),
    }
    let registration
    if (isRegistering) {
      registration = {
        ...credentials,
        fullName: form.get('fullName').trim(),
        confirmPassword: form.get('confirmPassword'),
      }
      if (!registration.fullName || !registration.email) {
        console.warn('[Registration] Required account details are missing')
        setError('Vui lòng điền đầy đủ họ tên và email.')
        return
      }
      if (!isRegistrationPasswordValid(registration.password)) {
        console.warn('[Registration] Password requirements validation failed')
        setError(
          'Mật khẩu cần ít nhất 8 ký tự, có chữ hoa, ký tự đặc biệt và không chứa khoảng trắng.',
        )
        return
      }
      if (registration.password !== registration.confirmPassword) {
        console.warn('[Registration] Password confirmation mismatch')
        setError('Mật khẩu xác nhận không khớp.')
        return
      }
    }
    setBusy(true)
    try {
      if (isRegistering) await signUp(registration)
      else await signIn(credentials)
      console.info('[Login] Authentication completed', { mode })
      navigate(state?.returnTo || '/dashboard', { replace: true })
    } catch (failure) {
      console.warn('[Login] Authentication failed', {
        mode,
        code: failure.code,
      })
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }
  if (loading)
    return (
      <p role="status" className="p-8">
        Đang xác thực...
      </p>
    )
  if (user) return <Navigate to="/dashboard" replace />
  return (
    <main className="grid min-h-dvh bg-[#f5f8f7] md:grid-cols-[1.1fr_1fr]">
      <section
        aria-label="Giới thiệu Involens"
        className="flex flex-col bg-[#141c2b] px-6 py-8 text-white sm:px-10 md:min-h-dvh md:px-8 lg:px-14 lg:py-12"
      >
        <div className="flex items-center gap-2.5 text-lg font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1ba780]">
            <Search size={19} aria-hidden="true" />
          </span>
          Involens
        </div>
        <div className="my-auto py-10 md:py-14">
          <h1 className="max-w-lg text-3xl font-bold leading-[1.15] tracking-tight lg:text-[42px]">
            Biến hóa đơn giấy thành dữ liệu, chỉ trong vài giây.
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-6 text-slate-300">
            Tải ảnh hoặc PDF hóa đơn lên, Involens tự đọc và trích xuất các
            trường quan trọng để bạn kiểm tra và xuất ra dùng ngay.
          </p>
          {/* Crop the original image's top 130px containing its duplicate heading and description. */}
          <div className="mt-7 aspect-[1200/430] overflow-hidden rounded-xl">
            <img
              src={extractionIllustration}
              alt="Quy trình Involens chuyển hóa đơn giấy thành dữ liệu có cấu trúc bằng nhận dạng chữ, trích xuất trường và kiểm tra, duyệt."
              width="1200"
              height="560"
              className="block h-full w-full object-cover object-bottom"
            />
          </div>
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-3 text-xs text-slate-300">
          <li className="flex items-center gap-1.5">
            <Check size={15} className="text-emerald-400" aria-hidden="true" />
            Tải lên ảnh hoặc PDF
          </li>
          <li className="flex items-center gap-1.5">
            <Check size={15} className="text-emerald-400" aria-hidden="true" />
            Tự động trích xuất
          </li>
          <li className="flex items-center gap-1.5">
            <Check size={15} className="text-emerald-400" aria-hidden="true" />
            Kiểm tra & xuất dữ liệu
          </li>
        </ul>
      </section>
      <section
        aria-label="Tài khoản Involens"
        className="flex items-center justify-center px-5 py-10 sm:px-10 md:px-7 lg:px-12"
      >
        <div className="w-full max-w-[400px] rounded-2xl bg-white p-6 shadow-[0_10px_40px_rgba(20,28,43,0.07)] sm:p-9">
          <div
            role="group"
            aria-label="Chọn đăng nhập hoặc đăng ký"
            className="grid grid-cols-2 rounded-lg bg-[#edf2f0] p-1 text-xs font-semibold"
          >
            <button
              type="button"
              onClick={isRegistering ? changeMode : undefined}
              disabled={busy}
              aria-pressed={!isRegistering}
              className={`rounded-md px-3 py-2.5 disabled:opacity-50 ${!isRegistering ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={!isRegistering ? changeMode : undefined}
              disabled={busy}
              aria-pressed={isRegistering}
              className={`rounded-md px-3 py-2.5 disabled:opacity-50 ${isRegistering ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Đăng ký
            </button>
          </div>
          <h2 className="mt-6 text-2xl font-bold tracking-tight">
            {isRegistering ? 'Tạo tài khoản miễn phí' : 'Chào mừng trở lại'}
          </h2>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {isRegistering
              ? 'Bắt đầu xử lý hóa đơn của bạn ngay hôm nay.'
              : 'Đăng nhập để tiếp tục xử lý hóa đơn của bạn.'}
          </p>
          <form key={mode} onSubmit={handleSubmit} className="mt-6">
            <fieldset disabled={busy} className="space-y-4 disabled:opacity-70">
              {isRegistering && (
                <label className="block text-xs font-medium text-slate-700">
                  Họ và tên
                  <input
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    placeholder="Nguyễn Văn A"
                    required
                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 placeholder:text-slate-400"
                  />
                </label>
              )}
              <label className="block text-xs text-slate-500">
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete={isRegistering ? 'email' : 'username'}
                  placeholder="ban@example.com"
                  required
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 placeholder:text-slate-400"
                />
              </label>
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs text-slate-500"
                >
                  Mật khẩu
                </label>
                <div className="relative mt-2">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={
                      isRegistering ? 'new-password' : 'current-password'
                    }
                    placeholder={
                      isRegistering
                        ? 'Tạo mật khẩu của bạn'
                        : 'Nhập mật khẩu của bạn'
                    }
                    aria-describedby={
                      isRegistering ? 'password-requirements' : undefined
                    }
                    required
                    className="h-11 w-full rounded-lg border border-slate-200 pl-3 pr-11 text-sm text-slate-800 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    aria-pressed={showPassword}
                    className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    {showPassword ? (
                      <EyeOff size={18} aria-hidden="true" />
                    ) : (
                      <Eye size={18} aria-hidden="true" />
                    )}
                  </button>
                </div>
                {isRegistering && (
                  <p
                    id="password-requirements"
                    className="mt-2 text-xs leading-5 text-slate-500"
                  >
                    Ít nhất 8 ký tự, có chữ hoa, ký tự đặc biệt và không chứa
                    khoảng trắng.
                  </p>
                )}
              </div>
              {isRegistering && (
                <label className="block text-xs font-medium text-slate-700">
                  Xác nhận mật khẩu
                  <input
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Nhập lại mật khẩu"
                    required
                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 placeholder:text-slate-400"
                  />
                </label>
              )}
              {(error || (!isRegistering && sessionError)) && (
                <p role="alert" className="text-xs text-red-600">
                  {error || sessionError}
                </p>
              )}
              <Button
                type="submit"
                disabled={busy}
                className="mt-2 h-11 w-full rounded-lg"
              >
                {busy
                  ? isRegistering
                    ? 'Đang tạo tài khoản...'
                    : 'Đang đăng nhập...'
                  : isRegistering
                    ? 'Tạo tài khoản'
                    : 'Đăng nhập'}
              </Button>
            </fieldset>
          </form>
          <p className="mt-5 text-center text-xs text-slate-500">
            {isRegistering ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
            <button
              type="button"
              onClick={changeMode}
              disabled={busy}
              className="font-semibold text-brand underline underline-offset-2 disabled:opacity-50"
            >
              {isRegistering ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}
