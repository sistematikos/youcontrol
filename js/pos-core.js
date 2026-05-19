/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Facturación y Ventas con Nro de Factura y Clientes (pos-core.js)
 */

import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12"; 

let productosMaster = [];
let clientesMaster = []; // Lista global de clientes sincronizados
let carrito = [];
let itemSeleccionadoIndex = -1;
let tasaActual = 1;

// Exponer variables críticas al objeto window para interactuar de forma segura con el DOM
window.clientesMaster = [];

// ==========================================
// 1. INICIALIZACIÓN Y CARGA DE CONFIGURACIÓN
// ==========================================
async function cargarTasa() {
    try {
        const tasaRef = doc(db, "usuarios", USER_ID, "configuracion", "tasa");
        const tasaSnap = await getDoc(tasaRef);
        if (tasaSnap.exists()) {
            tasaActual = parseFloat(tasaSnap.data().valor) || 1;
            const txtTasa = document.getElementById('txt-tasa');
            if (txtTasa) txtTasa.innerText = tasaActual.toFixed(2).replace('.', ',');
            renderizarProductos(productosMaster);
            window.actualizarCarritoUI();
        }
    } catch (e) { console.error("Error cargando tasa:", e); }
}

// Escuchar Clientes en tiempo real para poblar los selectores del sistema
function inicializarClientes() {
    const clientesRef = collection(db, "usuarios", USER_ID, "clientes");
    onSnapshot(clientesRef, (snapshot) => {
        clientesMaster = [];
        snapshot.forEach(docSnap => {
            clientesMaster.push({ id: docSnap.id, ...docSnap.data() });
        });
        // Ordenar alfabéticamente por nombre
        clientesMaster.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        
        // Sincronizar con el objeto global window para el buscador reactivo
        window.clientesMaster = clientesMaster;
        
        poblarSelectorClientes();
    });
}

function poblarSelectorClientes() {
    const selectCliente = document.getElementById('select-cliente');
    if (!selectCliente) return;

    selectCliente.innerHTML = `<option value="casual" selected>CONSUMIDOR FINAL (CASUAL)</option>`;
    clientesMaster.forEach(c => {
        selectCliente.innerHTML += `<option value="${c.id}">${c.nombre} ${c.rif ? `[${c.rif}]` : ''}</option>`;
    });
}

// ==========================================
// MOTOR DE BÚSQUEDA PREDICTIVA (SISTEMATIKOS)
// ==========================================
function inicializarBuscadorClientes() {
    const inputBuscarCl = document.getElementById('buscar-cliente-pos');
    const listaResultados = document.getElementById('resultados-cliente-pos');
    const btnLimpiarCl = document.getElementById('btn-limpiar-cliente');

    if (!inputBuscarCl || !listaResultados) return;

    // Escuchar la escritura del cajero en tiempo real
    inputBuscarCl.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (query === "") {
            listaResultados.style.display = 'none';
            if (btnLimpiarCl) btnLimpiarCl.style.display = 'none';
            sincronizarConSelectOriginal("casual");
            return;
        }

        if (btnLimpiarCl) btnLimpiarCl.style.display = 'flex';

        // Filtrar la cartera local en memoria por Nombre o RIF/Cédula
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
                <div class="opcion-cliente-item" 
                     data-id="${c.id}" 
                     data-nombre="${c.nombre}"
                     style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #F1F5F9; font-size: 13px; transition: background 0.15s ease;">
                    <b style="color: #1E293B; display: block; margin: 0;">${c.nombre}</b>
                    <small style="color: var(--vibrant-blue); font-family: monospace; font-weight: 700;">${c.rif || 'SIN IDENTIFICACIÓN'}</small>
                </div>
            `).join('');

            // Asignar eventos de clic a las opciones inyectadas
            listaResultados.querySelectorAll('.opcion-cliente-item').forEach(item => {
                item.addEventListener('click', function() {
                    const idSelected = this.getAttribute('data-id');
                    const nombreSelected = this.getAttribute('data-nombre');
                    
                    inputBuscarCl.value = nombreSelected;
                    inputBuscarCl.style.borderColor = "var(--vibrant-blue)";
                    inputBuscarCl.style.backgroundColor = "#eff6ff"; // Feedback visual azul tenue
                    listaResultados.style.display = 'none';
                    
                    sincronizarConSelectOriginal(idSelected);
                });
                
                // Efecto hover nativo sin depender de CSS externo
                item.addEventListener('mouseover', () => item.style.backgroundColor = '#f1f5f9');
                item.addEventListener('mouseout', () => item.style.backgroundColor = 'transparent');
            });
        }
        
        listaResultados.style.display = 'block';
    });

    // Evento para limpiar el cliente seleccionado y restablecer el estado inicial
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

    // Ocultar flotante si hacen clic fuera del componente
    document.addEventListener('click', (e) => {
        if (!inputBuscarCl.contains(e.target) && !listaResultados.contains(e.target)) {
            listaResultados.style.display = 'none';
        }
    });
}

// Sincroniza el ID seleccionado del buscador predictivo con el elemento estructurado nativo
function sincronizarConSelectOriginal(id) {
    const selectOriginal = document.getElementById('select-cliente');
    if (selectOriginal) {
        selectOriginal.value = id;
        selectOriginal.dispatchEvent(new Event('change'));
    }
}

// ==========================================
// 2. RENDERIZACIÓN DE PRODUCTOS Y CARRITO
// ==========================================
function renderizarProductos(lista) {
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

onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
    productosMaster = [];
    snapshot.forEach(doc => productosMaster.push({ id: doc.id, ...doc.data() }));
    renderizarProductos(productosMaster);
});

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
            <div class="single-line-row ${index === itemSeleccionadoIndex ? 'item-selected' : ''}" 
                 onclick="window.seleccionarItem(${index})"
                 style="padding: 12px 0;">
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
// 3. LOGICA Y TECLAS EXPRESS (F4, F5, F6)
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
    const
