/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Lector de Balanza Inteligente (pos-balanza.js)
 */

export function procesarCodigoBalanza(codigoBruto) {
    const texto = codigoBruto.trim();
    
    // Depuración en consola para verificar qué lee la pistola
    console.log("🔍 Código leído por la pistola:", texto, "Longitud:", texto.length);
    
    // Validamos que sea un código de balanza de 13 dígitos
    if (texto.length === 13) {
        // Extraemos los 5 dígitos del producto ubicados del índice 3 al 7 (posiciones 4 a 8 visuales)
        const codigoProducto = texto.substring(3, 8); // Esto extraerá "02002" de tu ejemplo
        
        // Extraemos los dígitos del peso (desde el índice 8 hasta el 12)
        const valorPesoGramos = parseInt(texto.substring(8, 13), 10); 
        const pesoKg = valorPesoGramos / 1000; // Convierte a kilogramos (ej: 0.795 kg)

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

    // Busca el producto usando los 5 dígitos extraídos en ID, barras o SKU
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
