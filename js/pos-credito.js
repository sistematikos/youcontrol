/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Extensión para Ventas a Crédito (pos-credito.js)
 */

import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Registra una cuenta por cobrar si el monto de crédito es mayor a 0.
 * @param {string} userId - ID del usuario/empresa actual.
 * @param {string} nroFactura - Número de la factura generada.
 * @param {object} clienteData - Datos del cliente (ID y Nombre).
 * @param {number} totalVentaUSD - Monto total de la venta.
 */
export async function procesarCreditoSiExiste(userId, nroFactura, clienteData, totalVentaUSD) {
    const inputCredito = document.getElementById('in-credito-usd');
    const montoCreditoUSD = parseFloat(inputCredito?.value) || 0;

    if (montoCreditoUSD <= 0) return; // Si no hay crédito, no hace nada.

    // Validación estricta: No se puede dar crédito a un cliente anónimo
    if (!clienteData.id || clienteData.id === "anonimo") {
        throw new Error("No se puede registrar una venta a crédito a un cliente Anónimo. Debe asignar un cliente válido.");
    }

    const cuentaPorCobrarData = {
        cliente_id: clienteData.id,
        nombre_cliente: clienteData.nombre,
        nro_factura: nroFactura,
        monto_total_usd: totalVentaUSD,
        monto_credito_usd: montoCreditoUSD,
        monto_abonado_usd: 0,
        saldo_pendiente_usd: montoCreditoUSD,
        estado: "pendiente", // pendiente, pagada
        fecha: serverTimestamp()
    };

    // Guardar en la colección de Cuentas por Cobrar de la empresa
    await addDoc(collection(db, "usuarios", userId, "cuentas_por_cobrar"), cuentaPorCobrarData);
}
