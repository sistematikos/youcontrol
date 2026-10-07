// BUSCADOR INTELIGENTE EN COMPRAS (Alineado con el POS de Ventas)
buscador.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase().trim();
    if (!val) { 
        dropdown.style.display = 'none'; 
        aviso.style.display = 'none'; 
        return; 
    }
    
    // Evalúa tanto id (SKU en Firestore) como sku, barras y nombre
    const filtrados = productosLocales.filter(p => 
        (p.id || '').toLowerCase().includes(val) ||
        (p.sku || '').toLowerCase().includes(val) || 
        (p.barras || '').toLowerCase().includes(val) || 
        (p.nombre || '').toLowerCase().includes(val)
    );
    
    if (filtrados.length > 0) {
        aviso.style.display = 'none';
        dropdown.innerHTML = filtrados.map(p => {
            const skuCodigo = p.sku || p.id;
            return `
                <div class="search-item" style="padding:10px; cursor:pointer; border-bottom:1px solid #eee; background:white;" 
                     onclick="window.seleccionar('${skuCodigo}')">
                    <strong>${p.nombre || 'SIN NOMBRE'}</strong><br>
                    <small>SKU / CÓD: ${skuCodigo} | Depto: ${p.departamento || 'GENERAL'}</small>
                </div>
            `;
        }).join('');
        dropdown.style.display = 'block';
    } else {
        dropdown.style.display = 'none';
        aviso.style.display = 'block'; 
    }
});

// Selección con Enter (Alineado con Ventas)
buscador.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const criterio = buscador.value.toLowerCase().trim();
        if (!criterio) return;

        const prod = productosLocales.find(p => 
            (p.id || '').toLowerCase() === criterio ||
            (p.sku || '').toLowerCase() === criterio || 
            (p.barras || '').toLowerCase() === criterio
        );
        
        if (prod) {
            aviso.style.display = 'none';
            window.seleccionar(prod.sku || prod.id);
            inputCantidad.focus(); 
        } else {
            // Si no existe, preparamos para nuevo registro
            aviso.style.display = 'block';
            inputSku.value = buscador.value.trim().toUpperCase();
            buscador.value = '';
            inputNombre.focus();
        }
    }
});
