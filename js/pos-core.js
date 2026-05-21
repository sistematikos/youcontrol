/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Facturación y Ventas (pos-core.js)
 * Versión Corregida: Carga síncrona de datos y filtros robustos
 */

import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, addDoc, doc, getDoc, query, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id') || "sUhfZI9Fy3M9UlInTYw2wFWZmB12"; 

let productosMaster = [];
let clientesMaster = []; 
let carrito = [];
let itemSeleccionadoIndex = -1;
let tasaActual = 1;
let proximoNumeroFacturaStr = "000001";

// Variables globales para el buscador
let indexFocoCliente = -1;
let indexFocoProducto = -1;

// ==========================================
// 1. CARGA DE DATOS (FIREBASE)
// ==========================================
async function cargarTasa() {
    try {
        const tasaRef = doc(db, "usuarios", USER_ID, "configuracion", "tasa");
        const tasaSnap = await getDoc(tasaRef);
        if (tasaSnap.exists()) {
            tasaActual = parseFloat(tasaSnap.data().valor) || 1;
            const txtTasa = document.getElementById('txt-tasa');
            if (txtTasa) txtTasa.innerText = tasaActual.toFixed(2).replace('.', ',');
        }
    } catch (e) { console.error("Error tasa:", e); }
}

function inicializarDatos() {
    // Escucha Clientes
    const clientesRef = collection(db, "usuarios", USER_ID, "clientes");
    onSnapshot(clientesRef, (snapshot) => {
        clientesMaster = [];
        snapshot.forEach(docSnap => {
            clientesMaster.push({ id: docSnap.id, ...docSnap.data() });
        });
        clientesMaster.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        poblarSelectorClientes();
    });

    // Escucha Productos
    const productosRef = collection(db, "usuarios", USER_ID, "productos");
    onSnapshot(productosRef, (snapshot) => {
        productosMaster = [];
        snapshot.forEach(doc => productosMaster.push({ id: doc.id, ...doc.data() }));
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
// 2. BUSCADOR CLIENTES (ROBUSTO)
// ==========================================
function inicializarBuscadorClientes() {
    const input = document.getElementById('buscar-cliente-pos');
    const lista = document.getElementById('resultados-cliente-pos');

    if (!input) return;

    input.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        if (!val) {
            lista.style.display = 'none';
            return;
        }

        // Filtro con validación de existencia de campos
        const filtrados = clientesMaster.filter(c => 
            (c.nombre && c.nombre.toLowerCase().includes(val)) || 
            (c.rif && c.rif.toLowerCase().includes(val))
        );

        lista.style.display = 'block';
        if (filtrados.length === 0) {
            lista.innerHTML = `<div style="padding:10px; text-align:center;">No encontrado</div>`;
        } else {
            lista.innerHTML = filtrados.map(c => `
                <div class="opcion-item" data-id="${c.id}" style="padding:10px; cursor:pointer; border-bottom:1px solid #eee;">
                    <b>${c.nombre}</b> <small>${c.rif || ''}</small>
                </div>
            `).join('');

            lista.querySelectorAll('.opcion-item').forEach(el => {
                el.onclick = () => {
                    input.value = el.querySelector('b').innerText;
                    lista.style.display = 'none';
                    sincronizarConSelectOriginal(el.dataset.id);
                };
            });
        }
    });
}

function sincronizarConSelectOriginal(id) {
    const select = document.getElementById('select-cliente');
    if (select) { select.value = id; select.dispatchEvent(new Event('change')); }
}

// ==========================================
// 3. INICIALIZACIÓN FINAL
// ==========================================
// Llamamos a la carga de datos primero
cargarTasa();
inicializarDatos();

// Esperamos brevemente a que los datos estén listos antes de activar los listeners de los inputs
setTimeout(() => {
    inicializarBuscadorClientes();
    inicializarBuscadorProductos();
    escucharUltimaFactura();
}, 1000);

// [Resto de tus funciones: registrarVenta, inicializarBuscadorProductos, etc., permanecen igual]
