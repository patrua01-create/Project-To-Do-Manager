import jwt from 'jsonwebtoken';
import { Profile } from 'passport';
import prisma from '../config/database.js';
import { User } from '../types/index.js';

export function generateJWT(user: User): string {
  const payload = {
    user_id: user.id,
    email: user.email
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET || 'default_secret', {
    expiresIn: '30d'
  });

  return token;
}

export function createJWTCookie(token: string): { setCookie: string } {
  return {
    setCookie: `auth_token=${token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Strict${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`
  };
}

export function clearAuthCookie(): { setCookie: string } {
  return {
    setCookie: 'auth_token=; HttpOnly; Path=/; Max-Age=0'
  };
}

export async function upsertUserFromOAuthProfile(
  provider: 'google' | 'github',
  profile: Profile
): Promise<User> {
  const email = extractEmail(profile, provider);
  const displayName = profile.displayName || profile.username || 'User';
  const avatarUrl = extractAvatarUrl(profile);

  return prisma.user.upsert({
    where: { provider_user_id: profile.id },
    update: {
      email,
      display_name: displayName,
      avatar_url: avatarUrl
    },
    create: {
      provider,
      provider_user_id: profile.id,
      email,
      display_name: displayName,
      avatar_url: avatarUrl
    }
  });
}

function extractEmail(profile: Profile, provider: string): string {
  if (profile.emails && profile.emails.length > 0) {
    return profile.emails[0].value;
  }
  if (provider === 'github') {
    return `${profile.id}@users.noreply.github.com`;
  }
  return profile.id + '@example.com';
}

function extractAvatarUrl(profile: Profile): string | undefined {
  if (profile.photos && profile.photos.length > 0) {
    return profile.photos[0].value;
  }
  return undefined;
}
