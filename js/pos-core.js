/**
 * YOU CONTROL - POS CORE
 * Sistema: Punto de Ventas
 * Desarrollado por: Sistematikos - Frank Hernandez
 */

import { productosMaster, tasaActual, procesarVentaFirebase } from './pos-db-motor.js';

let carrito = [];
let idSeleccionado = null;
let metodoPagoSeleccionado = "Punto de Venta"; // Valor inicial

// --- 1. SINCRONIZACIÓN CON EL MOTOR ---
document.addEventListener('productosActualizados', () => renderizar(productosMaster));
document.addEventListener('tasaActualizada', () => renderizar(productosMaster));

// --- 2. RENDERIZADO DE PRODUCTOS (Lara/Ventas View) ---
function renderizar(lista) {
    const grid = document.getElementById('grid-productos');
    if (!grid) return;
    grid.innerHTML = "";

    lista.forEach(p => {
        const pBs = (p.precio * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 });
        grid.innerHTML += `
            <div class="product-card" onclick="agregarAlCarrito('${p.id}')">
                <b style="font-size:0.95rem;">${p.nombre}</b>
                <div class="price-stack" style="text-align:right;">
                    <div style="font-weight:700; color:#001A3D;">$${p.precio.toFixed(2)}</div>
                    <div style="font-size:0.75rem; color:#64748B;">${pBs} Bs.</div>
                </div>
                <div style="text-align:right; font-size:0.8rem; color:#94A3B8;">Stock: ${p.stock}</div>
                <i class="fas fa-plus-circle" style="text-align:right; color:#0052D4;"></i>
            </div>`;
    });
}

// --- 3. GESTIÓN DEL CARRITO ---
window.agregarAlCarrito = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p) return;
    
    if (p.stock <= 0) {
        alert("Sin existencia en inventario.");
        return;
    }

    const existe = carrito.find(c => c.id === id);
    if (existe) {
        existe.cantidad++;
    } else {
        carrito.push({
            id: p.id,
            nombre: p.nombre,
            precio: p.precio,
            costoBase: p.costo || 0,
            cantidad: 1
        });
    }
    
    idSeleccionado = id;
    actualizarUI();
    document.getElementById('beepSound').play();
};

function actualizarUI() {
    const list = document.getElementById('lista-carrito');
    if (!list) return;
    list.innerHTML = ""; 
    let subtotalUSD = 0;

    carrito.forEach(c => {
        const totalFila = c.precio * c.cantidad;
        subtotalUSD += totalFila;
        const estaSeleccionado = idSeleccionado === c.id;

        list.innerHTML += `
            <div class="cart-item ${estaSeleccionado ? 'selected' : ''}" onclick="seleccionarItem('${c.id}')">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span><b style="color:#0052D4;">${c.cantidad}x</b> ${c.nombre}</span>
                    <b style="font-size:1.1rem;">$${totalFila.toFixed(2)}</b>
                </div>
            </div>`;
    });

    // Actualizar Totales
    const subtotalBs = subtotalUSD * tasaActual;
    document.getElementById('total-usd').innerText = `$ ${subtotalUSD.toFixed(2)}`;
    document.getElementById('total-bs').innerText = `${subtotalBs.toLocaleString('es-VE')} Bs.`;
    
    // Auto-scroll al último item
    list.scrollTop = list.scrollHeight;
}

window.seleccionarItem = (id) => {
    idSeleccionado = id;
    actualizarUI();
};

// --- 4. ACCIONES OPERATIVAS (F4, F5, F6) ---
window.ejecutarAccion = (tipo) => {
    if (!idSeleccionado) {
        alert("Seleccione un producto del carrito primero.");
        return;
    }
    const item = carrito.find(c => c.id === idSeleccionado);

    if (tipo === 'cantidad') {
        const n = prompt(`Nueva cantidad para ${item.nombre}:`, item.cantidad);
        if (n && !isNaN(n) && n > 0) item.cantidad = parseFloat(n);
    } 
    else if (tipo === 'precio') {
        const p = prompt(`Nuevo precio para ${item.nombre} (Costo: $${item.costoBase}):`, item.precio);
        if (p && !isNaN(p)) {
            if (parseFloat(p) < item.costoBase) {
                alert("Alerta: El precio es menor al costo de adquisición.");
            }
            item.precio = parseFloat(p);
        }
    } 
    else if (tipo === 'eliminar') {
        carrito = carrito.filter(c => c.id !== idSeleccionado);
        idSeleccionado = carrito.length > 0 ? carrito[carrito.length - 1].id : null;
    }
    actualizarUI();
};

