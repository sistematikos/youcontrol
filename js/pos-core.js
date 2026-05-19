/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Facturación y Ventas Completo (pos-core.js)
 * Optimización: Acceso directo a registro de clientes en sys_v2_clt.html si no existe.
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

let indexFocoCliente = -1;
let indexFocoProducto = -1;

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
// 2. MOTOR DE BÚSQUEDA Y CONTROL TECLADO - CLIENTES
// ==========================================
function inicializarBuscadorClientes() {
    const inputBuscarCl = document.getElementById('buscar-cliente-pos');
    const listaResultados = document.getElementById('resultados-cliente-pos');
    const btnLimpiarCl = document.getElementById('btn-limpiar-cliente');

    if (!inputBuscarCl || !listaResultados) return;

    inputBuscarCl.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        indexFocoCliente = -1; 
        
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
            // MEJORADO: Tarjeta interactiva para crear un cliente nuevo si no se encuentra
            listaResultados.innerHTML = `
                <div style="padding: 15px; text-align: center; background: white;">
                    <p style="color: #64748B; font-size: 13px; margin-bottom: 8px; font-weight: 500;">
                        <i class="fas fa-user-slash" style="color: #CBD5E1;"></i> Cliente no registrado
                    </p>
                    <button id="btn-crear-cliente-express" class="item-cl-nav" data-crear="true" style="width: 100%; background: #006aff; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.2s;">
                        <i class="fas fa-user-plus"></i> Registrar Nuevo Cliente
                    </button>
                </div>`;
                
            indexFocoCliente = 0; // Enfocar el botón de creación por defecto para usar Enter rápido

            const btnCrear = document.getElementById('btn-crear-cliente-express');
            if (btnCrear) {
                btnCrear.addEventListener('click', () => abrirRegistroClientes());
                btnCrear.addEventListener('mouseover', () => btnCrear.style.backgroundColor = '#0056d4');
                btnCrear.addEventListener('mouseout', () => btnCrear.style.backgroundColor = '#006aff');
            }
        } else {
            listaResultados.innerHTML = filtrados.map((c, i) => `
                <div class="opcion-item-desplegable item-cl-nav" data-index="${i}" data-id="${c.id}" data-nombre="${c.nombre}" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #F1F5F9; font-size: 13px; background: white; transition: background 0.1s;">
                    <b style="color: #1E293B; display: block; margin: 0;">${c.nombre}</b>
                    <small style="color: #006aff; font-family: monospace; font-weight: 700;">${c.rif || 'SIN IDENTIFICACIÓN'}</small>
                </div>
            `).join('');

            listaResultados.querySelectorAll('.opcion-item-desplegable').forEach(item => {
                item.addEventListener('click', function() {
                    seleccionarClienteDesdeLista(this);
                });
                item.addEventListener('mouseover', function() {
                    indexFocoCliente = parseInt(this.getAttribute('data-index'));
                    const allItems = listaResultados.querySelectorAll('.item-cl-nav');
                    resaltarItemEnLista(allItems, indexFocoCliente);
                });
            });
        }
        listaResultados.style.display = 'block';
    });

    // Escuchador de teclas para Clientes (Navegación + Enter)
    inputBuscarCl.addEventListener('keydown', (e) => {
        const items = listaResultados.querySelectorAll('.item-cl-nav');
        if (!items.length || listaResultados.style.display === 'none') return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            indexFocoCliente = (indexFocoCliente + 1) % items.length;
            resaltarItemEnLista(items, indexFocoCliente);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            indexFocoCliente = (indexFocoCliente - 1 + items.length) % items.length;
            resaltarItemEnLista(items, indexFocoCliente);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (indexFocoCliente >= 0 && indexFocoCliente < items.length) {
                const itemEnfocado = items[indexFocoCliente];
                if (itemEnfocado.getAttribute('data-crear') === "true") {
                    abrirRegistroClientes();
                } else {
                    seleccionarClienteDesdeLista(itemEnfocado);
                }
            }
        }
    });

    function seleccionarClienteDesdeLista(elemento) {
        inputBuscarCl.value = elemento.getAttribute('data-nombre');
        inputBuscarCl.style.borderColor = "#006aff";
        inputBuscarCl.style.backgroundColor = "#eff6ff";
        listaResultados.style.display = 'none';
        sincronizarConSelectOriginal(elemento.getAttribute('data-id'));
    }

    function abrirRegistroClientes() {
        listaResultados.style.display = 'none';
        // Abre el módulo en una pestaña nueva para no romper la cola de ventas activa
        window.open('sys_v2_clt.html', '_blank');
    }

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
// 3. MOTOR DE BÚSQUEDA Y CONTROL TECLADO - PRODUCTOS
// ==========================================
function inicializarBuscadorProductos() {
    const inputBuscarProd = document.getElementById('buscar-producto-pos') || document.getElementById('search-input');
    const listaResultadosProd = document.getElementById('resultados-producto-pos');

    if (!inputBuscarProd || !listaResultadosProd) return;

    inputBuscarProd.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        indexFocoProducto = -1;

        if (query === "") {
            listaResultadosProd.style.display = 'none';
            return;
        }

        const filtrados = productosMaster.filter(p => 
            (p.nombre || '').toLowerCase().includes(query) ||
            (p.codigo || '').toLowerCase().includes(query)
        );

        if (filtrados.length === 0) {
            listaResultadosProd.innerHTML = `
                <div style="padding: 15px; color: #64748B; font-size: 13px; font-weight: 600; text-align: center; background: #FFFFFF;">
                    <i class="fas fa-box-open" style="color: #CBD5E1; display: block; margin-bottom: 4px; font-size: 16px;"></i> No hay repuestos con ese nombre
                </div>`;
        } else {
            listaResultadosProd.innerHTML = filtrados.map((p, i) => {
                const pUSD = parseFloat(p.precio) || 0;
                const pBS = (pUSD * tasaActual).toFixed(2).replace('.', ',');
                return `
                    <div class="opcion-item-desplegable-prod item-prod-nav" data-index="${i}" data-id="${p.id}" style="padding: 12px 15px; cursor: pointer; border-bottom: 1px solid #F1F5F9; display: flex; justify-content: space-between; align-items: center; font-size: 14px; background: #FFFFFF; transition: background 0.1s;">
                        <span style="color: #1E293B; font-weight: 600; text-align: left; pointer-events: none;">${p.nombre}</span>
                        <div style="text-align: right; margin-left: 15px; flex-shrink: 0; pointer-events: none;">
                            <b style="color: #006aff; display: block; font-size: 14px;">$${pUSD.toFixed(2)}</b>
                            <small style="color: #64748B; font-size: 11px; font-weight: 600;">${pBS} Bs.</small>
                        </div>
                    </div>
                `;
            }).join('');

            listaResultadosProd.querySelectorAll('.opcion-item-desplegable-prod').forEach(item => {
                item.addEventListener('click', function() {
                    ejecutarSeleccionProducto(this.getAttribute('data-id'));
                });
                item.addEventListener('mouseover', function() {
                    indexFocoProducto = parseInt(this.getAttribute('data-index'));
                    const allItems = listaResultadosProd.querySelectorAll('.item-prod-nav');
                    resaltarItemEnLista(allItems, indexFocoProducto);
                });
            });
        }
        listaResultadosProd.style.display = 'block';
    });

    inputBuscarProd.addEventListener('keydown', (e) => {
        const items = listaResultadosProd.querySelectorAll('.item-prod-nav');
        if (!items.length || listaResultadosProd.style.display === 'none') return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            indexFocoProducto = (indexFocoProducto + 1) % items.length;
            resaltarItemEnLista(items, indexFocoProducto);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            indexFocoProducto = (indexFocoProducto - 1 + items.length) % items.length;
            resaltarItemEnLista(items, indexFocoProducto);
        } else if (e.key === "Enter") {
            if (indexFocoProducto >= 0 && indexFocoProducto < items.length) {
                e.preventDefault();
                ejecutarSeleccionProducto(items[indexFocoProducto].getAttribute('data-id'));
            }
        }
    });

    function ejecutarSeleccionProducto(prodId) {
        window.agregarCarrito(prodId);
        inputBuscarProd.value = "";
        listaResultadosProd.style.display = 'none';
        inputBuscarProd.focus();
    }

    document.addEventListener('click', (e) => {
        if (!inputBuscarProd.contains(e.target) && !listaResultadosProd.contains(e.target)) {
            listaResultadosProd.style.display = 'none';
        }
    });
}

