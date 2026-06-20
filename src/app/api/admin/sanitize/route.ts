import { NextRequest, NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../../../../firebase-applet-config.json'; 

if (getApps().length === 0) {
  initializeApp({
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
  });
}

const db = getFirestore();
const storage = getStorage();
const auth = getAuth();

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json();
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    // Verify admin role (check either the token custom claims or look up in Firestore)
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      // Emergency bypass for specific emails if role mapping isn't perfect yet
      if (decodedToken.email !== 'hi@arrdublu.us' && decodedToken.email !== 'admin@nowforevermoods.com') {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    const adminId = decodedToken.uid;
    const adminEmail = decodedToken.email;

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const auditLogRef = db.collection('audit_logs').doc();
    await auditLogRef.set({
      adminId,
      adminEmail,
      action: 'DIGITAL_SANITIZE_STARTED',
      details: `Admin ${adminEmail} started Digital Sanitize on Project ${bookingId}`,
      timestamp: Timestamp.now(),
    });

    const bucket = storage.bucket();
    const rawFolderPath = `bookings/${bookingId}/raw/`;
    
    const [files] = await bucket.getFiles({ prefix: rawFolderPath });
    const deletePromises = files.map(file => file.delete());
    await Promise.all(deletePromises);

    const bookingRef = db.collection('bookings').doc(bookingId);
    await bookingRef.update({
      status: 'sanitized',
      sanitizedAt: Timestamp.now(),
      sanitizedBy: adminId,
      updatedAt: Timestamp.now(),
    });

    await auditLogRef.update({
      action: 'DIGITAL_SANITIZE_COMPLETED',
      details: `Admin ${adminEmail} performed Digital Sanitize on Project ${bookingId}. ${files.length} raw assets purged.`,
    });

    return NextResponse.json({ 
      success: true, 
      purgedCount: files.length,
      message: `Project ${bookingId} sanitized successfully.` 
    });

  } catch (error: any) {
    console.error('Sanitize API Error:', error?.message || error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
