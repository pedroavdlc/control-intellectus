async function testIFT() {
    try {
        const url = 'https://sns.ift.org.mx:8081/sns-frontend/consulta-numeracion/numeracion-geografica.xhtml';
        const res = await fetch(url);
        const html = await res.text();
        // The ID might vary or be simpler
        const viewStateMatch = html.match(/javax\.faces\.ViewState"\s+value="([^"]+)"/);
        console.log("VIEWSTATE:", viewStateMatch ? viewStateMatch[1] : "NOT FOUND");
        console.log("COOKIES:", res.headers.get('set-cookie'));
    } catch (e) {
        console.error("ERROR:", e.message);
    }
}
testIFT();
