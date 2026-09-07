import passport from 'passport';
import * as authService from '../services/auth.js';

async function setupPassport() {
  const { Strategy: GoogleStrategy } = await import('passport-google-oauth20');
  const { Strategy: GithubStrategy } = await import('passport-github2');

  passport.use('google', new (GoogleStrategy as any)(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/auth/google/callback'
    },
    async (_accessToken: any, _refreshToken: any, profile: any, done: any) => {
      try {
        const user = await authService.upsertUserFromOAuthProfile('google', profile);
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  passport.use('github', new (GithubStrategy as any)(
    {
      clientID: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/auth/github/callback'
    },
    async (_accessToken: any, _refreshToken: any, profile: any, done: any) => {
      try {
        const user = await authService.upsertUserFromOAuthProfile('github', profile);
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));
}

setupPassport().catch((err) => {
  console.error('Failed to setup Passport:', err);
});

export default passport;