// --- 5. GESTIÓN DEL MODAL Y COBRO ---
document.getElementById('btnCobrar').onclick = () => {
    if (carrito.length === 0) return;
    document.getElementById('totalModal').innerText = document.getElementById('total-usd').innerText;
    document.getElementById('modalPago').style.display = "block";
    // Seleccionar por defecto el primer método visualmente
    const btnDefecto = document.getElementById('btn-metodo-pv');
    if(btnDefecto) seleccionarMetodo('Punto de Venta', btnDefecto);
};

window.seleccionarMetodo = (metodo, elemento) => {
    metodoPagoSeleccionado = metodo;
    // Limpiar selección previa
    document.querySelectorAll('.btn-action-metodo').forEach(btn => btn.classList.remove('active'));
    // Activar actual
    elemento.classList.add('active');
};

document.getElementById('btnConfirmarVenta').onclick = async () => {
    const totalUSD = carrito.reduce((s, i) => s + (i.precio * i.cantidad), 0);
    const btn = document.getElementById('btnConfirmarVenta');
    
    btn.disabled = true;
    btn.innerText = "PROCESANDO...";

    const exito = await procesarVentaFirebase(carrito, totalUSD, metodoPagoSeleccionado);

    if (exito) {
        alert("Venta procesada correctamente.");
        carrito = [];
        idSeleccionado = null;
        actualizarUI();
        document.getElementById('modalPago').style.display = "none";
    } else {
        alert("Error de red al registrar la venta.");
    }
    
    btn.disabled = false;
    btn.innerText = "REGISTRAR VENTA";
};

document.getElementById('btnCerrarModal').onclick = () => {
    document.getElementById('modalPago').style.display = "none";
};

// --- 6. BUSCADOR INTELIGENTE ---
document.getElementById('inputBusqueda').onkeyup = (e) => {
    const val = e.target.value.trim();
    if (e.key === "Enter" && val !== "") {
        // Buscar por código exacto
        const p = productosMaster.find(x => x.codigo === val);
        if (p) {
            agregarAlCarrito(p.id);
            e.target.value = "";
        }
    } else {
        // Filtrado visual
        const filtrados = productosMaster.filter(p => 
            p.nombre.toLowerCase().includes(val.toLowerCase()) || 
            p.codigo.includes(val)
        );
        renderizar(filtrados);
    }
};

// --- 7. EVENTOS DE TECLADO (SHORTCUTS) ---
window.addEventListener('keydown', (e) => {
    // F9: Cobrar o Confirmar
    if (e.key === "F9") {
        e.preventDefault();
        const modal = document.getElementById('modalPago');
        if (window.getComputedStyle(modal).display === "block") {
            document.getElementById('btnConfirmarVenta').click();
        } else {
            document.getElementById('btnCobrar').click();
        }
    }
    // F5: Cantidad
    if (e.key === "F5") { e.preventDefault(); ejecutarAccion('cantidad'); }
    // F4: Precio
    if (e.key === "F4") { e.preventDefault(); ejecutarAccion('precio'); }
    // F6: Eliminar
    if (e.key === "F6") { e.preventDefault(); ejecutarAccion('eliminar'); }
});

// Listener para los botones físicos de la interfaz
document.getElementById('btn-f4').onclick = () => ejecutarAccion('precio');
document.getElementById('btn-f5').onclick = () => ejecutarAccion('cantidad');
document.getElementById('btn-f6').onclick = () => ejecutarAccion('eliminar');
