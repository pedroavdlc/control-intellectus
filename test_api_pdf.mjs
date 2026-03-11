
import fs from 'fs';
import path from 'path';

async function testApi() {
    const filePath = 'C:/Users/SO/Videos/intellectus/526633610898_27022026_022051.pdf';
    const stats = fs.statSync(filePath);
    const buffer = fs.readFileSync(filePath);

    // Create a Blob-like object for FormData
    const formData = new FormData();
    const blob = new Blob([buffer], { type: 'application/pdf' });
    formData.append('file', blob, path.basename(filePath));

    try {
        console.log("Sending PDF to API...");
        const res = await fetch('http://localhost:3000/api/process/pdf', {
            method: 'POST',
            body: formData
        });

        console.log("Status:", res.status);
        const json = await res.json();
        console.log("Response:", JSON.stringify(json, null, 2));
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

testApi();
