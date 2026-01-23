import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAllMessages } from '@/lib/messages';

export async function GET() {
    try {
        // Verify authentication
        await requireAuth();

        const messages = getAllMessages();

        return NextResponse.json(
            { success: true, messages },
            { status: 200 }
        );

    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        console.error('Get messages error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
