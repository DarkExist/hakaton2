// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import MainDisplay from './components/MainDisplay';
import JournalSection from './components/JournalSection';
import AlloyCalculator from './components/AlloyCalculator';
import HelpSection from './components/HelpSection';
import Footer from './components/Footer';
import { useElectrolysisSimulator } from './hooks/useElectrolysisSimulator';
import './App.css';

const AppContent = () => {
  const [activeSection, setActiveSection] = useState('simulator');
  const simulator = useElectrolysisSimulator();
  const navigate = useNavigate();

  const handleNavigation = (section) => {
    setActiveSection(section);
    navigate(`/${section}`);
  };

  return (
    <div className="app-container">
      <Header 
        activeSection={activeSection} 
        onNavigate={handleNavigation} 
      />
      
      <div className="container">
        <main className="main-content">
          {activeSection === 'simulator' && (
            <>
              <ControlPanel simulator={simulator} />
              <MainDisplay simulator={simulator} />
            </>
          )}
          
          {activeSection === 'journal' && (
            <JournalSection simulator={simulator} />
          )}
          
          {activeSection === 'alloy' && (
            <AlloyCalculator simulator={simulator} />
          )}
          
          {activeSection === 'help' && (
            <HelpSection />
          )}
        </main>
      </div>
      
      <Footer />
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </Router>
  );
}

export default App;