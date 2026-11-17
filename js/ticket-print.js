/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Impresión de Tickets Térmicos (ticket-print.js)
 */

import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let bluetoothDeviceCache = null;
let bluetoothServerCache = null;

// Limpia acentos y espacios duros (\u00A0) que bloquean impresoras térmicas ESC/POS
function limpiarTextoTermico(texto) {
    return String(texto || '')
        .replace(/\u00A0/g, ' ')
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7E\n]/g, "");
}

function formatearMonto(valor) {
    return Number(valor || 0)
        .toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        .replace(/\u00A0/g, ' ');
}

export async function imprimirTicketVenta(userId, ventaData) {
    try {
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

        const tipoConexion = localStorage.getItem('youcontrol_tipo_conexion') || configTicket.tipo_conexion || "usb";

        if (tipoConexion === "bluetooth") {
            await imprimirPorBluetooth(ventaData, configTicket);
        } else {
            imprimirPorUSB(ventaData, configTicket);
        }

    } catch (e) {
        console.error("Error al procesar la impresión del ticket:", e);
    }
}

// --- IMPRESIÓN USB (PC) ---
function imprimirPorUSB(ventaData, configTicket) {
    const anchoMM = configTicket.ancho_mm || "80";
    const fechaFormateada = ventaData.fecha?.toDate ? ventaData.fecha.toDate().toLocaleString('es-VE') : new Date().toLocaleString('es-VE');
    const tasa = Number(ventaData.tasa_aplicada || 1);
    let htmlItems = '';
    let totalUSD = Number(ventaData.total_usd || 0);

    if (ventaData.items && Array.isArray(ventaData.items)) {
        ventaData.items.forEach(item => {
            const cant = Number(item.cantidad || 1);
            const precioUSD = Number(item.precio || 0);
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
                @page { size: ${anchoMM === '58' ? '58mm auto' : '80mm auto'}; margin: 0; }
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
            <div class="centro negrita" style="font-size: 13px; margin-top: 3px;">${(configTicket.nombre_negocio || 'NEGOCIO').toUpperCase()}</div>
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

// --- IMPRESIÓN BLUETOOTH (ANDROID) ---
export async function imprimirPorBluetooth(ventaData = null, configTicket = null) {
    if (!navigator.bluetooth) {
        alert("Tu navegador no soporta Bluetooth Web. Usa Google Chrome actualizado en Android.");
        return;
    }

    try {
        if (!bluetoothServerCache || !bluetoothDeviceCache?.gatt?.connected) {
            bluetoothDeviceCache = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: [
                    '000018f0-0000-1000-8000-00805f9b34fb', 
                    'e7810a71-73ae-499d-8c15-faa9aef0c3f2', 
                    '49535343-fe7d-4ae5-8fa9-9fafd205e455',
                    '0000ff00-0000-1000-8000-00805f9b34fb'
                ]
            });
            bluetoothServerCache = await bluetoothDeviceCache.gatt.connect();
        }

        const serviceUuids = [
            '000018f0-0000-1000-8000-00805f9b34fb', 
            'e7810a71-73ae-499d-8c15-faa9aef0c3f2', 
            '49535343-fe7d-4ae5-8fa9-9fafd205e455',
            '0000ff00-0000-1000-8000-00805f9b34fb'
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
            throw new Error("No se encontró la característica de escritura ESC/POS en esta impresora.");
        }

        // Si se llama desde el botón de prueba en Configuración (sin ventaData), imprime ticket de prueba con productos
        const esPrueba = !ventaData;
        if (esPrueba) {
            ventaData = {
                nro_factura: "PRUEBA-001",
                nombre_cliente: "CLIENTE DE PRUEBA",
                tasa_aplicada: 50.00,
                total_usd: 15.00,
                items: [
                    { nombre: "Producto de Prueba 1", cantidad: 2, precio: 5.00 },
                    { nombre: "Producto de Prueba 2", cantidad: 1, precio: 5.00 }
                ]
            };
            configTicket = configTicket || {
                nombre_negocio: document.getElementById('txt-nombre-negocio')?.value || "YOU CONTROL",
                telefono: document.getElementById('txt-telefono-negocio')?.value || "",
                direccion: document.getElementById('txt-direccion-negocio')?.value || "",
                ancho_mm: document.getElementById('sel-ancho-papel')?.value || "58",
                pie_pagina: document.getElementById('txt-pie-pagina')?.value || "¡Prueba exitosa!"
            };
        }

        const anchoCols = (configTicket?.ancho_mm === "80") ? 48 : 32;
        const separador = "-".repeat(anchoCols) + "\n";
        const encoder = new TextEncoder();
        let comandos = [];

        const agregarTexto = (str) => {
            comandos.push(...encoder.encode(limpiarTextoTermico(str)));
        };

        // Inicializar impresora y centrar
        comandos.push(27, 64); 
        comandos.push(27, 97, 1); 

        // Encabezado
        comandos.push(27, 69, 1); // Negrita ON
        agregarTexto(`${(configTicket?.nombre_negocio || 'NEGOCIO').toUpperCase()}\n`);
        comandos.push(27, 69, 0); // Negrita OFF

        if (configTicket?.telefono) agregarTexto(`Tel: ${configTicket.telefono}\n`);
        if (configTicket?.direccion) agregarTexto(`${configTicket.direccion}\n`);

        agregarTexto(separador);
        agregarTexto(`FACTURA NRO: ${ventaData.nro_factura || 'S/N'}\n`);
        agregarTexto(`CLIENTE: ${ventaData.nombre_cliente || 'Anonimo'}\n`);
        const fechaStr = ventaData.fecha?.toDate ? ventaData.fecha.toDate().toLocaleString('es-VE') : new Date().toLocaleString('es-VE');
        agregarTexto(`FECHA: ${fechaStr}\n`);
        agregarTexto(separador);

        // Alineación izquierda para productos
        comandos.push(27, 97, 0);

        const tasa = Number(ventaData.tasa_aplicada || 1);
        let totalUSD = Number(ventaData.total_usd || 0);
        let sumaCalculadaBs = 0;

        // Soporte tanto para ventaData.items como ventaData.productos o ventaData.carrito
        const listaItems = ventaData.items || ventaData.productos || ventaData.carrito || [];

        if (Array.isArray(listaItems) && listaItems.length > 0) {
            listaItems.forEach(item => {
                const cant = Number(item.cantidad || item.cant || 1);
                const precioUSD = Number(item.precio || item.precio_usd || 0);
                const precioBs = precioUSD * tasa;
                const subtotalBs = cant * precioBs;
                sumaCalculadaBs += subtotalBs;

                comandos.push(27, 69, 1); // Negrita ON
                agregarTexto(`${item.nombre || item.descripcion || 'Producto'}\n`);
                comandos.push(27, 69, 0); // Negrita OFF

                const detallePrecio = `${cant} x Bs.${formatearMonto(precioBs)}`;
                const subtotalStr = `Bs.${formatearMonto(subtotalBs)}`;
                const espacios = Math.max(1, anchoCols - detallePrecio.length - subtotalStr.length);
                agregarTexto(detallePrecio + " ".repeat(espacios) + subtotalStr + "\n");
            });
        } else {
            agregarTexto("Sin detalle de productos\n");
        }

        // Línea divisoria y total centrados
        comandos.push(27, 97, 1);
        agregarTexto(separador);

        const totalBs = totalUSD > 0 ? (totalUSD * tasa) : sumaCalculadaBs;
        comandos.push(27, 69, 1); // Negrita ON
        comandos.push(29, 33, 17); // Doble ancho y doble alto
        agregarTexto(`TOTAL: Bs.${formatearMonto(totalBs)}\n`);
        comandos.push(29, 33, 0); // Tamaño normal
        comandos.push(27, 69, 0); // Negrita OFF

        agregarTexto(separador);
        agregarTexto(`${configTicket?.pie_pagina || 'Gracias por su compra!'}\n\n\n\n`);

        // Envío en bloques pequeños (64 bytes) con pausa para evitar desbordamiento del buffer Bluetooth
        const byteArray = new Uint8Array(comandos);
        const chunkSize = 64; 
        for (let i = 0; i < byteArray.length; i += chunkSize) {
            const chunk = byteArray.slice(i, i + chunkSize);
            if (targetCharacteristic.properties.writeWithoutResponse) {
                await targetCharacteristic.writeValueWithoutResponse(chunk);
            } else {
                await targetCharacteristic.writeValue(chunk);
            }
            await new Promise(resolve => setTimeout(resolve, 35));
        }

        if (esPrueba) {
            alert("¡Impresora Bluetooth vinculada y ticket de prueba impreso!");
        }

    } catch (err) {
        console.error("Error al imprimir por Bluetooth:", err);
        alert("Error Bluetooth: " + err.message);
    }
}
