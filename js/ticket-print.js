/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Impresión de Tickets Térmicos (ticket-print.js)
 */

import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Genera e imprime el ticket de venta adaptado a 80mm o 58mm 100% en Bolívares
 * @param {string} userId ID del usuario/empresa
 * @param {Object} ventaData Datos completos de la venta recién registrada
 */
export async function imprimirTicketVenta(userId, ventaData) {
    try {
        // 1. Obtener datos de la empresa y configuración de la tickera desde Firebase
        const userDocRef = doc(db, "usuarios", userId);
        const userSnap = await getDoc(userDocRef);
        
        let configTicket = {
            imprimir_automatico: true,
            ancho_mm: "80",
            pie_pagina: "¡Gracias por su compra!",
            nombre_negocio: "CARNES TORACA C.A.",
            telefono: "",
            direccion: ""
        };

        if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.config_ticket) {
                configTicket = { ...configTicket, ...data.config_ticket };
            }
            // Respaldo por si los datos están en la raíz del documento del usuario
            if (!configTicket.nombre_negocio && (data.nombre || data.nombre_empresa)) {
                configTicket.nombre_negocio = data.nombre_empresa || data.nombre;
            }
            if (!configTicket.telefono && data.telefono) {
                configTicket.telefono = data.telefono;
            }
            if (!configTicket.direccion && data.direccion) {
                configTicket.direccion = data.direccion;
            }
        }

        if (configTicket.imprimir_automatico === false) return;

        const anchoMM = configTicket.ancho_mm || "80"; // "58" o "80"
        const anchoClase = anchoMM === "58" ? "ticket-58mm" : "ticket-80mm";
        const fechaFormateada = ventaData.fecha?.toDate ? ventaData.fecha.toDate().toLocaleString('es-VE') : new Date().toLocaleString('es-VE');
        const tasa = ventaData.tasa_aplicada || 1;

        // Construir líneas de productos 100% en Bs.
        let htmlItems = '';
        let totalUSD = ventaData.total_usd || 0;

        if (ventaData.items && Array.isArray(ventaData.items)) {
            ventaData.items.forEach(item => {
                const cant = item.cantidad || 1;
                const precioUSD = item.precio || 0;
                const precioBs = precioUSD * tasa;
                const subtotalBs = cant * precioBs;

                htmlItems += `
                    <tr>
                        <td colspan="2" style="font-weight: bold; padding-top: 3px;">${item.nombre || 'Producto'}</td>
                    </tr>
                    <tr>
                        <td style="text-align:left; font-size: ${anchoMM === '58' ? '9px' : '11px'};">${cant} x Bs. ${precioBs.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td style="text-align:right; font-size: ${anchoMM === '58' ? '9px' : '11px'};">Bs. ${subtotalBs.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    </tr>
                `;
            });
        }

        const totalBs = totalUSD * tasa;

        // Crear iframe oculto para impresión aislada sin bloquear la cola de Windows
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
                    @page {
                        size: ${anchoMM === '58' ? '58mm auto' : '80mm auto'};
                        margin: 0;
                    }
                    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; }
                    body { background: #fff; color: #000; font-size: ${anchoMM === '58' ? '10px' : '12px'}; line-height: 1.2; width: ${anchoMM === '58' ? '58mm' : '80mm'}; margin: 0; padding: 4px; }
                    .centro { text-align: center; }
                    .derecha { text-align: right; }
                    .negrita { font-weight: bold; }
                    .linea { border-bottom: 1px dashed #000; margin: 4px 0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
                    th, td { font-size: ${anchoMM === '58' ? '9px' : '11px'}; padding: 1px 0; }
                </style>
            </head>
            <body>
                <!-- ENCABEZADO -->
                <div class="centro negrita" style="font-size: 11px;">SISTEMA YOU CONTROL</div>
                <div class="centro negrita" style="font-size: 13px; margin-top: 3px;">${(configTicket.nombre_negocio || 'YOU CONTROL').toUpperCase()}</div>
                ${configTicket.telefono ? `<div class="centro">Tel: ${configTicket.telefono}</div>` : ''}
                ${configTicket.direccion ? `<div class="centro" style="font-size: 9px; margin-top: 2px;">${configTicket.direccion}</div>` : ''}
                
                <div class="linea"></div>
                <div class="centro negrita">FACTURA NRO: ${ventaData.nro_factura}</div>
                <div class="centro">CLIENTE: ${ventaData.nombre_cliente || 'Anónimo'}</div>
                <div class="centro" style="font-size: 9px;">FECHA: ${fechaFormateada}</div>
                
                <div class="centro" style="margin: 4px 0;">&nbsp;</div>
                <div class="centro">--------------------------------</div>
                
                <!-- DETALLE DE PRODUCTOS 100% EN BS -->
                <table>
                    <thead>
                        <tr>
                            <th style="text-align:left;">CANT x PRECIO (Bs.)</th>
                            <th style="text-align:right;">TOTAL (Bs.)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${htmlItems}
                    </tbody>
                </table>
                
                <div class="centro" style="margin: 4px 0;">--------------------------------</div>
                
                <!-- TOTAL A PAGAR EN BS -->
                <div class="derecha negrita" style="font-size: 13px; margin-top: 4px;">TOTAL A PAGAR: Bs. ${totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                
                <div class="centro" style="margin: 4px 0;">--------------------------------</div>
                
                <!-- PIE DE PÁGINA Y MARCA AL FINAL -->
                <div class="centro" style="margin-top: 6px;">${configTicket.pie_pagina || '¡Gracias por su compra!'}</div>
                <div class="centro" style="margin: 6px 0;">&nbsp;</div>
                <div class="centro negrita" style="font-size: 10px;">SISTEMA YOU CONTROL</div>
                
                <!-- MARGEN EXTRA AL FINAL -->
                <div style="margin-bottom: 15px;">&nbsp;</div>
            </body>
            </html>
        `);
        docPrint.close();

        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        }, 400);

    } catch (e) {
        console.error("Error al generar o imprimir el ticket:", e);
    }
}
