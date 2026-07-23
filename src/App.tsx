import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Events } from './pages/Events';
import { CreateEvent } from './pages/CreateEvent';
import { Profile } from './pages/Profile';
import { Onboarding } from './pages/Onboarding';
import { EventDetail } from './pages/EventDetail';
import { MyEvents } from './pages/MyEvents';
import { AdminEvents } from './pages/AdminEvents';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/events" element={<Events />} />
            <Route path="/admin/events" element={<AdminEvents />} />
            <Route path="/create-event" element={<CreateEvent />} />
            <Route path="/event/:id" element={<EventDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/my-events" element={<MyEvents />} />
            <Route path="/onboarding" element={<Onboarding />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
