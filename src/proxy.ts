import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';


const isPublicRoute = createRouteMatcher([
    "/api/inngest(.*)",
]);

export default clerkMiddleware(async (auth, req) => {

    const origin = req.headers.get('origin');

    //Add CORS heading work here.
    // Define allowed origins dynamically
    const allowedOrigins = process.env.NODE_ENV === 'production'
        ? ['https://app.example.com', 'https://admin.example.com']
        : ['http://localhost:3000', 'http://localhost:3001'];

    const isAllowedOrigin = origin && allowedOrigins.includes(origin);

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': isAllowedOrigin ? origin : 'null',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Max-Age': '86400',
            },
        });
    }

    if (!isPublicRoute(req)) {
        await auth.protect();
    }

    // Continue with the req and add CORS headers to the response
    const response = NextResponse.next();



    if (isAllowedOrigin) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return response;


});

