import { BrowserRouter as Router, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { Home } from './pages/Home';
import { Events } from './pages/Events';
import { Archive } from './pages/Archive';
import { CreateEvent } from './pages/CreateEvent';
import { Profile } from './pages/Profile';
import { ProfileSetup } from './pages/ProfileSetup';
import { Onboarding } from './pages/Onboarding';
import { EventDetail } from './pages/EventDetail';
import { MyEvents } from './pages/MyEvents';
import { AdminEvents } from './pages/AdminEvents';
import { Login } from './pages/Login';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';

function AppShell() {
  const { pathname } = useLocation();
  const isAuthPage = pathname === '/login';

  return (
    <div
      className={`bg-background flex flex-col ${
        isAuthPage ? 'h-dvh overflow-hidden' : 'min-h-screen'
      }`}
    >
      <ScrollToTop />
      <Navbar />
      <main className={`flex-1 ${isAuthPage ? 'min-h-0 overflow-hidden' : ''}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/events" element={<Events />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/discover" element={<Navigate to="/events" replace />} />
          <Route path="/admin/events" element={<AdminEvents />} />
          <Route path="/create-event" element={<CreateEvent />} />
          <Route path="/event/:id" element={<EventDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile-setup" element={<ProfileSetup />} />
          <Route path="/my-events" element={<MyEvents />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
        </Routes>
      </main>
      {!isAuthPage && <Footer />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}

export default App;
