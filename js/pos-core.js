/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Facturación y Ventas Completo (pos-core.js)
 * Adaptación Multi-Empresa: Lectura estricta de ID mediante localStorage.
 */

import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc, query, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// SEGURIDAD: Obtención dinámica del ID de empresa. Si no existe, bloquea la ejecución.
const USER_ID = localStorage.getItem('youcontrol_empresa_id');

if (!USER_ID) {
    console.error("Acceso denegado: No se ha detectado una empresa activa.");
    alert("Error de sesión: Por favor, ingrese nuevamente al sistema.");
    window.location.href = "index.html"; 
}

let productosMaster = [];
let clientesMaster = []; 
let carrito = [];
let itemSeleccionadoIndex = -1;
let tasaActual = 1;
let proximoNumeroFacturaStr = "000001";

window.clientesMaster = [];
let indexFocoCliente = -1;
let indexFocoProducto = -1;

// ==========================================
// 1. INICIALIZACIÓN, TASA Y FACTURA AUTOMÁTICA
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

function escucharUltimaFactura() {
    const ventsRef = collection(db, "usuarios", USER_ID, "ventas");
    const q = query(ventsRef, orderBy("fecha", "desc"), limit(1));
    
    onSnapshot(q, (snapshot) => {
        let ultimoNumero = 0;
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.nro_factura) {
                const limpio = data.nro_factura.replace(/\D/g, "");
                const num = parseInt(limpio);
                if (!isNaN(num) && num > ultimoNumero) ultimoNumero = num;
            }
        });
        proximoNumeroFacturaStr = String(ultimoNumero + 1).padStart(6, '0');
        const lblBadge = document.getElementById('lbl-nro-factura');
        if (lblBadge) lblBadge.innerText = proximoNumeroFacturaStr;
    });
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
// 2. MOTORES DE BÚSQUEDA (CLIENTES Y PRODUCTOS)
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
        const filtrados = clientesMaster.filter(c => (c.nombre || '').toLowerCase().includes(query) || (c.rif || '').toLowerCase().includes(query));

        if (filtrados.length === 0) {
            listaResultados.innerHTML = `
                <div style="padding: 15px; text-align: center; background: white;">
                    <p style="color: #64748B; font-size: 13px; margin-bottom: 8px;">Cliente no registrado</p>
                    <button id="btn-crear-cliente-express" class="item-cl-nav" data-crear="true" style="width: 100%; background: #006aff; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer;">
                        Registrar Nuevo Cliente
                    </button>
                </div>`;
            document.getElementById('btn-crear-cliente-express')?.addEventListener('click', () => window.open('sys_v2_clt.html', '_blank'));
        } else {
            listaResultados.innerHTML = filtrados.map((c, i) => `
                <div class="opcion-item-desplegable item-cl-nav" data-index="${i}" data-id="${c.id}" data-nombre="${c.nombre}" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #F1F5F9; background: white;">
                    <b>${c.nombre}</b><br><small style="color:#006aff;">${c.rif || 'S/ID'}</small>
                </div>
            `).join('');
            listaResultados.querySelectorAll('.item-cl-nav').forEach(item => item.addEventListener('click', (e) => {
                inputBuscarCl.value = item.getAttribute('data-nombre');
                listaResultados.style.display = 'none';
                sincronizarConSelectOriginal(item.getAttribute('data-id'));
            }));
        }
        listaResultados.style.display = 'block';
    });
}

function inicializarBuscadorProductos() {
    const inputBuscarProd = document.getElementById('buscar-producto-pos') || document.getElementById('search-input');
    const listaResultadosProd = document.getElementById('resultados-producto-pos');

    if (!inputBuscarProd || !listaResultadosProd) return;

    inputBuscarProd.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (query === "") { listaResultadosProd.style.display = 'none'; return; }

        const filtrados = productosMaster.filter(p => (p.nombre || '').toLowerCase().includes(query) || (p.codigo || '').toLowerCase().includes(query));
        
        listaResultadosProd.innerHTML = filtrados.map(p => `
            <div class="opcion-item-desplegable-prod item-prod-nav" data-id="${p.id}" style="padding: 10px; cursor: pointer; border-bottom: 1px solid #F1F5F9; background: white;">
                ${p.nombre} - <b>$${parseFloat(p.precio).toFixed(2)}</b>
            </div>
        `).join('');

        listaResultadosProd.querySelectorAll('.item-prod-nav').forEach(item => {
            item.addEventListener('click', () => {
                window.agregarCarrito(item.getAttribute('data-id'));
                inputBuscarProd.value = "";
                listaResultadosProd.style.display = 'none';
            });
        });
        listaResultadosProd.style.display = 'block';
    });
}

function sincronizarConSelectOriginal(id) {
    const selectOriginal = document.getElementById('select-cliente');
    if (selectOriginal) { selectOriginal.value = id; selectOriginal.dispatchEvent(new Event('change')); }
}

// ==========================================
// 3. PERSISTENCIA Y CARRO
// ==========================================
function inicializarProductos() {
    const productosRef = collection(db, "usuarios", USER_ID, "productos");
    onSnapshot(productosRef, (snapshot) => {
        productosMaster = [];
        snapshot.forEach(doc => productosMaster.push({ id: doc.id, ...doc.data() }));
    });
}

window.agregarCarrito = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p) return;
    const item = carrito.find(c => c.id === id);
    if (item) item.cantidad++; else carrito.push({ ...p, cantidad: 1 });
    window.actualizarCarritoUI();
};

window.actualizarCarritoUI = () => {
    const list = document.getElementById('lista-carrito');
    if (!list) return;
    let total = 0;
    list.innerHTML = carrito.map((c, i) => {
        total += (c.precio * c.cantidad);
        return `<div style="padding: 10px;">${c.cantidad}x ${c.nombre} - $${(c.precio*c.cantidad).toFixed(2)}</div>`;
    }).join('');
    document.getElementById('total-usd').innerText = `$ ${total.toFixed(2)}`;
    window.totalVentaUSD = total;
};

window.registrarVenta = async () => {
    const btn = document.getElementById('btnConfirmarVenta');
    if (!btn || btn.disabled) return;
    
    try {
        await addDoc(collection(db, "usuarios", USER_ID, "ventas"), {
            fecha: serverTimestamp(),
            nro_factura: proximoNumeroFacturaStr,
            total_usd: window.totalVentaUSD,
            tasa: tasaActual,
            items: carrito
        });
        alert("✅ Venta registrada: " + proximoNumeroFacturaStr);
        carrito = [];
        window.actualizarCarritoUI();
        document.getElementById('modalPago').style.display = 'none';
    } catch (e) { alert("Error: " + e.message); }
};

// ==========================================
// INICIALIZACIÓN GLOBAL
// ==========================================
cargarTasa();
escucharUltimaFactura();
inicializarClientes();
inicializarProductos();
inicializarBuscadorClientes();
inicializarBuscadorProductos();
