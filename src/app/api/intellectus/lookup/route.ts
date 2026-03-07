import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    if (!phone || phone.length < 10) {
        return NextResponse.json({ error: 'Número inválido' }, { status: 400 });
    }

    const cleanPhone = phone.length > 10 && phone.startsWith('52') ? phone.substring(2) : phone;

    try {
        const url = 'https://sns.ift.org.mx:8081/sns-frontend/consulta-numeracion/numeracion-geografica.xhtml';

        // 1. Initial GET to obtain session cookies and ViewState
        const initialRes = await fetch(url);
        const setCookie = initialRes.headers.get('set-cookie');
        const html = await initialRes.text();

        const viewStateMatch = html.match(/javax\.faces\.ViewState"\s+value="([^"]+)"/);
        if (!viewStateMatch) throw new Error("No se pudo obtener el token de sesión del IFT");

        const viewState = viewStateMatch[1];

        // 2. Perform the AJAX POST search
        const bodyParams = new URLSearchParams();
        bodyParams.append('javax.faces.partial.ajax', 'true');
        bodyParams.append('javax.faces.source', 'FORM_myform:BTN_publicSearch');
        bodyParams.append('javax.faces.partial.execute', '@all');
        bodyParams.append('javax.faces.partial.render', 'FORM_myform:P_containernumeracion');
        bodyParams.append('FORM_myform:BTN_publicSearch', 'FORM_myform:BTN_publicSearch');
        bodyParams.append('FORM_myform', 'FORM_myform');
        bodyParams.append('FORM_myform:TXT_NationalNumber', cleanPhone);
        bodyParams.append('javax.faces.ViewState', viewState);

        const lookupRes = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Faces-Request': 'partial/ajax',
                'X-Requested-With': 'XMLHttpRequest',
                'Cookie': setCookie || '',
                'Referer': url,
                'User-Agent': req.headers.get('user-agent') || 'Mozilla/5.0'
            },
            body: bodyParams.toString()
        });

        const xmlResponse = await lookupRes.text();

        // 3. Parse XML response for carrier
        // The carrier is usually in a grid cell after "Proveedor que atiende el número."
        const carrierLabel = 'Proveedor que atiende el número.';
        if (!xmlResponse.includes(carrierLabel)) {
            return NextResponse.json({ company: 'No encontrada', details: 'El IFT no devolvió resultados' });
        }

        // Extremely basic parsing (XML to Text)
        const parts = xmlResponse.split(carrierLabel);
        const afterLabel = parts[1];
        const carrierMatch = afterLabel.match(/ui-grid-col-6">([^<]+)<\/div>/);
        const carrier = carrierMatch ? carrierMatch[1].trim() : 'Desconocida';

        return NextResponse.json({ success: true, company: carrier });

    } catch (e: any) {
        console.error("Lookup Error:", e.message);
        return NextResponse.json({ error: 'Error al consultar IFT', details: e.message }, { status: 500 });
    }
}
