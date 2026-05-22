/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Gestión de Inventario General (sys_v1_inv.js)
 * Versión corregida: Validación estricta de ruta de usuario.
 */

import { db } from './firebase-config.js'; 
import { 
    collection, onSnapshot, doc, getDoc, setDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// OBTENCIÓN DEL ID: Se asegura de capturar el ID real de la sesión
const USER_ID = localStorage.getItem('youcontrol_empresa_id');

// Estado Global
let listaProductos = [];
let tasaActual = 1.00;

// Enlaces del DOM
const cuerpoTabla = document.getElementById('cuerpo-tabla');
const tasaInput = document.getElementById('tasaCambio');
const buscadorInput = document.getElementById('buscador');
const statusBar = document.getElementById('status-bar-inv');

// Enlaces del Formulario Modal
const modal = document.getElementById('modalProducto');
const modalTitulo = document.getElementById('modalTitulo');
const formId = document.getElementById('form-id');
const formBarras = document.getElementById('form-barras');
const formSku = document.getElementById('form-sku');
const formNombre = document.getElementById('form-nombre');
const formCosto = document.getElementById('form-costo');
const formGanancia = document.getElementById('form-ganancia');
const formPrecio = document.getElementById('form-precio');
const formStock = document.getElementById('form-stock');

// ==========================================
// 1. INICIALIZACIÓN DE LA DATA (VALIDADA)
// ==========================================
async function inicializarInventario() {
    // VALIDACIÓN: Si no hay ID en localStorage, el sistema no puede cargar datos
    if (!USER_ID) {
        mostrarStatusBar("❌ Error: No hay sesión activa. Inicia sesión primero.", "loading");
        console.error("USER_ID no encontrado en localStorage.");
        return;
    }

    console.log("Cargando datos para el usuario:", USER_ID);
    mostrarStatusBar("⏳ Conectando con Firestore...", "loading");
    
    try {
        // Consultar tasa (Ruta exacta: usuarios -> [USER_ID] -> configuracion -> tasa)
        const tasaDocRef = doc(db, "usuarios", USER_ID, "configuracion", "tasa");
        const tasaSnap = await getDoc(tasaDocRef);
        
        if (tasaSnap.exists()) {
            tasaActual = parseFloat(tasaSnap.data().valor) || 1.00;
            if (tasaInput) tasaInput.value = tasaActual.toFixed(2);
        }

        // Listener en tiempo real (Ruta exacta: usuarios -> [USER_ID] -> productos)
        const productosCollection = collection(db, "usuarios", USER_ID, "productos");
        
        onSnapshot(productosCollection, (snapshot) => {
            listaProductos = [];
            cuerpoTabla.innerHTML = '';

            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    listaProductos.push({ id: doc.id, ...doc.data() });
                });
                renderizarTabla(listaProductos);
                mostrarStatusBar("✅ Datos sincronizados correctamente.", "success");
            } else {
                cuerpoTabla.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px;">No hay productos para este usuario.</td></tr>`;
                ocultarStatusBar();
            }
        }, (error) => {
            console.error("Error en Snapshot:", error);
            mostrarStatusBar("❌ Error de permisos: Verifica tu ID de usuario.", "loading");
        });

        inicializarCalculadoraCosto();

    } catch (e) {
        console.error("Error crítico inicializador:", e);
        mostrarStatusBar("❌ Error al establecer comunicación con Firestore.", "loading");
    }
}

document.addEventListener('DOMContentLoaded', inicializarInventario);

// ==========================================
// MOTOR DE EVALUACIÓN DE PORCENTAJES
// ==========================================
function inicializarCalculadoraCosto() {
    if (!formCosto) return;
    formCosto.type = "text";
    formCosto.addEventListener('change', () => {
        let expresion = formCosto.value.trim().replace(/\s+/g, '');
        if (!expresion) return;
        
        const regexPorcentaje = /^([0-9.]+)([\+\-])([0-9.]+)%$/;
        const coincidencia = expresion.match(regexPorcentaje);

        if (coincidencia) {
            const base = parseFloat(coincidencia[1]);
            const operador = coincidencia[2];
            const porcentaje = parseFloat(coincidencia[3]);
            if (!isNaN(base) && !isNaN(porcentaje)) {
                let resultado = (operador === '+') ? base + (base * (porcentaje / 100)) : base - (base * (porcentaje / 100));
                formCosto.value = resultado.toFixed(2);
            }
        } else {
            try {
                if (/^[0-9\+\-\*\/\.\(\)]+$/.test(expresion)) {
                    const calculoPlano = Function(`"use strict"; return (${expresion})`)();
                    if (!isNaN(calculoPlano)) formCosto.value = parseFloat(calculoPlano).toFixed(2);
                }
            } catch (e) {
                const valorLimpio = parseFloat(expresion);
                formCosto.value = !isNaN(valorLimpio) ? valorLimpio.toFixed(2) : "0.00";
            }
        }
        if (typeof window.calcularPrecioModal === "function") window.calcularPrecioModal();
    });
}

