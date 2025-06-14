import { useAuth } from '@/hooks/useAuth';

export const DashboardPage: React.FC = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="dashboard-page">
      <h1>ダッシュボード</h1>
      <p>ようこそ、{user?.email}さん</p>
      <button onClick={handleSignOut}>ログアウト</button>
    </div>
  );
};