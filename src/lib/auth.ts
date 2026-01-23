import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'tech-solution-secret-key-2024';
const ADMIN_EMAIL = 'walkhatib39@gmail.com';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('Aa09600710@', 10);

export interface JWTPayload {
    email: string;
    role: string;
}

export async function verifyCredentials(email: string, password: string): Promise<boolean> {
    if (email !== ADMIN_EMAIL) {
        return false;
    }
    return bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);
}

export function generateToken(email: string): string {
    const payload: JWTPayload = {
        email,
        role: 'admin'
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
        return decoded;
    } catch (error) {
        return null;
    }
}

export async function getAuthToken(): Promise<string | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token');
    return token?.value || null;
}

export async function isAuthenticated(): Promise<boolean> {
    const token = await getAuthToken();
    if (!token) return false;

    const payload = await verifyToken(token);
    return payload !== null;
}

export async function requireAuth(): Promise<JWTPayload> {
    const token = await getAuthToken();
    if (!token) {
        throw new Error('Unauthorized');
    }

    const payload = await verifyToken(token);
    if (!payload) {
        throw new Error('Invalid token');
    }

    return payload;
}