function resaltarItemEnLista(itemsArray, indexResaltar) {
    itemsArray.forEach(item => {
        if(item.getAttribute('data-crear') === "true") {
            item.style.backgroundColor = '#006aff'; // Mantiene su color base de acción
        } else {
            item.style.backgroundColor = '#FFFFFF';
        }
    });
    if (indexResaltar >= 0 && indexResaltar < itemsArray.length) {
        if(itemsArray[indexResaltar].getAttribute('data-crear') === "true") {
            itemsArray[indexResaltar].style.backgroundColor = '#0056d4'; // Hover de acción
        } else {
            itemsArray[indexResaltar].style.backgroundColor = '#F1F5F9';
        }
        itemsArray[indexResaltar].scrollIntoView({ block: 'nearest' });
    }
}

// ==========================================
// 4. PERSISTENCIA EN TIEMPO REAL (FIREBASE)
// ==========================================
function inicializarProductos() {
    const productosRef = collection(db, "usuarios", USER_ID, "productos");
    onSnapshot(productosRef, (snapshot) => {
        productosMaster = [];
        snapshot.forEach(doc => productosMaster.push({ id: doc.id, ...doc.data() }));
        
        const container = document.getElementById('grid-productos');
        if (container) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; padding: 60px 20px; text-align: center; color: #94A3B8; font-size: 14px; font-weight: 500;">
                    <i class="fas fa-search" style="font-size: 28px; display: block; margin-bottom: 12px; color: #CBD5E1;"></i>
                    Escriba arriba para buscar y añadir repuestos al carro
                </div>`;
        }
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
        
        const nombreCorto = c.nombre.length > 30 ? c.nombre.substring(0, 30) + "..." : c.nombre;

        return `
            <div class="single-line-row ${index === itemSeleccionadoIndex ? 'item-selected' : ''}" onclick="window.seleccionarItem(${index})" style="padding: 12px 0;">
                <span style="flex: 1; margin-right: 15px; font-weight: 600;">${c.cantidad}x ${nombreCorto}</span>
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
// 5. BOTONES EXPRESS Y REGLAS DE TECLADO
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
// 6. CIERRE DE VENTA (MODAL)
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
        
        const inputBuscarCl = document.getElementById('buscar-cliente-pos');
        if (inputBuscarCl) {
            inputBuscarCl.value = "";
            inputBuscarCl.style.borderColor = "#e2e8f0";
            inputBuscarCl.style.backgroundColor = "#FFFFFF";
            sincronizarConSelectOriginal("casual");
        }

        const inputBuscarProd = document.getElementById('buscar-producto-pos') || document.getElementById('search-input');
        if (inputBuscarProd) inputBuscarProd.value = "";
        
        document.getElementById('modalPago').style.display = 'none';
    } catch (e) { alert("Error: " + e.message); }
    btn.innerText = "CONFIRMAR VENTA";
};

// ==========================================
// 7. EVENTOS DE TECLADO GENERAL
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

// Inicialización
cargarTasa();
inicializarClientes();
inicializarProductos();
inicializarBuscadorClientes();
inicializarBuscadorProductos();
