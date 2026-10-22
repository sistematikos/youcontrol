/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Lector de Balanza Inteligente (pos-balanza.js)
 */

export function procesarCodigoBalanza(codigoBruto) {
    const texto = codigoBruto.trim();
    
    console.log("🔍 Código leído por la pistola:", texto, "Longitud:", texto.length);
    
    // Validamos que sea un código de balanza de 13 dígitos
    if (texto.length === 13) {
        // Estructura: 3 dígitos prefijo (0-2) | 4 dígitos producto (3-6) | 5 dígitos peso (7-11) | 1 dígito control (12)
        const codigoProducto = texto.substring(3, 7); // Extrae exactamente "2002"
        const valorPesoGramos = parseInt(texto.substring(7, 12), 10); // Extrae "10795"
        const pesoKg = valorPesoGramos / 1000; // Convierte a 10.795 kg

        console.log("✅ Producto extraído:", codigoProducto, "| Peso calculado:", pesoKg, "kg");

        return {
            esBalanza: true,
            codigoProd: codigoProducto,
            cantidad: pesoKg
        };
    }

    console.log("❌ No tiene 13 dígitos, se procesará como código normal.");
    return { esBalanza: false };
}

export function manejarEscaneoBalanza(texto, productosMaster, agregarCarritoConCantidad) {
    const datosBalanza = procesarCodigoBalanza(texto);
    if (!datosBalanza.esBalanza) return false; 

    // Busca el producto usando los 4 dígitos extraídos en ID, barras o SKU
    const productoBalanza = productosMaster.find(p => 
        (p.id && p.id.toLowerCase() === datosBalanza.codigoProd.toLowerCase()) || 
        (p.barras && p.barras.toLowerCase() === datosBalanza.codigoProd.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase() === datosBalanza.codigoProd.toLowerCase())
    );

    if (productoBalanza) {
        agregarCarritoConCantidad(productoBalanza.id, datosBalanza.cantidad);
    } else {
        alert(`⚠️ El código de balanza [${datosBalanza.codigoProd}] extraído del sticker no está registrado en ningún producto.`);
    }

    return true; 
}
