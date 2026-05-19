/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Facturación y Ventas Completo (pos-core.js)
 * Buscadores Predictivos con Menú Desplegable Flotante para Clientes y Productos
 */

import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12"; 

let productosMaster = [];
let clientesMaster = []; 
let carrito = [];
let itemSeleccionadoIndex = -1;
let tasaActual = 1;

window.clientesMaster = [];

// ==========================================
// 1. INICIALIZACIÓN Y CONFIGURACIÓN
// ==========================================
async function cargarTasa() {
    try {
        const tasaRef = doc(db, "usuarios", USER_ID, "configuracion", "tasa");
        const tasaSnap = await getDoc(tasaRef);
        if (tasaSnap.exists()) {
            tasaActual = parseFloat(tasaSnap.data().valor) || 1;
            const txtTasa = document.getElementById('txt-tasa');
            if (txtTasa) txtTasa.innerText = tasaActual.toFixed(2).replace('.', ',');
            renderizarProductosListaFija(productosMaster);
            window.actualizarCarritoUI();
        }
    } catch (e) { console.error("Error cargando tasa:", e); }
}

function inicializarClientes() {
    const clientesRef = collection(db, "usuarios", USER_ID, "clientes");
    onSnapshot(clientesRef, (snapshot) => {
        clientesMaster = [];
        snapshot.forEach(docSnap => {
            clientesMaster.push({ id: docSnap.id, ...docSnap.data() });
        });
        clientesMaster.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        window.clientesMaster = clientesMaster;
        poblarSelectorClientes();
    });
}

function poblarSelectorClientes() {
    const selectOriginal = document.getElementById('select-cliente');
    if (!selectOriginal) return;
    selectOriginal.innerHTML = `<option value="casual" selected>CONSUMIDOR FINAL (CASUAL)</option>`;
    clientesMaster.forEach(c => {
        selectOriginal.innerHTML += `<option value="${c.id}">${c.nombre} ${c.rif ? `[${c.rif}]` : ''}</option>`;
    });
}

// ==========================================
// 2. MOTOR DE BÚSQUEDA FLOTANTE DE CLIENTES
// ==========================================
function inicializarBuscadorClientes() {
    const inputBuscarCl = document.getElementById('buscar-cliente-pos');
    const listaResultados = document.getElementById('resultados-cliente-pos');
    const btnLimpiarCl = document.getElementById('btn-limpiar-cliente');

    if (!inputBuscarCl || !listaResultados) return;

    inputBuscarCl.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (query === "") {
            listaResultados.style.display = 'none';
            if (btnLimpiarCl) btnLimpiarCl.style.display = 'none';
            sincronizarConSelectOriginal("casual");
            return;
        }

        if (btnLimpiarCl) btnLimpiarCl.style.display = 'flex';

        const filtrados = clientesMaster.filter(c => 
            (c.nombre || '').toLowerCase().includes(query) || 
            (c.rif || '').toLowerCase().includes(query)
        );

        if (filtrados.length === 0) {
            listaResultados.innerHTML = `
                <div style="padding: 12px; color: #94A3B8; font-size: 13px; font-weight: 600; text-align: center;">
                    <i class="fas fa-exclamation-circle"></i> No encontrado en la cartera
                </div>`;
        } else {
            listaResultados.innerHTML = filtrados.map(c => `
                <div class="opcion-item-desplegable" data-id="${c.id}" data-nombre="${c.nombre}" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #F1F5F9; font-size: 13px;">
                    <b style="color: #1E293B; display: block; margin: 0;">${c.nombre}</b>
                    <small style="color: #006aff; font-family: monospace; font-weight: 700;">${c.rif || 'SIN IDENTIFICACIÓN'}</small>
                </div>
            `).join('');

            listaResultados.querySelectorAll('.opcion-item-desplegable').forEach(item => {
                item.addEventListener('click', function() {
                    inputBuscarCl.value = this.getAttribute('data-nombre');
                    inputBuscarCl.style.borderColor = "#006aff";
                    inputBuscarCl.style.backgroundColor = "#eff6ff";
                    listaResultados.style.display = 'none';
                    sincronizarConSelectOriginal(this.getAttribute('data-id'));
                });
            });
        }
        listaResultados.style.display = 'block';
    });

    if (btnLimpiarCl) {
        btnLimpiarCl.addEventListener('click', () => {
            inputBuscarCl.value = "";
            inputBuscarCl.style.borderColor = "#e2e8f0";
            inputBuscarCl.style.backgroundColor = "#FFFFFF";
            listaResultados.style.display = 'none';
            btnLimpiarCl.style.display = 'none';
            sincronizarConSelectOriginal("casual");
        });
    }

    document.addEventListener('click', (e) => {
        if (!inputBuscarCl.contains(e.target) && !listaResultados.contains(e.target)) {
            listaResultados.style.display = 'none';
        }
    });
}

