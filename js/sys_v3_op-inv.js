/**
 * Módulo de Operaciones de Inventario - YOU CONTROL
 * Filtrado estricto por Usuario Autenticado
 */

import { auth, db } from './firebase_config.js'; // Ajusta la ruta a tu config de Firebase
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Estado global aislado
let productosBD = [];
let productoSeleccionado = null;
let usuarioActual = null;

// Elementos DOM
const buscadorInput = document.getElementById('buscador-prod-inv');
const listaResultados = document.getElementById('lista-resultados-inv');

const campoSku = document.getElementById('inv-sku');
const campoNombre = document.getElementById('inv-nombre');
const campoStockActual = document.getElementById('inv-stock-actual');
const campoCantidad = document.getElementById('inv-cantidad');
const campoTipoOp = document.getElementById('inv-tipo-op');
const campoConcepto = document.getElementById('inv-concepto');

// Escuchar cambios de estado de sesión
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            usuarioActual = user;
            // Limpiar catálogo previo inmediatamente antes de cargar el del nuevo usuario
            productosBD = [];
            cargarCatalogoProductos(user.uid);
        } else {
            // Si no hay sesión activa, redirigir al login y limpiar todo
            usuarioActual = null;
            productosBD = [];
            window.location.href = 'index.html';
        }
    });

    configurarBuscador();
    configurarAtajosTeclado();
});

/**
 * Carga EXCLUSIVAMENTE los productos del usuario que inició sesión
 * @param {string} userId - UID del usuario autenticado
 */
async function cargarCatalogoProductos(userId) {
    try {
        productosBD = []; // Garantiza que no se conserven productos de otros usuarios

        // Consulta filtrada por userId
        const q = query(collection(db, "productos"), where("userId", "==", userId));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
            productosBD.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`Catálogo cargado correctamente: ${productosBD.length} productos para el usuario ${userId}`);
    } catch (error) {
        console.error("Error al cargar los productos del usuario:", error);
    }
}

/**
 * Configura los eventos del buscador
 */
function configurarBuscador() {
    if (!buscadorInput || !listaResultados) return;

    buscadorInput.addEventListener('input', (e) => {
        const queryTexto = e.target.value.trim().toLowerCase();

        if (queryTexto.length === 0) {
            ocultarResultados();
            return;
        }

        // Filtra solo sobre el arreglo previamente validado para este usuario
        const filtrados = productosBD.filter(p => {
            const sku = (p.sku || p.id || '').toLowerCase();
            const nombre = (p.nombre || p.descripcion || '').toLowerCase();
            const barras = (p.barras || p.codigoBarras || '').toLowerCase();

            return sku.includes(queryTexto) || nombre.includes(queryTexto) || barras.includes(queryTexto);
        });

        renderizarResultados(filtrados);
    });

    document.addEventListener('click', (e) => {
        if (!buscadorInput.contains(e.target) && !listaResultados.contains(e.target)) {
            ocultarResultados();
        }
    });
}

/**
 * Renderiza la lista flotante
 */
function renderizarResultados(resultados) {
    listaResultados.innerHTML = '';

    if (resultados.length === 0) {
        listaResultados.innerHTML = `
            <div class="item-res-inv" style="cursor: default; color: #94A3B8;">
                <small>No se encontraron coincidencias en tu catálogo</small>
            </div>
        `;
        listaResultados.style.display = 'block';
        return;
    }

    resultados.slice(0, 10).forEach(p => {
        const item = document.createElement('div');
        item.className = 'item-res-inv';
        item.innerHTML = `
            <strong>${p.nombre || p.descripcion}</strong><br>
            <small>SKU: ${p.sku || p.id} | Stock Actual: ${p.stock ?? 0}</small>
        `;

        item.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            seleccionarProducto(p);
        });

        listaResultados.appendChild(item);
    });

    listaResultados.style.display = 'block';
}

function seleccionarProducto(producto) {
    productoSeleccionado = producto;

    buscadorInput.value = producto.nombre || producto.descripcion;
    campoSku.value = producto.sku || producto.id;
    campoNombre.value = producto.nombre || producto.descripcion;
    campoStockActual.value = producto.stock ?? 0;

    ocultarResultados();
    if (campoCantidad) campoCantidad.focus();
}

function ocultarResultados() {
    listaResultados.style.display = 'none';
    listaResultados.innerHTML = '';
}

function configurarAtajosTeclado() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F9') {
            e.preventDefault();
            if (window.procesarOperacionInventario) {
                window.procesarOperacionInventario();
            }
        }
    });
}
