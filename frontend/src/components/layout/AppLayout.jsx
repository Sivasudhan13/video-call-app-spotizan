import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../common/Navbar';
import { Footer } from '../common/Footer';
import { AgeNoticeModal } from '../common/AgeNoticeModal';

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-brand-dark selection:bg-brand-tomato selection:text-white">
      {/* 18+ Legal Consent Gate */}
      <AgeNoticeModal />

      {/* Main Header / Navigation */}
      <Navbar />

      {/* Dynamic Route Content */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* Compliance & Platform Footer */}
      <Footer />
    </div>
  );
}
