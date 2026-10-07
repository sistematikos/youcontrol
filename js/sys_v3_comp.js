/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Compras e Inventario (sys_v3_comp.js)
 */

import { db } from './firebase-config.js'; 
import { collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- VALIDACIÓN DE SESIÓN ---
const USER_ID = localStorage.getItem('youcontrol_empresa_id');
if (!USER_ID) {
    window.location.href = "index.html"; 
}

// --- VARIABLES GLOBALES ---
window.USER_ID = USER_ID;
window.productosLocales = [];
window.proveedoresLocales = [];
window.tasaActual = 1.0;
window.proveedorSeleccionadoID = null;
window.nombreProveedorSeleccionado = null;

// --- CARGA DE CONFIGURACIÓN Y TASA ---
async function cargarConfiguracionGlobal() {
    try {
        const userDocRef = doc(db, "usuarios", USER_ID);
        const snapConfig = await getDoc(userDocRef);
        if (snapConfig.exists()) {
            const data = snapConfig.data();
            window.tasaActual = data.tasa_bcv || 1.0;
            const spanTasa = document.getElementById('txt-tasa');
            if (spanTasa) spanTasa.innerText = window.tasaActual.toLocaleString('es-VE', { minimumFractionDigits: 2 });
        }
    } catch (e) {
        console.error("Error al cargar configuración:", e);
    }
}

// --- ESCUCHA DE FIRESTORE EN TIEMPO REAL ---
function inicializarProductos() {
    const productosRef = collection(db, "usuarios", USER_ID, "productos");
    onSnapshot(productosRef, (snapshot) => {
        window.productosLocales = [];
        snapshot.forEach(docSnap => {
            window.productosLocales.push({ id: docSnap.id, ...docSnap.data() });
        });
    });
}

function inicializarProveedores() {
    const proveedoresRef = collection(db, "usuarios", USER_ID, "proveedores");
    onSnapshot(proveedoresRef, (snapshot) => {
        window.proveedoresLocales = [];
        snapshot.forEach(docSnap => {
            window.proveedoresLocales.push({ id: docSnap.id, ...docSnap.data() });
        });
    });
}

// --- FUNCIONES DE BÚSQUEDA ---
window.buscarProducto = (texto) => {
    const criterio = texto.toLowerCase().trim();
    if (!criterio) return [];
    return window.productosLocales.filter(p => 
        (p.id || '').toLowerCase().includes(criterio) || 
        (p.sku || '').toLowerCase().includes(criterio) || 
        (p.barras || '').toLowerCase().includes(criterio) || 
        (p.nombre || '').toLowerCase().includes(criterio)
    );
};

window.buscarProveedor = (texto) => {
    const criterio = texto.toLowerCase().trim();
    if (!criterio) return [];
    return window.proveedoresLocales.filter(p => 
        (p.id || '').toLowerCase().includes(criterio) || 
        (p.rif || '').toLowerCase().includes(criterio) || 
        (p.nombre || '').toLowerCase().includes(criterio) || 
        (p.razon_social || '').toLowerCase().includes(criterio)
    );
};

// --- SELECCIÓN Y BINDING ---
window.seleccionarProveedor = (id, nombre) => {
    const inputProv = document.getElementById('buscar-proveedor');
    if (inputProv) inputProv.value = nombre;
    
    const divRes = document.getElementById('resultados-proveedor');
    if (divRes) divRes.style.display = 'none';

    window.proveedorSeleccionadoID = id;
    window.nombreProveedorSeleccionado = nombre;
};

window.seleccionarProductoCompra = (id) => {
    const prod = window.productosLocales.find(p => p.id === id || p.sku === id);
    if (!prod) return;

    const inputBuscador = document.getElementById('buscar-producto-compra');
    const inputSku = document.getElementById('in-sku');
    const inputNombre = document.getElementById('in-nombre');
    const inputCosto = document.getElementById('in-costo');
    const inputPrecio = document.getElementById('in-precio');
    const divRes = document.getElementById('resultados-producto-compra');

    if (inputBuscador) inputBuscador.value = prod.nombre || '';
    if (inputSku) inputSku.value = prod.sku || prod.id || '';
    if (inputNombre) inputNombre.value = prod.nombre || '';
    if (inputCosto) inputCosto.value = prod.costo || 0;
    if (inputPrecio) inputPrecio.value = prod.precio || 0;
    if (divRes) divRes.style.display = 'none';
};

// --- INICIALIZACIÓN DE INPUTS Y EVENTOS ---
function initBuscadores() {
    // Buscador de Proveedor
    const inputProv = document.getElementById('buscar-proveedor');
    const divResProv = document.getElementById('resultados-proveedor');

    inputProv?.addEventListener('input', (e) => {
        const texto = e.target.value.trim();
        if (!divResProv) return;

        if (texto === "") {
            divResProv.style.display = 'none';
            return;
        }

        const resultados = window.buscarProveedor(texto);
        if (resultados.length > 0) {
            divResProv.style.display = 'block';
            divResProv.innerHTML = resultados.map(p => {
                const nombreMostrar = p.nombre || p.razon_social || 'SIN NOMBRE';
                const idMostrar = p.rif || p.id;
                return `
                    <div class="resultado-item" 
                         style="padding: 10px; cursor: pointer; border-bottom: 1px solid #eee; background: white;" 
                         onclick="window.seleccionarProveedor('${p.id}', '${nombreMostrar.replace(/'/g, "\\'")}')">
                        <strong>${nombreMostrar}</strong><br>
                        <small style="color: #64748b;">RIF / CÓD: ${idMostrar}</small>
                    </div>
                `;
            }).join('');
        } else {
            divResProv.style.display = 'block';
            divResProv.innerHTML = `<div style="padding: 10px; color: #64748b;">No se encontraron proveedores</div>`;
        }
    });

    // Buscador de Producto
    const inputProd = document.getElementById('buscar-producto-compra');
    const divResProd = document.getElementById('resultados-producto-compra');

    inputProd?.addEventListener('input', (e) => {
        const texto = e.target.value.trim();
        if (!divResProd) return;

        if (texto === "") {
            divResProd.style.display = 'none';
            return;
        }

        const resultados = window.buscarProducto(texto);
        if (resultados.length > 0) {
            divResProd.style.display = 'block';
            divResProd.innerHTML = resultados.map(p => `
                <div class="resultado-item" 
                     style="padding: 10px; cursor: pointer; border-bottom: 1px solid #eee; background: white;" 
                     onclick="window.seleccionarProductoCompra('${p.id}')">
                    <strong>${p.nombre}</strong><br>
                    <small style="color: #64748b;">SKU: ${p.sku || p.id} | Costo: $${p.costo || 0}</small>
                </div>
            `).join('');
        } else {
            divResProd.style.display = 'block';
            divResProd.innerHTML = `<div style="padding: 10px; color: #64748b;">Producto no registrado (Complete los datos para nuevo ingreso)</div>`;
        }
    });
}

// --- REGISTRO DE COMPRA EN FIRESTORE ---
window.registrarCompra = async () => {
    const sku = document.getElementById('in-sku')?.value.trim();
    const nombre = document.getElementById('in-nombre')?.value.trim();
    const cantidad = parseFloat(document.getElementById('in-cantidad')?.value) || 0;
    const costo = parseFloat(document.getElementById('in-costo')?.value) || 0;
    const precio = parseFloat(document.getElementById('in-precio')?.value) || 0;
    const nroFactura = document.getElementById('in-factura-compra')?.value.trim() || "S/N";

    if (!sku || !nombre || cantidad <= 0) {
        return alert("Por favor llene el SKU, Nombre y una Cantidad mayor a 0.");
    }

    try {
        const prodExistente = window.productosLocales.find(p => p.id === sku || p.sku === sku);
        const provNombre = window.nombreProveedorSeleccionado || document.getElementById('buscar-proveedor')?.value || "Proveedor General";
        const provId = window.proveedorSeleccionadoID || "anonimo";

        // 1. Guardar documento de la Recepción / Compra
        const compraData = {
            proveedor_id: provId,
            nombre_proveedor: provNombre,
            nro_factura_proveedor: nroFactura,
            sku: sku,
            nombre_producto: nombre,
            cantidad: cantidad,
            costo_unitario_usd: costo,
            precio_venta_usd: precio,
            total_usd: cantidad * costo,
            fecha: serverTimestamp()
        };

        await addDoc(collection(db, "usuarios", USER_ID, "compras"), compraData);

        // 2. Actualizar o Crear Producto en el Inventario
        if (prodExistente) {
            const prodRef = doc(db, "usuarios", USER_ID, "productos", prodExistente.id);
            await updateDoc(prodRef, {
                stock: increment(cantidad),
                costo: costo,
                precio: precio > 0 ? precio : (prodExistente.precio || 0)
            });
        } else {
            // Si el producto no existe, lo crea usando el SKU como ID del documento
            const nuevoProdRef = doc(db, "usuarios", USER_ID, "productos", sku);
            await updateDoc(nuevoProdRef, {
                sku: sku,
                nombre: nombre,
                stock: cantidad,
                costo: costo,
                precio: precio
            });
        }

        alert("✅ Compra/Entrada registrada correctamente.");

        // Limpiar campos
        document.getElementById('in-sku').value = '';
        document.getElementById('in-nombre').value = '';
        document.getElementById('in-cantidad').value = '';
        document.getElementById('in-costo').value = '';
        document.getElementById('in-precio').value = '';
        if (document.getElementById('buscar-producto-compra')) document.getElementById('buscar-producto-compra').value = '';

    } catch (error) {
        console.error("Error al registrar la compra:", error);
        alert("Error al registrar compra: " + error.message);
    }
};

// --- INICIALIZACIÓN GENERAL ---
document.addEventListener('DOMContentLoaded', async () => {
    await cargarConfiguracionGlobal();
    inicializarProductos();
    inicializarProveedores();
    initBuscadores();
});
