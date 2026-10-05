import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main id="main-content">
      {/* Top Notice Banner */}
      <div className="top-bar">
        <div className="container">
          <div className="top-bar-inner">
            <div className="top-contact-info">
              <span><i className="fa-solid fa-flag"></i> Founded by Dr. B.R. Ambedkar (1927)</span>
              <span><i className="fa-solid fa-phone"></i> Central Command: 1800-24-1927</span>
              <a href="mailto:centralcommand@samatasainikdal.org"><i className="fa-solid fa-envelope"></i> centralcommand@samatasainikdal.org</a>
            </div>
          </div>
        </div>
      </div>

      <div className="tricolor-stripe"></div>

      {/* Main Header */}
      <header className="header-wrapper" id="mainHeader">
        <div className="container">
          <div className="header-main">
            <a href="/" className="brand-block">
              <div className="logo-container">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt="SSD Emblem" className="org-logo" />
              </div>
              <div className="brand-text">
                <span className="org-hindi">समता सैनिक दल</span>
                <span className="org-name">SAMATA SAINIK DAL</span>
                <span className="org-sub">ARMY OF EQUALITY &bull; CENTRAL COMMAND</span>
              </div>
            </a>

            <div className="header-actions">
              <a href="/membership.html" className="btn btn-outline-navy btn-sm">
                <i className="fa-solid fa-id-card"></i> Sainik Enlistment
              </a>
              <a href="/admin.html" className="btn btn-primary btn-sm">
                <i className="fa-solid fa-shield-halved"></i> Command Portal
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-overlay"></div>
        <div className="container hero-content">
          <div className="hero-badge">
            <i className="fa-solid fa-shield-heart"></i> Guarding Constitutional Morality Since 1927
          </div>
          <h1 className="hero-title">
            Discipline &bull; Self-Respect &bull; Human Equality
          </h1>
          <p className="hero-subtitle">
            The non-political, voluntary cadre founded by Bodhisattva Babasaheb Dr. B.R. Ambedkar to safeguard fundamental human rights, constitutional justice, and social democracy across India.
          </p>

          <div className="hero-actions" style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href="/membership.html" className="btn btn-primary btn-lg">
              <i className="fa-solid fa-user-plus"></i> Online Sainik Enlistment &rarr;
            </a>
            <a href="/member-portal.html" className="btn btn-outline-white btn-lg">
              <i className="fa-solid fa-id-badge"></i> Member Digital ID Portal
            </a>
            <a href="/verify.html" className="btn btn-outline-white btn-lg">
              <i className="fa-solid fa-qrcode"></i> Public QR Verification
            </a>
          </div>
        </div>
      </section>

      {/* Quick Access Matrix */}
      <section style={{ padding: '60px 0', background: 'var(--off-white)' }}>
        <div className="container">
          <div className="section-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
            <span className="section-badge"><i className="fa-solid fa-network-wired"></i> Digital Command Infrastructure</span>
            <h2 className="section-title">Enterprise Command Portals</h2>
            <p className="section-subtitle">Zero Trust Role-Based Access Scoped to Multi-Tier Territorial Jurisdictions.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div className="join-workflow-box" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '36px', color: 'var(--primary-orange)', marginBottom: '16px' }}>
                <i className="fa-solid fa-users-gear"></i>
              </div>
              <h3 style={{ fontSize: '18px', color: 'var(--dark-navy)', marginBottom: '8px' }}>Administrative Portal</h3>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
                Multi-level application review queue, district jurisdiction filtering, recommendation rubrics, and executive approvals.
              </p>
              <a href="/admin.html" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                Access Admin Portal &rarr;
              </a>
            </div>

            <div className="join-workflow-box" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '36px', color: 'var(--dark-navy)', marginBottom: '16px' }}>
                <i className="fa-solid fa-id-card-clip"></i>
              </div>
              <h3 style={{ fontSize: '18px', color: 'var(--dark-navy)', marginBottom: '8px' }}>Cadet Member Portal</h3>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
                Official Sainik ID card generation, offline verification barcode, unit assignment details, and national roll verification.
              </p>
              <a href="/member-portal.html" className="btn btn-outline-navy btn-sm" style={{ width: '100%' }}>
                Access Member Portal &rarr;
              </a>
            </div>

            <div className="join-workflow-box" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '36px', color: '#1B5E20', marginBottom: '16px' }}>
                <i className="fa-solid fa-shield-check"></i>
              </div>
              <h3 style={{ fontSize: '18px', color: 'var(--dark-navy)', marginBottom: '8px' }}>Public QR Verification</h3>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
                Zero-knowledge cryptographic verification endpoint for verifying genuine SSD identification cards and credentials.
              </p>
              <a href="/verify.html" className="btn btn-outline-navy btn-sm" style={{ width: '100%' }}>
                Verify Sainik ID &rarr;
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-wrapper">
        <div className="container" style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
          <p>&copy; {new Date().getFullYear()} Samata Sainik Dal (SSD) &bull; Central Command Platform &bull; All Rights Reserved.</p>
        </div>
      </footer>
    </main>
  );
}
