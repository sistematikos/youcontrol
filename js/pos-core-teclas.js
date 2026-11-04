// js/pos-core-teclas.js

export function ejecutarF4() { 
    if (!window.carrito || window.carrito.length === 0) return;
    
    // Obtener el índice seleccionado o usar el último por defecto
    let idx = window.itemCarritoSeleccionadoIndex;
    if (idx < 0 || idx >= window.carrito.length) {
        idx = window.carrito.length - 1;
    }
    
    const item = window.carrito[idx];
    const nuevaCant = prompt(`Cantidad para ${item.nombre}:`, item.cantidad);
    
    if (nuevaCant !== null && !isNaN(nuevaCant) && nuevaCant > 0) {
        item.cantidad = parseFloat(nuevaCant);
        window.actualizarCarritoUI();
    }
}

export function ejecutarF5() { 
    if (!window.carrito || window.carrito.length === 0) return;
    
    // Obtener el índice seleccionado o usar el último por defecto
    let idx = window.itemCarritoSeleccionadoIndex;
    if (idx < 0 || idx >= window.carrito.length) {
        idx = window.carrito.length - 1;
    }
    
    const item = window.carrito[idx];
    const nuevoPrecio = prompt(`Precio para ${item.nombre} ($):`, item.precio);
    
    if (nuevoPrecio !== null && !isNaN(nuevoPrecio)) {
        item.precio = parseFloat(nuevoPrecio);
        window.actualizarCarritoUI();
    }
}

export function ejecutarF6() { 
    if (!window.carrito || window.carrito.length === 0) return;

    // Obtener el índice seleccionado o usar el último por defecto
    let idx = window.itemCarritoSeleccionadoIndex;
    if (idx < 0 || idx >= window.carrito.length) {
        idx = window.carrito.length - 1;
    }

    // Eliminar específicamente el ítem seleccionado en ese índice
    window.carrito.splice(idx, 1);
    
    // Reajustar el índice seleccionado de forma segura
    if (window.itemCarritoSeleccionadoIndex >= window.carrito.length) {
        window.itemCarritoSeleccionadoIndex = window.carrito.length - 1;
    }
    
    window.actualizarCarritoUI();
}

export function abrirModalCobro() {
    if (!window.carrito || window.carrito.length === 0) { 
        alert("El carrito está vacío."); 
        return; 
    }
    
    const modal = document.getElementById('modalPago');
    if (modal) {
        const totalUSD = window.totalVentaUSD || 0;
        const totalBs = totalUSD * (window.tasaActual || 1.0);
        
        const dUSD = document.getElementById('totalModalUSD');
        const dBS = document.getElementById('totalModalBS');
        
        if (dUSD) dUSD.innerText = `$ ${totalUSD.toFixed(2)}`;
        if (dBS) dBS.innerText = `${totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2})} Bs.`;
        
        modal.style.display = 'flex';
        document.getElementById('in-punto-bs')?.focus();
    }
}
