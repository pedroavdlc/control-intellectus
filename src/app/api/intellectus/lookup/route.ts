import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    if (!phone || phone.length < 10) {
        return NextResponse.json({ error: 'Número inválido' }, { status: 400 });
    }

    // Strip 52 if present to get 10 digits
    const cleanPhone = phone.length > 10 && phone.startsWith('52') ? phone.substring(2) : phone;
    const tenDigitPhone = cleanPhone.substring(0, 10);

    try {
        const url = 'https://sns.ift.org.mx:8081/sns-frontend/consulta-numeracion/numeracion-geografica.xhtml';

        // Use a persistent User-Agent to avoid some basic bot detection
        const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

        // 1. Initial GET to obtain session cookies and ViewState
        const initialRes = await fetch(url, {
            headers: { 'User-Agent': userAgent }
        });

        // Important: Collect all cookies, especially Incapsula/JSESSIONID
        const setCookieHeaders = initialRes.headers.getSetCookie();
        const cookieString = setCookieHeaders.join('; ');

        const html = await initialRes.text();

        // Find ViewState - it might be j_id1:javax.faces.ViewState:0 or similar
        const viewStateMatch = html.match(/javax\.faces\.ViewState"\s+value="([^"]+)"/);
        if (!viewStateMatch) {
            console.error("ViewState not found in HTML");
            return NextResponse.json({ success: false, company: 'No encontrada', details: 'Token de sesión no encontrado' });
        }
        const viewState = viewStateMatch[1];

        // 2. Perform the AJAX POST search
        // We simulate the exact payload PrimeFaces sends
        const bodyParams = new URLSearchParams();
        bodyParams.append('javax.faces.partial.ajax', 'true');
        bodyParams.append('javax.faces.source', 'FORM_myform:BTN_publicSearch');
        bodyParams.append('javax.faces.partial.execute', '@all');
        bodyParams.append('javax.faces.partial.render', 'FORM_myform:P_containernumeracion');
        bodyParams.append('FORM_myform:BTN_publicSearch', 'FORM_myform:BTN_publicSearch');
        bodyParams.append('FORM_myform', 'FORM_myform');
        bodyParams.append('FORM_myform:TXT_NationalNumber', tenDigitPhone);
        bodyParams.append('javax.faces.ViewState', viewState);

        const lookupRes = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Faces-Request': 'partial/ajax',
                'X-Requested-With': 'XMLHttpRequest',
                'Cookie': cookieString,
                'Referer': url,
                'User-Agent': userAgent,
                'Origin': 'https://sns.ift.org.mx:8081'
            },
            body: bodyParams.toString()
        });

        const xmlResponse = await lookupRes.text();

        // 3. Parse XML response for carrier
        const carrierLabel = 'Proveedor que atiende el número.';
        if (!xmlResponse.includes(carrierLabel)) {
            // Check for common error messages in the XML
            if (xmlResponse.includes('No se encontraron registros')) {
                return NextResponse.json({ success: true, company: 'Sin Registro (Pertenencia Desconocida)' });
            }
            return NextResponse.json({ success: false, company: 'No encontrada', details: 'Respuesta del IFT no contiene datos' });
        }

        const parts = xmlResponse.split(carrierLabel);
        const afterLabel = parts[1];
        // The value is in the next grid cell
        const carrierMatch = afterLabel.match(/ui-grid-col-6">([^<]+)<\/div>/);
        const carrier = carrierMatch ? carrierMatch[1].trim() : 'Desconocida';

        return NextResponse.json({ success: true, company: carrier });

    } catch (e: any) {
        console.error("Lookup Error:", e.message);
        return NextResponse.json({ success: false, error: 'Error al consultar IFT', details: e.message }, { status: 500 });
    }
}