function sincronizarConSelectOriginal(id) {
    const selectOriginal = document.getElementById('select-cliente');
    if (selectOriginal) {
        selectOriginal.value = id;
        selectOriginal.dispatchEvent(new Event('change'));
    }
}

// ==========================================
// 3. NUEVO MOTOR: BUSCADOR DESPLEGABLE DE PRODUCTOS
// ==========================================
function inicializarBuscadorProductos() {
    // Captura la barra superior ("PIST") usando el ID de tu código original
    const inputBuscarProd = document.getElementById('buscar-producto-pos') || document.getElementById('search-input');
    
    // IMPORTANTE: Creamos dinámicamente el contenedor flotante para los productos si no existe en el HTML
    let listaResultadosProd = document.getElementById('resultados-producto-pos');
    if (inputBuscarProd && !listaResultadosProd) {
        listaResultadosProd = document.createElement('div');
        listaResultadosProd.id = 'resultados-producto-pos';
        // Estilos CSS incrustados para que flote perfectamente idéntico al de clientes
        Object.assign(listaResultadosProd.style, {
            position: 'absolute',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            maxHeight: '250px',
            overflowY: 'auto',
            zIndex: '9999',
            width: inputBuscarProd.offsetWidth + 'px',
            display: 'none'
        });
        // Insertar el contenedor justo debajo de la barra de búsqueda
        inputBuscarProd.parentNode.style.position = 'relative';
        inputBuscarProd.parentNode.appendChild(listaResultadosProd);
    }

    if (!inputBuscarProd || !listaResultadosProd) return;

    // Escuchar la escritura del cajero en tiempo real
    inputBuscarProd.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        // Ajustar ancho dinámicamente por si cambia la pantalla
        listaResultadosProd.style.width = inputBuscarProd.offsetWidth + 'px';

        if (query === "") {
            listaResultadosProd.style.display = 'none';
            return;
        }

        // Filtrar sobre el arreglo en memoria local
        const filtrados = productosMaster.filter(p => 
            (p.nombre || '').toLowerCase().includes(query) ||
            (p.codigo || '').toLowerCase().includes(query)
        );

        if (filtrados.length === 0) {
            listaResultadosProd.innerHTML = `
                <div style="padding: 12px; color: #94A3B8; font-size: 13px; font-weight: 600; text-align: center;">
                    <i class="fas fa-box-open"></i> Producto no registrado
                </div>`;
        } else {
            // Estructura limpia e interactiva para el menú desplegable del producto buscado
            listaResultadosProd.innerHTML = filtrados.map(p => {
                const pUSD = parseFloat(p.precio) || 0;
                const pBS = (pUSD * tasaActual).toFixed(2).replace('.', ',');
                return `
                    <div class="opcion-item-desplegable" data-id="${p.id}" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #F1F5F9; display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
                        <span style="color: #1E293B; font-weight: 600;">${p.nombre}</span>
                        <div style="text-align: right;">
                            <b style="color: #006aff; display: block;">$${pUSD.toFixed(2)}</b>
                            <small style="color: #64748B; font-size: 11px;">${pBS} Bs.</small>
                        </div>
                    </div>
                `;
            }).join('');

            // Manejar la selección e inyección directa al carrito
            listaResultadosProd.querySelectorAll('.opcion-item-desplegable').forEach(item => {
                item.addEventListener('click', function() {
                    const prodId = this.getAttribute('data-id');
                    
                    // 1. Agregar inmediatamente al carrito de ventas
                    window.agregarCarrito(prodId);
                    
                    // 2. Limpiar el buscador superior y ocultar el menú desplegable flotante
                    inputBuscarProd.value = "";
                    listaResultadosProd.style.display = 'none';
                    inputBuscarProd.focus();
                });
            });
        }
        listaResultadosProd.style.display = 'block';
    });

    // Cerrar el cuadro flotante si hacen clic en cualquier otra parte del POS
    document.addEventListener('click', (e) => {
        if (!inputBuscarProd.contains(e.target) && !listaResultadosProd.contains(e.target)) {
            listaResultadosProd.style.display = 'none';
        }
    });
}

