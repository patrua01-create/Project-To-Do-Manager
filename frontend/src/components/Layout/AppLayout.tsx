import { ReactNode, useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { NotificationPanel } from '../Notifications/NotificationPanel.js';
import { ProjectList } from '../Projects/ProjectList.js';
import { useWebSocket } from '../../hooks/useWebSocket.js';
import styles from './AppLayout.module.css';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const { connected } = useWebSocket();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className={styles.container}>
      {/* Mobile Overlay - Click to close sidebar */}
      {sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={closeSidebar}
          aria-label="Close menu"
        />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        {/* User Info */}
        <div className={styles.userInfo}>
          <div className={styles.userContainer}>
            {user?.avatar_url && (
              <img
                src={user.avatar_url}
                alt={user.display_name}
                className={styles.userAvatar}
              />
            )}
            <div className={styles.userDetails}>
              <div className={styles.userName}>
                {user?.display_name}
              </div>
              <div className={styles.userEmail}>{user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className={styles.logoutButton}
          >
            Logout
          </button>
        </div>

        {/* WebSocket Status */}
        <div
          className={`${styles.wsStatus} ${connected ? styles.wsStatusConnected : styles.wsStatusDisconnected}`}
        >
          WebSocket: {connected ? '✓ Connected' : '✗ Disconnected'}
        </div>

        {/* Projects Section */}
        <div className={styles.projectsSection}>
          <h2 className={styles.projectsTitle}>
            Projects
          </h2>
          <ProjectList onProjectSelect={closeSidebar} />
        </div>

        {/* Notifications */}
        <div className={styles.notificationsSection}>
          <NotificationPanel />
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Top Navigation */}
        <nav className={styles.navbar}>
          {/* Mobile Hamburger Menu - Inside navbar for proper layout */}
          <button
            className={styles.hamburger}
            onClick={toggleSidebar}
            aria-label="Toggle menu"
          >
            ☰
          </button>
          <h1 className={styles.navbarTitle}>
            Personal To-Do Manager
          </h1>
        </nav>

        {/* Content Area */}
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
