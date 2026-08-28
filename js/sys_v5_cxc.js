/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Extensión para Ventas a Crédito (pos-credito.js)
 */

import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function procesarCreditoSiExiste(userId, nroFactura, clienteData, totalVentaUSD) {
    const inputCredito = document.getElementById('in-credito-usd');
    const montoCreditoUSD = parseFloat(inputCredito?.value) || 0;

    if (montoCreditoUSD <= 0) return;

    if (!clienteData.id || clienteData.id === "anonimo") {
        throw new Error("No se puede registrar una venta a crédito a un cliente Anónimo. Debe asignar un cliente válido.");
    }

    const cuentaPorCobrarData = {
        cliente_id: clienteData.id,
        nombre_cliente: clienteData.nombre,
        nro_factura: nroFactura,
        // Incluimos todos los nombres posibles para garantizar compatibilidad con tu sys_v5_cxc.js
        monto: montoCreditoUSD,
        monto_total: montoCreditoUSD,
        monto_total_usd: montoCreditoUSD,
        monto_credito_usd: montoCreditoUSD,
        abonado: 0,
        monto_abonado_usd: 0,
        pendiente: montoCreditoUSD,
        saldo_pendiente_usd: montoCreditoUSD,
        estado: "pendiente",
        detalle: `Venta a crédito - Factura #${nroFactura}`,
        fecha: serverTimestamp()
    };

    await addDoc(collection(db, "usuarios", userId, "cuentas_por_cobrar"), cuentaPorCobrarData);
}