// ==========================================
// 4. RENDERIZACIÓN DE LA LISTA FIJA Y CARRITO
// ==========================================
function renderizarProductosListaFija(lista) {
    const container = document.getElementById('grid-productos');
    if (!container) return;

    container.innerHTML = lista.map(p => {
        const pUSD = parseFloat(p.precio) || 0;
        const pBS = (pUSD * tasaActual).toFixed(2).replace('.', ',');
        return `
            <div class="single-line-row" onclick="window.agregarCarrito('${p.id}')">
                <span style="flex: 1; margin-right: 15px;"><b>${p.nombre}</b></span>
                <div class="price-group">
                    <b>$${pUSD.toFixed(2)}</b>
                    <small>${pBS} Bs.</small>
                </div>
            </div>
        `;
    }).join('');
}

function inicializarProductos() {
    const productosRef = collection(db, "usuarios", USER_ID, "productos");
    onSnapshot(productosRef, (snapshot) => {
        productosMaster = [];
        snapshot.forEach(doc => productosMaster.push({ id: doc.id, ...doc.data() }));
        // La lista principal de abajo se mantiene intacta y estable
        renderizarProductosListaFija(productosMaster);
    });
}

window.actualizarCarritoUI = () => {
    const list = document.getElementById('lista-carrito');
    let total = 0;
    if (!list) return;

    list.innerHTML = carrito.map((c, index) => {
        const subUSD = c.precio * c.cantidad;
        const subBS = (subUSD * tasaActual).toFixed(2).replace('.', ',');
        total += subUSD;
        const nombreCorto = c.nombre.length > 22 ? c.nombre.substring(0, 22) + "..." : c.nombre;

        return `
            <div class="single-line-row ${index === itemSeleccionadoIndex ? 'item-selected' : ''}" onclick="window.seleccionarItem(${index})" style="padding: 12px 0;">
                <span style="flex: 1; margin-right: 15px;">${c.cantidad}x ${nombreCorto}</span>
                <div class="price-group">
                    <b>$${subUSD.toFixed(2)}</b>
                    <small>${subBS} Bs.</small>
                </div>
            </div>`;
    }).join('');
    
    document.getElementById('total-usd').innerText = `$ ${total.toFixed(2)}`;
    document.getElementById('total-bs').innerText = `${(total * tasaActual).toFixed(2).replace('.', ',')} Bs.`;
    window.totalVentaUSD = total;
};

// ==========================================
// 5. LÓGICA Y TECLAS EXPRESS (F4, F5, F6)
// ==========================================
window.ejecutarF4 = () => {
    if (itemSeleccionadoIndex === -1) return;
    const n = prompt("Nueva Cantidad:", carrito[itemSeleccionadoIndex].cantidad);
    if (n && !isNaN(n)) { carrito[itemSeleccionadoIndex].cantidad = parseInt(n); window.actualizarCarritoUI(); }
};

window.ejecutarF5 = () => {
    if (itemSeleccionadoIndex === -1) return;
    const p = prompt("Nuevo Precio ($):", carrito[itemSeleccionadoIndex].precio);
    if (p && !isNaN(p)) { carrito[itemSeleccionadoIndex].precio = parseFloat(p); window.actualizarCarritoUI(); }
};

window.ejecutarF6 = () => {
    if (itemSeleccionadoIndex === -1) return;
    carrito.splice(itemSeleccionadoIndex, 1);
    itemSeleccionadoIndex = carrito.length > 0 ? carrito.length - 1 : -1;
    window.actualizarCarritoUI();
};

window.agregarCarrito = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p) return;
    const item = carrito.find(c => c.id === id);
    if (item) { item.cantidad++; } else { carrito.push({ ...p, cantidad: 1 }); }
    itemSeleccionadoIndex = carrito.length - 1;
    window.actualizarCarritoUI();
};

window.seleccionarItem = (i) => { itemSeleccionadoIndex = i; window.actualizarCarritoUI(); };

// ==========================================
// 6. PASARELA DE COBRO Y PERSISTENCIA
// ==========================================
window.abrirModalCobro = () => {
    if (carrito.length === 0) return;
    document.getElementById('totalModalUSD').innerText = `$ ${window.totalVentaUSD.toFixed(2)}`;
    const totalModalBS = document.getElementById('totalModalBS');
    if (totalModalBS) totalModalBS.innerText = `Total: ${(window.totalVentaUSD * tasaActual).toFixed(2).replace('.', ',')} Bs.`;
    
    const inputFactura = document.getElementById('in-nro-factura');
    if (inputFactura && !inputFactura.value) {
        inputFactura.value = "FAC-" + Math.floor(100000 + Math.random() * 900000); 
    }
    document.getElementById('modalPago').style.display = 'flex';
    window.calcularRestante();
};

