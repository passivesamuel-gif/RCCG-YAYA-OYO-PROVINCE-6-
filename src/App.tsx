import React, { useEffect } from 'react';
import { RouterProvider, useRouter } from './context/RouterContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LibraryProvider } from './context/LibraryContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { FullPageLoader } from './components/ui/FullPageLoader';
import { DebugPanel } from './components/DebugPanel';

// Pages
import { HomePage } from './pages/HomePage';
import { LibraryPage } from './pages/LibraryPage';
import { BookDetailPage } from './pages/BookDetailPage';
import { ReaderPage } from './pages/ReaderPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import { NotFoundPage } from './pages/NotFoundPage';


const AppContent: React.FC = () => {
  const { path, search } = useRouter();
  const { loading: authLoading, user } = useAuth();

  const isReader = path.startsWith('/read/');

  // Initial loading state to prevent flash of content or premature redirect
  if (authLoading) {
    return <FullPageLoader />;
  }

  const renderCurrentView = () => {
    // 1. Public Landing Page (accessible to everyone)
    if (path === '/' || path === '') {
      return <HomePage />;
    }

    // 2. Public Authentication & Recovery Pages
    if (path === '/login') {
      return <LoginPage />;
    }
    if (path === '/signup') {
      return <SignupPage />;
    }
    // 3. Strict Auth Guard for all Library, Reading, and Admin Routes
    const isProtectedRoute =
      path === '/library' ||
      path.startsWith('/book/') ||
      path.startsWith('/read/') ||
      path === '/dashboard' ||
      path === '/profile' ||
      path === '/admin';

    if (isProtectedRoute && !user) {
      // Unauthenticated visitors are sent to Sign In with return redirect
      return <LoginPage />;
    }

    // 4. Authenticated Library Routes
    if (path === '/library') {
      return <LibraryPage />;
    }
    if (path.startsWith('/book/')) {
      return <BookDetailPage />;
    }
    if (path.startsWith('/read/')) {
      return <ReaderPage />;
    }
    if (path === '/dashboard') {
      return <DashboardPage />;
    }
    if (path === '/profile') {
      return <ProfilePage />;
    }
    if (path === '/admin') {
      return <AdminPage />;
    }

    // 5. Unrecognized path -> Designed 404 page
    return <NotFoundPage />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F2] text-[#252B2A]">
      {new URLSearchParams(search).get('debug') === '1' && <DebugPanel />}
      <Navbar />
      <main className="flex-1">
        {renderCurrentView()}
      </main>
      {!isReader && <Footer />}
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <RouterProvider>
        <AuthProvider>
          <LibraryProvider>
            <AppContent />
          </LibraryProvider>
        </AuthProvider>
      </RouterProvider>
    </ErrorBoundary>
  );
}
