import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

let dbInstance: admin.firestore.Firestore | null = null;
function getAdminDb() {
    if (!dbInstance) {
        if (!admin.apps.length) {
            try {
                admin.initializeApp({
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
                });
            } catch (e) {
                console.warn("Firebase Admin fallback init:", e);
                admin.initializeApp();
            }
        }
        dbInstance = getFirestore(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID);
    }
    return dbInstance;
}

let stripeInstance: Stripe | null = null;
function getStripe(): Stripe {
    if (!stripeInstance) {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) throw new Error('STRIPE_SECRET_KEY is required');
        stripeInstance = new Stripe(key);
    }
    return stripeInstance;
}

export async function POST(req: Request) {
    const sig = req.headers.get("stripe-signature");
    if (!process.env.STRIPE_WEBHOOK_SECRET || !sig) {
        return NextResponse.json({ error: "Service not configured" }, { status: 400 });
    }

    const body = await req.text();
    let event;
    try {
        event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
        return NextResponse.json({ error: `Verification Error: ${err.message}` }, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const { bookingId, userId } = session.metadata || {};

        if (bookingId) {
            try {
                const db = getAdminDb();
                await db.collection('transactions').add({
                    sessionId: session.id,
                    bookingId,
                    userId,
                    amount: session.amount_total ? session.amount_total / 100 : 0,
                    currency: session.currency?.toUpperCase(),
                    status: 'completed',
                    createdAt: admin.firestore.Timestamp.now(),
                });

                await db.collection('bookings').doc(bookingId).update({
                    paymentStatus: 'paid',
                    status: 'confirmed',
                    updatedAt: admin.firestore.Timestamp.now(),
                });

                // Trigger admin notification for successful payment
                const bookingSnapshot = await db.collection('bookings').doc(bookingId).get();
                const bookingData = bookingSnapshot.data();
                
                await db.collection('mail').add({
                    to: ['hi@arrdublu.us', 'ioka@arrdublu.us'],
                    message: {
                        subject: `Payment Secured: ${bookingData?.packageName || 'Session'}`,
                        html: `
                            <h2>New Payment Confirmed</h2>
                            <p><strong>Client:</strong> ${bookingData?.userName || 'Client'} (${bookingData?.userEmail})</p>
                            <p><strong>Package:</strong> ${bookingData?.packageName}</p>
                            <p><strong>Amount Paid:</strong> ${session.currency?.toUpperCase()} ${session.amount_total ? session.amount_total / 100 : 0}</p>
                            <p>The booking has been updated to <strong>confirmed</strong> status.</p>
                        `
                    }
                });
            } catch (error) {
                console.error("Failed to sync payment:", error);
            }
        }
    } else if (event.type === "payment_intent.succeeded") {
        const intent = event.data.object as Stripe.PaymentIntent;
        const { bookingId, userId } = intent.metadata || {};

        if (bookingId) {
            try {
                const db = getAdminDb();
                await db.collection('transactions').add({
                    paymentIntentId: intent.id,
                    bookingId,
                    userId,
                    amount: intent.amount / 100,
                    currency: intent.currency.toUpperCase(),
                    status: 'completed',
                    createdAt: admin.firestore.Timestamp.now(),
                });

                await db.collection('bookings').doc(bookingId).update({
                    paymentStatus: 'paid',
                    status: 'confirmed',
                    updatedAt: admin.firestore.Timestamp.now(),
                });
            } catch (error) {
                console.error("Failed to sync payment intent:", error);
            }
        }
    }
    return NextResponse.json({ verified: true });
}
