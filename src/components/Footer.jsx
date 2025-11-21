// src/components/Footer.js
import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3 className="footer-title">О симуляторе</h3>
            <p className="footer-text">
              Обучающий симулятор "Электролиз 360" разработан для безопасного обучения практикантов РУСАЛ основам технологического процесса электролиза алюминия.
            </p>
          </div>
          <div className="footer-section">
            <h3 className="footer-title">Контакты</h3>
            <p className="footer-text">
              Техническая поддержка:<br />
              support@electrolysis360.ru<br />
              +7 (495) 123-45-67
            </p>
          </div>
          <div className="footer-section">
            <h3 className="footer-title">Версия</h3>
            <p className="footer-text">
              Версия: 1.0.0 (React)<br />
              Последнее обновление: {new Date().toLocaleDateString('ru-RU')}<br />
              Для интеграции с backend используйте REST API
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;