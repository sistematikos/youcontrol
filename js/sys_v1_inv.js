/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Gestión de Inventario General (sys_v1_inv.js)
 * Conectado y Sincronizado a Cloud Firestore
 */

import { db } from './firebase-config.js'; 
import { 
    collection, onSnapshot, doc, getDoc, setDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ID de usuario compartido con el módulo de compras
const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";

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
// 1. INICIALIZACIÓN DE LA DATA (FIRESTORE)
// ==========================================
async function inicializarInventario() {
    mostrarStatusBar("⏳ Conectando con Cloud Firestore...", "loading");
    
    try {
        // Consultar tasa inicial de la sección de configuraciones
        const tasaSnap = await getDoc(doc(db, "usuarios", USER_ID, "configuracion", "tasa"));
        if (tasaSnap.exists()) {
            tasaActual = parseFloat(tasaSnap.data().valor) || 1.00;
            if (tasaInput) {
                tasaInput.value = tasaActual.toFixed(2);
            }
        }

        // Listener en tiempo real de la subcolección de productos
        const productosCollection = collection(db, "usuarios", USER_ID, "productos");
        
        onSnapshot(productosCollection, (snapshot) => {
            listaProductos = [];
            cuerpoTabla.innerHTML = '';

            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    listaProductos.push({ id: doc.id, ...doc.data() });
                });
                
                renderizarTabla(listaProductos);
                mostrarStatusBar("✅ Base de datos sincronizada correctamente.", "success");
            } else {
                cuerpoTabla.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px;">No hay productos en el inventario.</td></tr>`;
                ocultarStatusBar();
            }
        }, (error) => {
            console.error("Error en Snapshot:", error);
            mostrarStatusBar("❌ Error de permisos o lectura de base de datos.", "loading");
        });

    } catch (e) {
        console.error("Error crítico inicializador:", e);
        mostrarStatusBar("❌ Error al establecer comunicación con Firestore.", "loading");
    }
}

document.addEventListener('DOMContentLoaded', inicializarInventario);

