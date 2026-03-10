async function testFullLookup() {
    const phone = '6633610898'; // Bait number from earlier subagent test
    const url = 'https://sns.ift.org.mx:8081/sns-frontend/consulta-numeracion/numeracion-geografica.xhtml';

    try {
        console.log("1. Fetching initial page...");
        const initialRes = await fetch(url);
        const cookies = initialRes.headers.get('set-cookie');
        const html = await initialRes.text();

        const viewStateMatch = html.match(/javax\.faces\.ViewState"\s+value="([^"]+)"/);
        if (!viewStateMatch) {
            console.log("ViewState not found!");
            return;
        }
        const viewState = viewStateMatch[1];
        console.log("ViewState found:", viewState);

        console.log("2. Performing POST search...");
        const bodyParams = new URLSearchParams();
        bodyParams.append('javax.faces.partial.ajax', 'true');
        bodyParams.append('javax.faces.source', 'FORM_myform:BTN_publicSearch');
        bodyParams.append('javax.faces.partial.execute', '@all');
        bodyParams.append('javax.faces.partial.render', 'FORM_myform:P_containernumeracion');
        bodyParams.append('FORM_myform:BTN_publicSearch', 'FORM_myform:BTN_publicSearch');
        bodyParams.append('FORM_myform', 'FORM_myform');
        bodyParams.append('FORM_myform:TXT_NationalNumber', phone);
        bodyParams.append('javax.faces.ViewState', viewState);

        const lookupRes = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Faces-Request': 'partial/ajax',
                'X-Requested-With': 'XMLHttpRequest',
                'Cookie': cookies || '',
                'Referer': url
            },
            body: bodyParams.toString()
        });

        const result = await lookupRes.text();
        console.log("Result length:", result.length);
        if (result.includes('Proveedor que atiende el número.')) {
            console.log("SUCCESS: Carrier found in response!");
            const carrierMatch = result.split('Proveedor que atiende el número.')[1].match(/ui-grid-col-6">([^<]+)<\/div>/);
            console.log("CARRIER:", carrierMatch ? carrierMatch[1].trim() : "Regex failed");
        } else {
            console.log("FAILURE: Carrier not found in response.");
            if (result.includes('No se encontraron registros')) {
                console.log("Reason: IFT returned no records.");
            } else {
                console.log("Full response snippet:", result.substring(0, 500));
            }
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
testFullLookup();
