import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './lib/auth'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Services from './pages/Services'
import Doctors from './pages/Doctors'
import Book from './pages/Book'
import Auth from './pages/Auth'
import MyAppointments from './pages/MyAppointments'
import NotFound from './pages/NotFound'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 60_000 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="servicos" element={<Services />} />
              <Route path="profissionais" element={<Doctors />} />
              <Route path="agendar" element={<Book />} />
              <Route path="entrar" element={<Auth mode="login" />} />
              <Route path="cadastro" element={<Auth mode="register" />} />
              <Route element={<ProtectedRoute />}>
                <Route path="minhas-consultas" element={<MyAppointments />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
