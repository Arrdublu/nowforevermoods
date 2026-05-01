import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../../../../firebase-applet-config.json';

// Initialize Client SDK on Server
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
    if (!stripeInstance) {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) {
             throw new Error('STRIPE_SECRET_KEY is required');
        }
        stripeInstance = new Stripe(key);
    }
    return stripeInstance;
}

export async function POST(req: Request) {
    const { bookingId, userId } = await req.json();
    const url = new URL(req.url);
    const baseUrl = process.env.APP_URL || `${url.protocol}//${url.host}`;

    try {
        const bookingRef = doc(db, "bookings", bookingId);
        const bookingDoc = await getDoc(bookingRef);
        if (!bookingDoc.exists()) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }
        
        const bookingData = bookingDoc.data();
        if (bookingData?.userId !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const serverAmount = Math.round(bookingData.amountTotal * 100);
        const serverCurrency = bookingData.currency || "usd";
        const packageName = bookingData.packageName || "Session Booking";

        const stripe = getStripe();
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [{
                price_data: {
                    currency: serverCurrency,
                    product_data: { name: packageName },
                    unit_amount: serverAmount,
                },
                quantity: 1,
            }],
            mode: "payment",
            success_url: `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}`,
            metadata: { bookingId, userId },
        });
        return NextResponse.json({ id: session.id, url: session.url });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