// ==========================================
// 2. RENDERIZACIÓN DE FILAS Y BADGES
// ==========================================
function renderizarTabla(productos) {
    if (productos.length === 0) {
        cuerpoTabla.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px;">No se encontraron resultados en la búsqueda.</td></tr>`;
        return;
    }

    cuerpoTabla.innerHTML = '';
    
    productos.forEach(prod => {
        const costo = parseFloat(prod.costo || 0);
        const ganancia = parseFloat(prod.ganancia || 0);
        const precioUSD = parseFloat(prod.precio || 0);
        const stock = parseInt(prod.stock || 0);
        
        // Operación matemática de conversión de divisa a tasa superior
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
                <button class="btn-edit" onclick="window.abrirModalEditar('${prod.id}')" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-remove" onclick="window.eliminarProducto('${prod.id}', '${prod.nombre}')" title="Eliminar">
                    <i class="fas fa-trash-can"></i>
                </button>
            </td>
        `;
        cuerpoTabla.appendChild(fila);
    });
}

// ==========================================
// 3. BUSCADOR, CONTROL DE TASA Y ESCRITURA
// ==========================================
window.filtrarProductos = function() {
    const criterio = buscadorInput.value.trim().toLowerCase();
    
    const filtrados = listaProductos.filter(p => {
        const barras = (p.barras || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        const nombre = (p.nombre || '').toLowerCase();
        return barras.includes(criterio) || sku.includes(criterio) || nombre.includes(criterio);
    });
    
    renderizarTabla(filtrados);
};

// Modifica la tasa visualmente al escribir en el input
window.actualizarTasaTop = function() {
    const valorTasa = parseFloat(tasaInput.value);
    if (!isNaN(valorTasa) && valorTasa > 0) {
        tasaActual = valorTasa;
        window.filtrarProductos(); 
    }
};

// PERSISTENCIA: Guarda el valor actual en Firestore
window.guardarTasaFirestore = async function() {
    const valorTasa = parseFloat(tasaInput.value);
    if (isNaN(valorTasa) || valorTasa <= 0) {
        alert("Por favor, ingrese un valor de tasa válido y mayor a cero.");
        return;
    }

    mostrarStatusBar("⏳ Guardando nueva tasa en Firestore...", "loading");
    
    try {
        const tasaDocRef = doc(db, "usuarios", USER_ID, "configuracion", "tasa");
        // Escribe exactamente el campo 'valor' como lo lee tu módulo compras
        await setDoc(tasaDocRef, { valor: valorTasa }, { merge: true });
        
        tasaActual = valorTasa;
        window.filtrarProductos(); // Sincroniza la vista
        mostrarStatusBar("✅ Tasa de cambio guardada con éxito.", "success");
    } catch (e) {
        console.error("Error al guardar la tasa:", e);
        mostrarStatusBar("❌ Error al guardar la configuración en la DB.", "loading");
    }
};

// ==========================================
// 4. CONTROL DE VENTANAS MODALES
// ==========================================
window.abrirModalNuevo = function() {
    modalTitulo.innerHTML = `<i class="fas fa-plus"></i> Nuevo Producto`;
    formId.value = '';
    formBarras.value = '';
    formSku.value = '';
    formNombre.value = '';
    formCosto.value = '0.00';
    formGanancia.value = '0.0';
    formPrecio.value = '0.00';
    formStock.value = '0';
    
    modal.style.display = 'flex';
    formBarras.focus();
};

window.abrirModalEditar = function(id) {
    const prod = listaProductos.find(p => p.id === id);
    if (!prod) return;

    modalTitulo.innerHTML = `<i class="fas fa-box"></i> Editar Producto`;
    formId.value = prod.id;
    formBarras.value = prod.barras || '';
    formSku.value = prod.sku || '';
    formNombre.value = prod.nombre || '';
    formCosto.value = (prod.costo || 0).toFixed(2);
    formGanancia.value = (prod.ganancia || 0).toFixed(1);
    formPrecio.value = (prod.precio || 0).toFixed(2);
    formStock.value = prod.stock || '0';

    modal.style.display = 'flex';
    formNombre.focus();
};

window.cerrarModal = function() {
    modal.style.display = 'none';
};

// ==========================================
// 5. CÁLCULOS MATEMÁTICOS COMERCIALES
// ==========================================
window.calcularPrecioModal = function() {
    const costo = parseFloat(formCosto.value) || 0;
    const ganancia = parseFloat(formGanancia.value) || 0;
    const precioCalculado = costo + (costo * (ganancia / 100));
    formPrecio.value = precioCalculado.toFixed(2);
};

window.calcularGananciaModal = function() {
    const costo = parseFloat(formCosto.value) || 0;
    const precio = parseFloat(formPrecio.value) || 0;
    
    if (costo > 0) {
        const gananciaCalculada = ((precio - costo) / costo) * 100;
        formGanancia.value = gananciaCalculada.toFixed(1);
    } else {
        formGanancia.value = '0.0';
    }
};

// ==========================================
// 6. OPERACIONES ESCRITURA Y ELIMINACIÓN (CRUD)
// ==========================================
window.guardarCambiosModal = async function() {
    const id = formId.value.trim();
    const nombre = formNombre.value.trim();
    const sku = formSku.value.trim();
    const barras = formBarras.value.trim();

    if (!nombre) {
        alert("La descripción del producto es obligatoria.");
        return;
    }

    mostrarStatusBar("⏳ Guardando cambios en Firestore...", "loading");

    const productoData = {
        sku: sku,
        barras: barras,
        nombre: nombre,
        costo: parseFloat(formCosto.value) || 0,
        ganancia: parseFloat(formGanancia.value) || 0,
        precio: parseFloat(formPrecio.value) || 0,
        stock: parseInt(formStock.value) || 0,
        ultima_actualizacion: new Date().toISOString().split('T')[0]
    };

    try {
        let idDocumento = id;
        if (!idDocumento) {
            idDocumento = sku || barras || doc(collection(db, "temp")).id;
        }

        const docRef = doc(db, "usuarios", USER_ID, "productos", idDocumento);
        await setDoc(docRef, productoData, { merge: true });

        window.cerrarModal();
        mostrarStatusBar("✅ Producto guardado exitosamente.", "success");
    } catch (e) {
        console.error("Error al escribir producto:", e);
        alert("Error crítico al guardar en Firestore.");
        ocultarStatusBar();
    }
};

window.eliminarProducto = async function(id, nombre) {
    if (confirm(`¿Estás seguro de eliminar permanentemente: "${nombre}"?`)) {
        mostrarStatusBar("⏳ Eliminando de la base de datos...", "loading");
        try {
            const docRef = doc(db, "usuarios", USER_ID, "productos", id);
            await deleteDoc(docRef);
            mostrarStatusBar("✅ Producto eliminado.", "success");
        } catch (e) {
            console.error("Error al remover de Firestore:", e);
            alert("No se pudo eliminar el registro.");
            ocultarStatusBar();
        }
    }
};

// ==========================================
// 7. ALERTAS Y RENDER VISUAL DE ESTADOS
// ==========================================
function mostrarStatusBar(mensaje, tipo) {
    if (!statusBar) return;
    statusBar.innerText = mensaje;
    statusBar.className = ''; 
    statusBar.style.display = 'block';

    if (tipo === 'loading') {
        statusBar.classList.add('status-loading');
    } else if (tipo === 'success') {
        statusBar.classList.add('status-success');
        setTimeout(ocultarStatusBar, 3000);
    }
}

function ocultarStatusBar() {
    if (statusBar) statusBar.style.display = 'none';
}
