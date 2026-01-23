import { NextRequest, NextResponse } from 'next/server';
import { saveMessage } from '@/lib/messages';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validation
        const { firstName, lastName, email, phone, message } = body;

        if (!firstName || !lastName || !email || !phone || !message) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Save message
        const newMessage = saveMessage({
            firstName,
            lastName,
            email,
            phone,
            message
        });

        return NextResponse.json(
            {
                success: true,
                message: 'Message sent successfully',
                id: newMessage.id
            },
            { status: 201 }
        );

    } catch (error) {
        console.error('Contact form error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
