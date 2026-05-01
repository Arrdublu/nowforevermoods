export default function CheckPage() {
    return (
        <div style={{ padding: '50px', background: 'white', color: 'black' }}>
            <h1>Basic Route Test</h1>
            <p>If you see this, Next.js routing is working on this domain.</p>
            <p>Timestamp: {new Date().toISOString()}</p>
        </div>
    );
}