window.autoCompletarPago = (input) => {
    const p = parseFloat(document.getElementById('in-punto-bs').value) || 0;
    const pm = parseFloat(document.getElementById('in-pagomovil-bs').value) || 0;
    const ef = parseFloat(document.getElementById('in-efectivo-bs').value) || 0;
    const dv = parseFloat(document.getElementById('in-divisas-usd').value) || 0;
    const pagadoUSD = dv + ((p + pm + ef) / tasaActual);
    const faltaUSD = window.totalVentaUSD - pagadoUSD;
    if (faltaUSD <= 0) return;
    input.value = (input.id === 'in-divisas-usd') ? faltaUSD.toFixed(2) : (faltaUSD * tasaActual).toFixed(2);
    window.calcularRestante();
};

window.calcularRestante = () => {
    const p = parseFloat(document.getElementById('in-punto-bs').value) || 0;
    const pm = parseFloat(document.getElementById('in-pagomovil-bs').value) || 0;
    const ef = parseFloat(document.getElementById('in-efectivo-bs').value) || 0;
    const dv = parseFloat(document.getElementById('in-divisas-usd').value) || 0;
    const pagadoUSD = dv + ((p + pm + ef) / tasaActual);
    const btn = document.getElementById('btnConfirmarVenta');
    if(btn) btn.disabled = (window.totalVentaUSD - pagadoUSD) > 0.01;
};

window.registrarVenta = async () => {
    const btn = document.getElementById('btnConfirmarVenta');
    if (!btn || btn.disabled) return;
    
    const nroFactura = document.getElementById('in-nro-factura').value.trim() || "S/N";
    const selectCliente = document.getElementById('select-cliente');
    const clienteId = selectCliente ? selectCliente.value : "casual";
    const clienteNombre = selectCliente ? selectCliente.options[selectCliente.selectedIndex].text : "CONSUMIDOR FINAL (CASUAL)";

    btn.innerText = "GUARDANDO..."; btn.disabled = true;
    
    try {
        await addDoc(collection(db, "usuarios", USER_ID, "ventas"), {
            fecha: serverTimestamp(),
            nro_factura: nroFactura,
            cliente_id: clienteId,
            cliente_nombre: clienteNombre,
            total_usd: window.totalVentaUSD,
            tasa: tasaActual,
            pagos: {
                punto: parseFloat(document.getElementById('in-punto-bs').value) || 0,
                movil: parseFloat(document.getElementById('in-pagomovil-bs').value) || 0,
                efectivo: parseFloat(document.getElementById('in-efectivo-bs').value) || 0,
                divisas: parseFloat(document.getElementById('in-divisas-usd').value) || 0
            },
            items: carrito.map(i => ({ nombre: i.nombre, cant: i.cantidad, precio: i.precio }))
        });
        
        alert("✅ Venta registrada bajo Factura Nro: " + nroFactura);
        
        carrito = []; 
        window.actualizarCarritoUI();
        if(document.getElementById('in-nro-factura')) document.getElementById('in-nro-factura').value = '';
        
        // Resetear buscador cliente
        const inputBuscarCl = document.getElementById('buscar-cliente-pos');
        if (inputBuscarCl) {
            inputBuscarCl.value = "";
            inputBuscarCl.style.borderColor = "#e2e8f0";
            inputBuscarCl.style.backgroundColor = "#FFFFFF";
            sincronizarConSelectOriginal("casual");
        }

        // Resetear buscador productos
        const inputBuscarProd = document.getElementById('buscar-producto-pos') || document.getElementById('search-input');
        if (inputBuscarProd) inputBuscarProd.value = "";
        
        document.getElementById('modalPago').style.display = 'none';
    } catch (e) { alert("Error: " + e.message); }
    btn.innerText = "CONFIRMAR VENTA";
};

// ==========================================
// 7. CONTROL DE TECLADO
// ==========================================
window.addEventListener('keydown', (e) => {
    const modalActivo = document.getElementById('modalPago').style.display === 'flex';
    if (e.ctrlKey && e.key === "F5") return;
    if (e.key === "F4") { e.preventDefault(); if (!modalActivo) window.ejecutarF4(); }
    if (e.key === "F5") { e.preventDefault(); if (!modalActivo) window.ejecutarF5(); }
    if (e.key === "F6") { e.preventDefault(); if (!modalActivo) window.ejecutarF6(); }
    if (e.key === "F9") { 
        e.preventDefault(); 
        if (!modalActivo) { window.abrirModalCobro(); } else { window.registrarVenta(); } 
    }
    if (e.key === "Escape") document.getElementById('modalPago').style.display = 'none';
});

// Lanzamiento secuencial
cargarTasa();
inicializarClientes();
inicializarProductos();
inicializarBuscadorClientes();
inicializarBuscadorProductos();
