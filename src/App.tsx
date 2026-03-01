import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import Navbar from './components/Navbar';
import Hero from './sections/Hero';
import TrustStrip from './sections/TrustStrip';
import Suites from './sections/Suites';
import Amenities from './sections/Amenities';
import Gallery from './sections/Gallery';
import LocationSection from './sections/Location';
import Reviews from './sections/Reviews';
import FAQ from './sections/FAQ';
import FinalCTA from './sections/FinalCTA';
import Footer from './components/Footer';
import GuestPortal from './pages/GuestPortal';

// CRM Imports
import CrmLayout from './crm/CrmLayout';
import Login from './crm/pages/Login';
import Dashboard from './crm/pages/Dashboard';
import Reservations from './crm/pages/Reservations';
import FrontDesk from './crm/pages/FrontDesk';
import Housekeeping from './crm/pages/Housekeeping';
import Maintenance from './crm/pages/Maintenance';
import GuestCRM from './crm/pages/GuestCRM';
import Finance from './crm/pages/Finance';
import Reports from './crm/pages/Reports';
import Settings from './crm/pages/Settings';


gsap.registerPlugin(ScrollTrigger);


function LandingPage() {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <div className="relative w-full overflow-hidden bg-marble text-espresso font-body">
      <div className="noise-overlay"></div>
      <Navbar />
      <Hero />
      <TrustStrip />
      <Suites />
      <Amenities />
      <Gallery />
      <LocationSection />
      <Reviews />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Guest Portal & Landing */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/guest-portal" element={<GuestPortal />} />

        {/* CRM */}
        <Route path="/crm/login" element={<Login />} />
        <Route path="/crm" element={<CrmLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="front-desk" element={<FrontDesk />} />
          <Route path="housekeeping" element={<Housekeeping />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="guests" element={<GuestCRM />} />
          <Route path="finance" element={<Finance />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