// ==========================================
// RENDERIZACIÓN
// ==========================================
function renderizarTabla(productos) {
    cuerpoTabla.innerHTML = '';
    productos.forEach(prod => {
        const costo = parseFloat(prod.costo || 0);
        const ganancia = parseFloat(prod.ganancia || 0);
        const precioUSD = parseFloat(prod.precio || 0);
        const stock = parseInt(prod.stock || 0);
        const precioBS = (precioUSD * tasaActual).toFixed(2);

        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td class="txt-bold">${prod.barras || '—'}</td>
            <td>${prod.sku || '—'}</td>
            <td>${prod.nombre || 'Sin Descripción'}</td>
            <td>$ ${costo.toFixed(2)}</td>
            <td>${ganancia}%</td>
            <td class="txt-bold">$ ${precioUSD.toFixed(2)}</td>
            <td><span class="badge-bs">Bs. ${precioBS.replace('.', ',')}</span></td>
            <td><span class="badge-stock" style="${stock <= 3 ? 'background: #FEE2E2; color: #EF4444; font-weight:700;' : ''}">${stock}</span></td>
            <td style="text-align: center;">
                <button class="btn-edit" onclick="window.abrirModalEditar('${prod.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-remove" onclick="window.eliminarProducto('${prod.id}', '${prod.nombre}')"><i class="fas fa-trash-can"></i></button>
            </td>
        `;
        cuerpoTabla.appendChild(fila);
    });
}

// ==========================================
// CRUD Y OPERACIONES (RUTA DINÁMICA FIJA)
// ==========================================
window.guardarCambiosModal = async function() {
    const id = formId.value.trim();
    const productoData = {
        sku: formSku.value.trim(),
        barras: formBarras.value.trim(),
        nombre: formNombre.value.trim(),
        costo: parseFloat(formCosto.value) || 0,
        ganancia: parseFloat(formGanancia.value) || 0,
        precio: parseFloat(formPrecio.value) || 0,
        stock: parseInt(formStock.value) || 0,
        ultima_actualizacion: new Date().toISOString().split('T')[0]
    };

    try {
        const idDoc = id || formSku.value || formBarras.value || doc(collection(db, "temp")).id;
        // RUTA DINÁMICA: Siempre usa el USER_ID capturado al inicio
        const docRef = doc(db, "usuarios", USER_ID, "productos", idDoc);
        await setDoc(docRef, productoData, { merge: true });
        window.cerrarModal();
        mostrarStatusBar("✅ Guardado exitoso.", "success");
    } catch (e) {
        console.error("Error al guardar:", e);
        alert("Error al guardar producto.");
    }
};

window.eliminarProducto = async function(id, nombre) {
    if (confirm(`¿Eliminar ${nombre}?`)) {
        try {
            await deleteDoc(doc(db, "usuarios", USER_ID, "productos", id));
            mostrarStatusBar("✅ Producto eliminado.", "success");
        } catch (e) { alert("Error al eliminar."); }
    }
};

// ==========================================
// VENTANAS Y ESTADOS
// ==========================================
window.abrirModalEditar = function(id) {
    const prod = listaProductos.find(p => p.id === id);
    if (!prod) return;
    formId.value = prod.id;
    formBarras.value = prod.barras || '';
    formSku.value = prod.sku || '';
    formNombre.value = prod.nombre || '';
    formCosto.value = (prod.costo || 0).toFixed(2);
    formGanancia.value = (prod.ganancia || 0).toFixed(1);
    formPrecio.value = (prod.precio || 0).toFixed(2);
    formStock.value = prod.stock || '0';
    modal.style.display = 'flex';
};

window.cerrarModal = function() { modal.style.display = 'none'; };

function mostrarStatusBar(mensaje, tipo) {
    if (!statusBar) return;
    statusBar.innerText = mensaje;
    statusBar.style.display = 'block';
    if (tipo === 'success') setTimeout(ocultarStatusBar, 3000);
}

function ocultarStatusBar() { if (statusBar) statusBar.style.display = 'none'; }

window.actualizarTasaTop = function() {
    const valorTasa = parseFloat(tasaInput.value);
    if (!isNaN(valorTasa) && valorTasa > 0) {
        tasaActual = valorTasa;
        window.filtrarProductos(); 
    }
};

window.guardarTasaFirestore = async function() {
    const valorTasa = parseFloat(tasaInput.value);
    try {
        await setDoc(doc(db, "usuarios", USER_ID, "configuracion", "tasa"), { valor: valorTasa }, { merge: true });
        tasaActual = valorTasa;
        window.filtrarProductos();
        mostrarStatusBar("✅ Tasa guardada.", "success");
    } catch (e) { mostrarStatusBar("❌ Error al guardar tasa.", "loading"); }
};

window.filtrarProductos = function() {
    const criterio = buscadorInput.value.trim().toLowerCase();
    const filtrados = listaProductos.filter(p => (p.barras || '').toLowerCase().includes(criterio) || (p.sku || '').toLowerCase().includes(criterio) || (p.nombre || '').toLowerCase().includes(criterio));
    renderizarTabla(filtrados);
};
