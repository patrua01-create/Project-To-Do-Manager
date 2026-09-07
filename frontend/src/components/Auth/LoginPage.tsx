import React from 'react';
import { loginWithGoogle, loginWithGitHub } from '../../services/auth.js';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const handleGoogleLogin = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    loginWithGoogle();
  };

  const handleGitHubLogin = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    loginWithGitHub();
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Personal To-Do Manager</h1>
        <p className={styles.subtitle}>Organize your tasks with ease</p>

        <div className={styles.divider} />

        <div className={styles.buttonContainer}>
          <button
            className={`${styles.button} ${styles.googleButton}`}
            onClick={handleGoogleLogin}
            type="button"
          >
            <span className={styles.icon}>🔵</span>
            Continue with Google
          </button>

          <button
            className={`${styles.button} ${styles.githubButton}`}
            onClick={handleGitHubLogin}
            type="button"
          >
            <span className={styles.icon}>⚫</span>
            Continue with GitHub
          </button>
        </div>

        <p className={styles.notice}>You will be redirected to authorize this application</p>
      </div>
    </div>
  );
}
