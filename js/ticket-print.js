/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Impresión de Tickets Térmicos (ticket-print.js)
 */

import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Genera e imprime el ticket de venta adaptado a 80mm o 58mm
 * @param {string} userId ID del usuario/empresa
 * @param {Object} ventaData Datos completos de la venta recién registrada
 */
export async function imprimirTicketVenta(userId, ventaData) {
    try {
        // 1. Obtener datos de la empresa y configuración de la tickera
        const userDocRef = doc(db, "usuarios", userId);
        const userSnap = await getDoc(userDocRef);
        
        let empresaInfo = {
            nombre: "YOU CONTROL",
            rif: "J-00000000-0",
            direccion: "Lara, Venezuela",
            telefono: ""
        };

        let configTicket = {
            imprimir_automatico: true,
            ancho_mm: "80",
            pie_pagina: "¡Gracias por su compra!"
        };

        if (userSnap.exists()) {
            const data = userSnap.data();
            empresaInfo = {
                nombre: data.nombre_empresa || data.nombre || "YOU CONTROL",
                rif: data.rif || data.documento || "",
                direccion: data.direccion || "",
                telefono: data.telefono || ""
            };
            if (data.config_ticket) {
                configTicket = { ...configTicket, ...data.config_ticket };
            }
        }

        // Si el usuario configuró no imprimir automáticamente, puedes decidir omitirlo o permitir reimpresión manual
        // Aquí generamos el HTML oculto para la impresión
        const anchoClase = configTicket.ancho_mm === "58" ? "ticket-58mm" : "ticket-80mm";
        
        const fechaFormateada = ventaData.fecha?.toDate ? ventaData.fecha.toDate().toLocaleString('es-VE') : new Date().toLocaleString('es-VE');

        // Construir líneas de productos
        let htmlItems = '';
        let subtotalCalculadoUSD = 0;

        if (ventaData.items && Array.isArray(ventaData.items)) {
            ventaData.items.forEach(item => {
                const sub = item.cantidad * (item.precio || 0);
                subtotalCalculadoUSD += sub;
                htmlItems += `
                    <div class="item-fila">
                        <div class="item-descripcion">${item.cantidad}x ${item.nombre}</div>
                        <div class="item-precios">
                            <span>$${sub.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="item-detalle-chico">($${(item.precio || 0).toFixed(2)} c/u)</div>
                `;
            });
        }

        // Construir desglose de pagos
        let htmlPagos = '';
        const pagos = ventaData.pagos || {};
        const tasa = ventaData.tasa_aplicada || 1;

        if (pagos.punto_bs > 0) htmlItemsPagos('Punto (Bs)', pagos.punto_bs, 'Bs');
        if (pagos.pago_movil_bs > 0) htmlItemsPagos('Pago Móvil (Bs)', pagos.pago_movil_bs, 'Bs');
        if (pagos.efectivo_bs > 0) htmlItemsPagos('Efectivo (Bs)', pagos.efectivo_bs, 'Bs');
        if (pagos.divisas_usd > 0) htmlItemsPagos('Divisas ($)', pagos.divisas_usd, '$');
        if (pagos.credito_usd > 0) htmlItemsPagos('Crédito ($)', pagos.credito_usd, '$');

        function htmlItemsPagos(label, valor, tipo) {
            htmlPagos += `<div class="pago-fila"><span>${label}:</span> <span>${tipo === 'Bs' ? valor.toLocaleString('es-VE', {minimumFractionDigits: 2}) + ' Bs' : '$' + valor.toFixed(2)}</span></div>`;
        }

        const totalBs = subtotalCalculadoUSD * tasa;

        // Crear contenedor iframe o ventana flotante de impresión
        const iframeId = 'iframe-print-ticket';
        let iframe = document.getElementById(iframeId);
        if (iframe) iframe.remove();

        iframe = document.createElement('iframe');
        iframe.id = iframeId;
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        const docPrint = iframe.contentWindow.document;
        docPrint.open();
        docPrint.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Ticket #${ventaData.nro_factura}</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; }
                    body { background: #fff; color: #000; font-size: ${configTicket.ancho_mm === "58" ? "10px" : "12px"}; line-height: 1.2; }
                    .ticket-80mm { width: 72mm; margin: 0 auto; padding: 5px; }
                    .ticket-58mm { width: 48mm; margin: 0 auto; padding: 2px; }
                    
                    .centro { text-align: center; }
                    .negrita { font-weight: bold; }
                    .linea-punteada { border-top: 1px dashed #000; margin: 6px 0; }
                    
                    .header-empresa h1 { font-size: ${configTicket.ancho_mm === "58" ? "13px" : "15px"}; margin-bottom: 2px; }
                    .header-empresa p { font-size: ${configTicket.ancho_mm === "58" ? "9px" : "11px"}; }

                    .info-venta { margin: 6px 0; font-size: ${configTicket.ancho_mm === "58" ? "9px" : "11px"}; }
                    
                    .item-fila { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 4px; gap: 5px; }
                    .item-descripcion { flex: 1; word-break: break-all; }
                    .item-precios { text-align: right; white-space: nowrap; font-weight: bold; }
                    .item-detalle-chico { font-size: 9px; color: #333; margin-bottom: 2px; }

                    .totales-seccion { margin-top: 6px; }
                    .total-fila { display: flex; justify-content: space-between; font-weight: bold; font-size: ${configTicket.ancho_mm === "58" ? "11px" : "13px"}; margin-top: 3px; }
                    .pago-fila { display: flex; justify-content: space-between; font-size: 10px; color: #222; }

                    .footer-ticket { text-align: center; margin-top: 10px; font-size: 10px; }

                    @media print {
                        body { width: 100%; }
                    }
                </style>
            </head>
            <body>
                <div class="${anchoClase}">
                    <div class="centro header-empresa">
                        <h1>${empresaInfo.nombre}</h1>
                        ${empresaInfo.rif ? `<p>RIF: ${empresaInfo.rif}</p>` : ''}
                        ${empresaInfo.direccion ? `<p>${empresaInfo.direccion}</p>` : ''}
                        ${empresaInfo.telefono ? `<p>Telf: ${empresaInfo.telefono}</p>` : ''}
                    </div>

                    <div class="linea-punteada"></div>

                    <div class="info-venta">
                        <p><strong>Nro Factura:</strong> ${ventaData.nro_factura}</p>
                        <p><strong>Fecha:</strong> ${fechaFormateada}</p>
                        <p><strong>Cliente:</strong> ${ventaData.nombre_cliente || 'Anónimo'}</p>
                        <p><strong>Tasa BCV:</strong> ${tasa.toLocaleString('es-VE', {minimumFractionDigits: 2})} Bs/$</p>
                    </div>

                    <div class="linea-punteada"></div>

                    <div class="items-seccion">
                        ${htmlItems}
                    </div>

                    <div class="linea-punteada"></div>

                    <div class="totales-seccion">
                        <div class="total-fila">
                            <span>TOTAL USD:</span>
                            <span>$ ${subtotalCalculadoUSD.toFixed(2)}</span>
                        </div>
                        <div class="total-fila">
                            <span>TOTAL BS:</span>
                            <span>${totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2})} Bs</span>
                        </div>
                    </div>

                    <div class="linea-punteada"></div>

                    <div class="pagos-seccion">
                        <p class="negrita" style="font-size: 10px; margin-bottom: 2px;">MÉTODOS DE PAGO:</p>
                        ${htmlPagos}
                    </div>

                    <div class="linea-punteada"></div>

                    <div class="footer-ticket">
                        <p>${configTicket.pie_pagina || '¡Gracias por su compra!'}</p>
                        <p style="margin-top: 4px; font-size: 8px;">Powered by YOU CONTROL</p>
                    </div>
                </div>

                <script>
                    window.onload = function() {
                        window.focus();
                        window.print();
                    }
                <\/script>
            </body>
            </html>
        `);
        docPrint.close();

    } catch (e) {
        console.error("Error al generar o imprimir el ticket:", e);
    }
}
