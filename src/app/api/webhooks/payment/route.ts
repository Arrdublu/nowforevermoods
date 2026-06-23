import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../../../../firebase-applet-config.json';

let dbInstance: admin.firestore.Firestore | null = null;
function getAdminDb() {
    if (!dbInstance) {
        if (!admin.apps.length) {
            try {
                admin.initializeApp({
                    projectId: firebaseConfig.projectId
                });
            } catch (e) {
                console.warn("Firebase Admin fallback init:", e);
                admin.initializeApp();
            }
        }
        dbInstance = getFirestore(firebaseConfig.firestoreDatabaseId);
    }
    return dbInstance;
}

let stripeInstance: Stripe | null = null;
function getStripe(): Stripe {
    if (!stripeInstance) {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key || key.includes('secrets/') || key === 'placeholder') {
             throw new Error('Stripe API Key is missing or invalid. Please configure your actual STRIPE_SECRET_KEY in the app settings.');
        }
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
        const { bookingId, orderId, userId } = session.metadata || {};

        if (orderId) {
            try {
                const db = getAdminDb();
                await db.collection('transactions').add({
                    sessionId: session.id,
                    orderId,
                    userId,
                    amount: session.amount_total ? session.amount_total / 100 : 0,
                    currency: session.currency?.toUpperCase(),
                    status: 'completed',
                    createdAt: admin.firestore.Timestamp.now(),
                });

                await db.collection('orders').doc(orderId).update({
                    status: 'paid',
                    stripeSessionId: session.id,
                    updatedAt: admin.firestore.Timestamp.now(),
                });

                const orderSnapshot = await db.collection('orders').doc(orderId).get();
                const orderData = orderSnapshot.data();

                if (orderData?.userEmail) {
                    const productId = orderData?.productId;
                    const productSnapshot = await db.collection('products').doc(productId).get();
                    const productData = productSnapshot.data();

                    if (productData?.isDigital && productData?.downloadUrl) {
                        // Queue email
                        await db.collection('mail').add({
                            to: [orderData.userEmail],
                            message: {
                                subject: `Your NFM Digital Download: ${orderData.productName}`,
                                html: `
                                    <h2>Thank you for your purchase from the NowForeverMoods Boutique!</h2>
                                    <p>You can download <strong>${orderData.productName}</strong> using the secure link below.</p>
                                    <a href="${productData.downloadUrl}" style="display:inline-block;padding:10px 20px;background:#1a1a1a;color:#fff;text-decoration:none;">Download Your Files</a>
                                `
                            }
                        });
                        
                        await db.collection('orders').doc(orderId).update({
                            downloadSent: true
                        });
                    } else if (!productData?.isDigital) {
                        // Decrement stock for physical
                        if (productData?.inStock && productData.inStock > 0) {
                            await db.collection('products').doc(productId).update({
                                inStock: admin.firestore.FieldValue.increment(-1)
                            });
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to sync order payment:", error?.message || String(error));
            }
        } else if (bookingId) {
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
                    to: ['hi@arrdublu.us', 'ioka@arrdublu.us', 'admin@nowforevermoods.com'],
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

                if (bookingData?.userEmail) {
                    if (bookingData?.packageId === 'beauty-architecture') {
                        await db.collection('mail').add({
                            to: [bookingData.userEmail],
                            message: {
                                subject: `Beauty Architecture Initiation: Welcome & Next Steps`,
                                html: `
                                    <h2>Welcome to Beauty Architecture</h2>
                                    <p>Hi ${bookingData?.userName || 'Client'},</p>
                                    <p>Your payment has been successfully processed and your initiation into Beauty Architecture is confirmed.</p>
                                    <h3>Step 1: The Blueprint Questionnaire</h3>
                                    <p>To begin our journey, please complete your detailed creative blueprint. This allows us to understand your aesthetic core before our first session.</p>
                                    <p><a href="https://nowforevermoods.com/blueprint" style="display: inline-block; padding: 10px 20px; background-color: #111; color: #fff; text-decoration: none; border-radius: 4px;">Complete Questionnaire</a></p>
                                    <h3>What happens next?</h3>
                                    <p>Once you submit your blueprint, we will review it and follow up within 48 hours to schedule our first direct consultation. We look forward to building with you.</p>
                                    <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border: 1px solid #eee;">
                                        <h3 style="margin-top: 0;">Receipt of Payment</h3>
                                        <p><strong>Amount Paid:</strong> ${session.currency?.toUpperCase()} ${(session.amount_total ? session.amount_total / 100 : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        <p><strong>Package:</strong> ${bookingData?.packageName}</p>
                                    </div>
                                    <p>— Now Forever Moods</p>
                                `
                            }
                        });
                    } else {
                        await db.collection('mail').add({
                            to: [bookingData.userEmail],
                            message: {
                                subject: `Session Confirmed: ${bookingData?.packageName || 'Photography Session'}`,
                                html: `
                                    <h2>Your Session is Confirmed</h2>
                                    <p>Hi ${bookingData?.userName || 'there'},</p>
                                    <p>Thank you for booking with us! Your payment has been received and your session is confirmed.</p>
                                    <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border: 1px solid #eee;">
                                        <h3 style="margin-top: 0;">Receipt of Payment</h3>
                                        <p><strong>Amount Paid:</strong> ${session.currency?.toUpperCase()} ${(session.amount_total ? session.amount_total / 100 : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        <p><strong>Package:</strong> ${bookingData?.packageName}</p>
                                    </div>
                                    <h3>Next Steps</h3>
                                    <p>We will be in touch shortly to coordinate exact timing, styling, and location details if we haven't already.</p>
                                    <p>We're excited to create something beautiful together!</p>
                                    <p>— Now Forever Moods</p>
                                `
                            }
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to sync payment:", error?.message || String(error));
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
                console.error("Failed to sync payment intent:", error?.message || String(error));
            }
        }
    }
    return NextResponse.json({ verified: true });
}
