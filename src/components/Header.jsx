// src/components/Header.js
import React from 'react';
import logo from '../assets/logo-icon.png';

const Header = ({ activeSection, onNavigate }) => {
  return (
    <header>
      <div className="container">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">
              <img src={logo} alt="E360" />
            </div>
            <div>
              <div className="logo-text">Электролиз 360</div>
              <div className="logo-subtext">Обучающий симулятор для практикантов РУСАЛ</div>
            </div>
          </div>
          <nav className="nav-menu">
            <ul>
              <li><a href="#" className={activeSection === 'simulator' ? 'active' : ''} onClick={() => onNavigate('simulator')}>Симулятор</a></li>
              <li><a href="#" className={activeSection === 'journal' ? 'active' : ''} onClick={() => onNavigate('journal')}>Журнал экспериментов</a></li>
              <li><a href="#" className={activeSection === 'alloy' ? 'active' : ''} onClick={() => onNavigate('alloy')}>Калькулятор сплавов</a></li>
              <li><a href="#" className={activeSection === 'help' ? 'active' : ''} onClick={() => onNavigate('help')}>Справка</a></li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;