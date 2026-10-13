/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Impresión de Tickets Térmicos Multiconexión Independiente (ticket-print.js)
 */

import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Cache para mantener viva la conexión Bluetooth en este dispositivo Android
let bluetoothDeviceCache = null;
let bluetoothServerCache = null;

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

        // 2. Determinar el tipo de conexión local de ESTE dispositivo (PC = usb, Android = bluetooth)
        let tipoConexion = localStorage.getItem('youcontrol_tipo_conexion');
        if (!tipoConexion && configTicket.tipo_conexion) {
            tipoConexion = configTicket.tipo_conexion;
        }
        tipoConexion = tipoConexion || "usb";

        // 3. Ejecutar según corresponda
        if (tipoConexion === "bluetooth") {
            await imprimirPorBluetooth(ventaData, configTicket);
        } else {
            imprimirPorUSB(ventaData, configTicket);
        }

    } catch (e) {
        console.error("Error al procesar la impresión del ticket:", e);
    }
}

// --- MÉTODO A: IMPRESIÓN VÍA IFRAME PARA USB / PC ---
function imprimirPorUSB(ventaData, configTicket) {
    const anchoMM = configTicket.ancho_mm || "80"; // "58" o "80"
    const fechaFormateada = ventaData.fecha?.toDate ? ventaData.fecha.toDate().toLocaleString('es-VE') : new Date().toLocaleString('es-VE');
    const tasa = ventaData.tasa_aplicada || 1;

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
            <div class="derecha negrita" style="font-size: 13px; margin-top: 4px;">TOTAL A PAGAR: Bs. ${totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <div class="centro" style="margin: 4px 0;">--------------------------------</div>
            
            <div class="centro" style="margin-top: 6px;">${configTicket.pie_pagina || '¡Gracias por su compra!'}</div>
            <div class="centro" style="margin: 6px 0;">&nbsp;</div>
            <div class="centro negrita" style="font-size: 10px;">SISTEMA YOU CONTROL</div>
            <div style="margin-bottom: 15px;">&nbsp;</div>
        </body>
        </html>
    `);
    docPrint.close();

    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
    }, 400);
}

// --- MÉTODO B: IMPRESIÓN POR WEB BLUETOOTH API PARA ANDROID ---
async function imprimirPorBluetooth(ventaData, configTicket) {
    if (!navigator.bluetooth) {
        alert("Tu navegador no soporta la Web Bluetooth API. Asegúrate de usar Google Chrome en Android.");
        return;
    }

    try {
        if (!bluetoothServerCache || !bluetoothDeviceCache?.gatt?.connected) {
            bluetoothDeviceCache = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: [
                    '000018f0-0000-1000-8000-00805f9b34fb', 
                    'e7810a71-73ae-499d-8c15-faa9aef0c3f2', 
                    '49535343-fe7d-4ae5-8fa9-9fafd205e455'
                ]
            });
            bluetoothServerCache = await bluetoothDeviceCache.gatt.connect();
        }

        const serviceUuids = [
            '000018f0-0000-1000-8000-00805f9b34fb', 
            'e7810a71-73ae-499d-8c15-faa9aef0c3f2', 
            '49535343-fe7d-4ae5-8fa9-9fafd205e455'
        ];
        let targetCharacteristic = null;

        for (const uuid of serviceUuids) {
            try {
                const service = await bluetoothServerCache.getPrimaryService(uuid);
                const characteristics = await service.getCharacteristics();
                targetCharacteristic = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);
                if (targetCharacteristic) break;
            } catch (err) {}
        }

        if (!targetCharacteristic) {
            throw new Error("No se encontró una característica de escritura ESC/POS compatible.");
        }

        const encoder = new TextEncoder();
        let comandos = [];

        comandos.push(27, 64); 
        comandos.push(27, 97, 1); 

        comandos.push(...encoder.encode("SISTEMA YOU CONTROL\n"));
        comandos.push(27, 33, 8); 
        comandos.push(...encoder.encode(`${(configTicket.nombre_negocio || 'YOU CONTROL').toUpperCase()}\n`));
        comandos.push(27, 33, 0); 

        if (configTicket.telefono) comandos.push(...encoder.encode(`Tel: ${configTicket.telefono}\n`));
        if (configTicket.direccion) comandos.push(...encoder.encode(`${configTicket.direccion}\n`));

        comandos.push(...encoder.encode("--------------------------------\n"));
        comandos.push(...encoder.encode(`FACTURA NRO: ${ventaData.nro_factura}\n`));
        comandos.push(...encoder.encode(`CLIENTE: ${ventaData.nombre_cliente || 'Anónimo'}\n`));
        const fechaStr = ventaData.fecha?.toDate ? ventaData.fecha.toDate().toLocaleString('es-VE') : new Date().toLocaleString('es-VE');
        comandos.push(...encoder.encode(`FECHA: ${fechaStr}\n`));
        comandos.push(...encoder.encode("--------------------------------\n"));

        const tasa = ventaData.tasa_aplicada || 1;
        let totalUSD = ventaData.total_usd || 0;

        if (ventaData.items && Array.isArray(ventaData.items)) {
            ventaData.items.forEach(item => {
                const cant = item.cantidad || 1;
                const precioUSD = item.precio || 0;
                const precioBs = precioUSD * tasa;
                const subtotalBs = cant * precioBs;

                comandos.push(27, 33, 8);
                comandos.push(...encoder.encode(`${item.nombre || 'Producto'}\n`));
                comandos.push(27, 33, 0);
                const lineaItem = `${cant} x Bs.${precioBs.toFixed(2)}`.padEnd(18) + `Bs.${subtotalBs.toFixed(2)}\n`;
                comandos.push(...encoder.encode(lineaItem));
            });
        }

        comandos.push(...encoder.encode("--------------------------------\n"));

        const totalBs = totalUSD * tasa;
        comandos.push(27, 33, 16); 
        comandos.push(...encoder.encode(`TOTAL: Bs.${totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2})}\n`));
        comandos.push(27, 33, 0);

        comandos.push(...encoder.encode("--------------------------------\n"));
        comandos.push(27, 97, 1); 
        comandos.push(...encoder.encode(`${configTicket.pie_pagina || '¡Gracias por su compra!'}\n\n`));
        comandos.push(...encoder.encode("SISTEMA YOU CONTROL\n\n\n")); 

        const byteArray = new Uint8Array(comandos);
        const chunkSize = 512;
        for (let i = 0; i < byteArray.length; i += chunkSize) {
            const chunk = byteArray.slice(i, i + chunkSize);
            await targetCharacteristic.writeValue(chunk);
        }

    } catch (err) {
        console.error("Error al imprimir por Bluetooth:", err);
        alert("No se pudo enviar la orden a la impresora Bluetooth: " + err.message);
    }
}
