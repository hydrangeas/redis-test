import React from 'react';
import { AuthProvider } from '@/hooks/useAuth';
import { AppRouter } from '@/router';
import './App.css';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
};

export default App;