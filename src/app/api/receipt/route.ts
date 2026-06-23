import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');

  if (!type || !id) {
    return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });
  }

  const collectionName = type === 'order' ? 'orders' : 'bookings';
  
  try {
    const docRef = adminDb.collection(collectionName).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const item = docSnap.data();

    // Verify it's paid
    const isPaid = item?.status === 'paid' || item?.status === 'confirmed' || item?.status === 'completed' || item?.paymentStatus === 'paid';
    
    if (!isPaid) {
       return NextResponse.json({ error: 'Receipt only available for paid items' }, { status: 400 });
    }

    const doc = new jsPDF();
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("RECEIPT", 20, 30);
    
    // Company details
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Now Forever Moods (NFM)", 20, 45);
    doc.text(`Receipt ID: ${id}`, 20, 50);
    
    let dateStr = item?.createdAt;
    if (item?.createdAt && item?.createdAt?.toDate) {
      dateStr = item.createdAt.toDate();
    }
    
    doc.text(`Date: ${dateStr ? format(new Date(dateStr), 'PPP') : 'N/A'}`, 20, 55);
    
    // Line separator
    doc.setLineWidth(0.5);
    doc.line(20, 65, 190, 65);
    
    // Order details
    doc.setFont("helvetica", "bold");
    doc.text("Description", 20, 75);
    doc.text("Amount", 170, 75, { align: 'right' });
    
    doc.setFont("helvetica", "normal");
    const itemName = item?.productName || item?.packageName || 'Custom Purchase';
    
    // Handle long text wrapping
    const splitTitle = doc.splitTextToSize(itemName, 100);
    doc.text(splitTitle, 20, 85);
    
    let amount = Number(item?.amountTotal);
    if (isNaN(amount)) amount = Number(item?.amount);
    if (isNaN(amount)) amount = Number(item?.price);
    if (isNaN(amount)) amount = 0;

    const currency = (item?.currency || 'usd').toUpperCase();
    
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
    
    doc.text(formattedAmount, 170, 85, { align: 'right' });
    
    // Line separator
    const lineY = 85 + (splitTitle.length * 5) + 5;
    doc.line(20, lineY, 190, lineY);
    
    // Total
    doc.setFont("helvetica", "bold");
    doc.text("Total Paid:", 130, lineY + 10, { align: 'right' });
    doc.text(formattedAmount, 170, lineY + 10, { align: 'right' });
    
    // Footer
    doc.setFont("helvetica", "italic");
    doc.text("Thank you for your business.", 105, lineY + 30, { align: 'center' });
    
    const arrayBuffer = doc.output('arraybuffer');
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="nfm-receipt-${id}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('Error generating PDF:', error?.message || String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
